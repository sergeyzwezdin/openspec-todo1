# completion-stats Specification

## Purpose

Shows the user how many tasks they completed on each of the last 7 days, using a server-side log of completion events and a chart on the home page.

## Requirements

### Requirement: Record a completion event
When a task changes from not done to done, the server SHALL record a completion event for that task, timestamped at the moment of the change. An update that leaves `done` unchanged MUST NOT record an event.

#### Scenario: Completing a task adds to today's count
- **WHEN** the user checks an active task
- **THEN** today's completion count increases by 1

#### Scenario: Setting done on an already done task
- **WHEN** a client sets `done` to `true` on a task that is already done
- **THEN** no completion event is recorded

#### Scenario: Title-only edit
- **WHEN** a client changes only the title of a task
- **THEN** no completion event is recorded

#### Scenario: Complete, uncheck and complete again
- **WHEN** the user checks an active task, unchecks it and checks it again on the same day
- **THEN** that task contributes 1 to today's completion count

### Requirement: Unchecking removes the latest completion event
When a task changes from done to not done, the server SHALL remove that task's most recent completion event, even if the event falls outside the 7-day window. Setting `done` to `false` on an active task MUST NOT change the log.

#### Scenario: Uncheck a task completed today
- **WHEN** the user completes a task today and then unchecks it
- **THEN** today's completion count returns to its previous value

#### Scenario: Uncheck a task completed on an earlier day
- **WHEN** a task was completed 2 days ago, is still done, and the user unchecks it today
- **THEN** the count for the day 2 days ago decreases by 1
- **AND** today's count is unchanged

#### Scenario: Uncheck a task completed before the 7-day window
- **WHEN** a task was completed more than 7 days ago, is still done, and the user unchecks it
- **THEN** that task's most recent completion event is removed
- **AND** all 7 daily counts stay the same

#### Scenario: Set not done on an active task
- **WHEN** a client sets `done` to `false` on a task that is not done
- **THEN** the completion log is unchanged

### Requirement: Completion history survives task deletion
Deleting a task SHALL keep its completion events in the log. Undoing a delete MUST NOT change the log.

#### Scenario: Complete then delete
- **WHEN** the user completes a task and then deletes it
- **THEN** the completion still counts toward the day it happened

#### Scenario: Undo a delete
- **WHEN** the user deletes a completed task and clicks "Undo" in the toast
- **THEN** the daily completion counts are the same as before the delete

### Requirement: Server-side completion log storage
Completion events SHALL be stored in the server process memory, in a single log shared by everyone who opens the app. The log SHALL persist across page reloads while the server process keeps running. It is not required to survive a server restart.

#### Scenario: Reload keeps the counts
- **WHEN** the user completes a task and reloads the page
- **THEN** today's completion count still includes that task

#### Scenario: Restart clears the log
- **WHEN** the server process restarts
- **THEN** every daily completion count is 0

### Requirement: Daily completion stats API
`GET /api/completion-stats?tz=<IANA timezone>` SHALL respond 200 with a JSON array of exactly 7 objects `{ "date": "YYYY-MM-DD", "count": <integer> }`, oldest first. The last entry SHALL be today's date in `tz`. Each event SHALL count on the calendar day of its timestamp in `tz`; a day without events SHALL have count 0. The response SHALL reflect the log at request time.

#### Scenario: No completions
- **WHEN** the log has no events in the last 7 days and a client sends `GET /api/completion-stats?tz=UTC`
- **THEN** the server responds 200 with 7 entries, each with `count` 0
- **AND** the dates are 7 consecutive days ending with today's date in UTC

#### Scenario: Day depends on the timezone
- **WHEN** the log has one event at `2026-10-20T22:30:00Z`
- **THEN** with `tz=Europe/Moscow` (UTC+3) the event counts on `"2026-10-21"`
- **AND** with `tz=UTC` the event counts on `"2026-10-20"`

#### Scenario: Older events are excluded
- **WHEN** the log has an event older than the earliest date in the response
- **THEN** that event is not counted on any day

#### Scenario: Missing timezone
- **WHEN** a client sends `GET /api/completion-stats` without `tz`
- **THEN** the server responds 400

#### Scenario: Unknown timezone
- **WHEN** a client sends `GET /api/completion-stats?tz=Mars/Base`
- **THEN** the server responds 400

### Requirement: Daily completions chart
The home page SHALL show a bar chart of completions for the last 7 days, one bar per day, from the oldest on the left to today on the right. Each day SHALL be labeled with a short date in the viewer's locale, and the exact count for each day SHALL be readable. The chart SHALL request stats in the browser's timezone and SHALL show a loading state until they load.

#### Scenario: Chart shows the last 7 days
- **WHEN** the stats load
- **THEN** the chart shows 7 bars, ending with today on the right
- **AND** each bar is labeled with a short date in the viewer's locale

#### Scenario: Exact count on hover or focus
- **WHEN** the user hovers over or focuses a day's bar
- **THEN** a tooltip shows that day's exact completion count

#### Scenario: Day without completions
- **WHEN** a day has a count of 0
- **THEN** that day's bar is empty and the day is still labeled

#### Scenario: No completions at all
- **WHEN** all 7 days have a count of 0
- **THEN** the chart shows all 7 days at 0 instead of a placeholder

#### Scenario: Loading state
- **WHEN** the home page opens and the stats have not loaded yet
- **THEN** the chart area shows a loading state

#### Scenario: Browser timezone is used
- **WHEN** the browser's timezone is Europe/Moscow
- **THEN** the chart requests stats with `tz=Europe/Moscow`

### Requirement: Chart updates after done changes
After the server confirms that a task changed between done and not done, the chart SHALL reload the stats and show the new counts without a page reload. Adding, renaming or deleting a task is not required to update the chart.

#### Scenario: Check a task
- **WHEN** the user checks an active task and the server confirms the change
- **THEN** today's bar increases by 1 without a page reload

#### Scenario: Uncheck the task again
- **WHEN** the user then unchecks the same task and the server confirms the change
- **THEN** today's bar returns to its previous value

### Requirement: Stats error feedback
If loading the stats fails, the page SHALL show an error toast, and the chart area SHALL show a failure message instead of the chart. The todo list SHALL keep working.

#### Scenario: Failed stats load
- **WHEN** the home page cannot load the completion stats
- **THEN** an error toast appears
- **AND** the chart area shows a failure message instead of the chart
- **AND** the user can still add, edit, complete and delete tasks

#### Scenario: Failed toggle
- **WHEN** the user checks or unchecks a task and the server rejects the request
- **THEN** the chart stays unchanged
