"use client";

/**
 * Saved per day: the one chart (DESIGN.md, Savings chart). Real daily
 * savings from the server as Action Blue columns in a padded panel, a hover
 * readout in the caption line, and the same numbers as a table under "Show
 * the daily numbers", so keyboard and touch users get them too. Shown once
 * there are a few days of savings to compare.
 */

import { useId, useState } from "react";
import { Disclosure } from "@/components/ui/display";
import { formatBytes, formatCount, formatDay, percentOf, plural } from "@/lib/format";
import type { SavingsPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Round a byte maximum up to a clean axis value (1, 2, 5 × 10^n bytes). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** The padded panel the chart sits in (28px, 20px at 520px and below). */
export const CHART_PANEL = "rounded-panel border border-line bg-surface p-7 max-roomy:p-5";

export function SavingsChart({ points, className }: { points: SavingsPoint[]; className?: string }) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...points.map((p) => p.saved_bytes)));
  const total = points.reduce((sum, p) => sum + Math.max(0, p.saved_bytes), 0);
  const shown = active !== null ? points[active] : null;
  const hasData = points.some((p) => p.saved_bytes > 0);

  return (
    <figure className={cn("flex min-w-0 flex-col", CHART_PANEL, className)} aria-labelledby={`${id}-caption`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span id={`${id}-caption`} className="text-title text-ink">
          Saved per day
        </span>
        <span className="text-meta text-muted tabular" aria-live="off">
          {shown
            ? `${formatDay(shown.date)}: ${formatBytes(shown.saved_bytes)} · ${plural(shown.files, "file")}`
            : `Last 30 days · ${formatBytes(total)}`}
        </span>
      </figcaption>
      {/* A picture of the table below, for the eye; the table is what assistive tech reads. */}
      <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3" aria-hidden>
        <div className="flex flex-col justify-between text-right text-xs text-muted tabular">
          <span className="-translate-y-1/2">{hasData ? formatBytes(max) : ""}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="relative h-32" onMouseLeave={() => setActive(null)}>
          <div className="absolute inset-x-0 top-0 h-px bg-line" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-line" />
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {points.map((p, i) => {
              const h = p.saved_bytes > 0 ? Math.max(2, percentOf(p.saved_bytes, max)) : 0;
              return (
                <div
                  key={p.date}
                  data-day={p.date}
                  className="flex h-full min-w-0 flex-1 items-end justify-center"
                  onMouseEnter={() => setActive(i)}
                >
                  <div
                    className={cn("w-full max-w-6 rounded-t-progress bg-accent", active === i && "brightness-[.94]")}
                    style={{ height: `${h}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <span />
        <div className="mt-2 flex justify-between text-xs text-muted tabular">
          <span>{points[0] ? formatDay(points[0].date) : ""}</span>
          <span>Today</span>
        </div>
      </div>
      <Disclosure title="Show the daily numbers" className="mt-5">
        <table className="w-full text-sm">
          <caption className="pb-2 text-left text-meta text-muted">Space saved per day, last 30 days</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">
                Day
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Saved
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                Files
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {points.map((p) => (
              <tr key={p.date}>
                <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                  {formatDay(p.date)}
                </th>
                <td className="px-3 py-2 text-right text-ink tabular">{formatBytes(p.saved_bytes)}</td>
                <td className="py-2 pl-3 text-right text-muted tabular">{formatCount(p.files)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Disclosure>
    </figure>
  );
}

/** Whether the savings history has enough days with savings to be worth a chart. */
export function worthCharting(points: SavingsPoint[], minDays = 3): boolean {
  return points.filter((p) => p.saved_bytes > 0).length >= minDays;
}
