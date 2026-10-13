"use client";

/**
 * Queue: Running / Up next / History, with queue controls and job actions.
 * Each tab is one flat panel of rows with dividers between them; empty
 * states sit in a panel too.
 */

import { CircleCheck, CircleX, ScanSearch, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FileName, WasName } from "@/components/file-name";
import { JobCard, JobCardSkeleton, historyNote } from "@/components/jobs";
import { QueueControls, queueSentence } from "@/components/queue-controls";
import { PageHeader } from "@/components/shell";
import { JobStateBadge } from "@/components/status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout, Disclosure, EmptyState, Skeleton } from "@/components/ui/display";
import { NavTabs, Pager, useClampedOffset } from "@/components/ui/nav-tabs";
import { ConfirmDialog } from "@/components/ui/overlays";
import { useJobActions } from "@/lib/actions";
import { errorMessage } from "@/lib/api";
import { formatBytes, formatRelative, plural } from "@/lib/format";
import { entryIsUnreadable, isUnreadable, newFileName } from "@/lib/outcomes";
import { useActivity, useJobStandings, useJobs, useLibraries, useQueueState, useSettings } from "@/lib/queries";
import { href, openSheet, updateParams, type Route } from "@/lib/router";
import type { ActivityEntry, ActivityLevel, Job } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE = 50;
const EMPTY_JOBS: Job[] = [];

/** One panel: the theme surface, a divider border and the panel radius, with rows inside. */
const PANEL = "overflow-hidden rounded-panel border border-line bg-surface";

/** A list row's padding: 24px at the sides, 18px at 520px and below. */
const ROW = "px-[18px] py-3.5 roomy:px-6";

function openJob(job: Job) {
  openSheet({ job: job.id });
}

function useLibraryName() {
  const libraries = useLibraries();
  return (id: string) => libraries.data?.find((l) => l.id === id)?.name ?? "";
}

/** A library's current minimum saving, to name it when a result fell short of it. */
function useMinSavings() {
  const libraries = useLibraries();
  return (id: string) => libraries.data?.find((l) => l.id === id)?.profile.min_savings_pct;
}

function ListSkeleton() {
  return (
    <div className={cn(PANEL, "divide-y divide-line")}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={cn(ROW, "flex min-h-[73px] items-center gap-4")}>
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** An empty state in its panel (it has no box of its own). */
function Empty({ title, children, action }: { title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={PANEL}>
      <EmptyState title={title} action={action}>
        {children}
      </EmptyState>
    </div>
  );
}

/**
 * A list that couldn't load: an error with a retry instead of an empty
 * state that would claim there is nothing.
 */
function LoadFailed({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Callout
      tone="danger"
      title="Couldn't load the queue"
      action={
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      {errorMessage(error)}
    </Callout>
  );
}

/** Above a list that failed to refresh but still shows what it last had. */
function StaleNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="status" className="mb-3 text-meta text-muted">
      Showing the last known state. Couldn&apos;t refresh just now; trying again shortly.
    </p>
  );
}

/** Empty states point at adding a library when there are none yet. */
function useNoLibraries(): boolean {
  const libraries = useLibraries();
  return libraries.data !== undefined && libraries.data.length === 0;
}

function AddLibraryEmpty({ title }: { title: ReactNode }) {
  return (
    <Empty
      title={title}
      action={
        <a href={href("/libraries/new")} className={buttonVariants({ variant: "primary" })}>
          Add a library
        </a>
      }
    >
      Add a folder of videos first. Files that are worth converting are queued automatically after it&apos;s scanned.
    </Empty>
  );
}

function RunningTab() {
  const running = useJobs({ state: "running", limit: 50 });
  const queue = useQueueState();
  const noLibraries = useNoLibraries();
  if (running.isPending) {
    return (
      <div className={PANEL}>
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    );
  }
  if (running.error && !running.data) return <LoadFailed error={running.error} onRetry={() => running.refetch()} />;
  const items = running.data?.items ?? [];
  if (!items.length) {
    if (noLibraries) return <AddLibraryEmpty title="Nothing to convert yet" />;
    if (queue.data?.paused) {
      return (
        <Empty title="The queue is paused">
          {queue.data.queued
            ? `${plural(queue.data.queued, "file")} waiting. Nothing new starts until you resume.`
            : "Nothing new starts until you resume."}
        </Empty>
      );
    }
    if (queue.data && queue.data.running > 0) {
      // A job just started; its row arrives with the next list refresh.
      return (
        <div className={PANEL} aria-busy="true" aria-label="Loading what's converting">
          <JobCardSkeleton />
        </div>
      );
    }
    return (
      <Empty title="Nothing is converting">
        Files in the queue start automatically, a few at a time. How many run at once is set in{" "}
        <a href={href("/settings/processing")} className="text-ink underline">
          Settings › Processing
        </a>
        .
      </Empty>
    );
  }
  return (
    <>
      <StaleNote show={Boolean(running.error)} />
      <div className={PANEL}>
        {items.map((job, i) => (
          <JobCard key={job.id} job={job} onOpen={openJob} announce={i === 0} />
        ))}
      </div>
    </>
  );
}

function UpNextTab({ offset }: { offset: number }) {
  const queued = useJobs({ state: "queued", limit: PAGE, offset });
  const libraryName = useLibraryName();
  const noLibraries = useNoLibraries();
  const { cancel, moveToTop } = useJobActions();
  useClampedOffset(offset, queued.data?.total, PAGE);
  if (queued.isPending) return <ListSkeleton />;
  if (queued.error && !queued.data) return <LoadFailed error={queued.error} onRetry={() => queued.refetch()} />;
  const items = queued.data?.items ?? [];
  if (!items.length) {
    if (offset > 0 && (queued.data?.total ?? 0) > 0) return <ListSkeleton />;
    if (noLibraries) return <AddLibraryEmpty title="The queue is empty" />;
    return (
      <Empty title="The queue is empty">
        New files are added automatically after each scan. You can also queue files from a library.
      </Empty>
    );
  }
  return (
    <>
      <StaleNote show={Boolean(queued.error)} />
      <ol className={cn(PANEL, "divide-y divide-line")}>
        {items.map((job, i) => (
          <li key={job.id} className={cn(ROW, "flex flex-wrap items-center gap-x-4 gap-y-2 roomy:flex-nowrap")}>
            <span className="w-7 shrink-0 text-right text-meta text-muted tabular">
              <span className="sr-only">Position </span>
              {offset + i + 1}
            </span>
            <button
              type="button"
              onClick={() => openJob(job)}
              className="group/name flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
            >
              <FileName name={job.file_name} className="text-sm font-label text-ink group-hover/name:underline" />
              <span className="block truncate text-meta text-muted">
                {[libraryName(job.library_id), formatBytes(job.input_size), `added ${formatRelative(job.created_at)}`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </button>
            {/* Words, not bare icons: a lone ✕ beside a file name reads as "delete the file". Under the
                name at 520px and below, with the words lined up with it. */}
            <div className="-ml-3 flex w-full shrink-0 gap-1 pl-11 roomy:ml-0 roomy:w-auto roomy:pl-0">
              {offset + i > 0 ? (
                <Button
                  variant="quiet"
                  size="sm"
                  aria-label={`Move ${job.file_name} to the top`}
                  disabled={moveToTop.isPending}
                  onClick={() => moveToTop.mutate(job)}
                  needsServer
                >
                  Move to top
                </Button>
              ) : null}
              <Button
                variant="quiet"
                size="sm"
                aria-label={`Remove ${job.file_name} from the queue`}
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(job)}
                needsServer
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Pager
        offset={offset}
        limit={PAGE}
        total={queued.data?.total ?? 0}
        onPage={(next) => updateParams({ offset: next || null })}
        noun="files"
      />
    </>
  );
}

function HistoryTab({ offset }: { offset: number }) {
  const history = useJobs({ state: "history", limit: PAGE, offset });
  const libraryName = useLibraryName();
  const minSavings = useMinSavings();
  const outputMode = useSettings().data?.output_mode;
  const { retry, clearHistory } = useJobActions();
  const [confirmClear, setConfirmClear] = useState(false);
  const items = history.data?.items ?? EMPTY_JOBS;
  const standings = useJobStandings(items);
  useClampedOffset(offset, history.data?.total, PAGE);
  if (history.isPending) return <ListSkeleton />;
  if (history.error && !history.data) return <LoadFailed error={history.error} onRetry={() => history.refetch()} />;
  if (!items.length) {
    if (offset > 0 && (history.data?.total ?? 0) > 0) return <ListSkeleton />;
    return (
      <Empty title="No history yet">
        Every finished, skipped or failed conversion is listed here with its checks and savings.
      </Empty>
    );
  }
  return (
    <>
      <StaleNote show={Boolean(history.error)} />
      <div className="-mt-2 mb-2 flex justify-end">
        <Button variant="quiet" size="sm" onClick={() => setConfirmClear(true)} needsServer>
          Clear history
        </Button>
      </div>
      <ul className={cn(PANEL, "divide-y divide-line")}>
        {items.map((job) => {
          const standing = standings.get(job.id) ?? "current";
          // Retrying a damaged original can't help; its sheet offers the fix.
          // A file that is converted (kept as converted, or converted since)
          // or queued again has nothing to retry; converting it again asks
          // first, in its sheet. No button until the file has been read.
          const retryable =
            standing === "current" && (job.state === "cancelled" || (job.state === "failed" && !isUnreadable(job)));
          // A conversion that changed the file's extension is listed by the new name, the old one secondary.
          const renamed = newFileName(job, undefined, outputMode);
          return (
            <li
              key={job.id}
              className={cn(ROW, "flex flex-col items-start gap-2 roomy:flex-row roomy:items-center roomy:gap-4")}
            >
              <button
                type="button"
                onClick={() => openJob(job)}
                className="group/name min-h-11 w-full min-w-0 text-left roomy:w-auto roomy:flex-1"
              >
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <FileName
                    name={renamed ?? job.file_name}
                    className="text-sm font-label text-ink group-hover/name:underline"
                  />
                  <JobStateBadge job={job} standing={standing} />
                </span>
                {renamed ? <WasName name={job.file_name} className="mt-0.5" /> : null}
                {/* When the note wraps, the library and time start their own line, with no stray "·". */}
                <span className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className={cn("min-w-0 text-meta", job.state === "done" ? "text-ink" : "text-muted")}>
                    {standing === "unknown" ? (
                      <span aria-hidden className="skeleton inline-block h-3 w-40 align-middle" />
                    ) : (
                      historyNote(job, minSavings(job.library_id), standing)
                    )}
                  </span>
                  <span className="text-xs text-muted">
                    {[libraryName(job.library_id), formatRelative(job.finished_at)].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
              {retryable ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => retry.mutate(job)}
                  disabled={retry.isPending}
                  aria-label={`${job.state === "failed" ? "Try again" : "Queue again"}: ${job.file_name}`}
                  needsServer
                >
                  {job.state === "failed" ? "Try again" : "Queue again"}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Pager
        offset={offset}
        limit={PAGE}
        total={history.data?.total ?? 0}
        onPage={(next) => updateParams({ offset: next || null })}
        noun="results"
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear the history?"
        confirmLabel="Clear history"
        loading={clearHistory.isPending}
        onConfirm={() => clearHistory.mutate(undefined, { onSettled: () => setConfirmClear(false) })}
      >
        <p>This removes the list of finished conversions, including their checks and logs.</p>
        <p>Your files and their status in each library stay exactly as they are.</p>
      </ConfirmDialog>
    </>
  );
}

const LOG_ICON: Record<ActivityLevel, ReactNode> = {
  info: <ScanSearch className="text-muted" aria-hidden />,
  success: <CircleCheck className="text-ok" aria-hidden />,
  warning: <TriangleAlert className="text-warn" aria-hidden />,
  error: <CircleX className="text-error" aria-hidden />,
};

/**
 * An entry's tone. A damaged original is the file's problem, not a failed
 * conversion: amber, as everywhere else ("Can't be read").
 */
export function logLevel(entry: Pick<ActivityEntry, "level" | "message" | "problem">): ActivityLevel {
  return entry.level === "error" && entryIsUnreadable(entry) ? "warning" : entry.level;
}

/** Scans, warnings and problems as they happened, closed until wanted. */
function Log() {
  const activity = useActivity();
  const items = activity.data?.items.filter((e) => e.level !== "success").slice(0, 30) ?? [];
  if (!items.length) return null;
  return (
    <Disclosure title="Log: scans, warnings and problems" className="mt-10">
      <ol className="flex flex-col gap-3">
        {items.map((entry) => (
          <li key={entry.id} className="flex gap-2.5 text-sm leading-[1.5] [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0">
            {LOG_ICON[logLevel(entry)]}
            <span className="sr-only">{logLevel(entry)}:</span>
            <span className="min-w-0 flex-1 text-ink">{entry.message}</span>
            <span className="shrink-0 pt-0.5 text-xs text-muted">{formatRelative(entry.at)}</span>
          </li>
        ))}
      </ol>
    </Disclosure>
  );
}

export function QueueScreen({ route }: { route: Route }) {
  const tab = route.segments[1] === "next" ? "next" : route.segments[1] === "history" ? "history" : "running";
  const queue = useQueueState();
  const settings = useSettings();
  const history = useJobs({ state: "history", limit: 1 });
  const noLibraries = useNoLibraries();
  const offset = Math.max(0, Number(route.params.get("offset")) || 0);
  const q = queue.data;
  // Pause and Stop only mean something while there's work, or while paused.
  const controls = q && !noLibraries && (q.running > 0 || q.queued > 0 || q.paused);
  return (
    <div>
      <PageHeader
        title="Queue"
        description={q ? (noLibraries ? "Add a library to start converting." : queueSentence(q, settings.data)) : " "}
        actions={controls ? <QueueControls queue={q} /> : null}
      />
      <NavTabs
        label="Queue views"
        className="mb-6"
        tabs={[
          { href: href("/queue"), label: "Running", active: tab === "running", count: queue.data?.running },
          { href: href("/queue/next"), label: "Up next", active: tab === "next", count: queue.data?.queued },
          { href: href("/queue/history"), label: "History", active: tab === "history", count: history.data?.total },
        ]}
      />
      {tab === "running" ? <RunningTab /> : null}
      {tab === "next" ? <UpNextTab offset={offset} /> : null}
      {tab === "history" ? (
        <>
          <HistoryTab offset={offset} />
          <Log />
        </>
      ) : null}
    </div>
  );
}
