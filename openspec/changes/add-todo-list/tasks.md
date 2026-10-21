# Tasks

The project has no test framework, and this change does not add one (see `design.md`, Non-Goals). Each task is verified with `pnpm lint`, `pnpm build`, `curl` against `pnpm dev`, or a manual check in the browser.

## 1. Setup

- [ ] 1.1 Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` (section "With Cache Components") and `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (`RouteContext`, async `params`), as project `AGENTS.md` requires. Done when the `connection()` and `RouteContext` usage in groups 3 and 4 matches these docs.
- [ ] 1.2 Add the checkbox component with `pnpm dlx shadcn@latest add checkbox`, after confirming the CLI works with `components.json` (style `base-nova`). Verify that `components/ui/checkbox.tsx` exists, imports from `@base-ui/react` (not Radix), any `package.json` change is expected, and `pnpm lint` passes.

## 2. Task store

- [ ] 2.1 Create `lib/tasks/store.ts` with the `Task` type `{ id: string; title: string; done: boolean; createdAt: string }` and `listTasks`, `createTask`, `updateTask`, `deleteTask`. Keep the `Map` on `globalThis` so dev hot reload does not reset it. Use `crypto.randomUUID()` for `id`, ISO 8601 for `createdAt`, and return the list sorted by `createdAt`, newest first. Verify with `pnpm lint` and by type-checking through `pnpm build`.
- [ ] 2.2 Add one shared title validator in `lib/tasks/` (trim, non-empty, at most 150 characters) that the API and the client both import. Verify with `pnpm lint`.

## 3. Collection route `/api/tasks`

- [ ] 3.1 Create `app/api/tasks/route.ts` with `GET`, which calls `await connection()` from `next/server` first and then returns `Response.json(listTasks())`. Verify that `curl -s localhost:3000/api/tasks` returns `[]` on a fresh `pnpm dev`.
- [ ] 3.2 Add `POST` to `app/api/tasks/route.ts`: parse `{ title }`, validate it, create the task, return it with 201. Return 400 with `{ error }` for bad JSON or an invalid title. Verify with `curl -X POST -H 'Content-Type: application/json' -d '{"title":"Buy milk"}'` (201, `done: false`), then with `-d '{"title":"   "}'` and a 151-character title (both 400), and confirm that a following `GET` includes the created task.

## 4. Item route `/api/tasks/[id]`

- [ ] 4.1 Create `app/api/tasks/[id]/route.ts` with `PATCH`, typed `ctx: RouteContext<'/api/tasks/[id]'>` and reading `const { id } = await ctx.params`. Accept `title` and/or `done`. Return 400 when neither is present, `done` is not a boolean or the title is invalid; 404 for an unknown id; the updated task otherwise. Verify each case with `curl -X PATCH`.
- [ ] 4.2 Add `DELETE` to `app/api/tasks/[id]/route.ts`: 204 on success, 404 for an unknown id. Verify with `curl -X DELETE` on an existing id (204, gone from `GET`) and on a random UUID (404).

## 5. Todo list UI

- [ ] 5.1 Create `components/todo-list.tsx` (`"use client"`, arrow function, `ReactElement` return type, one-line JSDoc). Fetch `GET /api/tasks` on mount and show a loading state until it responds; on failure show an error toast. Split tasks into active and completed, keep newest first, and always render both sections, each showing a "No tasks" placeholder when it has no tasks. Verify in the browser against the spec scenarios "Page loads tasks from the server", "Empty list", "No completed tasks" and "All tasks completed".
- [ ] 5.2 Add the new-task form to `components/todo-list.tsx` using `components/ui/input.tsx` and `components/ui/button.tsx`: trim the title, disable submit while it is empty, set `maxLength={150}`, call `POST /api/tasks`, put the returned task at the top of the active list and clear the input. Verify the "Add a task" scenarios in the browser.
- [ ] 5.3 Create `components/todo-item.tsx` for one row: checkbox (`components/ui/checkbox.tsx`), title, edit and delete buttons with `lucide-react` icons. Checking or unchecking calls `PATCH { done }` and moves the task between sections using the server response. Verify the "Mark a task as done or not done" scenarios, and confirm that a failed request (stop `pnpm dev` and click) shows an error toast and leaves the task where it was.
- [ ] 5.4 Add inline edit to `components/todo-item.tsx`: clicking the title or the edit button opens an input; Enter saves through `PATCH { title }`; Escape cancels without a request or prompt and sets a flag so the blur that follows is ignored. An empty trimmed title on Enter reverts, and an unchanged title sends no request. Verify the "Edit a task title inline" scenarios in the browser, checking the network tab for the no-request cases.
- [ ] 5.5 Add the blur prompt to `components/todo-item.tsx` using `components/ui/dialog.tsx` (never `window.confirm`). On blur with an unchanged title, leave edit mode silently. On blur with a changed title, open the dialog with "Save" (sends `PATCH { title }`, leaves edit mode) and "Discard" (restores the original title, leaves edit mode). Disable "Save" when the edited title is empty after trimming or over 150 characters. Treat Escape or an overlay click on the dialog as "Discard", and ignore blur events while the dialog is open. If the "Save" request fails, show an error toast and restore the original title. Verify the "Confirm unsaved edit on blur" scenarios in the browser, checking the network tab for the "Discard" and unchanged-title cases.
- [ ] 5.6 Add delete with undo in `components/todo-list.tsx`: remove the task from local state, show a sonner toast with an "Undo" action, and send `DELETE` only from the toast's auto-close/dismiss callback when undo was not clicked. "Undo" restores the task without a request. If the deferred `DELETE` fails, restore the task and show an error toast. Verify the "Delete a task with undo" scenarios: after the toast closes the task stays gone after reload, and after "Undo" it is still in `GET /api/tasks`.

## 6. Home page and cleanup

- [ ] 6.1 Update `app/page.tsx` to render `<TodoList />` in place of `<ComponentDemo />`, keeping the existing component style. Verify that `/` shows the todo list.
- [ ] 6.2 Delete `components/component-demo.tsx`. Verify that `grep -r component-demo app components lib` finds nothing and `pnpm lint` passes.
- [ ] 6.3 Update `metadata` in `app/layout.tsx` to a todo-app title and description, replacing `"openspec-project"` and `"Next.js + shadcn/ui demo"`. Verify the browser tab title.

## 7. Integration checks

- [ ] 7.1 Run `pnpm lint` and confirm it reports no errors.
- [ ] 7.2 Run `pnpm build` and confirm it succeeds and that the route summary marks `/api/tasks` and `/api/tasks/[id]` as dynamic, not prerendered.
- [ ] 7.3 With `pnpm build && pnpm start`, add a task, reload the page and confirm the task is still there ("Reload keeps tasks"). Restart the server and confirm the list is empty ("Restart clears tasks").
- [ ] 7.4 Under `pnpm dev`, go through every scenario in `specs/todo-list/spec.md` once more in the browser and with `curl`, and confirm each one behaves as written.
