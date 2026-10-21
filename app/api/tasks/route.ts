import { connection } from "next/server";

import { readJsonObject } from "@/lib/tasks/read-json-object";
import { createTask, listTasks } from "@/lib/tasks/store";
import { validateTitle } from "@/lib/tasks/validate-title";

/** Lists all tasks, newest first; `connection()` keeps it from being prerendered at build time. */
export const GET = async (): Promise<Response> => {
  await connection();
  return Response.json(listTasks());
};

/** Creates a task from `{ title }` and returns it with 201, or 400 `{ error }` for an invalid body. */
export const POST = async (req: Request): Promise<Response> => {
  const body = await readJsonObject(req);
  if (!body) {
    return Response.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const result = validateTitle(body.title);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(createTask(result.title), { status: 201 });
};
