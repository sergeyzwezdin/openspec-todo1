## MODIFIED Requirements

### Requirement: Home page shows the todo list
The home page SHALL show the todo list: an input for new tasks, a section of active tasks and a "Completed" section. Both sections SHALL always be visible; a section with no tasks SHALL show a "No tasks" placeholder. Until the task list has loaded from the server, the page SHALL show a loading state. Below the "Completed" section the page SHALL show the daily completions chart, which SHALL always be visible and shows its own loading state.

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

#### Scenario: Chart below the Completed section
- **WHEN** the home page loads
- **THEN** the daily completions chart appears below the "Completed" section
- **AND** it appears also when the task list is empty
