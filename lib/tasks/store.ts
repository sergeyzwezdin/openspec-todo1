/** A single todo item; `createdAt` is an ISO 8601 timestamp. */
export type Task = { id: string; title: string; done: boolean; createdAt: string };

/** Fields a client may change on an existing task. */
export type TaskPatch = { title?: string; done?: boolean };

/** One not done → done transition of a task; `completedAt` is an ISO 8601 timestamp. */
export type CompletionEvent = { taskId: string; completedAt: string };

/** `globalThis` widened with the task map and event log, so dev hot reload reuses them instead of resetting them. */
const globalForTasks = globalThis as typeof globalThis & {
  tasks?: Map<string, Task>;
  completionEvents?: CompletionEvent[];
};

/** In-memory task storage for a single server process; insertion order equals creation order. */
const tasks: Map<string, Task> = (globalForTasks.tasks ??= new Map<string, Task>());

/** In-memory completion log in recording order; only this module writes to it. */
const completionEvents: CompletionEvent[] = (globalForTasks.completionEvents ??= []);

/** All tasks, newest `createdAt` first; tasks created in the same millisecond keep newest-inserted first. */
export const listTasks = (): Task[] =>
  Array.from(tasks.values())
    .reverse()
    .sort((a, b) => compareCreatedAtDescending(a, b));

/** Stores a new active task with the given (already validated) title. */
export const createTask = (title: string): Task => {
  const task: Task = {
    id: crypto.randomUUID(),
    title,
    done: false,
    createdAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);
  return task;
};

/** Applies the defined fields of `patch` to the task and records a `done` change in the completion log, or returns `undefined` for an unknown id. */
export const updateTask = (id: string, patch: TaskPatch): Task | undefined => {
  const current = tasks.get(id);
  if (!current) {
    return undefined;
  }
  const updated: Task = {
    ...current,
    title: patch.title ?? current.title,
    done: patch.done ?? current.done,
  };
  tasks.set(id, updated);
  recordDoneChange(id, current.done, updated.done);
  return updated;
};

/** Removes the task but keeps its completion events; `false` means the id was unknown. */
export const deleteTask = (id: string): boolean => tasks.delete(id);

/** A read-only view of the completion log, oldest event first. */
export const listCompletionEvents = (): readonly CompletionEvent[] => completionEvents;

/** Sort comparator by ISO `createdAt`, later first; equal timestamps compare as 0 so a stable sort keeps their order. */
const compareCreatedAtDescending = (a: Task, b: Task): number =>
  b.createdAt.localeCompare(a.createdAt);

/** Pushes an event on not done → done, drops the task's latest event on done → not done, and ignores unchanged `done`. */
const recordDoneChange = (taskId: string, wasDone: boolean, isDone: boolean): void => {
  if (!wasDone && isDone) {
    completionEvents.push({ taskId, completedAt: new Date().toISOString() });
    return;
  }
  if (wasDone && !isDone) {
    const index = completionEvents.findLastIndex((event) => event.taskId === taskId);
    if (index !== -1) {
      completionEvents.splice(index, 1);
    }
  }
};
