"use client";

/**
 * The libraries as one panel of library rows with the bar's legend under
 * them (DESIGN.md, Library rows and the library bar), on the Overview and
 * on the Libraries screen.
 */

import type { ReactNode } from "react";
import { LibraryBar, LibraryLegend, finishedText, remainingCount } from "@/components/library-bar";
import { settlingText } from "@/lib/convertible";
import { formatBytes, formatCount, plural } from "@/lib/format";
import { useFailures } from "@/lib/queries";
import { href } from "@/lib/router";
import { useLive } from "@/lib/store";
import type { Library, LibraryStats } from "@/lib/types";

/** One panel: the theme surface, a divider border and the panel radius, with rows inside. */
const PANEL = "overflow-hidden rounded-panel border border-line bg-surface";

const NO_FILES: LibraryStats = {
  file_count: 0,
  total_bytes: 0,
  pending: 0,
  queued: 0,
  processing: 0,
  done: 0,
  skipped: 0,
  failed: 0,
  saved_bytes: 0,
  settling: 0,
};

/** Every library's counts added up, for the legend. */
export function totalStats(libraries: readonly Library[]): LibraryStats {
  return libraries.reduce(
    (acc, l) => ({
      file_count: acc.file_count + l.stats.file_count,
      total_bytes: acc.total_bytes + l.stats.total_bytes,
      pending: acc.pending + l.stats.pending,
      queued: acc.queued + l.stats.queued,
      processing: acc.processing + l.stats.processing,
      done: acc.done + l.stats.done,
      skipped: acc.skipped + l.stats.skipped,
      failed: acc.failed + l.stats.failed,
      saved_bytes: acc.saved_bytes + l.stats.saved_bytes,
      settling: acc.settling + l.stats.settling,
    }),
    NO_FILES,
  );
}

/**
 * A library row: a link that covers the whole row (its name underlines
 * while the row is hovered; the row keeps its fill, as Popcorn SR's rows
 * do), the space saved, a status line that wraps, and the library bar.
 * "6 to review" is its own link above the covering one.
 */
export function LibraryRow({ library }: { library: Library }) {
  const scan = useLive((s) => s.scans[library.id]);
  const failures = useFailures();
  const copying = library.stats.settling;
  const stats = library.stats;
  const unreadable = failures.byLibrary[library.id]?.unreadable ?? 0;
  const scanning = library.scanning || (scan && scan.phase !== "done");
  const left = remainingCount(stats);
  // "100% finished" only once nothing more is on its way (see `finishedText`).
  const finished = finishedText(stats, unreadable, Boolean(scanning));
  let status: ReactNode;
  // Files being copied in get their own line, unless that's the whole story.
  let settling = copying > 0 && Boolean(library.enabled && !library.path_error);
  if (library.path_error) {
    status = <span className="text-ink">{library.path_error}</span>;
  } else if (!library.enabled) {
    status = "Paused. Not scanned or converted.";
  } else if (scanning) {
    status = scan
      ? scan.phase === "discovering"
        ? `Looking for videos · ${formatCount(scan.discovered)} found`
        : `Checking ${formatCount(scan.analyzed)} of ${formatCount(scan.to_analyze)}`
      : "Scanning";
  } else if (left > 0) {
    status = `${plural(left, "file")} to go`;
  } else if (copying > 0) {
    // Not "everything is finished" while a file is still arriving.
    status = settlingText(copying);
    settling = false;
  } else if (stats.file_count === 0) {
    status = "No videos found yet";
  } else {
    // Failed files aren't finished; "to review" follows.
    status =
      stats.failed > 0
        ? stats.done + stats.skipped === 0
          ? "Nothing converted yet"
          : "Everything else is finished"
        : "Everything is finished";
  }
  return (
    <li className="group relative p-[18px] roomy:px-6 roomy:py-5">
      <div className="flex items-baseline justify-between gap-4">
        {/* The name's link covers the whole row; "to review" sits above it. */}
        <a
          href={href(`/library/${library.id}`)}
          className="min-w-0 truncate text-base font-label text-ink no-underline outline-none group-hover:underline after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent focus-visible:after:outline-solid"
        >
          {library.name}
        </a>
        <span className="shrink-0 text-sm text-ink tabular">
          {stats.saved_bytes > 0 ? `${formatBytes(stats.saved_bytes)} saved` : null}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-4 text-meta text-muted">
        {/* Wraps (as Popcorn SR's row details do) rather than clipping, so the link's focus outline shows whole. */}
        <span className="min-w-0 [overflow-wrap:anywhere]">
          {status}
          {stats.failed > 0 ? (
            <>
              {" · "}
              {/* 27px tall without moving the line, and above the row's covering link. */}
              <a
                href={href(`/library/${library.id}`, { status: "failed" })}
                className="relative z-10 -my-1 inline-block py-1 text-ink underline"
              >
                {formatCount(stats.failed)} to review
              </a>
            </>
          ) : null}
        </span>
        {stats.file_count > 0 && finished ? <span className="shrink-0 tabular">{finished}</span> : null}
      </div>
      {settling ? <p className="mt-1 text-meta text-muted">{settlingText(copying)}</p> : null}
      <LibraryBar stats={stats} unreadable={unreadable} className="mt-3" />
    </li>
  );
}

/** The panel: a row per library, then the bar's legend for all of them (from 521px). */
export function LibrariesPanel({ libraries }: { libraries: readonly Library[] }) {
  const failures = useFailures();
  const totals = totalStats(libraries);
  return (
    <div className={PANEL}>
      <ul className="divide-y divide-line">
        {libraries.map((library) => (
          <LibraryRow key={library.id} library={library} />
        ))}
      </ul>
      {totals.file_count > 0 ? (
        <div className="hidden border-t border-line px-6 py-3.5 roomy:block">
          <LibraryLegend stats={totals} unreadable={failures.total.unreadable} />
        </div>
      ) : null}
    </div>
  );
}
