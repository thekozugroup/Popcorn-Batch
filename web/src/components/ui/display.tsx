"use client";

/** Small display building blocks shared by every screen. */

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";
import { cn, copyText } from "@/lib/utils";
import { Button } from "./button";

/** Placeholder block while content loads (it pulses only when motion is allowed). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("skeleton h-4", className)} {...props} />;
}

interface MeterProps {
  /**
   * 0..100, or `null` while the share isn't known: an indeterminate bar (a
   * band moving along it when motion is allowed; with reduced motion only
   * the words beside it say so).
   */
  value: number | null;
  label: string;
  /** What the bar stands for in words, for screen readers ("1,017 frames, 6 min elapsed"). */
  valueText?: string;
  className?: string;
  tone?: "accent" | "success" | "danger" | "muted";
}

const meterTone: Record<NonNullable<MeterProps["tone"]>, string> = {
  accent: "bg-accent",
  success: "bg-ok",
  danger: "bg-error",
  muted: "bg-field",
};

/** A 5px progress bar with a proper progressbar role. It is never decorative. */
export function Meter({ value, label, valueText, className, tone = "accent" }: MeterProps) {
  const track = "h-[5px] w-full overflow-hidden rounded-progress bg-subtle";
  if (value === null) {
    // No aria-valuenow: an indeterminate progressbar.
    return (
      <div
        role="progressbar"
        aria-label={label}
        aria-valuetext={valueText}
        data-indeterminate=""
        className={cn("meter-indeterminate", track, className)}
      >
        <div className={cn("meter-indeterminate-band h-full rounded-progress", meterTone[tone])} />
      </div>
    );
  }
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={valueText}
      className={cn(track, className)}
    >
      <div
        className={cn("progress-fill h-full w-full rounded-progress", meterTone[tone])}
        style={{ clipPath: `inset(0 ${100 - clamped}% 0 0 round 4px)` }}
      />
    </div>
  );
}

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

/**
 * The status dot of each tone. A neutral tag has none; `info` is the Zinc
 * Status dot of a waiting, skipped or kept state.
 */
const toneDot: Record<Tone, string | null> = {
  neutral: null,
  info: "bg-field",
  accent: "bg-accent",
  success: "bg-ok",
  warning: "bg-warn",
  danger: "bg-error",
};

/** A 7px status dot, the only place a status colour appears beside words. */
export function StatusDot({ tone, className }: { tone: Exclude<Tone, "neutral">; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-[7px] shrink-0 rounded-full", toneDot[tone], className)} />;
}

/**
 * A tag: describes a state, never clickable. Subtle fill, supporting text,
 * the tag radius; a status tag starts with a 7px dot (its `tone`), a
 * descriptive one (Best fit, Default, NVIDIA GPU) has none. The words carry
 * the meaning; the dot only repeats it.
 */
export function Tag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  /** @deprecated Tags have no icon; it is ignored. Remove it at the call site. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const dot = toneDot[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-[7px] rounded-tag bg-subtle px-[9px] py-[5px] text-xs leading-[1.4] whitespace-nowrap text-muted",
        className,
      )}
    >
      {dot ? <span aria-hidden className={cn("size-[7px] shrink-0 rounded-full", dot)} /> : null}
      {children}
    </span>
  );
}

/** The former name of `Tag`, kept until every call site uses `Tag`. */
export const Badge = Tag;

/**
 * A message: setup hints, failures, notes. Subtle fill, neutral text, and
 * its tone as a 1px border only (none for information, emerald for success,
 * amber for a warning, red for an error). No icon.
 */
export function Callout({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-control border bg-subtle px-[18px] py-[14px] text-sm leading-[1.6] [overflow-wrap:anywhere] text-ink",
        tone === "info" && "border-transparent",
        tone === "warning" && "border-warn",
        tone === "danger" && "border-error",
        tone === "success" && "border-ok",
        className,
      )}
    >
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1">{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** Copy a string; the button reads "Copied" for a moment and says so to screen readers. */
export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const onCopy = async () => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy. Select the text and copy it by hand.");
    }
  };
  return (
    <Button variant="secondary" size="sm" onClick={onCopy} className={className}>
      {copied ? "Copied" : label}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </Button>
  );
}

/** Monospace block for commands and logs, with a copy button. */
export function CodeBlock({
  code,
  label,
  className,
  maxHeight = "16rem",
  wrap = true,
}: {
  code: string;
  label: string;
  className?: string;
  maxHeight?: string;
  wrap?: boolean;
}) {
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-control border border-line bg-subtle", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line py-1.5 pr-1.5 pl-3.5">
        <span className="text-xs text-muted">{label}</span>
        <CopyButton text={code} label="Copy" />
      </div>
      <pre
        tabIndex={0}
        aria-label={label}
        className={cn(
          "overflow-auto px-3.5 py-3 font-mono text-[13px] leading-[1.6] text-ink -outline-offset-2",
          wrap ? "break-all whitespace-pre-wrap" : "whitespace-pre",
        )}
        style={{ maxHeight }}
      >
        {code}
      </pre>
    </div>
  );
}

/**
 * Teaches what belongs in an empty area and the next step. It has no box of
 * its own: callers put it inside a panel.
 */
export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  /** @deprecated Empty states have no icon; it is ignored. Remove it at the call site. */
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-11 text-center", className)}>
      <p className="text-base font-semibold text-ink">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-[42ch] text-sm leading-[1.6] text-muted">{children}</div> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Heading for a block within a page (title token: 20px, 600). */
export function SectionHeading({
  title,
  description,
  action,
  id,
  className,
  quietAction = true,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
  /**
   * The action starts with a borderless button, whose text is pulled left
   * to line up with the heading when it wraps below it. Pass `false` for a
   * bordered one, whose edge must line up instead.
   */
  quietAction?: boolean;
}) {
  // The action sits beside the heading at every width ("Libraries · Add
  // library"); only a row of several controls that can't fit wraps below.
  return (
    <div className={cn("mt-0 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-xl leading-[1.4] font-semibold tracking-[-0.025em] text-ink">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? (
        // Pulled left so a wrapped borderless button's text lines up with
        // the heading; beside it, the margin only widens the gap.
        <div className={cn("flex max-w-full shrink-0 flex-wrap items-center gap-2", quietAction && "-ml-2.5 roomy:ml-0")}>
          {action}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A closed section under a divider: "Technical details" (codecs, encoder
 * names, similarity scores, ffmpeg commands and logs), the Log, encoders.
 */
export function Disclosure({
  title = "Technical details",
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group mt-6 border-t border-line pt-3", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-[550] text-ink select-none [&::-webkit-details-marker]:hidden">
        {/* Turns with its own disclosure only, so one inside an open one still looks closed. */}
        <ChevronRight
          className="size-4 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200 [details[open]>summary>&]:rotate-90"
          aria-hidden
        />
        {title}
      </summary>
      <div className="flex flex-col gap-4 pt-2 pb-2">{children}</div>
    </details>
  );
}

/** A label/value pair for detail lists. `mono` only for encoder names and raw ffprobe values. */
export function Detail({ label, children, mono }: { label: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-sm font-[550] break-words text-ink",
          mono && "font-mono text-[13px] font-normal",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
