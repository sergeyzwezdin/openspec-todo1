# Proposal

## Why

The home page shows a shadcn/ui component demo and nothing the user can actually do. This change replaces it with a simple todo list: the user adds, edits, removes and completes tasks, and completed tasks live in their own section.

## What Changes

- Replace the home page (`app/page.tsx`) with a todo list. Remove the demo component `components/component-demo.tsx`.
- Add tasks from an input at the top of the list. Titles are trimmed, must not be empty and are capped at 150 characters.
- Edit a task title inline. Enter saves, Escape cancels. Leaving the field with a changed title opens a dialog that asks whether to save or discard the change. Saving an empty title with Enter reverts to the previous title.
- Mark a task as done with a checkbox. Done tasks move to a separate "Completed" section; unchecking moves them back. Both sections are always shown, with a "No tasks" placeholder when empty.
- Delete a task without a confirmation dialog. The task disappears at once and a toast offers "Undo".
- Store tasks on the server behind a JSON API built with Next.js Route Handlers (`/api/tasks`, `/api/tasks/[id]`). The store is in memory, so tasks survive a page reload but not a server restart.
- Add a checkbox component to `components/ui/` and update the page metadata in `app/layout.tsx`.

Decisions confirmed by the user:

- Maximum title length is 150 characters.
- Both sections list newest tasks first, ordered by creation time.
- Blur while editing never saves on its own. If the title changed, a dialog (the existing shadcn `Dialog`, not `window.confirm`) offers "Save" and "Discard".
- The "Completed" section is always visible and shows "No tasks" when empty. The active section does the same.
- Blur with an unchanged title leaves edit mode without a dialog.
- If the edited title is invalid (empty after trimming or over 150 characters), the dialog's "Save" button is disabled, so only "Discard" is available.
- Closing the dialog with Escape or by clicking the overlay counts as "Discard".
- If saving from the dialog fails on the server, the page shows an error toast and restores the original title.

Out of scope:

- Authentication and multiple users. There is one global list.
- Durable persistence (database, files). Data resets when the server restarts.
- Due dates, priorities, tags.
- Manual reordering.
- Filtering and search.

## Capabilities

### New Capabilities

- `todo-list`: managing a single list of tasks on the home page (create, edit, complete, delete with undo) and the HTTP API that stores them on the server.

### Modified Capabilities

None. `openspec/specs/` has no existing capabilities.

## Impact

- Code: `app/page.tsx`, `app/layout.tsx` (metadata), new `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `lib/tasks/store.ts`, `components/todo-list.tsx`, new `components/ui/checkbox.tsx`. The existing `components/ui/dialog.tsx` is reused for the blur prompt. `components/component-demo.tsx` is deleted.
- API: new endpoints `GET`/`POST /api/tasks` and `PATCH`/`DELETE /api/tasks/[id]`.
- Dependencies: the shadcn checkbox component, which may add a package if the CLI requires one. No database or new runtime service.
- Deployment: the in-memory store only works with a single long-running server process. Serverless or multi-instance deployments would lose or split data.
