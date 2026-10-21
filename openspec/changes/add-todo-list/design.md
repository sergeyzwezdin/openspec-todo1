# Design

## Context

See `proposal.md` for motivation and `specs/todo-list/spec.md` for behavior.

Current state that shapes the approach:

- Next.js 16.4.2, React 19.3, TypeScript, Tailwind v4, pnpm. `next.config.ts` enables `cacheComponents`, `partialPrefetching` and `reactCompiler`.
- shadcn/ui is built on `@base-ui/react` (`components.json` style `base-nova`). `components/ui/` has button, card, dialog, dropdown-menu, input, label and sonner. It has no checkbox.
- `app/layout.tsx` already mounts the sonner `<Toaster />`.
- `app/page.tsx` renders `<ComponentDemo />` from `components/component-demo.tsx`. Components are arrow functions with an explicit `ReactElement` return type and a one-line JSDoc.
- The project has no tests or test framework. `pnpm lint` and `pnpm build` are the available checks.
- Project `AGENTS.md` requires reading the bundled docs in `node_modules/next/dist/docs/` before writing code, because this Next.js version differs from older ones.

## Goals / Non-Goals

**Goals:**

- A small JSON API (Route Handlers) that the browser calls for every read and write. Next.js acts as the BFF.
- A single client component that owns the list state and talks to that API.
- `GET /api/tasks` must run on every request, not be frozen at build time.

**Non-Goals:**

- Server-side rendering of the task list. The page stays a static shell and loads tasks in the browser.
- Optimistic concurrency or conflict handling between two open tabs. The last write wins.
- Automated tests. The project has no test setup and this change does not add one.

## Decisions

### API shape: Route Handlers

- `app/api/tasks/route.ts`: `GET` returns all tasks; `POST` creates a task from `{ title }` and returns it (201).
- `app/api/tasks/[id]/route.ts`: `PATCH` updates `title` and/or `done` and returns the task; `DELETE` removes the task (204).
- All bodies are JSON. Invalid input (bad JSON, missing or wrong-type fields, title empty after trim or over 150 characters) returns 400 with `{ error }`. An unknown id returns 404.
- Title validation lives in one shared function in `lib/tasks/` so POST, PATCH and the client use the same rules.

Alternatives considered:

- Server Actions. Rejected: the user asked for a BFF with Route Handlers.
- `localStorage` in the browser. Rejected: the user wants tasks stored on the server.

### `GET` must be dynamic under Cache Components

With Cache Components on, a `GET` Route Handler that reads no uncached or runtime data is prerendered at build time (`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, section "With Cache Components"). Reading a module-level variable does not count as runtime data, so the handler would return the build-time list forever. The handler calls `await connection()` from `next/server` before reading the store, which makes it run at request time. `POST`, `PATCH` and `DELETE` are never cached and need nothing extra.

`pnpm build` output must show `/api/tasks` as dynamic. That check is in `tasks.md`.

### Dynamic params are a Promise

In this version the second argument of a Route Handler carries `params` as a Promise. The `[id]` handlers type it with the global `RouteContext<'/api/tasks/[id]'>` helper (no import needed after type generation) and read the id with `const { id } = await ctx.params` (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`).

### In-memory store on `globalThis`

`lib/tasks/store.ts` exports the `Task` type and functions to list, create, update and delete tasks.

```ts
type Task = { id: string; title: string; done: boolean; createdAt: string };
```

- `id` comes from `crypto.randomUUID()`; `createdAt` is an ISO 8601 string.
- The tasks live in a `Map<string, Task>` stored on `globalThis`. Without that, dev hot reload re-evaluates the module and wipes the list.
- The store returns tasks sorted by `createdAt` descending. The client splits them into active and completed, so both sections are newest first.

Limitations, accepted for this change:

- Data resets when the server process restarts.
- Several server instances, or serverless functions, each get their own copy of the list. The store only behaves correctly on one long-running process (`pnpm dev` or `pnpm start`).
- There is one global list with no users and no auth.

Alternative considered: SQLite or a JSON file. Rejected: the user chose an in-memory store, and either would add a dependency or file I/O.

### Client component owns the list

`components/todo-list.tsx` is a `"use client"` component rendered by `app/page.tsx`. It may split one row into `components/todo-item.tsx`.

- On mount it fetches `GET /api/tasks` and shows a loading state until the response arrives. The page itself stays a static shell, which fits Cache Components and partial prefetching.
- Every mutation calls the API and then updates local state from the response body. The UI does not apply changes before the server confirms them, except for delete (below).
- If a request fails, the component shows an error toast (`sonner`) and leaves, or puts back, the state it had before the action.
- The add form trims the title and disables submit while the trimmed value is empty. The input sets `maxLength={150}`. The server checks the same rules again.
- Inline edit: clicking the title or the edit button swaps it for an input. Enter saves and Escape cancels, both without a prompt. A trimmed empty value on Enter cancels instead of saving. If the trimmed value equals the current title, no request is sent. Blur is handled separately (next section).
- Both sections always render. A section with no tasks shows a "No tasks" placeholder, so the active and completed sections behave the same way.

### Blur prompt with the shadcn `Dialog`

Blur never saves on its own. The edit row handles it like this:

- Title unchanged (trimmed value equals the current title): leave edit mode silently, no dialog.
- Title changed: keep the edited value and open a `Dialog` from `components/ui/dialog.tsx` with "Save" and "Discard". "Save" sends `PATCH { title }` and leaves edit mode once it succeeds. "Discard" restores the original title and leaves edit mode without a request.
- Edited title invalid (empty after trim or over 150 characters): the dialog opens with "Save" disabled, so "Discard" is the only way out.
- Closing the dialog with Escape or an overlay click goes through `onOpenChange(false)` and runs the Discard path.
- Escape in the input sets a flag before the input unmounts, and the blur handler checks it, so Escape never opens the dialog.

The dialog takes focus when it opens, which blurs the input again. The handler must ignore blur while the dialog is open, or it would reopen the prompt. Native `window.confirm` was rejected: the user ruled it out, and it blocks the main thread and cannot match the app's styling.

### Delete with deferred request and undo toast

On delete the client removes the task from local state and shows a sonner toast with an "Undo" action. The `DELETE` request goes out only when the toast closes without undo (sonner `onAutoClose` / `onDismiss`). "Undo" puts the task back in local state and sends no request; the list order comes from `createdAt`, so the task returns to its old position. If the deferred `DELETE` fails, the client puts the task back and shows an error toast.

If the user leaves the page while the toast is open, the request never fires and the task stays on the server. That is the safe way to fail: nothing gets lost by accident.

Alternative considered: delete on the server immediately and add a restore endpoint for undo. Rejected: it adds API surface and has to recreate the task with its original id and `createdAt`.

### Checkbox component

Add the shadcn checkbox with `pnpm dlx shadcn@latest add checkbox`, which writes `components/ui/checkbox.tsx` in the project's `base-nova` style. The implementer should confirm the CLI version matches `components.json` and that the generated file imports from `@base-ui/react`, not Radix.

### Home page and metadata

`app/page.tsx` renders the todo list in place of `<ComponentDemo />`. `components/component-demo.tsx` is deleted. `app/layout.tsx` metadata changes from `"openspec-project"` / `"Next.js + shadcn/ui demo"` to a title and description for the todo app.

### Confirmed by the user

- Title limit: 150 characters.
- Ordering: newest first by `createdAt` in both sections. Completing a task does not move it to the top of "Completed".
- Blur never auto-saves; a changed title triggers the Save/Discard dialog.
- Both sections are always visible, with a "No tasks" placeholder when empty.
- Blur with an unchanged title exits edit mode with no dialog.
- An invalid edited title disables "Save" in the dialog.
- Escape or an overlay click on the dialog counts as "Discard".
- A failed "Save" PATCH from the dialog closes the dialog, shows an error toast and restores the original title.

## Risks / Trade-offs

- [The `GET` handler gets prerendered and serves a stale list] → `await connection()` in the handler, and check the route type in the `pnpm build` output.
- [Data lost on restart or split across instances] → Accepted and stated in the proposal. Moving to a database later only replaces `lib/tasks/store.ts`.
- [Two tabs overwrite each other's changes] → Accepted, last write wins. Reloading shows the server state.
- [A deferred delete never fires because the tab closed] → Accepted. The task stays, which is safer than losing it.
- [The shadcn CLI generates a Radix-based checkbox or adds an unexpected package] → Review the generated file and the `package.json` diff before committing.
- [Blur fires after Escape and opens the save prompt for a cancelled edit] → Escape sets a flag that the blur handler checks.
- [The dialog taking focus fires another blur and reopens the prompt] → The blur handler does nothing while the dialog is open.
- [A failed "Save" PATCH leaves the user stuck in the dialog] → On failure, show an error toast, close the dialog and restore the original title, the same as any other failed request.

## Migration Plan

No data migration. The change replaces the demo home page. Rollback is a revert of the commit.
