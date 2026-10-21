/** Parses the request body as a JSON object, or returns `undefined` for invalid JSON, arrays and primitives. */
export const readJsonObject = async (req: Request): Promise<Record<string, unknown> | undefined> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return undefined;
  }
  return isPlainObject(body) ? body : undefined;
};

/** Narrows a parsed JSON value to a non-null, non-array object. */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
