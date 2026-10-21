/** Number of days in the stats window, today included. */
const windowDays = 7;

/** Completions on one calendar day; `date` is `YYYY-MM-DD` in the requested timezone. */
export type DailyCompletions = { date: string; count: number };

/** Counts events per calendar day in `timeZone` for the 7 days ending on `now`'s date, oldest first; events outside the window are ignored. */
export const getDailyCompletions = (
  events: readonly { completedAt: string }[],
  timeZone: string,
  now: Date,
): DailyCompletions[] => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const counts = new Map<string, number>(
    listWindowDates(formatDayKey(formatter, now)).map((date): [string, number] => [date, 0]),
  );
  for (const event of events) {
    const key = formatDayKey(formatter, new Date(event.completedAt));
    const count = counts.get(key);
    if (count !== undefined) {
      counts.set(key, count + 1);
    }
  }
  return Array.from(counts, ([date, count]): DailyCompletions => ({ date, count }));
};

/** Formats the calendar day of `instant` as `YYYY-MM-DD` in the formatter's timezone. */
const formatDayKey = (formatter: Intl.DateTimeFormat, instant: Date): string => {
  const parts = formatter.formatToParts(instant);
  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

/** The window's day keys ending on `todayKey`, oldest first; steps back on the date parts with `Date.UTC`, so DST cannot skip or repeat a day. */
const listWindowDates = (todayKey: string): string[] => {
  const [year, month, day] = todayKey.split("-").map(Number);
  return Array.from({ length: windowDays }, (_, index): string => {
    const daysBack = windowDays - 1 - index;
    return new Date(Date.UTC(year, month - 1, day - daysBack)).toISOString().slice(0, 10);
  });
};
