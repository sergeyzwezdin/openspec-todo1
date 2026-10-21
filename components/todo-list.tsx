"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { toast } from "sonner";

import { TodoItem, type TodoItemHandlers } from "@/components/todo-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Task, TaskPatch } from "@/lib/tasks/store";
import { MAX_TITLE_LENGTH, validateTitle } from "@/lib/tasks/validate-title";

type LoadStatus = "loading" | "ready" | "failed";

/** Todo list backed by the `/api/tasks` API: add, edit, complete and delete tasks with undo. */
export const TodoList = (): ReactElement => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [draft, setDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const draftValidation = validateTitle(draft);

  useEffect(() => {
    let isActive = true;
    fetchTasks()
      .then((loaded) => {
        if (!isActive) return;
        setTasks(sortNewestFirst(loaded));
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setStatus("failed");
        showError("Could not load tasks", error);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const putTask = (task: Task): void => {
    setTasks((current) => sortNewestFirst([task, ...current.filter(({ id }) => id !== task.id)]));
  };

  const handleAdd = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!draftValidation.ok || isAdding) return;
    setIsAdding(true);
    try {
      putTask(await createTask(draftValidation.title));
      setDraft("");
    } catch (error) {
      showError("Could not add the task", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (task: Task, done: boolean): Promise<void> => {
    try {
      putTask(await updateTask(task.id, { done }));
    } catch (error) {
      showError("Could not update the task", error);
    }
  };

  const handleRename = async (task: Task, title: string): Promise<void> => {
    try {
      putTask(await updateTask(task.id, { title }));
    } catch (error) {
      showError("Could not rename the task", error);
    }
  };

  // The DELETE request is deferred until the undo toast closes without "Undo".
  const handleDelete = (task: Task): void => {
    setTasks((current) => current.filter(({ id }) => id !== task.id));
    let isSettled = false;
    const commitDelete = (): void => {
      if (isSettled) return;
      isSettled = true;
      deleteTask(task.id).catch((error: unknown) => {
        putTask(task);
        showError("Could not delete the task", error);
      });
    };
    const undoDelete = (): void => {
      if (isSettled) return;
      isSettled = true;
      putTask(task);
    };
    toast(`Deleted "${task.title}"`, {
      action: { label: "Undo", onClick: undoDelete },
      onAutoClose: commitDelete,
      onDismiss: commitDelete,
    });
  };

  const handlers: TodoItemHandlers = {
    onToggle: (task, done) => void handleToggle(task, done),
    onRename: handleRename,
    onDelete: handleDelete,
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {status === "loading" && <p className="text-sm text-muted-foreground">Loading tasks…</p>}
        {status === "failed" && <p className="text-sm text-muted-foreground">Tasks could not be loaded.</p>}
        {status === "ready" && (
          <>
            <form onSubmit={(event) => void handleAdd(event)} className="flex gap-2">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={MAX_TITLE_LENGTH}
                placeholder="What needs to be done?"
                aria-label="New task title"
              />
              <Button type="submit" disabled={!draftValidation.ok || isAdding}>
                Add
              </Button>
            </form>
            <TaskSection title="Active" tasks={tasks.filter(({ done }) => !done)} handlers={handlers} />
            <TaskSection title="Completed" tasks={tasks.filter(({ done }) => done)} handlers={handlers} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

type TaskSectionProps = {
  title: string;
  tasks: Task[];
  handlers: TodoItemHandlers;
};

/** Titled group of task rows, with a "No tasks" placeholder when empty. */
const TaskSection = ({ title, tasks, handlers }: TaskSectionProps): ReactElement => (
  <section className="flex flex-col gap-2">
    <h2 className="text-sm font-medium">{title}</h2>
    {tasks.length === 0 ? (
      <p className="text-sm text-muted-foreground">No tasks</p>
    ) : (
      <ul className="flex flex-col">
        {tasks.map((task) => (
          <TodoItem key={task.id} task={task} {...handlers} />
        ))}
      </ul>
    )}
  </section>
);

/** Orders tasks newest first by creation time, the order both sections use. */
const sortNewestFirst = (tasks: Task[]): Task[] =>
  [...tasks].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

/** Shows an error toast with the server's error message, when there is one, as its description. */
const showError = (message: string, error: unknown): void => {
  toast.error(message, { description: error instanceof Error ? error.message : undefined });
};

/** Loads all tasks from the server. */
const fetchTasks = async (): Promise<Task[]> => {
  const body = await requestJson("/api/tasks", { cache: "no-store" });
  if (!Array.isArray(body) || !body.every(isTask)) throw new Error("Unexpected response from the server");
  return body;
};

/** Creates a task and returns it as stored on the server. */
const createTask = async (title: string): Promise<Task> =>
  requestTask("/api/tasks", createJsonInit("POST", { title }));

/** Updates a task's title and/or done state and returns the updated task. */
const updateTask = async (id: string, changes: TaskPatch): Promise<Task> =>
  requestTask(`/api/tasks/${encodeURIComponent(id)}`, createJsonInit("PATCH", changes));

/** Removes a task from the server. */
const deleteTask = async (id: string): Promise<void> => {
  await sendRequest(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
};

/** Sends a request whose response body must be a task. */
const requestTask = async (url: string, init: RequestInit): Promise<Task> => {
  const body = await requestJson(url, init);
  if (!isTask(body)) throw new Error("Unexpected response from the server");
  return body;
};

/** Sends a request and parses its JSON response body. */
const requestJson = async (url: string, init: RequestInit): Promise<unknown> => {
  const response = await sendRequest(url, init);
  const body: unknown = await response.json();
  return body;
};

/** Sends a request and throws with the server's `{ error }` message on a non-2xx status. */
const sendRequest = async (url: string, init: RequestInit): Promise<Response> => {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return response;
};

/** Reads the `{ error }` message of a failed response, falling back to the status code. */
const readErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `Request failed with status ${response.status}`;
  const body: unknown = await response.json().catch(() => undefined);
  if (typeof body !== "object" || body === null || !("error" in body)) return fallback;
  return typeof body.error === "string" ? body.error : fallback;
};

/** Builds a request with a JSON body. */
const createJsonInit = (method: "POST" | "PATCH", body: object): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Checks that a parsed response body has the shape of a task. */
const isTask = (value: unknown): value is Task =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "title" in value &&
  typeof value.title === "string" &&
  "done" in value &&
  typeof value.done === "boolean" &&
  "createdAt" in value &&
  typeof value.createdAt === "string";
