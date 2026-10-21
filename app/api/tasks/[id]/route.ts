import { readJsonObject } from "@/lib/tasks/read-json-object";
import { deleteTask, updateTask, type TaskPatch } from "@/lib/tasks/store";
import { validateTitle } from "@/lib/tasks/validate-title";

/** Updates `title` and/or `done`; 400 `{ error }` for an invalid body (task left unchanged), 404 for an unknown id. */
export const PATCH = async (
  req: Request,
  ctx: RouteContext<"/api/tasks/[id]">,
): Promise<Response> => {
  const { id } = await ctx.params;
  const body = await readJsonObject(req);
  if (!body) {
    return Response.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const parsed = parsePatch(body);
  if (typeof parsed === "string") {
    return Response.json({ error: parsed }, { status: 400 });
  }
  const task = updateTask(id, parsed);
  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }
  return Response.json(task);
};

/** Removes the task and responds 204 with no body, or 404 `{ error }` for an unknown id. */
export const DELETE = async (
  _req: Request,
  ctx: RouteContext<"/api/tasks/[id]">,
): Promise<Response> => {
  const { id } = await ctx.params;
  if (!deleteTask(id)) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
};

/** Builds a validated patch from a JSON body, or returns the error message for a 400 response. */
const parsePatch = (body: Record<string, unknown>): TaskPatch | string => {
  const hasTitle = "title" in body;
  const hasDone = "done" in body;
  if (!hasTitle && !hasDone) {
    return "Body must contain title or done";
  }
  if (hasDone && typeof body.done !== "boolean") {
    return "done must be a boolean";
  }
  const patch: TaskPatch = hasDone ? { done: body.done === true } : {};
  if (!hasTitle) {
    return patch;
  }
  const result = validateTitle(body.title);
  return result.ok ? { ...patch, title: result.title } : result.error;
};
