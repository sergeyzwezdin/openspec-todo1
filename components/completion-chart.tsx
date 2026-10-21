"use client";

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { showError } from "@/lib/show-error";
import type { DailyCompletions } from "@/lib/stats/daily-completions";

/** Stats request state; `rows` exist only once a response has arrived. */
type StatsState =
  | { status: "loading" }
  | { status: "ready"; rows: DailyCompletions[] }
  | { status: "failed" };

/** Series config for the chart: the `count` bars, labeled and colored from the theme. */
const chartConfig = {
  count: { label: "Completed", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Short month-and-day label in the viewer's locale; formatted in UTC because day keys are parsed as UTC noon. */
const dayLabelFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

type CompletionChartProps = {
  /** Changing this value refetches the stats. */
  refreshKey: number;
};

/** Bar chart of tasks completed on each of the last 7 days, in the browser's timezone. */
export const CompletionChart = ({ refreshKey }: CompletionChartProps): ReactElement => {
  const [state, setState] = useState<StatsState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;
    fetchDailyCompletions()
      .then((rows) => {
        if (!isActive) return;
        setState({ status: "ready", rows });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState({ status: "failed" });
        showError("Could not load completion stats", error);
      });
    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Completed per day</CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === "loading" && <p className="text-sm text-muted-foreground">Loading stats…</p>}
        {state.status === "failed" && <p className="text-sm text-muted-foreground">Stats could not be loaded.</p>}
        {state.status === "ready" && <DailyCompletionsChart rows={state.rows} />}
      </CardContent>
    </Card>
  );
};

/** The 7 daily bars, oldest on the left, with whole-number ticks and a tooltip with the exact count. */
const DailyCompletionsChart = ({ rows }: { rows: DailyCompletions[] }): ReactElement => (
  <ChartContainer config={chartConfig} className="aspect-auto h-48 w-full">
    <BarChart data={rows} margin={{ left: -24 }}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="date" tickLine={false} axisLine={false} interval={0} tickFormatter={formatDayLabel} />
      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
      <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={formatTooltipLabel} />} />
      <Bar dataKey="count" fill="var(--color-count)" radius={4} />
    </BarChart>
  </ChartContainer>
);

/** Formats a `YYYY-MM-DD` key as a short date; noon UTC keeps the viewer's offset from moving it to another day. */
const formatDayLabel = (date: string): string => dayLabelFormat.format(new Date(`${date}T12:00:00Z`));

/** Tooltip title: the bar's day key as a short date; a non-string label hides the title. */
const formatTooltipLabel = (label: unknown): ReactNode =>
  typeof label === "string" ? formatDayLabel(label) : null;

/** Loads the last 7 days of completion counts for the browser's timezone. */
const fetchDailyCompletions = async (): Promise<DailyCompletions[]> => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await fetch(`/api/completion-stats?tz=${encodeURIComponent(timeZone)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isDailyCompletions)) {
    throw new Error("Unexpected response from the server");
  }
  return body;
};

/** Checks that a parsed response row has the shape `{ date, count }`. */
const isDailyCompletions = (value: unknown): value is DailyCompletions =>
  typeof value === "object" &&
  value !== null &&
  "date" in value &&
  typeof value.date === "string" &&
  "count" in value &&
  typeof value.count === "number";
