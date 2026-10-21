# todo-list Specification

## Purpose

Lets a user keep a single list of tasks on the home page: add, edit, complete and delete tasks, with the list stored on the server so it survives page reloads.

## Requirements

### Requirement: Home page shows the todo list
The home page SHALL show the todo list: an input for new tasks, a section of active tasks and a "Completed" section. Both sections SHALL always be visible; a section with no tasks SHALL show a "No tasks" placeholder. Until the task list has loaded from the server, the page SHALL show a loading state.

#### Scenario: Page loads tasks from the server
- **WHEN** the user opens the home page
- **THEN** the page shows a loading state
- **AND** once the server responds, the page shows the stored tasks split into active and completed

#### Scenario: Empty list
- **WHEN** the home page loads and the server has no tasks
- **THEN** the active section and the "Completed" section are both visible
- **AND** each shows the "No tasks" placeholder

#### Scenario: No completed tasks
- **WHEN** at least one task exists and none of them is done
- **THEN** the "Completed" section is visible and shows the "No tasks" placeholder

#### Scenario: All tasks completed
- **WHEN** at least one task exists and all of them are done
- **THEN** the active section is visible and shows the "No tasks" placeholder

### Requirement: Task ordering
Active tasks and completed tasks SHALL each be listed newest first, by task creation time.

#### Scenario: Newer task listed above older one
- **WHEN** task "A" was created before task "B" and both are active
- **THEN** "B" appears above "A" in the active list

#### Scenario: Completed tasks keep creation order
- **WHEN** tasks "A" (older) and "B" (newer) are both done
- **THEN** "B" appears above "A" in the "Completed" section, regardless of which was completed first

### Requirement: Add a task
The user SHALL be able to add a task by typing a title and submitting it. The title SHALL be trimmed of surrounding whitespace, MUST NOT be empty after trimming and MUST NOT exceed 150 characters. A new task SHALL be active (not done).

#### Scenario: Add a valid task
- **WHEN** the user types "Buy milk" and submits
- **THEN** a task titled "Buy milk" appears at the top of the active list
- **AND** the input is cleared

#### Scenario: Surrounding whitespace is trimmed
- **WHEN** the user submits "  Buy milk  "
- **THEN** the new task's title is "Buy milk"

#### Scenario: Whitespace-only title cannot be submitted
- **WHEN** the input is empty or contains only whitespace
- **THEN** the submit control is disabled and no task is created

#### Scenario: Title longer than 150 characters
- **WHEN** the user tries to enter a title longer than 150 characters
- **THEN** no task with more than 150 characters is created

### Requirement: Edit a task title inline
The user SHALL be able to edit a task title in place, without leaving the list. Editing starts when the user clicks the title or its edit button. Enter SHALL save the edit; Escape SHALL cancel it without a prompt. The same title rules as for adding apply.

#### Scenario: Save with Enter
- **WHEN** the user edits a task title to "Buy oat milk" and presses Enter
- **THEN** the task shows "Buy oat milk" and leaves edit mode
- **AND** the new title is stored on the server

#### Scenario: Cancel with Escape
- **WHEN** the user changes a task title and presses Escape
- **THEN** the task shows its original title and leaves edit mode
- **AND** no save prompt is shown and nothing is sent to the server

#### Scenario: Empty title reverts
- **WHEN** the user clears the title, or leaves only whitespace, and presses Enter
- **THEN** the task keeps its original title and leaves edit mode

### Requirement: Confirm unsaved edit on blur
Moving focus out of the title field SHALL NOT save the edit by itself. If the title changed, the page SHALL show an in-page dialog, not a native browser prompt, with "Save" and "Discard" actions. "Save" SHALL save the edit and leave edit mode; "Discard" SHALL restore the original title and leave edit mode. Closing the dialog any other way SHALL count as "Discard".

#### Scenario: Blur with changes shows the prompt
- **WHEN** the user changes a task title and moves focus out of the field
- **THEN** a dialog asks whether to save the change, offering "Save" and "Discard"
- **AND** nothing is sent to the server yet

#### Scenario: Save from the prompt
- **WHEN** the save prompt is open and the user clicks "Save"
- **THEN** the task shows the new title and leaves edit mode
- **AND** the new title is stored on the server

#### Scenario: Discard from the prompt
- **WHEN** the save prompt is open and the user clicks "Discard"
- **THEN** the task shows its original title and leaves edit mode
- **AND** nothing is sent to the server

#### Scenario: Close the prompt without choosing
- **WHEN** the save prompt is open and the user presses Escape or clicks outside the dialog
- **THEN** the edit is discarded as with "Discard"

#### Scenario: Invalid title in the prompt
- **WHEN** the save prompt opens for a title that is empty after trimming or longer than 150 characters
- **THEN** the "Save" action is disabled and only "Discard" is available

#### Scenario: Blur without changes
- **WHEN** the user opens edit mode, leaves the title unchanged and moves focus out of the field
- **THEN** the task leaves edit mode with no prompt and nothing is sent to the server

### Requirement: Mark a task as done or not done
Each task SHALL have a checkbox. Checking it SHALL mark the task done and move it to the "Completed" section. Unchecking a completed task SHALL mark it not done and move it back to the active list.

#### Scenario: Complete a task
- **WHEN** the user checks the checkbox of an active task
- **THEN** the task moves to the "Completed" section, shown as checked
- **AND** the done state is stored on the server

#### Scenario: Reopen a completed task
- **WHEN** the user unchecks a task in the "Completed" section
- **THEN** the task moves back to the active list in its creation-order position

### Requirement: Delete a task with undo
The user SHALL be able to delete a task without a confirmation dialog. The task SHALL disappear from the list immediately, and a toast SHALL offer an "Undo" action. The task SHALL be removed from the server only if the toast closes without "Undo".

#### Scenario: Delete and let the toast close
- **WHEN** the user deletes a task and the toast closes without "Undo"
- **THEN** the task is removed from the server
- **AND** it does not reappear after a page reload

#### Scenario: Undo a delete
- **WHEN** the user deletes a task and clicks "Undo" in the toast
- **THEN** the task reappears in its previous section and position
- **AND** the task is still stored on the server

### Requirement: Error feedback
When a request to the server fails, the page SHALL show an error toast and SHALL keep showing the list as it was before the failed action.

#### Scenario: Failed update
- **WHEN** the user completes a task and the server request fails
- **THEN** an error toast appears
- **AND** the task stays in the section it was in before the action

#### Scenario: Failed initial load
- **WHEN** the home page cannot load the task list
- **THEN** an error toast appears instead of a list of tasks

### Requirement: Server-side task storage
Tasks SHALL be stored on the server in a single list shared by everyone who opens the app. The list SHALL persist across page reloads while the server process keeps running. It is not required to survive a server restart.

#### Scenario: Reload keeps tasks
- **WHEN** the user adds a task and reloads the page
- **THEN** the task is still in the list

#### Scenario: Restart clears tasks
- **WHEN** the server process restarts
- **THEN** the task list is empty

### Requirement: Task API
The server SHALL expose a JSON API under `/api/tasks`. Each task SHALL have `id`, `title`, `done` and `createdAt` fields. `GET /api/tasks` lists tasks, `POST /api/tasks` creates one from `{ "title" }`, `PATCH /api/tasks/{id}` updates `title` and/or `done`, and `DELETE /api/tasks/{id}` removes one.

#### Scenario: List tasks
- **WHEN** a client sends `GET /api/tasks`
- **THEN** the server responds 200 with a JSON array of all current tasks

#### Scenario: List reflects changes at request time
- **WHEN** a task is created and a client then sends `GET /api/tasks`
- **THEN** the response includes the new task

#### Scenario: Create a task
- **WHEN** a client sends `POST /api/tasks` with `{ "title": "Buy milk" }`
- **THEN** the server responds with the created task as JSON, with `done` set to `false`

#### Scenario: Create with invalid title
- **WHEN** a client sends `POST /api/tasks` with a missing, non-string, whitespace-only or longer-than-150-character title
- **THEN** the server responds 400 and creates no task

#### Scenario: Update a task
- **WHEN** a client sends `PATCH /api/tasks/{id}` with `{ "done": true }` for an existing task
- **THEN** the server responds with the updated task as JSON

#### Scenario: Update with invalid body
- **WHEN** a client sends `PATCH /api/tasks/{id}` with neither `title` nor `done`, a non-boolean `done`, or a title that breaks the title rules
- **THEN** the server responds 400 and the task is unchanged

#### Scenario: Update unknown task
- **WHEN** a client sends `PATCH /api/tasks/{id}` for an id that does not exist
- **THEN** the server responds 404

#### Scenario: Delete a task
- **WHEN** a client sends `DELETE /api/tasks/{id}` for an existing task
- **THEN** the server removes the task and responds with a success status

#### Scenario: Delete unknown task
- **WHEN** a client sends `DELETE /api/tasks/{id}` for an id that does not exist
- **THEN** the server responds 404
