"use client";

/**
 * Status vocabulary: every state has a word, and a status tag repeats it as
 * a 7px dot (see DESIGN.md, Colors › Status): emerald for passed, Action
 * Blue for working now, Zinc Status for waiting or left as it is, amber for
 * needs the user, red for failed. The words stay neutral.
 */

import { CircleCheck, CircleDashed, CircleMinus, CircleX, Clock, LoaderCircle, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Tag, type Tone } from "@/components/ui/display";
import { CHECK_STATUS_LABEL, FILE_STATUS_LABEL, HW_API_LABEL, JOB_STAGE_LABEL, JOB_STATE_LABEL } from "@/lib/labels";
import { KEPT_CONVERTED, failureGroup, setupProblem, type Failure, type JobStanding } from "@/lib/outcomes";
import type { CheckStatus, FileStatus, HwApi, Job, JobState } from "@/lib/types";
import { cn } from "@/lib/utils";

/** `info` is the Zinc Status dot of a waiting, skipped or kept state. */
const FILE_STATUS_TONE: Record<FileStatus, Tone> = {
  pending: "neutral",
  queued: "info",
  processing: "accent",
  done: "success",
  skipped: "info",
  failed: "danger",
};

const FILE_STATUS_ICON: Record<FileStatus, ReactNode> = {
  pending: <CircleDashed aria-hidden />,
  queued: <Clock aria-hidden />,
  processing: <LoaderCircle aria-hidden />,
  done: <CircleCheck aria-hidden />,
  skipped: <CircleMinus aria-hidden />,
  failed: <CircleX aria-hidden />,
};

/**
 * Icon for a file status.
 * @deprecated Filters and tags carry no icons in the Popcorn design; remove it at the call site.
 */
export function fileStatusIcon(status: FileStatus): ReactNode {
  return FILE_STATUS_ICON[status];
}

/**
 * A failure that isn't a failed conversion gets its own tag: a damaged
 * original is amber "Can't be read" (the fix is outside the app), a setup
 * problem amber "Needs a fix", a file moved or replaced meanwhile a neutral
 * "Moved or changed". `null` for a failed conversion, which reads "Failed".
 */
function FailureBadge({ failure }: { failure: Failure }) {
  switch (failureGroup(failure)) {
    case "unreadable":
      return <Tag tone="warning">Can&apos;t be read</Tag>;
    case "setup":
      return <Tag tone="warning">Needs a fix</Tag>;
    case "changed":
      return <Tag tone="info">Moved or changed</Tag>;
    default:
      return null;
  }
}

export function FileStatusBadge({
  status,
  progress,
  error,
  problem,
}: {
  status: FileStatus;
  progress?: number | null;
  /** The file's error and problem code, to tell the kinds of failure apart. */
  error?: string | null;
  problem?: Failure["problem"];
}) {
  const failure: Failure = { error: error ?? null, problem: problem ?? null };
  if (status === "failed" && failureGroup(failure) !== "conversion") return <FailureBadge failure={failure} />;
  const label =
    status === "processing" && progress !== null && progress !== undefined
      ? `${FILE_STATUS_LABEL[status]} ${Math.round(progress)}%`
      : FILE_STATUS_LABEL[status];
  return (
    <Tag tone={FILE_STATUS_TONE[status]} className="tabular">
      {label}
    </Tag>
  );
}

const JOB_STATE_TONE: Record<JobState, Tone> = {
  queued: "info",
  running: "accent",
  done: "success",
  skipped: "info",
  failed: "danger",
  cancelled: "info",
};

/**
 * Outcome of a job. Done and verified jobs read "Verified"; a skipped job
 * reads "Kept original" when a new file was made and thrown away (the size
 * rule), and "Skipped" when the file never needed work. Where the job
 * stands now (`standing`, see `jobStanding`) comes first: a second
 * conversion that left an already converted file as it was reads "Kept as
 * converted" (or "Needs a fix" when a setup problem stopped it), a failure
 * the file has moved past a plain grey "Failed", and a job whose file
 * hasn't been read yet a placeholder.
 */
export function JobStateBadge({
  job,
  standing = "current",
}: {
  job: Pick<Job, "state" | "stage" | "validation" | "output_size" | "error" | "problem">;
  standing?: JobStanding;
}) {
  if (standing === "unknown") return <span aria-hidden className="skeleton inline-block h-[27px] w-24 shrink-0" />;
  if (standing === "kept") {
    if (job.state === "failed" && setupProblem(job)) return <Tag tone="warning">Needs a fix</Tag>;
    return <Tag tone="info">{KEPT_CONVERTED}</Tag>;
  }
  if (job.state === "failed" && (standing === "converted" || standing === "queued")) {
    // Past tense and grey: the file has moved on, nothing to do here.
    return <Tag tone="info">{JOB_STATE_LABEL.failed}</Tag>;
  }
  if (job.state === "failed" && failureGroup(job) !== "conversion") return <FailureBadge failure={job} />;
  if (job.state === "done" && job.validation?.passed) return <Tag tone="success">Verified</Tag>;
  const label =
    job.state === "running"
      ? JOB_STAGE_LABEL[job.stage]
      : job.state === "skipped" && job.output_size !== null
        ? "Kept original"
        : JOB_STATE_LABEL[job.state];
  return <Tag tone={JOB_STATE_TONE[job.state]}>{label}</Tag>;
}

const CHECK_STYLE: Record<CheckStatus, { className: string; icon: ReactNode }> = {
  pass: { className: "text-ok", icon: <CircleCheck aria-hidden /> },
  warn: { className: "text-warn", icon: <TriangleAlert aria-hidden /> },
  fail: { className: "text-error", icon: <CircleX aria-hidden /> },
  skipped: { className: "text-field", icon: <CircleMinus aria-hidden /> },
};

/** A 16px icon for one verification check, with a hidden word for screen readers. */
export function CheckIcon({ status }: { status: CheckStatus }) {
  const style = CHECK_STYLE[status];
  return (
    <span className={cn("mt-0.5 shrink-0 [&_svg]:size-4", style.className)}>
      {style.icon}
      <span className="sr-only">{CHECK_STATUS_LABEL[status]}:</span>
    </span>
  );
}

/**
 * Where a job runs, as a descriptive tag ("NVIDIA GPU", "CPU"). The encoder
 * itself is named in the job's Technical details.
 */
export function EncoderBadge({ api }: { api: HwApi | null; encoder?: string | null }) {
  if (!api) return null;
  return <Tag>{HW_API_LABEL[api]}</Tag>;
}
