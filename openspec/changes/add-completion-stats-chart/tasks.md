# Tasks

The project has no test framework, and this change does not add one (see `design.md`, Non-Goals). Each task is verified with `pnpm lint`, `pnpm build`, `curl` against `pnpm dev`, or a manual check in the browser.

## 1. Chart dependency

- [ ] 1.1 Add the shadcn Chart component with `pnpm dlx shadcn@latest add chart`. Verify that `components/ui/chart.tsx` exists, imports from `recharts` and from the `cn` package, and imports nothing from Radix (`grep -i radix components/ui/chart.tsx` finds nothing). Check that the `package.json` diff adds only `recharts` and note the installed version, since the design leaves it [unconfirmed]. `pnpm lint` and `pnpm build` must pass.

## 2. Completion event log in the store

- [ ] 2.1 In `lib/tasks/store.ts`, add the type `CompletionEvent = { taskId: string; completedAt: string }` and an events array on `globalThis` next to the task `Map`, so dev hot reload keeps it. Export a read function for the log and keep all writes inside the store. Verify with `pnpm lint` and `pnpm build`.
- [ ] 2.2 Make `updateTask` compare the old and new `done` values: `false` → `true` pushes an event with the current ISO 8601 time, `true` → `false` removes the last event with that `taskId`, and anything else (including title-only patches) leaves the log alone. Leave `deleteTask` as it is, so the events stay after a delete. Verify with `pnpm lint` and `pnpm build`. The behavior gets checked with `curl` in 3.3, once the route exists.

## 3. Daily stats aggregation and API route

- [ ] 3.1 Create `lib/stats/daily-completions.ts` with a pure function `(events, tz, now)` that returns 7 `{ date, count }` rows, oldest first. Format day keys as `YYYY-MM-DD` in `tz` (for example `Intl.DateTimeFormat("en-CA", …)` or `formatToParts`). Get the six earlier days by stepping back on the date parts with `Date.UTC`, never by subtracting 24 hours. Days without events get `count: 0`, and older events are ignored. Use relative or type-only imports only (no `@/` alias), so you can call it directly with Node 24. Check it with a one-off `node --input-type=module -e` that imports the `.ts` file and is not committed: one event at `2026-10-20T22:30:00Z` with `now` = `2026-10-21T12:00:00Z` lands on `2026-10-21` for `Europe/Moscow` and on `2026-10-20` for `UTC`; a `now` just after a DST change (for example `2026-10-26T12:00:00Z`, `Europe/Berlin`) still gives 7 distinct consecutive dates; an event 8 days before `now` counts nowhere. `pnpm lint` must pass.
- [ ] 3.2 Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, section "With Cache Components", as project `AGENTS.md` requires. Then create `app/api/completion-stats/route.ts` with `GET`. It calls `await connection()` from `next/server` first, then validates `tz` with `new Intl.DateTimeFormat(undefined, { timeZone: tz })`. A missing `tz` or a `RangeError` returns 400 with `{ error }`. Otherwise it returns the rows from 3.1 for the store's log and the current time. Under `pnpm dev`, verify that `curl -s 'localhost:3000/api/completion-stats?tz=UTC'` returns 7 rows with `count: 0` and consecutive dates ending with today in UTC, and that `curl -i localhost:3000/api/completion-stats` and `curl -i 'localhost:3000/api/completion-stats?tz=Mars/Base'` both return 400. `pnpm build` must list `/api/completion-stats` as ƒ (dynamic).
- [ ] 3.3 Check the store transitions from group 2 with `curl` under a fresh `pnpm dev`, reading today's row from `GET /api/completion-stats?tz=UTC` after each step. Create a task and `PATCH {"done":true}`: count 1. Send `PATCH {"done":true}` again: still 1. `PATCH {"title":"Renamed"}`: still 1. `PATCH {"done":false}`: 0. `PATCH {"done":false}` again: still 0. Check, uncheck and check again: 1. `DELETE` the task: still 1. If the current time is between 21:00 and 24:00 UTC, also confirm that today's row for `tz=Europe/Moscow` has the next day's date and includes the event.

## 4. Chart component

- [ ] 4.1 Create `components/completion-chart.tsx` (`"use client"`) with a `refreshKey` prop. On mount and whenever `refreshKey` changes, fetch `GET /api/completion-stats?tz=<Intl.DateTimeFormat().resolvedOptions().timeZone>` with `cache: "no-store"`. Use the `isActive` flag pattern from `components/todo-list.tsx` so the effect cleanup drops any response that arrives after a newer request started. Keep three states: loading, ready and failed. Verify with `pnpm lint`, and in the browser network tab check that the request carries the browser's timezone (for example `tz=Europe/Moscow`).
- [ ] 4.2 Render the ready state as a `Card` titled "Completed per day" holding a `ChartContainer` with a fixed height class, and inside it a `BarChart` with one `Bar`, `ChartTooltip` and `ChartTooltipContent`. Build `XAxis` labels as short dates in the viewer's locale: parse `date` as UTC noon and format it with `timeZone: "UTC"`. If a `YAxis` is shown, set `allowDecimals={false}`. Verify in the browser that the chart shows 7 bars, oldest on the left and today on the right, that every day has a label including days at 0, that an all-zero week still shows 7 labeled days and not a placeholder, and that hovering a bar shows its exact count in the tooltip.
- [ ] 4.3 Show a loading state in the card until the first response arrives. On failure, show a short failure message in the card and an error toast that looks like the one from `showError` in `components/todo-list.tsx`. That helper is module-local now, so either export it or pass it in. Verify in the browser by throttling the network to see the loading state, and by blocking `/api/completion-stats` in devtools to see the toast and the failure message.

## 5. Wire into TodoList

- [ ] 5.1 In `components/todo-list.tsx`, keep a `refreshKey` counter and render `<CompletionChart refreshKey={refreshKey} />` below the "Completed" section, including when the list is empty. Increment the counter in `handleToggle` only after the `PATCH` succeeds and `putTask` has run. Leave `app/page.tsx` unchanged. Verify in the browser: checking a task raises today's bar by 1 without a reload and unchecking it brings the bar back; adding, renaming or deleting a task (including "Undo") sends no `/api/completion-stats` request in the network tab; a toggle that fails (block `/api/tasks/*` in devtools) shows the existing error toast and leaves the chart as it was; with the stats request blocked, the chart shows its failure message and toast while you can still add, edit, complete and delete tasks. `pnpm lint` must pass.

## 6. Integration checks

- [ ] 6.1 Run `pnpm lint` and `pnpm build`. Confirm both succeed and that the route summary lists `/api/completion-stats`, `/api/tasks` and `/api/tasks/[id]` as ƒ (dynamic).
- [ ] 6.2 With `pnpm build && pnpm start`, go through the scenarios in `specs/completion-stats/spec.md` and `specs/todo-list/spec.md` in the browser. With an empty list the chart is visible below "Completed" with 7 days at 0. Completing a task and reloading keeps today's count. Deleting a completed task leaves the counts unchanged, with or without "Undo". Restarting the server resets every day to 0. The browser console shows no React or Recharts errors or warnings during the walkthrough.

## Workflow follow-up

- After review, archive the change with `/opsx:archive add-completion-stats-chart`.
