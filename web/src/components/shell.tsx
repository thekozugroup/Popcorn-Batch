"use client";

/**
 * App frame, as in Popcorn SR: a 228px sidebar from 801px (the brand, the
 * four sections, the libraries and a footer with the queue status and the
 * version) that becomes a compact top block at 800px and below (the brand
 * and the queue status on one line, then the four sections). Nothing is
 * fixed to the viewport. Also the quiet status pieces that live in the
 * frame: the queue status link, "Reconnecting…" and, when its address is
 * set, the link to Popcorn SR.
 */

import { ArrowUpRight, LoaderCircle, WifiOff } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Brand } from "@/components/brand";
import { finishedText } from "@/components/library-bar";
import { buttonVariants } from "@/components/ui/button";
import { Callout, StatusDot } from "@/components/ui/display";
import { Tooltip } from "@/components/ui/overlays";
import { settlingBrief } from "@/lib/convertible";
import { formatHour, plural } from "@/lib/format";
import { popcornSrLink } from "@/lib/popcorn-sr";
import { useFailures, useLibraries, useQueueState, useSettings, useSetupProblems, useSystem } from "@/lib/queries";
import { href, type Route } from "@/lib/router";
import { useLive, useServerDown, type ConnectionState } from "@/lib/store";
import type { Library, QueueState, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

type Section = "overview" | "libraries" | "queue" | "settings" | "none";

function sectionOf(route: Route): Section {
  const [first] = route.segments;
  if (!first) return "overview";
  if (first === "queue") return "queue";
  if (first === "library" || first === "libraries") return "libraries";
  if (first === "settings") return "settings";
  return "none";
}

/** Whether any library is being scanned (from the library list or live events). */
export function useAnyScanning(): boolean {
  const libraries = useLibraries();
  const liveScan = useLive((s) => Object.values(s.scans).some((scan) => scan.phase !== "done"));
  return liveScan || Boolean(libraries.data?.some((l) => l.scanning));
}

/** The colour of the queue status dot: Action Blue, amber, emerald or Zinc Status. */
export type QueueDot = "accent" | "warning" | "success" | "info";

/**
 * Queue state in a few words, e.g. "Converting 2 files" or "Paused", with
 * the colour of its dot. Once nothing is running or waiting, a setup
 * problem that stops conversions (`blocked`, see `useSetupProblems`) reads
 * "Needs a fix", never the calm "Watching for new files".
 */
export function queueSummary(
  queue: QueueState | undefined,
  settings: Settings | undefined,
  scanning = false,
  blocked = false,
): { text: string; tone: "active" | "paused" | "idle" | "waiting" | "blocked"; dot: QueueDot } {
  if (!queue) return { text: "Loading…", tone: "idle", dot: "info" };
  if (queue.paused) {
    // Pausing is still work in progress; paused is a deliberate wait.
    return queue.running
      ? { text: `Pausing · ${plural(queue.running, "file")} finishing`, tone: "paused", dot: "accent" }
      : { text: "Paused", tone: "paused", dot: "info" };
  }
  if (queue.running > 0) return { text: `Converting ${plural(queue.running, "file")}`, tone: "active", dot: "accent" };
  if (queue.waiting_for_schedule) {
    const hours = settings?.active_hours;
    return {
      text: hours ? `Starts at ${formatHour(hours.start)}` : "Waiting for active hours",
      tone: "waiting",
      dot: "info",
    };
  }
  if (queue.queued > 0) return { text: `${plural(queue.queued, "file")} waiting`, tone: "waiting", dot: "info" };
  if (scanning) return { text: "Scanning", tone: "waiting", dot: "info" };
  if (blocked) return { text: "Needs a fix", tone: "blocked", dot: "warning" };
  return {
    text: settings?.watch_folders === false ? "All caught up" : "Watching for new files",
    tone: "idle",
    dot: "success",
  };
}

/**
 * The queue's state as a link to the Queue (or, for a setup problem, to the
 * overview that explains it): a 7px dot and the words. While the live
 * connection is down it shows the last known state with a hollow dot.
 */
function QueueStatusLink({ className }: { className?: string }) {
  const queue = useQueueState();
  const settings = useSettings();
  const libraries = useLibraries();
  const scanning = useAnyScanning();
  const blocked = useSetupProblems().open;
  const connection = useLive((s) => s.connection);
  const polling = useLive((s) => s.polling);
  const serverDown = useLive((s) => s.serverDown);
  // The banner is up: the server can't be reached.
  const away = useServerDown();
  const summary = queueSummary(queue.data, settings.data, scanning, blocked);
  // No folder is watched yet: there's no queue state worth showing.
  if (libraries.data?.length === 0) return null;
  // Without live updates (and before polling catches up), or while the
  // server can't be reached, this is only the last known state.
  const stale = connection !== "open" && (serverDown || !polling);
  const lastKnown = `Last known: ${summary.text.charAt(0).toLowerCase()}${summary.text.slice(1)}`;
  return (
    <a
      // A setup problem is explained, with its fix, under "Needs your attention" on the overview.
      href={summary.tone === "blocked" ? href("/") : href("/queue")}
      title={stale ? lastKnown : undefined}
      className={cn(
        "inline-flex min-h-11 min-w-0 items-center gap-2 rounded-control px-3.5 py-3 text-[13px] whitespace-nowrap text-muted no-underline hover:bg-subtle hover:text-ink",
        className,
      )}
    >
      {/* Stale: a hollow dot, so it can't be mistaken for a live state. */}
      {stale ? (
        <span aria-hidden className="size-[7px] shrink-0 rounded-full border border-field" />
      ) : (
        <StatusDot tone={summary.dot} />
      )}
      <span className="truncate">{away ? "Not connected" : summary.text}</span>
      {stale ? <span className="sr-only"> ({away ? lastKnown : "last known state"})</span> : null}
    </a>
  );
}

const CONNECTION_TEXT: Record<Exclude<ConnectionState, "open">, string> = {
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  unavailable: "Live updates off",
};

/**
 * Shown only while the live connection is down. `compact` (the top block at
 * 800px and below) keeps just an icon, with the words for screen readers
 * and as a tooltip.
 */
function ConnectionNotice({ className, compact = false }: { className?: string; compact?: boolean }) {
  const connection = useLive((s) => s.connection);
  const polling = useLive((s) => s.polling);
  const serverDown = useLive((s) => s.serverDown);
  // The banner above every screen already says the server is away.
  const bannerShown = useServerDown();
  if (connection === "open" || bannerShown) return null;
  const text = serverDown ? "Server not answering" : CONNECTION_TEXT[connection];
  const detail = serverDown
    ? "Trying again every few seconds."
    : polling
      ? "Refreshing every 5 seconds instead."
      : undefined;
  if (!compact) {
    return (
      <p role="status" className={cn("px-3.5 py-1 text-[13px] leading-[1.5] text-muted", className)}>
        {text}
        {detail ? <span className="block text-xs">{detail}</span> : null}
      </p>
    );
  }
  return (
    <Tooltip content={detail ? `${text}. ${detail}` : text}>
      <p
        role="status"
        tabIndex={0}
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-control text-muted [&_svg]:size-4 [&_svg]:shrink-0",
          className,
        )}
      >
        {connection === "connecting" ? <LoaderCircle className="spin" aria-hidden /> : <WifiOff aria-hidden />}
        <span className="sr-only">
          {text}
          {detail ? ` ${detail}` : null}
        </span>
      </p>
    </Tooltip>
  );
}

/**
 * A calm note above every screen while the server can't be reached (the
 * container stopped or is restarting). What's on screen stays as it was, and
 * the app reconnects on its own; nothing needs reloading.
 */
function ServerDownBanner() {
  const show = useServerDown();
  return (
    <div role="status" aria-live="polite">
      {show ? (
        <Callout className="mb-8" title="Can't reach Popcorn Batch right now">
          It may be restarting. You&apos;re seeing the last known state; actions come back when it does, and this page
          reconnects on its own.
        </Callout>
      ) : null}
    </div>
  );
}

/**
 * "Open Popcorn SR", only when its address is saved and passes the checks:
 * a link that opens it in a new tab (and says so to screen readers). Never
 * a connection state: Popcorn Batch doesn't contact Popcorn SR. A quiet
 * button in the sidebar footer, a secondary one in Settings › About.
 */
export function PopcornSrLink({ variant, className }: { variant: "quiet" | "secondary"; className?: string }) {
  const settings = useSettings();
  const address = popcornSrLink(settings.data);
  if (!address) return null;
  return (
    <a
      href={address}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant, size: "sm" }), className)}
    >
      Open Popcorn SR
      <span className="sr-only"> (opens in a new tab)</span>
      <ArrowUpRight aria-hidden />
    </a>
  );
}

/** A section of the main navigation: text only, 44px, the subtle fill when current or hovered. */
function NavItem({ to, current, children }: { to: string; current: "page" | "true" | undefined; children: ReactNode }) {
  return (
    <a
      href={to}
      aria-current={current}
      className={cn(
        "flex min-h-11 min-w-0 items-center justify-center rounded-control px-0.5 py-2.5 text-center text-xs font-medium no-underline wide:justify-start wide:px-3.5 wide:py-3 wide:text-left wide:text-sm",
        current ? "bg-subtle text-ink" : "text-muted hover:bg-subtle hover:text-ink",
      )}
    >
      <span className="truncate">{children}</span>
    </a>
  );
}

/** A library in the sidebar: its name and its state, one step from anywhere. */
export function LibraryLink({ library, active }: { library: Library; active: boolean }) {
  const scan = useLive((s) => s.scans[library.id]);
  const failures = useFailures();
  const unreadable = failures.byLibrary[library.id]?.unreadable ?? 0;
  const scanning = library.scanning || Boolean(scan && scan.phase !== "done");
  let detail: ReactNode;
  if (library.path_error) {
    detail = (
      <span className="inline-flex items-center gap-1.5">
        <StatusDot tone="warning" />
        Folder missing
      </span>
    );
  } else if (!library.enabled) {
    detail = "Paused";
  } else if (scanning) {
    detail = "Scanning";
  } else if (library.stats.file_count === 0) {
    detail = library.stats.settling > 0 ? settlingBrief(library.stats.settling) : "No files yet";
  } else {
    // Not "100% finished" while a file is still arriving.
    detail = finishedText(library.stats, unreadable) ?? settlingBrief(library.stats.settling);
  }
  return (
    <a
      href={href(`/library/${library.id}`)}
      aria-current={active ? "page" : undefined}
      className={cn(
        // Full width in a scrolling list: the focus outline sits inside so it isn't clipped.
        "block min-h-11 rounded-control px-3.5 py-2 no-underline -outline-offset-2",
        active ? "bg-subtle" : "hover:bg-subtle",
      )}
    >
      <span className="block truncate text-sm font-medium text-ink">{library.name}</span>
      <span className="mt-0.5 block truncate text-xs text-muted tabular">{detail}</span>
    </a>
  );
}

/**
 * The sidebar from 801px, and the compact top block at 800px and below: one
 * element for every width.
 */
function Sidebar({ route }: { route: Route }) {
  const section = sectionOf(route);
  const libraries = useLibraries();
  const system = useSystem();
  const activeLibrary = route.segments[0] === "library" ? route.segments[1] : undefined;
  const current = (key: Section): "page" | "true" | undefined => {
    if (section !== key) return undefined;
    // Inside one library the section is current, and the library's own item is the page.
    return key === "libraries" && activeLibrary ? "true" : "page";
  };
  return (
    <aside
      aria-label="Main"
      className="relative flex min-w-0 flex-col gap-[18px] border-b border-line bg-surface px-5 pt-[18px] pb-2 wide:sticky wide:top-0 wide:h-dvh wide:gap-10 wide:border-r wide:border-b-0 wide:px-5 wide:py-8"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <a
          href={href("/")}
          className="flex min-h-11 shrink-0 items-center rounded-control no-underline"
          aria-label="Popcorn Batch overview"
        >
          <Brand />
        </a>
        <div className="flex min-w-0 items-center gap-1 wide:hidden">
          <ConnectionNotice compact />
          <QueueStatusLink className="max-w-48 -mr-3.5" />
        </div>
      </div>
      <nav aria-label="Sections" className="grid grid-cols-4 wide:grid-cols-1 wide:gap-1.5">
        <NavItem to={href("/")} current={current("overview")}>
          Overview
        </NavItem>
        <NavItem to={href("/libraries")} current={current("libraries")}>
          Libraries
        </NavItem>
        <NavItem to={href("/queue")} current={current("queue")}>
          Queue
        </NavItem>
        <NavItem to={href("/settings")} current={current("settings")}>
          Settings
        </NavItem>
      </nav>
      {/* The item above already says "Libraries"; this list keeps the name for screen readers. */}
      <nav
        aria-label="Libraries"
        className="-mt-4 hidden min-h-0 flex-1 content-start gap-0.5 overflow-y-auto border-t border-line pt-4 wide:grid"
      >
        {libraries.data?.map((library) => (
          <LibraryLink key={library.id} library={library} active={library.id === activeLibrary} />
        ))}
        {libraries.isPending ? (
          <div className="space-y-2 px-3.5 py-2">
            <div className="skeleton h-3.5 w-28" />
            <div className="skeleton h-3 w-16" />
          </div>
        ) : null}
        <a
          href={href("/libraries/new")}
          className="flex min-h-11 items-center rounded-control px-3.5 py-2 text-sm font-medium text-muted no-underline -outline-offset-2 hover:bg-subtle hover:text-ink"
        >
          Add library
        </a>
      </nav>
      <div className="mt-auto hidden gap-1 border-t border-line pt-4 wide:grid">
        <QueueStatusLink className="w-full" />
        <ConnectionNotice />
        <PopcornSrLink variant="quiet" className="w-full justify-start px-3.5" />
        {system.data?.version ? (
          <p className="px-3.5 pt-1 text-xs text-muted tabular">Version {system.data.version}</p>
        ) : null}
      </div>
    </aside>
  );
}

/** The frame around every screen except first-run setup. */
export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  // Hash navigation keeps the old scroll position and focus. On a new screen,
  // start at the top and move focus to the content so screen readers follow.
  const screen = route.segments.join("/");
  const previous = useRef(screen);
  useEffect(() => {
    if (previous.current === screen) return;
    previous.current = screen;
    window.scrollTo({ top: 0 });
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [screen]);

  return (
    // Below 801px the top block keeps its own height; the main region takes what's left.
    <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] wide:grid-cols-[228px_minmax(0,1fr)] wide:grid-rows-none">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
        className={cn(buttonVariants({ variant: "secondary" }), "absolute -top-20 left-4 z-50 focus:top-4")}
      >
        Skip to content
      </a>
      <Sidebar route={route} />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1320px] min-w-0 px-5 pt-6 pb-12 outline-none wide:p-[clamp(24px,5vw,64px)]"
      >
        <ServerDownBanner />
        {/* Each section enters with Popcorn SR's short fade and rise. */}
        <div key={route.segments[0] ?? ""} className="view">
          {children}
        </div>
      </main>
    </div>
  );
}

/** Screen title (the headline token) with optional description and actions. */
export function PageHeader({
  title,
  description,
  actions,
  children,
  inlineActions = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** Keep a small action (a "…" menu) beside the title on phones too. */
  inlineActions?: boolean;
}) {
  return (
    <header
      className={cn(
        "mb-8 flex items-start justify-between gap-6",
        !inlineActions && "max-roomy:flex-col max-roomy:gap-4",
      )}
    >
      <div className="min-w-0">
        <h1 className="text-3xl leading-[1.2] font-semibold tracking-[-0.025em] break-words text-ink max-roomy:text-[28px]">
          {title}
        </h1>
        {description ? <div className="mt-2.5 max-w-[58ch] text-base leading-[1.6] text-muted">{description}</div> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 roomy:shrink-0">{actions}</div> : null}
    </header>
  );
}
