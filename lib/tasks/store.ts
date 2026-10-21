/** A single todo item; `createdAt` is an ISO 8601 timestamp. */
export type Task = { id: string; title: string; done: boolean; createdAt: string };

/** Fields a client may change on an existing task. */
export type TaskPatch = { title?: string; done?: boolean };

/** `globalThis` widened with the task map, so dev hot reload reuses the map instead of resetting it. */
const globalForTasks = globalThis as typeof globalThis & { tasks?: Map<string, Task> };

/** In-memory task storage for a single server process; insertion order equals creation order. */
const tasks: Map<string, Task> = (globalForTasks.tasks ??= new Map<string, Task>());

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

/** Applies the defined fields of `patch` to the task, or returns `undefined` for an unknown id. */
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
  return updated;
};

/** Removes the task; `false` means the id was unknown. */
export const deleteTask = (id: string): boolean => tasks.delete(id);

/** Sort comparator by ISO `createdAt`, later first; equal timestamps compare as 0 so a stable sort keeps their order. */
const compareCreatedAtDescending = (a: Task, b: Task): number =>
  b.createdAt.localeCompare(a.createdAt);
