import { connection } from "next/server";

import { getDailyCompletions } from "@/lib/stats/daily-completions";
import { listCompletionEvents } from "@/lib/tasks/store";

/** Outcome of `validateTimeZone`: the accepted IANA name, or a message explaining why it was rejected. */
type TimeZoneValidation = { ok: true; timeZone: string } | { ok: false; error: string };

/** Returns 7 `{ date, count }` rows for the last 7 days in `?tz=<IANA timezone>`, or 400 `{ error }` for a missing or unknown `tz`. */
export const GET = async (req: Request): Promise<Response> => {
  await connection();
  const result = validateTimeZone(new URL(req.url).searchParams.get("tz"));
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(getDailyCompletions(listCompletionEvents(), result.timeZone, new Date()));
};

/** Accepts a non-empty timezone that `Intl.DateTimeFormat` recognizes; its `RangeError` becomes a rejection. */
const validateTimeZone = (value: string | null): TimeZoneValidation => {
  if (!value) {
    return { ok: false, error: "tz is required" };
  }
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
  } catch (err) {
    if (err instanceof RangeError) {
      return { ok: false, error: `Unknown timezone: ${value}` };
    }
    throw err;
  }
  return { ok: true, timeZone: value };
};
