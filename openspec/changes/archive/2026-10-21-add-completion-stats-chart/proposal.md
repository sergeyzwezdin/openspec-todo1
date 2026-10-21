# Proposal

## Why

The user can complete tasks but cannot see how many they finish each day. This change adds a chart of daily completions for the last 7 days to the home page.

## What Changes

- Show a daily completions chart on the home page, below the "Completed" section. It updates as soon as a task is checked or unchecked.
- The chart always covers the last 7 days, ending today. Days without completions show 0.
- Count completions from a server-side event log, not from the current `done` flag:
  - Marking a task done (not done → done) records a completion event.
  - Unchecking a done task removes that task's most recent completion event.
  - Deleting a task keeps its events, so history survives deletion.
  - Title edits and `done` updates that don't change the value leave the log as is.
- Group events by the viewer's local calendar day. The browser sends its IANA timezone with the request.
- Add `GET /api/completion-stats?tz=<IANA timezone>`, which returns 7 `{ date, count }` rows.
- Keep the event log in memory, like tasks. There is one shared log, and it resets when the server restarts.
- Build the chart with the shadcn/ui Chart component, which adds Recharts as a dependency.

## Capabilities

### New Capabilities
- `completion-stats`: the completion event log, the daily completion statistics API and the daily completions chart.

### Modified Capabilities
- `todo-list`: the requirement "Home page shows the todo list" now also places the daily completions chart below the "Completed" section.

## Impact

- Code: new route `app/api/completion-stats/route.ts`. `updateTask` in `lib/tasks/store.ts` records or removes events when `done` changes. A new client chart component is rendered by `components/todo-list.tsx`. `components/ui/chart.tsx` is added through the shadcn CLI.
- API: new endpoint `GET /api/completion-stats`. The request and response shapes of `/api/tasks` stay the same.
- Dependencies: `recharts` in `package.json`.
- Deployment: the event log has the same limit as the task store. It needs a single long-running server process and is lost on restart.
