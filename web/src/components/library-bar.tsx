"use client";

/**
 * The library bar: one 5px bar per library that fills from the left as files
 * finish. Converted files are Action Blue and skipped ones Zinc Status, so
 * the filled length is the "% finished" next to it; files in the queue or
 * converting and files still to convert are the empty track (the legend
 * names them). Failed conversions are an amber mark at the end; originals
 * that can't be read aren't drawn at all (they're listed under "Needs your
 * attention") and aren't counted in "% finished" either. Every part is also
 * said in words.
 */

import { formatCount, formatPercent, percentOf } from "@/lib/format";
import type { LibraryStats } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Segment {
  key: string;
  label: string;
  count: number;
  /** The segment's fill; `null` for a part of the empty track. */
  fill: string | null;
}

function segments(stats: LibraryStats, unreadable: number): Segment[] {
  return [
    { key: "done", label: "Converted", count: stats.done, fill: "bg-accent" },
    { key: "skipped", label: "Skipped", count: stats.skipped, fill: "bg-field" },
    // The empty track, so the filled part is what's finished.
    { key: "active", label: "In queue or converting", count: stats.queued + stats.processing, fill: null },
    { key: "pending", label: "To convert", count: stats.pending, fill: null },
    {
      key: "failed",
      label: "Couldn't convert",
      count: Math.max(0, stats.failed - unreadable),
      fill: "bg-warn",
    },
  ];
}

/**
 * Files the bar and "% finished" count: every file except originals that
 * can't be read, which are set aside until they're replaced or ignored.
 */
export function countedFiles(stats: LibraryStats, unreadable = 0): number {
  return Math.max(0, stats.file_count - unreadable);
}

/**
 * Share of files that are finished: converted, or left as they are
 * (skipped), out of the files the bar draws. Shown as "% finished", never
 * "% done", because "Converted" counts only the first kind.
 */
export function finishedPercent(stats: LibraryStats, unreadable = 0): number {
  return percentOf(stats.done + stats.skipped, countedFiles(stats, unreadable));
}

/**
 * Whether more of the library is on its way: files still being copied in
 * (`LibraryStats.settling`, added once they stop changing) or a scan that is
 * still looking. The files counted so far can all be finished while that
 * is so, but the library isn't.
 */
export function isWaiting(stats: Pick<LibraryStats, "settling">, scanning = false): boolean {
  return stats.settling > 0 || scanning;
}

/**
 * "60% finished" for the sidebar and the overview, or `null` when it would
 * say too much: a library whose known files are all finished still has
 * files on their way while `isWaiting`, so it isn't "100% finished" (the
 * caller says what it waits for, see `settlingText`). Rounds down, so one
 * file left of 300 is "99%", never "100%".
 */
export function finishedText(stats: LibraryStats, unreadable = 0, scanning = false): string | null {
  const percent = finishedPercent(stats, unreadable);
  const all = percent >= 100;
  if (all && isWaiting(stats, scanning)) return null;
  return `${formatPercent(all ? 100 : Math.min(99, Math.floor(percent)))} finished`;
}

/** Files still waiting for work. */
export function remainingCount(stats: LibraryStats): number {
  return stats.pending + stats.queued + stats.processing;
}

/** One-sentence summary for screen readers and tooltips. */
export function statsSentence(stats: LibraryStats, unreadable = 0): string {
  if (stats.file_count === 0) return "No videos found yet.";
  const failed = Math.max(0, stats.failed - unreadable);
  const parts = [
    `${formatCount(stats.done)} converted`,
    stats.queued + stats.processing ? `${formatCount(stats.queued + stats.processing)} in queue or converting` : null,
    stats.pending ? `${formatCount(stats.pending)} to convert` : null,
    stats.skipped ? `${formatCount(stats.skipped)} skipped` : null,
    failed ? `${formatCount(failed)} couldn't be converted` : null,
    unreadable ? `${formatCount(unreadable)} can't be read` : null,
  ].filter(Boolean);
  return `${formatCount(stats.file_count)} files: ${parts.join(", ")}.`;
}

export function LibraryBar({
  stats,
  unreadable = 0,
  className,
}: {
  stats: LibraryStats;
  /** Failed files whose original can't be read: left out of the bar. */
  unreadable?: number;
  className?: string;
}) {
  const total = countedFiles(stats, unreadable);
  return (
    <div
      role="img"
      aria-label={statsSentence(stats, unreadable)}
      // The empty track: inside a filled row it turns to the surface colour (globals.css).
      data-track=""
      className={cn("flex h-[5px] w-full gap-px overflow-hidden rounded-progress bg-subtle", className)}
    >
      {total > 0
        ? segments(stats, unreadable)
            .filter((s) => s.count > 0 && s.fill)
            .map((s) => (
              <div
                key={s.key}
                // The couldn't-convert mark sits at the far end, past the empty track.
                className={cn("h-full min-w-[3px]", s.fill, s.key === "failed" && "ml-auto")}
                style={{ width: `${percentOf(s.count, total)}%` }}
              />
            ))
        : null}
    </div>
  );
}

/** The bar's legend: each segment with a swatch, a word and a count. */
export function LibraryLegend({
  stats,
  unreadable = 0,
  className,
}: {
  stats: LibraryStats;
  unreadable?: number;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted", className)}>
      {segments(stats, unreadable)
        .filter((s) => s.count > 0 || s.key === "done")
        .map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            {/* A filled swatch for a drawn part, an outlined one for the empty track. */}
            <span
              aria-hidden
              className={cn("size-2.5 shrink-0 rounded-progress", s.fill ?? "border border-field bg-subtle")}
            />
            <span>
              {s.label} <span className="font-medium text-ink tabular">{formatCount(s.count)}</span>
            </span>
          </li>
        ))}
    </ul>
  );
}
