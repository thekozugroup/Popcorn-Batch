"use client";

/**
 * Root of the UI: decides between first-run setup, the "can't reach the
 * server" screen and the normal app, and maps hash routes to screens.
 */

import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { Brand } from "@/components/brand";
import { FileSheet } from "@/components/files";
import { JobSheet } from "@/components/jobs";
import { NavigationPrompt } from "@/components/save-bar";
import { Shell } from "@/components/shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { CodeBlock, EmptyState, Skeleton } from "@/components/ui/display";
import { ApiError, apiBase, errorMessage, isUuid } from "@/lib/api";
import { useLibraries, useSettings } from "@/lib/queries";
import { closeSheet, href, navigate, useRoute, type Route } from "@/lib/router";
import { AddLibraryScreen } from "@/screens/add-library";
import { LibrariesScreen } from "@/screens/libraries";
import { LibraryScreen } from "@/screens/library";
import { OverviewScreen } from "@/screens/overview";
import { QueueScreen } from "@/screens/queue";
import { SettingsScreen } from "@/screens/settings";
import { SetupScreen } from "@/screens/setup";

/** A flat panel: the surface, a 1px divider border, the panel radius. */
const PANEL = "rounded-panel border border-line bg-surface";

/** A screen outside the shell: one centred column. */
const FRAME = "grid min-h-dvh place-items-center px-5 py-10 roomy:px-6";

/** The page's one heading, in the headline token. */
const HEADLINE = "text-3xl leading-[1.2] font-semibold tracking-[-0.025em] break-words text-ink max-roomy:text-[28px]";

/** Catches render errors so one broken view never blanks the whole app. */
class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Popcorn Batch UI error", error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className={PANEL}>
          <EmptyState
            title="This view ran into a problem"
            action={
              <Button variant="primary" onClick={() => window.location.reload()}>
                Reload
              </Button>
            }
          >
            <p>Your files and settings are fine; only this page failed to draw.</p>
            <CodeBlock className="mt-4 text-left" code={this.state.error.message} label="Error" />
          </EmptyState>
        </div>
      );
    }
    return this.props.children;
  }
}

function titleFor(route: Route): string {
  const [first, second] = route.segments;
  switch (first) {
    case undefined:
      return "Overview";
    case "queue":
      return "Queue";
    case "libraries":
      return second === "new" ? "Add library" : "Libraries";
    case "library":
      return "Library";
    case "settings":
      return "Settings";
    case "setup":
      return "Welcome";
    default:
      return "Not found";
  }
}

function Screen({ route }: { route: Route }) {
  const [first, second] = route.segments;
  switch (first) {
    case undefined:
    case "setup":
      return <OverviewScreen />;
    case "queue":
      return <QueueScreen route={route} />;
    case "libraries":
      return second === "new" ? <AddLibraryScreen /> : <LibrariesScreen />;
    case "library":
      return second ? <LibraryScreen id={second} route={route} /> : <LibrariesScreen />;
    case "settings":
      return <SettingsScreen route={route} />;
    default:
      return (
        <div className={PANEL}>
          <EmptyState
            title="This page doesn't exist"
            action={
              <a href={href("/")} className={buttonVariants({ variant: "primary" })}>
                Go to overview
              </a>
            }
          >
            The link may be from an older version of Popcorn Batch.
          </EmptyState>
        </div>
      );
  }
}

/**
 * Job and file detail sheets, opened from any screen via `?job=` / `?file=`.
 * Ids that aren't UUIDs (a mangled or crafted link) are ignored.
 */
function RouteSheets({ route }: { route: Route }) {
  const jobParam = route.params.get("job");
  const fileParam = route.params.get("file");
  const jobId = isUuid(jobParam) ? jobParam : null;
  const fileId = isUuid(fileParam) ? fileParam : null;
  return (
    <>
      <JobSheet jobId={jobId} onClose={() => closeSheet(["job"])} />
      <FileSheet fileId={jobId ? null : fileId} onClose={() => closeSheet(["file"])} />
    </>
  );
}

/** The shell's shape while the first answers load: a sidebar of placeholders from 801px. */
function BootScreen() {
  return (
    <div
      className="grid min-h-dvh grid-cols-[minmax(0,1fr)] content-start wide:grid-cols-[228px_minmax(0,1fr)]"
      aria-busy="true"
      aria-label="Loading Popcorn Batch"
    >
      <div className="hidden flex-col gap-10 border-r border-line bg-surface px-5 py-8 wide:flex">
        <Brand />
        <div className="grid gap-1.5">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1320px] min-w-0 px-5 pt-6 pb-12 wide:p-[clamp(24px,5vw,64px)]">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="mt-8 h-40 w-full" />
        <Skeleton className="mt-6 h-28 w-full" />
      </div>
    </div>
  );
}

/**
 * The server refused this address (its DNS-rebinding guard): the fix is the
 * ALLOWED_HOSTS variable, or a reverse proxy passing the original Host
 * header. Nothing else on the generic checklist applies.
 */
export function HostNotAllowed({
  retrying,
  onRetry,
  host = typeof window === "undefined" ? "" : window.location.hostname,
}: {
  retrying: boolean;
  onRetry: () => void;
  /** The name the page was opened at; the browser's own by default. */
  host?: string;
}) {
  return (
    <div className={FRAME}>
      <div className="w-full max-w-lg min-w-0">
        <Brand className="mb-11" />
        {/* The wording of the docs and of the server's own error, so searching for either finds this screen. */}
        <h1 className={HEADLINE}>
          {host ? `Popcorn Batch doesn't answer to the address "${host}"` : "Popcorn Batch doesn't answer to this address"}
        </h1>
        <p className="mt-3 text-base leading-[1.6] text-muted">
          To protect your library, it only answers to addresses it recognises. Add{" "}
          <code className="text-[13px] break-all text-ink">{host || "this name"}</code> to the container&apos;s{" "}
          <code className="text-[13px] text-ink">ALLOWED_HOSTS</code> variable, then restart it.
        </p>
        <CodeBlock className="mt-5" code={`ALLOWED_HOSTS=${host || "media.example.com"}`} label="Container variable" />
        <p className="mt-4 text-[13px] leading-[1.6] text-muted">
          Behind a reverse proxy? Make it pass the original Host header, port included (in Nginx:{" "}
          <code className="text-[13px] text-ink">proxy_set_header Host $http_host;</code>).
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button variant="primary" onClick={onRetry} loading={retrying}>
            Try again
          </Button>
          <p role="status" className="text-[13px] text-muted">
            {retrying ? "Checking…" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function Unreachable({ error, retrying, onRetry }: { error: unknown; retrying: boolean; onRetry: () => void }) {
  const network = error instanceof ApiError && error.isUnavailable;
  if (error instanceof ApiError && error.code === "host_not_allowed") {
    return <HostNotAllowed retrying={retrying} onRetry={onRetry} />;
  }
  return (
    <div className={FRAME}>
      <div className="w-full max-w-lg min-w-0">
        <Brand className="mb-11" />
        <h1 className={HEADLINE}>{network ? "Can't reach Popcorn Batch" : "Popcorn Batch couldn't load"}</h1>
        <p className="mt-3 text-base leading-[1.6] text-muted">
          {network
            ? "The server isn't answering. It may be restarting or the container may have stopped. This page tries again every few seconds."
            : errorMessage(error)}
        </p>
        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-[1.6] text-ink marker:text-muted">
          <li>Check that the container is running (on Unraid: the Docker tab).</li>
          <li>Look at the container log for errors.</li>
          <li>
            The app is looking for its API at <code className="text-[13px] break-all">{apiBase()}</code>.
          </li>
        </ul>
        <div className="mt-8 flex items-center gap-3">
          <Button variant="primary" onClick={onRetry} loading={retrying}>
            Try again
          </Button>
          <p role="status" className="text-[13px] text-muted">
            {retrying ? "Checking…" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const settings = useSettings();
  const libraries = useLibraries();

  const needsSetup = settings.data !== undefined && libraries.data !== undefined && !settings.data.onboarded && libraries.data.length === 0;

  useEffect(() => {
    document.title = needsSetup ? "Welcome — Popcorn Batch" : `${titleFor(route)} — Popcorn Batch`;
  }, [route, needsSetup]);

  // Setup is only for the first run; send stale links to the overview.
  useEffect(() => {
    if (!needsSetup && settings.data && route.segments[0] === "setup") navigate("/", { replace: true });
  }, [needsSetup, settings.data, route.segments]);

  // Keep retrying quietly while the server is away.
  const failed = Boolean((settings.error && !settings.data) || (libraries.error && !libraries.data));
  const refetchSettings = settings.refetch;
  const refetchLibraries = libraries.refetch;
  useEffect(() => {
    if (!failed) return;
    const timer = setInterval(() => {
      void refetchSettings();
      void refetchLibraries();
    }, 5000);
    return () => clearInterval(timer);
  }, [failed, refetchSettings, refetchLibraries]);

  if (failed) {
    return (
      <Unreachable
        error={settings.error ?? libraries.error}
        retrying={settings.isFetching || libraries.isFetching}
        onRetry={() => {
          void settings.refetch();
          void libraries.refetch();
        }}
      />
    );
  }

  if (!settings.data || !libraries.data) return <BootScreen />;

  if (needsSetup) return <SetupScreen settings={settings.data} />;

  return (
    <Shell route={route}>
      <ErrorBoundary resetKey={route.segments.join("/")}>
        <Screen route={route} />
        <RouteSheets route={route} />
      </ErrorBoundary>
      <NavigationPrompt />
    </Shell>
  );
}
