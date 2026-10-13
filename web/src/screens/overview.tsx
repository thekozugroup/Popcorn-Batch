"use client";

/**
 * Overview: a calm status page. The space saved as the page's heading and
 * one sentence about what is happening; "Needs your attention" only when
 * something needs fixing, grouped by cause with its fix; one panel of job
 * rows only while files are converting; then each library, the latest
 * results and the space saved per day. Flat panels with dividers between
 * rows, and status as a dot beside neutral words.
 */

import type { ReactNode } from "react";
import { SavingsChart, worthCharting } from "@/components/charts";
import { FileName, WasName } from "@/components/file-name";
import { JobCard, JobCardSkeleton, historyNote } from "@/components/jobs";
import { LibraryBar, LibraryLegend, finishedText, remainingCount } from "@/components/library-bar";
import { QueueControls } from "@/components/queue-controls";
import { JobStateBadge } from "@/components/status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout, SectionHeading, Skeleton, StatusDot } from "@/components/ui/display";
import { useFileActions, useQueueActions } from "@/lib/actions";
import { errorMessage } from "@/lib/api";
import { settlingText } from "@/lib/convertible";
import { formatBytes, formatCount, formatHour, formatRelative, plural, splitBytes } from "@/lib/format";
import { SETUP_PROBLEMS, newFileName, reasonsFor, setupFix, type SetupProblem } from "@/lib/outcomes";
import {
  useFailures,
  useHardwareInfo,
  useJobStandings,
  useJobs,
  useLibraries,
  useOverview,
  useSavedFileCount,
  useSettings,
  useSetupProblems,
  RECENT_RESULTS_QUERY,
  type Failures,
  type SavedFiles,
} from "@/lib/queries";
import { href, openSheet } from "@/lib/router";
import { useLive, useServerDown } from "@/lib/store";
import type {
  BulkRequest,
  HardwareInfo,
  Job,
  Library,
  LibraryStats,
  Overview,
  QueueState,
  ScanProgress,
  Settings,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { HardwareLine } from "./setup";

/** "All caught up" → "all caught up", after "Last known:". */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** "Looking through Movies: 64 files found so far." for the scans in progress. */
function scanSentence(libraries: Library[], scans: Record<string, ScanProgress>): string | null {
  const scanning = libraries.filter((l) => l.scanning || (scans[l.id] && scans[l.id].phase !== "done"));
  if (!scanning.length) return null;
  const first = scanning[0];
  const scan = scans[first.id];
  const found = scan ? Math.max(scan.discovered, scan.to_analyze) : first.stats.file_count;
  const where =
    scanning.length === 1 ? first.name : `${first.name} and ${plural(scanning.length - 1, "other library", "other libraries")}`;
  if (scan?.phase === "analyzing" && scan.to_analyze > 0) {
    return `Looking through ${where}: checked ${formatCount(scan.analyzed)} of ${plural(scan.to_analyze, "file")}`;
  }
  return found > 0 ? `Looking through ${where}: ${plural(found, "video")} found so far` : `Looking through ${where} for videos`;
}

/**
 * Files being copied into the libraries that are watched right now
 * (`LibraryStats.settling`); a paused library or one whose folder is
 * missing isn't looking, so its last count doesn't hold anything up.
 */
export function copyingFiles(libraries: readonly Library[]): number {
  return libraries.reduce((n, l) => n + (l.enabled && !l.path_error ? l.stats.settling : 0), 0);
}

/** The colour of a status dot: Action Blue, emerald, amber or Zinc Status. */
type Dot = "accent" | "success" | "warning" | "info";

/** One panel: the theme surface, a divider border and the panel radius, with rows inside. */
const PANEL = "overflow-hidden rounded-panel border border-line bg-surface";

interface Status {
  /** Action Blue while working, emerald when all is done, amber for a fix, else Zinc Status. */
  dot: Dot;
  text: string;
  /** Quiet words after the sentence. */
  detail?: string;
  /** Resume, when paused. */
  resume?: boolean;
}

/** What still needs the user once nothing is converting: failed files, and whether a setup problem stops conversions. */
export interface Attention {
  failed: number;
  /** A setup problem (work folder, destination, disk space, hardware) is open. */
  blocked: boolean;
  /** Files still being copied into watched libraries (`LibraryStats.settling`). */
  settling?: number;
}

/**
 * The one status sentence: "Converting 2 files · 3 waiting", "All caught
 * up", "Paused · Resume". Never "All caught up" while a setup problem
 * stops conversions.
 */
export function overviewStatus(
  queue: QueueState,
  settings: Settings | undefined,
  scanning: string | null,
  attention: Attention = { failed: 0, blocked: false },
): Status {
  const waiting = queue.queued ? `${formatCount(queue.queued)} waiting` : undefined;
  if (queue.paused) {
    // Pausing is still work in progress; paused is a deliberate wait.
    return queue.running
      ? { dot: "accent", text: `Pausing · ${plural(queue.running, "file")} finishing`, resume: true }
      : { dot: "info", text: "Paused", detail: waiting, resume: true };
  }
  if (queue.running) return { dot: "accent", text: `Converting ${plural(queue.running, "file")}`, detail: waiting };
  if (queue.waiting_for_schedule) {
    const hours = settings?.active_hours;
    return {
      dot: "info",
      text: hours ? `Starts at ${formatHour(hours.start)}` : "Waiting for active hours",
      detail: waiting,
    };
  }
  if (scanning) return { dot: "accent", text: scanning };
  if (queue.queued) return { dot: "info", text: `${plural(queue.queued, "file")} waiting to start` };
  // "Needs your attention" follows right below with the fix.
  if (attention.blocked) return { dot: "warning", text: "Waiting for a fix" };
  // Not "All caught up" while a file is still arriving.
  if (attention.settling) {
    return {
      dot: "info",
      text: settlingText(attention.settling),
      detail: attention.failed > 0 ? `${plural(attention.failed, "file")} to review` : undefined,
    };
  }
  return {
    dot: "success",
    text: "All caught up",
    detail:
      attention.failed > 0
        ? `${plural(attention.failed, "file")} to review`
        : settings?.watch_folders === false
          ? "new files are picked up at the next scan"
          : "new files are picked up as they appear",
  };
}

function StatusLine({ queue, failed }: { queue: QueueState; failed: number }) {
  const settings = useSettings();
  const libraries = useLibraries();
  const scans = useLive((s) => s.scans);
  const { resume } = useQueueActions();
  const blocked = useSetupProblems().open;
  // While the server is away this is only what it last said: a hollow dot, not a live one.
  const down = useServerDown();
  const status = overviewStatus(queue, settings.data, scanSentence(libraries.data ?? [], scans), {
    failed,
    blocked,
    settling: copyingFiles(libraries.data ?? []),
  });
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
      <p role="status" className={cn("flex min-w-0 items-start gap-2.5 text-base", down ? "text-muted" : "text-ink")}>
        {down ? (
          <span aria-hidden className="mt-[8.5px] size-[7px] shrink-0 rounded-full border border-field" />
        ) : (
          <StatusDot tone={status.dot} className="mt-[8.5px]" />
        )}
        <span className="min-w-0">
          {down ? <span>Last known: </span> : null}
          <span className={down ? undefined : "font-[550]"}>{down ? lowerFirst(status.text) : status.text}</span>
          {status.detail ? <span className="text-muted"> · {status.detail}</span> : null}
        </span>
      </p>
      {status.resume ? (
        <Button variant="primary" size="sm" onClick={() => resume.mutate()} loading={resume.isPending} needsServer>
          Resume
        </Button>
      ) : null}
    </div>
  );
}

/**
 * "from 12 converted files (1 came out larger)": the converted files the
 * space saved is the net sum of (see `countSavedFiles`), so the count
 * agrees with the libraries' "Converted", and a file that grew is named
 * rather than silently left out.
 */
export function savedFromText(saved: SavedFiles): string {
  const from = `from ${plural(saved.files, "converted file")}`;
  return saved.larger > 0 ? `${from} (${formatCount(saved.larger)} came out larger)` : from;
}

function SavedFrom({ totals }: { totals: LibraryStats }) {
  const count = useSavedFileCount(totals);
  // Counting failed: the converted files are the closest answer.
  const saved = count.data ?? (count.error ? { files: totals.done, larger: 0 } : null);
  // Inside a sentence: a span, as a block can't sit in a paragraph.
  if (saved === null) return <span aria-hidden className="skeleton inline-block h-3.5 w-36 align-middle" />;
  return <>{savedFromText(saved)}</>;
}

function SavedHero({ overview }: { overview: Overview }) {
  const { totals, projected_savings_bytes: projected } = overview;
  const libraries = useLibraries();
  const scans = useLive((s) => s.scans);
  const saved = Math.max(0, totals.saved_bytes);
  const { value, unit } = splitBytes(saved);
  const remaining = totals.pending + totals.queued + totals.processing;
  const holdings =
    totals.total_bytes > 0 ? (
      <p className="mt-3 text-[13px] text-muted">
        Your libraries hold {formatBytes(totals.total_bytes)} across {plural(totals.file_count, "file")}.
      </p>
    ) : null;

  // Savings, not the "converted" count, decide: a converted file queued
  // again keeps its savings but isn't "done" meanwhile.
  if (saved === 0) {
    // Nothing to report yet: say what is happening instead of a giant "0 GB".
    const scanning = scanSentence(libraries.data ?? [], scans) !== null;
    const failed = totals.failed;
    // Files still being copied in: nothing is "in good shape" until they're in.
    const copying = copyingFiles(libraries.data ?? []);
    // Failed files are never "in good shape": say they're waiting on the user.
    const title = scanning
      ? "Getting to know your library"
      : remaining > 0
        ? "Your first files are on their way"
        : failed > 0
          ? totals.done > 0
            ? "Nothing saved yet"
            : "Nothing converted yet"
          : totals.file_count > 0
            ? copying > 0
              ? "Nothing to convert so far"
              : "Nothing needs converting"
            : "Waiting for videos";
    const detail = scanning
      ? "Conversions start as soon as files are checked."
      : remaining > 0
        ? "The space you get back shows up here as soon as the first files are verified."
        : failed > 0
          ? `${plural(failed, "file")} ${failed === 1 ? "needs" : "need"} your attention below.`
          : copying > 0
            ? // The status line below says how many; this says what happens next.
              `${totals.file_count > 0 ? "Every file found so far is in good shape or was left as it is. " : ""}Files still being copied in are added once they stop changing.`
            : totals.file_count > 0
              ? "Every file is already in good shape or was left as it is."
              : "Once a library is scanned and files are converted, the space you get back shows up here.";
    return (
      <div className="min-w-0">
        <h1 className="text-3xl leading-[1.2] font-semibold tracking-[-0.025em] text-ink max-roomy:text-[28px]">
          {title}
        </h1>
        <p className="mt-3 max-w-[58ch] text-base leading-[1.6] text-muted">{detail}</p>
        <StatusLine queue={overview.queue} failed={totals.failed} />
        {holdings}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* The amount is the page's heading; "saved" stays its own element (the browser e2e test finds it). */}
      <h1 className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-5xl leading-[1.1] font-semibold tracking-[-0.025em] text-ink tabular max-roomy:text-[2.5rem]">
          {value} {unit}
        </span>{" "}
        <span className="text-xl font-semibold text-muted">saved</span>
      </h1>
      <p className="mt-3 max-w-[58ch] text-base leading-[1.6] text-muted">
        <SavedFrom totals={totals} />
        {projected && projected > 0 && remaining > 0 ? (
          <>
            . About <span className="font-semibold text-ink">{formatBytes(projected)}</span> more once the remaining{" "}
            {plural(remaining, "file")} {remaining === 1 ? "is" : "are"} done.
          </>
        ) : (
          "."
        )}
      </p>
      <StatusLine queue={overview.queue} failed={totals.failed} />
      {holdings}
    </div>
  );
}

interface Problem {
  key: string;
  /**
   * The row's dot: red for conversions that failed (`danger`), amber for
   * everything else that needs the user (`warning`; `info` is a file that
   * changed meanwhile, where nothing was lost either).
   */
  tone: "warning" | "danger" | "info";
  title: string;
  detail: string;
  /** The server's own sentences for it (the exact cause and fix), most common first. */
  reasons?: string[];
  /** Where to look or fix it. */
  action?: { label: string; href: string };
  /** "Try again" for every file it stopped, once it's fixed. */
  retry?: Retry;
}

/** The requests behind one "Try again", and how many files they're for. */
interface Retry {
  requests: BulkRequest[];
  /** Converted files whose stopped conversion was "Convert anyway": queued the same way. */
  forced?: string[];
  count: number;
}

/**
 * One cause's rows: a single row when its files are all in one library,
 * else one row per library named after it ("Movies: 2 files can't be
 * read"), so every "Review" lands on a list that holds all it counted.
 */
function perLibrary(
  key: string,
  libraries: Library[],
  counts: Record<string, number>,
  row: (n: number) => Pick<Problem, "tone" | "title" | "detail">,
): Problem[] {
  const hit = libraries.filter((l) => (counts[l.id] ?? 0) > 0);
  const review = (library: Library) => ({
    label: "Review",
    href: href(`/library/${library.id}`, { status: "failed" }),
  });
  if (hit.length === 1) return [{ key, ...row(counts[hit[0].id]), action: review(hit[0]) }];
  return hit.map((library) => {
    const problem = row(counts[library.id]);
    return { ...problem, key: `${key}-${library.id}`, title: `${library.name}: ${problem.title}`, action: review(library) };
  });
}

/**
 * "3 files couldn't be converted because of it." `kept` counts converted
 * files whose second conversion it stopped; `atLeast` marks a count cut
 * short (too many failed files to read them all).
 */
function blockedText(failed: number, kept = 0, atLeast = false): string {
  const files = `${atLeast ? "At least " : ""}${plural(failed, "file")}`;
  if (failed > 0 && kept > 0) {
    return `${files} couldn't be converted because of it, and ${plural(kept, "converted file")} couldn't be converted again.`;
  }
  if (kept > 0) {
    return `${plural(kept, "converted file")} couldn't be converted again because of it. ${kept === 1 ? "It's" : "They're"} still as ${kept === 1 ? "it was" : "they were"}.`;
  }
  return `${files} couldn't be converted because of it.`;
}

/**
 * The server's sentences for a group of failures, as lines: the one
 * sentence when they all share it, else up to three, each with its count
 * (two, and how many more there are, when there are more than three).
 */
function reasonLines(items: { error: string | null }[]): string[] {
  const all = reasonsFor(items, 3);
  if (all.reasons.length === 1 && all.rest === 0) return [all.reasons[0].text];
  const { reasons, rest } = all.rest > 0 ? reasonsFor(items, 2) : all;
  const lines = reasons.map((r) => `${plural(r.count, "file")}: ${r.text}`);
  if (rest > 0) lines.push(`${plural(rest, "more file")} with other messages: open one from its library to see why.`);
  return lines;
}

/**
 * "Try again" for the files one problem stopped: the failed ones by id (or,
 * when there were too many to read them all, every failed file), and
 * converted files whose second conversion it stopped queued again.
 */
function retryFor(failed: { id: string }[], kept: Job[], failures: Failures, failedTotal: number): Retry | undefined {
  const requests: BulkRequest[] = [];
  if (failed.length) {
    requests.push(failures.complete ? { action: "retry_failed", ids: failed.map((f) => f.id) } : { action: "retry_failed" });
  }
  const forced = [...new Set(kept.filter((j) => j.force).map((j) => j.file_id))];
  const keptIds = [...new Set(kept.filter((j) => !j.force).map((j) => j.file_id))];
  if (keptIds.length) requests.push({ action: "queue", ids: keptIds });
  if (!requests.length && !forced.length) return undefined;
  const count = (failed.length ? (failures.complete ? failed.length : failedTotal) : 0) + keptIds.length + forced.length;
  return forced.length ? { requests, forced, count } : { requests, count };
}

/**
 * Problems the user can fix, one row per cause. Setup problems (work
 * folder, destination, disk space, chosen hardware) are one row each
 * across every library, with the server's own sentences (the exact cause
 * and fix), a link to the setting and "Try again" for all their files,
 * including converted files whose second conversion they stopped (`kept`);
 * damaged originals and failed conversions get a row per library with
 * "Review".
 */
export function problemsFrom(
  libraries: Library[],
  failures: Failures,
  hw: HardwareInfo | undefined,
  settings?: Pick<Settings, "output_mode">,
  kept: Partial<Record<SetupProblem, Job[]>> = {},
): Problem[] {
  const problems: Problem[] = [];
  const failedTotal = libraries.reduce((sum, l) => sum + l.stats.failed, 0);
  const hints = hw?.hints.filter((h) => h.level !== "info") ?? [];
  // Files the chosen hardware couldn't convert belong with the hardware tips.
  const hardwareFailed = failures.ready ? (failures.setup.hardware_unavailable ?? []) : [];
  const hardwareKept = kept.hardware_unavailable ?? [];
  if (hints.length) {
    const blocking = hints.some((h) => h.level === "error");
    const tips = hints.length > 1 ? `${hints[0].title}, and ${plural(hints.length - 1, "more tip")}.` : `${hints[0].title}.`;
    const stopped = hardwareFailed.length + hardwareKept.length;
    problems.push({
      key: "hardware",
      tone: blocking ? "danger" : "warning",
      title: blocking ? "Nothing can be converted until setup is fixed" : "Hardware setup needs a fix",
      detail: stopped ? `${tips} ${blockedText(hardwareFailed.length, hardwareKept.length, !failures.complete)}` : tips,
      action: { label: "Show me", href: href("/settings/hardware") },
      retry: retryFor(hardwareFailed, hardwareKept, failures, failedTotal),
    });
  }
  for (const library of libraries.filter((l) => l.path_error)) {
    problems.push({
      key: `folder-${library.id}`,
      tone: "warning",
      title: `${library.name}: the folder can't be read`,
      detail: library.path_error ?? "",
      action: { label: "Show me", href: href(`/library/${library.id}`) },
    });
  }
  if (failures.ready) {
    for (const kind of SETUP_PROBLEMS) {
      const files = failures.setup[kind] ?? [];
      const keptJobs = kept[kind] ?? [];
      // Already said with the hardware tips.
      if ((!files.length && !keptJobs.length) || (kind === "hardware_unavailable" && hints.length)) continue;
      const fix = setupFix(kind, settings?.output_mode);
      const reasons = reasonLines([...files, ...keptJobs]);
      problems.push({
        key: `setup-${kind}`,
        tone: "warning",
        title: fix.title,
        // The server's sentences name the exact cause and fix; the generic fix only without them.
        detail: reasons.length
          ? blockedText(files.length, keptJobs.length, !failures.complete)
          : `${blockedText(files.length, keptJobs.length, !failures.complete)} ${fix.fix}`,
        reasons,
        action: { label: fix.setting.label, href: href(fix.setting.path, { focus: fix.setting.focus }) },
        retry: retryFor(files, keptJobs, failures, failedTotal),
      });
    }
    const count = (kind: "unreadable" | "conversion") =>
      Object.fromEntries(
        Object.entries(failures.byLibrary).map(([id, c]) => [
          id,
          // Files not read aren't known to be failed conversions: they get their own row.
          kind === "conversion" ? c.conversion - (failures.unsorted[id] ?? 0) : c[kind],
        ]),
      );
    problems.push(
      ...perLibrary("unreadable", libraries, count("unreadable"), (n) => ({
        tone: "warning",
        title: `${plural(n, "file")} can't be read`,
        detail: `${n === 1 ? "It looks" : "They look"} damaged or ${n === 1 ? "isn't a video" : "aren't videos"}. Popcorn Batch left ${n === 1 ? "it" : "them"} alone.`,
      })),
      ...perLibrary("failed", libraries, count("conversion"), (n) => ({
        tone: "danger",
        title: `${plural(n, "file")} couldn't be converted`,
        detail: `The ${n === 1 ? "original is" : "originals are"} untouched. See why, then try again.`,
      })),
      ...perLibrary("unsorted", libraries, failures.unsorted, (n) => ({
        tone: "danger",
        title: `${plural(n, "more file")} couldn't be converted`,
        detail: "There are too many failed files to sort them all here. The list shows why each one failed.",
      })),
    );
    const changed = failures.changed;
    if (changed.length) {
      const one = changed.length === 1;
      const reasons = reasonLines(changed);
      problems.push({
        key: "changed",
        tone: "info",
        title: `${plural(changed.length, "file")} changed or moved while ${one ? "it was" : "they were"} being converted`,
        detail: reasons.length
          ? "Nothing was replaced."
          : `${one ? "It was" : "They were"} moved, deleted or replaced during the conversion, so nothing was replaced.`,
        reasons,
        retry: retryFor(changed, [], failures, failedTotal),
      });
    }
  }
  return problems;
}

/**
 * "Try again" for every file of one cause, once it's fixed. Its accessible
 * name starts with the words on the button ("Try again, 5 files"), so a
 * voice command for what's on screen reaches it.
 */
function RetryAll({ retry }: { retry: Retry }) {
  const { retryAll } = useFileActions();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => retryAll.mutate({ requests: retry.requests, forced: retry.forced })}
      loading={retryAll.isPending}
      aria-label={`Try again, ${plural(retry.count, "file")}`}
      needsServer
    >
      Try again
    </Button>
  );
}

const RECENT_QUERY = RECENT_RESULTS_QUERY;
const EMPTY_JOBS: Job[] = [];

function NeedsAttention() {
  const libraries = useLibraries();
  const failures = useFailures();
  const settings = useSettings();
  const { hw } = useHardwareInfo();
  const { kept } = useSetupProblems();
  const problems = problemsFrom(libraries.data ?? [], failures, hw, settings.data, kept);
  if (!problems.length) return null;
  return (
    <section aria-labelledby="attention-heading">
      <SectionHeading id="attention-heading" title="Needs your attention" />
      <ul className={cn(PANEL, "divide-y divide-line")}>
        {problems.map((p) => (
          <li
            key={p.key}
            className={cn(
              "flex flex-col gap-3 p-[18px] roomy:flex-row roomy:justify-between roomy:gap-5 roomy:px-6 roomy:py-5",
              p.reasons?.length ? "roomy:items-start" : "roomy:items-center",
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {/* Red for conversions that failed; amber for the rest, where nothing was lost. */}
              <StatusDot tone={p.tone === "danger" ? "danger" : "warning"} className="mt-[8.5px]" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-[550] text-ink">{p.title}</p>
                <p className="mt-1 max-w-[62ch] text-[13px] leading-[1.6] text-muted">{p.detail}</p>
                {p.reasons?.length ? (
                  // The server's own words: the exact cause and what to do about it.
                  <ul className="mt-2 max-w-[62ch] space-y-1.5 border-l border-line pl-3 text-[13px] leading-[1.6] text-ink">
                    {p.reasons.map((reason) => (
                      <li key={reason} className="break-words">
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            {p.action || p.retry ? (
              // Under the text at 520px and below, lined up with it, wrapping rather than running past the edge.
              <div className="flex flex-wrap gap-2 pl-[19px] roomy:shrink-0 roomy:pl-0">
                {p.action ? (
                  <a href={p.action.href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    {p.action.label}
                  </a>
                ) : null}
                {p.retry ? <RetryAll retry={p.retry} /> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One panel of job rows, only while files are converting. */
function NowConverting({ queue }: { queue: QueueState }) {
  const running = useJobs({ state: "running", limit: 12 });
  const jobs = running.data?.items ?? [];
  const open = (job: Job) => openSheet({ job: job.id });
  if (queue.running === 0 && jobs.length === 0) return null;
  return (
    <section aria-labelledby="now-heading">
      <SectionHeading
        id="now-heading"
        title="Converting now"
        action={
          <>
            <a href={href("/queue")} className={buttonVariants({ variant: "quiet", size: "sm" })}>
              Open queue
            </a>
            {/* The status line above already offers Resume as the page's one primary action. */}
            <QueueControls queue={queue} compact resumeVariant="secondary" />
          </>
        }
      />
      {running.error && !running.data ? (
        <Callout tone="danger" title="Couldn't load what's converting">
          {errorMessage(running.error)} This retries on its own.
        </Callout>
      ) : jobs.length > 0 ? (
        <div className={PANEL}>
          {jobs.map((job, i) => (
            <JobCard key={job.id} job={job} onOpen={open} announce={i === 0} />
          ))}
        </div>
      ) : (
        // A job just started; its row arrives with the next list refresh.
        <div className={PANEL} aria-busy="true" aria-label="Loading what's converting">
          <JobCardSkeleton />
        </div>
      )}
    </section>
  );
}

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
    <li className="group relative p-[18px] hover:bg-subtle roomy:px-6 roomy:py-5">
      <div className="flex items-baseline justify-between gap-4">
        {/* The name's link covers the whole row; "to review" sits above it. */}
        <a
          href={href(`/library/${library.id}`)}
          className="min-w-0 truncate text-base font-[550] text-ink no-underline outline-none group-hover:underline after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent focus-visible:after:outline-solid"
        >
          {library.name}
        </a>
        <span className="shrink-0 text-sm text-ink tabular">
          {stats.saved_bytes > 0 ? `${formatBytes(stats.saved_bytes)} saved` : null}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-4 text-[13px] text-muted">
        <span className="min-w-0 truncate">
          {status}
          {stats.failed > 0 ? (
            <>
              {" · "}
              <a href={href(`/library/${library.id}`, { status: "failed" })} className="relative z-10 text-ink underline">
                {formatCount(stats.failed)} to review
              </a>
            </>
          ) : null}
        </span>
        {stats.file_count > 0 && finished ? <span className="shrink-0 tabular">{finished}</span> : null}
      </div>
      {settling ? <p className="mt-1 text-[13px] text-muted">{settlingText(copying)}</p> : null}
      <LibraryBar stats={stats} unreadable={unreadable} className="mt-3" />
    </li>
  );
}

function Libraries() {
  const libraries = useLibraries();
  const failures = useFailures();
  const list = libraries.data ?? [];
  const totals = list.reduce(
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
    {
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
    },
  );
  return (
    <section aria-labelledby="libraries-heading">
      <SectionHeading
        id="libraries-heading"
        title="Libraries"
        action={
          <a href={href("/libraries/new")} className={buttonVariants({ variant: "quiet", size: "sm" })}>
            Add library
          </a>
        }
      />
      <div className={PANEL}>
        <ul className="divide-y divide-line">
          {list.map((library) => (
            <LibraryRow key={library.id} library={library} />
          ))}
        </ul>
        {totals.file_count > 0 ? (
          <div className="hidden border-t border-line px-6 py-3.5 roomy:block">
            <LibraryLegend stats={totals} unreadable={failures.total.unreadable} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** The latest results (the layout gives them a column only when there are some). */
export function RecentResults() {
  const history = useJobs(RECENT_QUERY);
  const libraries = useLibraries();
  const settings = useSettings();
  const items = history.data?.items ?? EMPTY_JOBS;
  const standings = useJobStandings(items);
  if (!history.isPending && items.length === 0) return null;
  const libraryName = (id: string) => libraries.data?.find((l) => l.id === id)?.name;
  const minSavings = (id: string) => libraries.data?.find((l) => l.id === id)?.profile.min_savings_pct;
  const outputMode = settings.data?.output_mode;
  return (
    <section aria-labelledby="recent-heading">
      <SectionHeading
        id="recent-heading"
        title="Recently finished"
        action={
          items.length ? (
            <a href={href("/queue/history")} className={buttonVariants({ variant: "quiet", size: "sm" })}>
              See all
            </a>
          ) : null
        }
      />
      {history.isPending ? (
        <div className={cn(PANEL, "space-y-3 p-[18px] roomy:p-6")}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <ul className={cn(PANEL, "divide-y divide-line")}>
          {items.map((job) => {
            const standing = standings.get(job.id) ?? "current";
            // A conversion that changed the file's extension is listed by the new name, the old one secondary.
            const renamed = newFileName(job, undefined, outputMode);
            return (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => openSheet({ job: job.id })}
                  // Full width inside the panel: the focus outline sits inside so it isn't clipped.
                  className="flex w-full flex-col gap-1.5 px-[18px] py-4 text-left -outline-offset-2 hover:bg-subtle roomy:px-6"
                >
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="min-w-0 flex-1">
                      <FileName name={renamed ?? job.file_name} className="text-sm font-[550] text-ink" />
                      {renamed ? <WasName name={job.file_name} className="mt-0.5" /> : null}
                    </span>
                    <JobStateBadge job={job} standing={standing} />
                  </span>
                  <span className="flex w-full items-baseline justify-between gap-3 text-[13px]">
                    {standing === "unknown" ? (
                      <span aria-hidden className="skeleton inline-block h-3 w-40" />
                    ) : (
                      // The reason comes first; two lines hold it in this narrow column.
                      <span className={cn("line-clamp-2 min-w-0", job.state === "done" ? "text-ink" : "text-muted")}>
                        {historyNote(job, minSavings(job.library_id), standing)}
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-muted">
                      {[libraryName(job.library_id), formatRelative(job.finished_at)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Live updates can't reach this browser: say why, once, where it's seen. */
function LiveUpdatesOff() {
  const connection = useLive((s) => s.connection);
  if (connection !== "unavailable") return null;
  return (
    <Callout tone="info" title="Live updates aren't reaching this browser" className="mb-8">
      <p>
        The page refreshes every 5 seconds instead, so progress moves in steps. If you open Popcorn Batch through a
        reverse proxy (Nginx Proxy Manager, SWAG, Traefik), turn on WebSocket support for it.
      </p>
    </Callout>
  );
}

/**
 * No library yet (setup was skipped): the welcome's promise again, with the
 * one action that matters.
 */
function Welcome() {
  const hardware = useHardwareInfo();
  const libraries = useLibraries();
  const failures = useFailures();
  const settings = useSettings();
  const { kept } = useSetupProblems();
  const problems = problemsFrom(libraries.data ?? [], failures, hardware.hw, settings.data, kept);
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl leading-[1.2] font-semibold tracking-[-0.025em] text-ink max-roomy:text-[28px]">
        Make your video library smaller, safely.
      </h1>
      <p className="mt-2.5 max-w-[58ch] text-base leading-[1.6] text-muted">
        Point Popcorn Batch at a folder and choose a goal. It converts files in the background, checks each result
        against the original, and only then replaces it.
      </p>
      <a href={href("/libraries/new")} className={cn(buttonVariants({ variant: "primary" }), "mt-8")}>
        Choose a folder
      </a>
      <div className="mt-5 text-[13px] text-muted">
        <HardwareLine hw={hardware.hw} detecting={hardware.detecting} />
      </div>
      {problems.length ? (
        <div className="mt-10">
          <NeedsAttention />
        </div>
      ) : null}
    </div>
  );
}

export function OverviewScreen() {
  const overview = useOverview();
  const libraries = useLibraries();
  const recent = useJobs(RECENT_QUERY);
  const hasRecent = recent.isPending || (recent.data?.items.length ?? 0) > 0;
  const data = overview.data;
  if (libraries.data !== undefined && libraries.data.length === 0) {
    return (
      <div>
        <LiveUpdatesOff />
        <Welcome />
      </div>
    );
  }
  const chart = data && worthCharting(data.savings_history);
  return (
    <div>
      <LiveUpdatesOff />
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className={cn("lg:col-start-1 lg:row-start-1", !chart && "lg:col-span-2")}>
          {data ? (
            <SavedHero overview={data} />
          ) : overview.error ? (
            <Callout tone="danger" title="Couldn't load the overview">
              The rest of the app still works. This page retries on its own.
            </Callout>
          ) : (
            <div>
              <Skeleton className="h-[53px] w-72 max-w-full" />
              <Skeleton className="mt-4 h-5 w-96 max-w-full" />
            </div>
          )}
        </div>
        <div className="empty:hidden lg:col-span-2">
          <NeedsAttention />
        </div>
        {data ? (
          <div className="empty:hidden lg:col-span-2">
            <NowConverting queue={data.queue} />
          </div>
        ) : null}
        <div
          className={cn(
            "grid grid-cols-1 gap-10 lg:col-span-2",
            // Before anything has finished, the libraries take the full width.
            hasRecent && "xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]",
          )}
        >
          <Libraries />
          <RecentResults />
        </div>
        {/* Last on narrower screens (after the libraries); beside the saved amount from 1024px. */}
        {chart ? (
          <SavingsChart points={data.savings_history} className="lg:col-start-2 lg:row-start-1 lg:self-end" />
        ) : null}
      </div>
    </div>
  );
}
