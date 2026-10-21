# Design

## Context

See `proposal.md` for motivation. Behavior is in `specs/completion-stats/spec.md` and `specs/todo-list/spec.md`.

Current state that shapes the approach:

- Next.js 16.4.2, React 19.3, TypeScript, Tailwind v4, pnpm. `next.config.ts` enables `cacheComponents`, `partialPrefetching` and `reactCompiler`.
- shadcn/ui is built on `@base-ui/react` (`components.json` style `base-nova`). The `cn` package is already a dependency.
- `lib/tasks/store.ts` defines `Task = { id, title, done, createdAt }` and keeps tasks in a `Map` on `globalThis`, so dev hot reload does not wipe them. `updateTask(id, patch)` merges `title` and `done`.
- `app/api/tasks/[id]/route.ts` `PATCH` validates the body and then calls `updateTask`. `app/api/tasks/route.ts` `GET` calls `await connection()`, because under Cache Components a `GET` handler that reads no uncached or runtime data is prerendered (`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, section "With Cache Components").
- `components/todo-list.tsx` is a `"use client"` component that owns the task state. `handleToggle(task, done)` sends `PATCH` and then calls `putTask(response)`. Errors go through the sonner `showError` toast. Delete is deferred until the undo toast closes.
- The project has no test framework. `pnpm lint` and `pnpm build` are the available checks.

## Goals / Non-Goals

**Goals:**

- Record completions as events on the server, so history survives deletes and re-checks.
- Aggregate the last 7 days on the server, grouped by the viewer's calendar day.
- Refresh the chart right after a checkbox toggle, without polling.

**Non-Goals:**

- A configurable window. The chart always shows 7 days.
- Keeping events across server restarts.
- Per-user statistics. There is one shared log, as there is one shared task list.
- Live sync between tabs. Another tab sees new numbers on its next reload or toggle.
- Automated tests. The project has no test setup and this change does not add one.

## Decisions

### Event log owned by the store

`lib/tasks/store.ts` keeps an array of events on `globalThis` next to the task map, for the same hot reload reason:

```ts
type CompletionEvent = { taskId: string; completedAt: string }; // ISO 8601
```

`updateTask` compares the old and new `done` values:

- `false` → `true`: push an event with the current time.
- `true` → `false`: remove the last event with a matching `taskId`.
- Unchanged: do nothing. Title-only patches fall here.

`deleteTask` leaves the task's events in place. The store exports a read function for the log; nothing outside the store writes to it.

The transition check lives in the store, not in the route, so tasks and events change in one place and cannot drift apart. The event type and the read function could sit in a separate `lib/stats/` module that the store calls. That is a file layout choice; the store still owns the write.

Alternatives considered:

- A `completedAt` field on `Task`. Rejected: the user chose a history that survives deletes and re-checks, and the field would change the `/api/tasks` response shape.
- A separate events module that the `PATCH` route calls after `updateTask`. Rejected: two call sites would have to stay in sync, and any future caller of `updateTask` could skip the event.

### Aggregation on the server

`app/api/completion-stats/route.ts` handles `GET /api/completion-stats?tz=<IANA>`. The route sits at the top level rather than at `/api/tasks/stats`, where it would sit beside the `/api/tasks/[id]` dynamic segment.

- `tz` is required. The handler checks it with `new Intl.DateTimeFormat(undefined, { timeZone: tz })`. A missing value or a `RangeError` returns 400 with `{ error }`.
- The handler calls `await connection()` before reading the store, the same pattern as `GET /api/tasks`. Reading `req.url` might already make it dynamic, but one pattern for both routes is easier to check. `pnpm build` output must list `/api/completion-stats` as dynamic (ƒ).
- The counting is a pure function in `lib/stats/daily-completions.ts` that takes `(events, tz, now)` and returns 7 `{ date, count }` rows. Passing `now` in keeps it deterministic and easy to reason about.

How the function builds the rows:

1. The day key of an event is its `completedAt` formatted as `YYYY-MM-DD` in `tz`, for example with `Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })` or `formatToParts`.
2. Today's key is `now` formatted the same way.
3. The six earlier keys come from calendar arithmetic on that year, month and day with `Date.UTC`, stepping back one day at a time. Subtracting 24 hours from a timestamp would skip or repeat a day around DST changes; arithmetic on the date parts does not.
4. Days with no events get `count: 0`. Rows are ordered oldest first.

Alternative considered: return the raw events and count in the browser. Rejected: it sends the whole log, which grows without bound, and the API contract in the spec is the aggregated rows.

### Timezone from the browser

The client sends `Intl.DateTimeFormat().resolvedOptions().timeZone` as `tz`. It needs no permission prompt and returns the IANA name the server expects.

### Chart built with the shadcn Chart component

`pnpm dlx shadcn@latest add chart` writes `components/ui/chart.tsx` and adds `recharts` to `package.json`. The shadcn docs (Context7, registry 4.21) say the base chart uses Recharts 3 and imports `cn` from the `cn` package. The shadcn repo pins `recharts` 3.8.0; which version the CLI installs here is [unconfirmed]. The implementer checks the generated file and the `package.json` diff before committing.

`components/completion-chart.tsx` is a new `"use client"` component:

- A `Card` titled "Completed per day" holding a `ChartContainer` with a `BarChart`, one `Bar`, `ChartTooltip` and `ChartTooltipContent`.
- `XAxis` labels are short dates, such as the weekday from `Intl.DateTimeFormat(undefined, { weekday: "short" })` or month and day. The label code parses `date` as UTC noon and formats it with `timeZone: "UTC"`, so the browser's offset cannot move it to the neighbouring day.
- If a `YAxis` is shown, it sets `allowDecimals={false}`. Counts are whole numbers.
- `ChartContainer` gets a fixed height class. Recharts' `ResponsiveContainer` renders nothing inside a parent with no height.
- Three states: loading, ready and failed. Failed shows a short message in the card and an error toast through `showError`.

Alternative considered: a hand-written SVG bar chart. Rejected: the user chose the shadcn Chart component.

### Live refresh through a `refreshKey` prop

`TodoList` renders `<CompletionChart refreshKey={n} />` below the "Completed" section and increments `n` after a toggle `PATCH` succeeds. The chart refetches whenever `refreshKey` changes. Each fetch uses the same `isActive` flag pattern as the initial load in `TodoList`: the effect cleanup clears the flag, so a response that arrives after a newer request started is dropped. Adding, renaming and deleting tasks do not touch the event log, so they do not bump the key.

Alternatives considered:

- Derive the counts from the client task state. Rejected: the client cannot see the history of deleted tasks or earlier re-checks.
- Poll the endpoint. Rejected: toggles are the only source of change, and the client already knows when one succeeds.

### Chart lives inside `TodoList`

The toggle handler is in `TodoList`, so the chart goes there too and the refresh signal stays a local counter. `app/page.tsx` does not change. Rendering the chart from the page would need shared state or a context between two siblings just to pass a counter.

### Confirmed by the user

- The chart sits below the list on the home page and updates live.
- The window is the last 7 days.
- Completions come from an event log, not from the current `done` flag.
- Unchecking removes that task's most recent event.
- Deleting a task keeps its history.
- Days are grouped in the browser's timezone.
- The chart uses the shadcn Chart component (Recharts).

## Risks / Trade-offs

- [Recharts 3 misbehaves with React 19.3 or the React Compiler; compatibility is [unconfirmed]] → Run `pnpm build`, open the page in a browser, toggle a few tasks and check the console stays clean.
- [The shadcn CLI generates a Radix-based or style-mismatched `chart.tsx`, or adds unexpected packages] → Review the generated file and the `package.json` diff before committing.
- [`GET /api/completion-stats` is prerendered and serves build-time counts] → `await connection()` in the handler, and check the route type in the `pnpm build` output.
- [DST or offset bugs put events on the wrong day or repeat a day] → Format day keys explicitly in `tz` and step back with UTC calendar arithmetic on the date parts, never by subtracting 24 hours.
- [The event log grows without bound] → Accepted. It is in memory and resets on restart, like the task store.
- [Rapid toggles return stats responses out of order] → The chart drops any response whose request is no longer the latest.
- [The stats request fails while the list works] → The chart has its own error state and toast. The list is not affected.
- [The chart renders at zero height] → `ChartContainer` gets a fixed height class.

## Migration Plan

No data migration. The event log starts empty, so the chart shows zeros until tasks are checked after deploy. Rollback is a revert of the commit, which also removes `recharts` from `package.json`.
