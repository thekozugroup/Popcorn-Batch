"use client";

/**
 * One library: its progress, the file table (search, status filter, sort,
 * pages, bulk actions) and its settings (goal, quality, advanced, rename,
 * pause, remove).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Ellipsis, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { UseDriveButton, UseDriveConfirm } from "@/components/drive-change";
import { FileName } from "@/components/file-name";
import { LibraryBar, LibraryLegend, countedFiles, isWaiting } from "@/components/library-bar";
import { ProfileEditor } from "@/components/profile-editor";
import { SaveBar } from "@/components/save-bar";
import { SETTINGS_PANEL, SettingsSection } from "@/components/settings-section";
import { PageHeader } from "@/components/shell";
import { FileStatusBadge } from "@/components/status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/controls";
import { Callout, EmptyState, Skeleton, StatusDot, Tag } from "@/components/ui/display";
import { NavTabs, Pager, useClampedOffset } from "@/components/ui/nav-tabs";
import { ActionMenu, ConfirmDialog } from "@/components/ui/overlays";
import { useFileActions } from "@/lib/actions";
import { ApiError, api, errorMessage } from "@/lib/api";
import { leftOutText, nothingToConvertText, planBulkConvert, settlingText } from "@/lib/convertible";
import { formatBytes, formatCount, formatRelative, foundByEarlierName, plural } from "@/lib/format";
import { SETUP_PROBLEMS, cantBeReadText, failedFilterLabel, reasonsFor, setupFix } from "@/lib/outcomes";
import { FILE_STATUS_HELP, FILE_STATUS_LABEL, GOAL_LABEL, sourceCodecLabel } from "@/lib/labels";
import { sameProfile } from "@/lib/profile";
import {
  keys,
  useActivity,
  useFailures,
  useFiles,
  useHardwareInfo,
  useLibrary,
  usePresets,
  useSettings,
} from "@/lib/queries";
import { profileFieldOf, type ProfileErrors } from "@/lib/settings-form";
import { href, navigate, openSheet, updateParams, type Route } from "@/lib/router";
import { useFileLive, useLive } from "@/lib/store";
import type { FileSort, FileStatus, Library, MediaFile } from "@/lib/types";
import { FILE_STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE = 100;

/** A flat panel: the theme surface, a 1px divider border and the panel radius. */
const PANEL = "overflow-hidden rounded-panel border border-line bg-surface";

const SORTS: { value: FileSort; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "-size", label: "Largest first" },
  { value: "size", label: "Smallest first" },
  { value: "-updated", label: "Recently changed" },
  { value: "status", label: "Status" },
];

function useLibraryActions(library: Library) {
  const client = useQueryClient();
  const refreshLibrary = (updated?: Library) => {
    if (updated) {
      client.setQueryData<Library[]>(keys.libraries, (old) => old?.map((l) => (l.id === updated.id ? updated : l)));
    }
    void client.invalidateQueries({ queryKey: keys.libraries });
  };

  const scan = useMutation({
    mutationFn: () => api.scanLibrary(library.id),
    onSuccess: () => {
      toast(`Scanning ${library.name}`, { description: "New and changed files will appear as they're found." });
      refreshLibrary();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) toast("Already scanning", { description: err.message });
      else toast.error("Couldn't start a scan", { description: errorMessage(err) });
    },
  });

  const setEnabled = useMutation({
    mutationFn: (enabled: boolean) => api.updateLibrary(library.id, { enabled }),
    onSuccess: (updated) => {
      refreshLibrary(updated);
      toast(updated.enabled ? `${updated.name} resumed` : `${updated.name} paused`, {
        description: updated.enabled
          ? "It will be scanned and converted again."
          : "It won't be scanned or converted until you resume it.",
      });
    },
    onError: (err) => toast.error("Couldn't change that", { description: errorMessage(err) }),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteLibrary(library.id),
    onSuccess: () => {
      client.setQueryData<Library[]>(keys.libraries, (old) => old?.filter((l) => l.id !== library.id));
      void client.invalidateQueries({ queryKey: keys.overview });
      void client.invalidateQueries({ queryKey: keys.jobs() });
      toast(`Removed ${library.name}`, { description: "Your media files were not touched." });
      navigate("/", { replace: true });
    },
    onError: (err) => toast.error("Couldn't remove the library", { description: errorMessage(err) }),
  });

  return { scan, setEnabled, remove };
}

/**
 * What keeps the library's folder from being used, as the server says it.
 * When that is another drive mounted where the library's drive (or the
 * output or work folder's) was, the user can say to use the one there now,
 * after a confirmation that says what that means.
 */
export function FolderProblem({ library }: { library: Library }) {
  const client = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const mount = library.changed_mount ?? null;
  const relearn = useMutation({
    mutationFn: () => api.relearnMounts(library.id),
    onSuccess: (updated) => {
      client.setQueryData<Library[]>(keys.libraries, (old) => old?.map((l) => (l.id === updated.id ? updated : l)));
      void client.invalidateQueries({ queryKey: keys.libraries });
      void client.invalidateQueries({ queryKey: keys.queue });
      void client.invalidateQueries({ queryKey: keys.settingsFolders });
      setConfirming(false);
      toast.success("Using the drive that's there now", {
        description: `${library.name} goes on with the drive mounted at ${mount ?? "that place"}.`,
      });
    },
    onError: (err) => {
      setConfirming(false);
      toast.error("Couldn't change that", { description: errorMessage(err) });
    },
  });
  if (!library.path_error) return null;
  return (
    <>
      <Callout
        tone="warning"
        title={mount ? "A different drive is mounted" : "Popcorn Batch can't read this folder"}
        action={mount ? <UseDriveButton onClick={() => setConfirming(true)} /> : null}
      >
        {/* The server's sentence says what to check for this kind of problem. */}
        <p>{library.path_error}</p>
      </Callout>
      {mount ? (
        <UseDriveConfirm
          open={confirming}
          onOpenChange={setConfirming}
          mount={mount}
          loading={relearn.isPending}
          onConfirm={() => relearn.mutate()}
        />
      ) : null}
    </>
  );
}

function ScanBanner({ library }: { library: Library }) {
  const scan = useLive((s) => s.scans[library.id]);
  if (!library.scanning && (!scan || scan.phase === "done")) return null;
  const text = scan
    ? scan.phase === "discovering"
      ? `Looking for video files… ${formatCount(scan.discovered)} found so far.`
      : `Analysing new and changed files: ${formatCount(scan.analyzed)} of ${formatCount(scan.to_analyze)}.`
    : "Scanning for new and changed files…";
  // A message without a border (information); its words say what the scan is doing.
  return (
    <div role="status" className="mt-6">
      <Callout title={text} />
    </div>
  );
}

/**
 * Title, folder and goal. The rarely needed "Scan now" (folders are
 * watched and rescanned on their own) sits in the "…" menu with a way to
 * the library's settings, where pausing and removing live.
 */
function Header({ library }: { library: Library }) {
  const { scan } = useLibraryActions(library);
  return (
    <PageHeader
      title={library.name}
      inlineActions
      actions={
        <ActionMenu
          trigger={
            <Button variant="secondary" size="icon" aria-label={`More actions for ${library.name}`}>
              <Ellipsis />
            </Button>
          }
          actions={[
            {
              label: library.scanning ? "Scanning…" : "Scan now",
              icon: <RefreshCw aria-hidden />,
              disabled: library.scanning || !library.enabled || scan.isPending,
              onSelect: () => scan.mutate(),
            },
            {
              label: "Library settings",
              icon: <SlidersHorizontal aria-hidden />,
              href: href(`/library/${library.id}/settings`),
            },
          ]}
        />
      }
    >
      {/* The folder in full (it wraps), the goal as a descriptive tag, a paused state, the last scan. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="min-w-0 text-meta leading-[1.5] text-muted [overflow-wrap:anywhere]">{library.path}</span>
        <Tag>{GOAL_LABEL[library.profile.goal]}</Tag>
        {!library.enabled ? <Tag tone="info">Paused</Tag> : null}
        {library.last_scan_at ? (
          <span className="text-xs text-muted">Scanned {formatRelative(library.last_scan_at)}</span>
        ) : null}
      </div>
    </PageHeader>
  );
}

function RemoveLibraryDialog({
  library,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  library: Library;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Remove ${library.name}?`}
      confirmLabel="Remove library"
      loading={loading}
      onConfirm={onConfirm}
    >
      <p>
        Popcorn Batch stops watching <span className="text-ink [overflow-wrap:anywhere]">{library.path}</span> and
        forgets its files and history. Anything converting in it is cancelled.
      </p>
      <p className="font-label text-ink">Your media files are not deleted or changed.</p>
    </ConfirmDialog>
  );
}

export function Summary({ library }: { library: Library }) {
  const stats = library.stats;
  const failures = useFailures();
  const scan = useLive((s) => s.scans[library.id]);
  const unreadable = failures.byLibrary[library.id]?.unreadable ?? 0;
  // Originals that can't be read are set aside, as in the bar below.
  const counted = countedFiles(stats, unreadable);
  // Files still being copied in, or a scan still looking: everything counted
  // may be finished while more is on its way.
  const copying = stats.settling;
  const waiting = isWaiting(stats, library.scanning || Boolean(scan && scan.phase !== "done"));
  return (
    <section aria-label="Progress" className="rounded-panel border border-line bg-surface p-7 max-roomy:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-base text-ink">
          <span className="font-semibold tabular">{formatCount(stats.done + stats.skipped)}</span> of{" "}
          <span className="tabular">{plural(counted, "file")}</span> finished{waiting ? " so far" : ""}
          {stats.skipped > 0 ? (
            <span className="text-muted">
              {" "}
              ({formatCount(stats.done)} converted, {formatCount(stats.skipped)} skipped)
            </span>
          ) : null}
          {unreadable > 0 ? <span className="text-muted"> · {cantBeReadText(unreadable)}</span> : null}
        </p>
        <p className="text-sm text-muted tabular">
          {stats.saved_bytes > 0 ? (
            <>
              <span className="font-semibold text-ink">{formatBytes(stats.saved_bytes)} saved</span> ·{" "}
            </>
          ) : null}
          {formatBytes(stats.total_bytes)} in total
        </p>
      </div>
      {copying > 0 ? (
        // Added once they stop changing, so they aren't in the counts yet.
        <p className="mt-2 text-meta leading-relaxed text-muted">{settlingText(copying)}</p>
      ) : null}
      <LibraryBar stats={stats} unreadable={unreadable} className="mt-4" />
      <LibraryLegend stats={stats} unreadable={unreadable} className="mt-3 hidden roomy:flex" />
    </section>
  );
}

/** Debounced value, for the search box. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function SearchBox({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [lastInitial, setLastInitial] = useState(initial);
  const debounced = useDebounced(text, 300);
  const first = useRef(true);
  // Filters were cleared elsewhere: follow, unless it is our own debounce echoing back.
  if (initial !== lastInitial) {
    setLastInitial(initial);
    if (initial !== debounced.trim()) setText(initial);
  }
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    updateParams({ q: debounced.trim() || null, offset: null });
  }, [debounced]);
  return (
    <div className="relative min-w-0 flex-1 roomy:max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input
        type="search"
        aria-label="Search files by name or folder"
        placeholder="Search files"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}

/**
 * Setup problems behind this library's failed files (the work folder, the
 * destination, disk space, the chosen hardware), one callout each: the
 * cause, the server's own sentence with the exact fix, and the setting
 * where it's made. Without it the list would show "Needs a fix" badges and
 * a "Try again" that fails the same way.
 */
function SetupNotice({ library }: { library: Library }) {
  const failures = useFailures();
  const settings = useSettings();
  if (!failures.ready) return null;
  const groups = SETUP_PROBLEMS.map((kind) => ({
    kind,
    files: (failures.setup[kind] ?? []).filter((f) => f.library_id === library.id),
  })).filter((g) => g.files.length > 0);
  if (!groups.length) return null;
  const waiting = groups.reduce((sum, g) => sum + g.files.length, 0);
  const one = waiting === 1;
  // One message per cause (amber border, neutral words, no icon), the
  // setting that fixes it as its action, then what waits on them.
  return (
    <section aria-label="Needs a fix in the setup" className="flex flex-col gap-3">
      {groups.map(({ kind, files }) => {
        const fix = setupFix(kind, settings.data?.output_mode);
        const { reasons, rest } = reasonsFor(files, 2);
        return (
          <Callout
            key={kind}
            tone="warning"
            title={fix.title}
            action={
              <a
                href={href(fix.setting.path, { focus: fix.setting.focus })}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                {fix.setting.label}
              </a>
            }
          >
            {reasons.length === 0 ? (
              <p className="max-w-[68ch]">{fix.fix}</p>
            ) : (
              // The server's own sentences: the exact cause and fix, each once.
              reasons.map((r) => (
                <p key={r.text} className="max-w-[68ch] [&+p]:mt-1">
                  {reasons.length > 1 ? `${plural(r.count, "file")}: ${r.text}` : r.text}
                </p>
              ))
            )}
            {rest > 0 ? (
              <p className="mt-1 max-w-[68ch]">{`${plural(rest, "more file")} with other messages: open one to see why.`}</p>
            ) : null}
          </Callout>
        );
      })}
      <p className="text-meta leading-relaxed text-muted">
        {`${plural(waiting, "file")} in this library ${one ? "is" : "are"} waiting on ${groups.length > 1 ? "these" : "this"}. Once fixed, try ${one ? "it" : "them"} again below.`}
      </p>
    </section>
  );
}

/** Scroll a sideways-scrolling row so `item` and 20px either side of it are in view. */
function scrollIntoRow(row: HTMLElement | null, item: HTMLElement | null | undefined) {
  if (!row || !item) return;
  const start = item.offsetLeft - 20;
  const end = item.offsetLeft + item.offsetWidth + 20;
  if (start < row.scrollLeft) row.scrollLeft = start;
  else if (end > row.scrollLeft + row.clientWidth) row.scrollLeft = end - row.clientWidth;
}

function StatusChips({ library, status }: { library: Library; status: FileStatus | null }) {
  const stats = library.stats;
  const failures = useFailures();
  // The "failed" filter's words say what kind of failure it holds (see `failedFilterLabel`).
  const failedLabel = failedFilterLabel(failures.ready ? failures.byLibrary[library.id] : undefined);
  const filters: { value: FileStatus | null; label: string; count: number }[] = [
    { value: null, label: "All", count: stats.file_count },
    ...FILE_STATUSES.map((s) => ({ value: s, label: s === "failed" ? failedLabel : FILE_STATUS_LABEL[s], count: stats[s] })),
  ];
  // Below 521px the filters scroll sideways: keep the chosen one in view (a
  // "Review" link lands here with ?status=failed), and the focused one, whose
  // outline the browser would leave half cut at the edge.
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollIntoRow(row.current, row.current?.querySelector<HTMLElement>("[aria-pressed='true']"));
  }, [status]);
  return (
    <div
      ref={row}
      role="group"
      aria-label="Filter by status"
      onFocus={(e) => scrollIntoRow(row.current, e.target)}
      // Edge to edge on phones (the main region's 20px padding), so a filter can scroll out of view
      // cleanly; the 6px above and below leave room for the focus outline.
      className="relative -mx-5 -my-1.5 flex gap-1.5 overflow-x-auto px-5 py-1.5 roomy:m-0 roomy:flex-wrap roomy:overflow-visible roomy:p-0"
    >
      {filters.map((filter) => {
        const active = filter.value === status;
        if (filter.value && filter.count === 0 && !active) return null;
        return (
          // A filter button: the pressed one has the subtle fill and a Zinc Status border, so its state
          // isn't shown by fill alone.
          <button
            key={filter.value ?? "all"}
            type="button"
            aria-pressed={active}
            title={filter.value ? FILE_STATUS_HELP[filter.value] : "Every file in this library"}
            onClick={() => updateParams({ status: filter.value, offset: null })}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border px-3 text-sm font-medium whitespace-nowrap",
              active ? "border-field bg-subtle text-ink" : "border-transparent text-muted hover:bg-subtle hover:text-ink",
            )}
          >
            {filter.label}
            <span className={cn("text-xs tabular", active ? "text-ink" : "text-muted")}>{formatCount(filter.count)}</span>
          </button>
        );
      })}
    </div>
  );
}

function formatLine(file: MediaFile): string {
  return [file.resolution, file.video_codec ? sourceCodecLabel(file.video_codec) : null, file.hdr ? "HDR" : null]
    .filter(Boolean)
    .join(" · ");
}

/**
 * A converted file that came out larger: the amount in main text after an
 * amber dot (a status colour only as a dot), and the word for screen readers.
 */
function Larger({ bytes, words }: { bytes: number; words?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink" title="The converted file came out larger">
      <StatusDot tone="warning" />
      <span>
        {words ? `${formatBytes(bytes)} larger` : `+${formatBytes(bytes)}`}
        {words ? null : <span className="sr-only"> larger</span>}
      </span>
    </span>
  );
}

function SavedCell({ file }: { file: MediaFile }) {
  if (file.saved_bytes === null || file.status !== "done") return <span className="text-muted">—</span>;
  if (file.saved_bytes < 0) return <Larger bytes={-file.saved_bytes} />;
  // The file sheet's words for a conversion that freed nothing (a hard-linked original), not "0 bytes".
  if (file.saved_bytes === 0) return <span className="text-meta text-muted">No space freed</span>;
  return <span className="text-ink">{formatBytes(file.saved_bytes)}</span>;
}

/**
 * What a converted file saved, for a row without a Saved column (the phone
 * list, and the table below 1024px): "1.2 GB saved", how much larger it
 * came out, or "No space freed" (the file sheet's words) when it freed none.
 */
function SavedNote({ file }: { file: MediaFile }) {
  if (file.status !== "done" || file.saved_bytes === null) return null;
  if (file.saved_bytes === 0) return <span className="text-xs text-muted">No space freed</span>;
  if (file.saved_bytes < 0) {
    return (
      <span className="text-xs">
        <Larger bytes={-file.saved_bytes} words />
      </span>
    );
  }
  return <span className="text-xs text-ink">{formatBytes(file.saved_bytes)} saved</span>;
}

/**
 * Under a search result whose name and folder don't hold the search text:
 * the server found it by a name it had before a conversion renamed it, and
 * this says so, or the row would look like a wrong match.
 */
function EarlierNameMatch() {
  return <span className="mt-0.5 block text-xs text-muted">Found by its name before it was converted</span>;
}

/** Status with live whole-file progress while converting (see `overallProgress`). */
function StatusCell({ file }: { file: MediaFile }) {
  const live = useFileLive(file.id);
  return (
    <FileStatusBadge
      status={file.status}
      error={file.error}
      problem={file.problem}
      progress={file.status === "processing" ? (live?.overall ?? null) : null}
    />
  );
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  // The label pads the native 18px box out to a 44px target.
  return (
    <label className="-m-[13px] inline-flex cursor-pointer p-[13px]">
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

/**
 * An empty library. Right after files were copied in, the server waits for
 * them to stop changing, so this mustn't send the user off to check their
 * Docker mounts: it says what the latest scan found instead.
 */
function NoFilesYet({ library }: { library: Library }) {
  const activity = useActivity();
  const copying = library.stats.settling;
  const latest = activity.data?.items.find((e) => e.library_id === library.id);
  if (copying > 0) {
    // The progress above already says how many; this says what happens next.
    return (
      <EmptyState title="Files are on their way">
        {copying === 1 ? "A file in this folder is" : `${plural(copying, "file")} in this folder are`} still being
        copied. {copying === 1 ? "It's" : "They're"} added here automatically once{" "}
        {copying === 1 ? "it stops" : "they stop"} changing.
      </EmptyState>
    );
  }
  return (
    <EmptyState title="No videos found yet">
      <p>
        Popcorn Batch looked in <span className="text-ink [overflow-wrap:anywhere]">{library.path}</span>. Files that
        are still being copied are picked up once they stop changing. If nothing appears, check that the folder is
        mapped into the container, then scan again.
      </p>
      {latest ? (
        <p className="mt-3 text-meta [overflow-wrap:anywhere]">
          Latest: {latest.message} · {formatRelative(latest.at)}
        </p>
      ) : null}
    </EmptyState>
  );
}

function openFile(file: MediaFile) {
  openSheet({ file: file.id });
}

export function FilesTab({ library, route }: { library: Library; route: Route }) {
  const statusParam = route.params.get("status");
  const status = FILE_STATUSES.includes(statusParam as FileStatus) ? (statusParam as FileStatus) : null;
  const q = route.params.get("q") ?? "";
  const sortParam = route.params.get("sort") as FileSort | null;
  const sort: FileSort = SORTS.some((s) => s.value === sortParam) ? (sortParam as FileSort) : "name";
  const offset = Math.max(0, Number(route.params.get("offset")) || 0);
  const files = useFiles({ library: library.id, status: status ?? undefined, q: q || undefined, sort, limit: PAGE, offset });
  const { bulk } = useFileActions();
  const failures = useFailures();
  // Damaged originals are left out: trying them again can't help. They get
  // their own "Skip" instead.
  const retry = failures.ready ? (failures.retry[library.id] ?? null) : null;
  const unreadableIds = failures.ready
    ? failures.unreadable.filter((f) => f.library_id === library.id).map((f) => f.id)
    : [];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [confirmAgain, setConfirmAgain] = useState(false);
  const items = useMemo(() => files.data?.items ?? [], [files.data]);
  const total = files.data?.total ?? 0;
  useClampedOffset(offset, files.data?.total, PAGE);

  // Selection only covers what is on screen.
  const visibleIds = useMemo(() => new Set(items.map((f) => f.id)), [items]);
  const selection = [...selected].filter((id) => visibleIds.has(id));
  const allSelected = items.length > 0 && selection.length === items.length;
  // The worker skips files the library's settings leave alone, so "Convert"
  // sends only the ones it would really convert and says what it left out.
  const convertPlan = planBulkConvert(
    items.filter((f) => selected.has(f.id)),
    library.profile,
  );
  const leftOut = leftOutText(convertPlan);
  const convertSelection = () =>
    bulk.mutate(
      { action: "queue", ids: convertPlan.ids, note: leftOut },
      {
        onSuccess: () => setSelected(new Set()),
        onSettled: () => setConfirmAgain(false),
      },
    );

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const stats = library.stats;
  const filtered = Boolean(status || q);
  const onSort = (value: string) => updateParams({ sort: value === "name" ? null : value, offset: null });

  let body: ReactNode;
  if (files.isPending) {
    body = (
      <div aria-hidden className={cn(PANEL, "divide-y divide-line")}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex min-h-[69px] items-center gap-4 px-4 py-3 wide:px-6">
            <Skeleton className="size-[18px]" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-16 roomy:block" />
            <Skeleton className="h-[27px] w-24" />
          </div>
        ))}
      </div>
    );
  } else if (files.error && !files.data) {
    // With a list already on screen, keep showing it; the banner says the server is away.
    body = (
      <Callout tone="danger" title="Couldn't load the files" action={<Button size="sm" onClick={() => files.refetch()}>Try again</Button>}>
        {errorMessage(files.error)}
      </Callout>
    );
  } else if (items.length === 0 && offset > 0 && total > 0) {
    // Past the last page; the offset is being corrected.
    body = null;
  } else if (items.length === 0) {
    body = (
      <div className={PANEL}>
        {filtered ? (
          <EmptyState
            title="No files match"
            action={
              <Button variant="secondary" onClick={() => updateParams({ status: null, q: null, offset: null })}>
                Clear filters
              </Button>
            }
          >
            {q ? `Nothing named like “${q}”${status ? ` with status ${FILE_STATUS_LABEL[status].toLowerCase()}` : ""}.` : "No files have this status right now."}
          </EmptyState>
        ) : library.scanning ? (
          <EmptyState title="Scanning this folder">Files appear here as they&apos;re found and analysed.</EmptyState>
        ) : (
          <NoFilesYet library={library} />
        )}
      </div>
    );
  } else {
    body = (
      <>
        {/*
          From 801px: a table in one panel. Beside the sidebar there are only 493px at 801px, so
          columns join as the room grows: Name and Status first (the size and format under the
          name, what was saved under the status), Size, Saved and the folder from 1024px, and
          Format from 1280px.
        */}
        <div className={cn(PANEL, "hidden wide:block")}>
          <table className="w-full table-fixed text-sm">
            <caption className="sr-only">
              Files in {library.name}
              {status ? `, ${FILE_STATUS_LABEL[status]}` : ""}
            </caption>
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th scope="col" className="w-[42px] py-3 pl-6">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selection.length > 0 && !allSelected}
                    onChange={(on) => setSelected(on ? new Set(items.map((f) => f.id)) : new Set())}
                    label="Select all files on this page"
                  />
                </th>
                <th scope="col" className="py-3 pl-6 font-medium">
                  Name
                </th>
                <th scope="col" className="hidden w-[96px] py-3 pl-6 text-right font-medium lg:table-cell">
                  Size
                </th>
                <th scope="col" className="hidden w-[176px] py-3 pl-6 font-medium xl:table-cell">
                  Format
                </th>
                <th scope="col" className="w-[180px] py-3 pr-6 pl-6 font-medium lg:w-[156px] lg:pr-0">
                  Status
                </th>
                <th scope="col" className="hidden w-[120px] py-3 pr-6 pl-6 text-right font-medium lg:table-cell">
                  Saved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((file) => {
                const folder = file.relative_path.includes("/")
                  ? file.relative_path.slice(0, file.relative_path.lastIndexOf("/"))
                  : "";
                const format = formatLine(file);
                const isSelected = selected.has(file.id);
                return (
                  // A selected row has the subtle fill (its tag turns to the surface, see globals.css);
                  // hovering underlines the name, as on every row, and never fills it.
                  <tr key={file.id} data-selected={isSelected || undefined} className={cn(isSelected && "bg-subtle")}>
                    <td className="py-3 pl-6">
                      <Checkbox checked={isSelected} onChange={(on) => toggle(file.id, on)} label={`Select ${file.file_name}`} />
                    </td>
                    <td className="py-3 pl-6">
                      <button
                        type="button"
                        onClick={() => openFile(file)}
                        className="group/name flex min-h-11 w-full min-w-0 flex-col justify-center text-left"
                      >
                        <FileName name={file.file_name} className="font-label text-ink group-hover/name:underline" />
                        <span className="block text-xs leading-[1.5] text-muted [overflow-wrap:anywhere]">
                          {/* Below 1024px: the size and format, which have no column yet. */}
                          <span className="lg:hidden">{[formatBytes(file.size_bytes), format].filter(Boolean).join(" · ")}</span>
                          {/* From 1024px: the folder, and below 1280px the format after it. */}
                          <span className="hidden lg:inline">
                            {folder}
                            {format ? (
                              <span className="xl:hidden">
                                {folder ? " · " : ""}
                                {format}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        {q && foundByEarlierName(file, q) ? <EarlierNameMatch /> : null}
                      </button>
                    </td>
                    <td className="hidden py-3 pl-6 text-right text-ink tabular lg:table-cell">{formatBytes(file.size_bytes)}</td>
                    <td className="hidden truncate py-3 pl-6 text-meta text-muted xl:table-cell">{format || "—"}</td>
                    <td className="py-3 pr-6 pl-6 lg:pr-0">
                      <span className="flex flex-col items-start gap-1">
                        <StatusCell file={file} />
                        <span className="lg:hidden">
                          <SavedNote file={file} />
                        </span>
                      </span>
                    </td>
                    <td className="hidden py-3 pr-6 pl-6 text-right tabular lg:table-cell">
                      <SavedCell file={file} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Below 801px: a list of file rows in one panel. */}
        <ul className={cn(PANEL, "divide-y divide-line wide:hidden")}>
          {items.map((file) => (
            <li
              key={file.id}
              data-selected={selected.has(file.id) || undefined}
              className={cn("flex items-start gap-3 px-4 py-3", selected.has(file.id) && "bg-subtle")}
            >
              <span className="pt-0.5">
                <Checkbox
                  checked={selected.has(file.id)}
                  onChange={(on) => toggle(file.id, on)}
                  label={`Select ${file.file_name}`}
                />
              </span>
              <button type="button" onClick={() => openFile(file)} className="group/name min-h-11 min-w-0 flex-1 text-left">
                <FileName name={file.file_name} className="text-sm font-label text-ink group-hover/name:underline" />
                <span className="mt-0.5 block text-xs text-muted">
                  {formatBytes(file.size_bytes)}
                  {formatLine(file) ? ` · ${formatLine(file)}` : ""}
                </span>
                {q && foundByEarlierName(file, q) ? <EarlierNameMatch /> : null}
                <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusCell file={file} />
                  <SavedNote file={file} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Pager
          offset={offset}
          limit={PAGE}
          total={total}
          onPage={(next) => {
            setSelected(new Set());
            updateParams({ offset: next || null });
          }}
          noun="files"
        />
      </>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 roomy:justify-between roomy:gap-3">
        <SearchBox key={library.id} initial={q} />
        <div className="hidden items-center gap-2 roomy:flex">
          <label htmlFor="file-sort" className="text-meta whitespace-nowrap text-muted">
            Sort by
          </label>
          <Select id="file-sort" value={sort} onChange={(e) => onSort(e.target.value)} className="w-44">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        {/* Below 521px: the same native picker behind an icon button, on the search row. */}
        <div
          className={cn(
            buttonVariants({ variant: "secondary", size: "icon" }),
            "relative has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-solid roomy:hidden",
          )}
        >
          <ArrowDownUp aria-hidden />
          {/* Over the whole button, border included, so the target is the full 44px. */}
          <select
            aria-label={`Sort files (now: ${SORTS.find((x) => x.value === sort)?.label ?? "Name"})`}
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            className="absolute -inset-px cursor-pointer opacity-0"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <StatusChips library={library} status={status} />

      <div
        className={cn(
          "mt-4 mb-4 flex min-h-11 flex-wrap items-center gap-2",
          // Below 801px there is no "Select files…" hint: with no buttons the
          // row would be a blank gap, so it collapses to the spacing alone.
          selection.length === 0 &&
            stats.pending === 0 &&
            !retry &&
            unreadableIds.length === 0 &&
            "max-wide:mb-0 max-wide:min-h-0",
          // While files are selected the actions stay in view as the list scrolls
          // (edge to edge below 801px, where the main region's padding is 20px).
          selection.length > 0 &&
            "sticky top-0 z-20 -mx-5 border-b border-line bg-page px-5 py-2 wide:mx-0 wide:px-0",
        )}
      >
        {selection.length > 0 ? (
          <>
            <p className="mr-2 text-sm font-label text-ink tabular" role="status">
              {plural(selection.length, "file")} selected
            </p>
            <Button
              variant="primary"
              size="sm"
              loading={bulk.isPending && bulk.variables?.action === "queue"}
              disabled={convertPlan.ids.length === 0 || bulk.isPending}
              aria-describedby={convertPlan.ids.length === 0 ? "bulk-convert-why" : undefined}
              onClick={() => (convertPlan.again > 0 ? setConfirmAgain(true) : convertSelection())}
            >
              {convertPlan.ids.length > 0 && convertPlan.ids.length < selection.length
                ? `Convert ${formatCount(convertPlan.ids.length)}`
                : "Convert"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmSkip(true)} disabled={bulk.isPending}>
              Skip
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setSelected(new Set())}>
              Clear selection
            </Button>
            {convertPlan.ids.length === 0 ? (
              <p id="bulk-convert-why" className="basis-full text-meta leading-relaxed text-muted">
                {nothingToConvertText(convertPlan)}
              </p>
            ) : null}
          </>
        ) : (
          <>
            {stats.pending > 0 ? (
              <Button
                variant="primary"
                size="sm"
                loading={bulk.isPending && bulk.variables?.action === "queue"}
                onClick={() => bulk.mutate({ action: "queue", library: library.id, status: "pending" })}
                needsServer
              >
                Add {plural(stats.pending, "file")} to the queue
              </Button>
            ) : null}
            {retry ? (
              <Button
                variant="secondary"
                size="sm"
                loading={bulk.isPending && bulk.variables?.action === "retry_failed"}
                onClick={() => bulk.mutate(retry.request)}
                needsServer
              >
                Try {plural(retry.count, "failed file")} again
              </Button>
            ) : null}
            {unreadableIds.length > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                loading={bulk.isPending && bulk.variables?.action === "skip"}
                onClick={() => bulk.mutate({ action: "skip", ids: unreadableIds, unreadable: true })}
                title="Leave them as they are. A replaced copy is picked up automatically."
                needsServer
              >
                {unreadableIds.length === 1
                  ? "Skip the file that can't be read"
                  : `Skip ${formatCount(unreadableIds.length)} files that can't be read`}
              </Button>
            ) : null}
            {items.length > 0 ? (
              <p className="ml-auto hidden text-xs text-muted wide:block">Select files to convert or skip them.</p>
            ) : null}
          </>
        )}
      </div>

      {body}

      <ConfirmDialog
        open={confirmSkip}
        onOpenChange={setConfirmSkip}
        title={`Skip ${plural(selection.length, "file")}?`}
        confirmLabel="Skip files"
        loading={bulk.isPending}
        onConfirm={() =>
          bulk.mutate(
            { action: "skip", ids: selection },
            {
              onSettled: () => setConfirmSkip(false),
              onSuccess: () => setSelected(new Set()),
            },
          )
        }
      >
        <p>They&apos;ll be left as they are and marked “Skipped by you”. Queued ones are taken out of the queue.</p>
        <p>You can convert them later from this list.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmAgain}
        onOpenChange={setConfirmAgain}
        title={`Convert ${plural(convertPlan.ids.length, "file")}?`}
        confirmLabel="Convert"
        loading={bulk.isPending}
        onConfirm={convertSelection}
      >
        <p>
          {convertPlan.again === convertPlan.ids.length
            ? convertPlan.again === 1
              ? "It was already converted once."
              : "They were all converted once already."
            : `${plural(convertPlan.again, "of them was", "of them were")} already converted once.`}{" "}
          Quality can drop a little each time a file is converted.
        </p>
      </ConfirmDialog>
    </div>
  );
}

const FIX_HIGHLIGHTED = "Fix the highlighted fields to save.";

function SettingsTab({ library }: { library: Library }) {
  const client = useQueryClient();
  const presets = usePresets();
  const hardware = useHardwareInfo();
  const settings = useSettings();
  const { remove, setEnabled } = useLibraryActions(library);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [draft, setDraft] = useState(() => ({ name: library.name, profile: library.profile }));
  const [base, setBase] = useState(library);
  const [valid, setValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [resetKey, setResetKey] = useState(0);

  const dirty = draft.name !== base.name || !sameProfile(draft.profile, base.profile);

  // Follow server changes while the user hasn't edited anything.
  if (library !== base && !dirty) {
    setBase(library);
    setDraft({ name: library.name, profile: library.profile });
  }

  const save = useMutation({
    mutationFn: () =>
      api.updateLibrary(library.id, {
        name: draft.name.trim() !== base.name ? draft.name.trim() : undefined,
        profile: !sameProfile(draft.profile, base.profile) ? draft.profile : undefined,
      }),
    onSuccess: (updated) => {
      client.setQueryData<Library[]>(keys.libraries, (old) => old?.map((l) => (l.id === updated.id ? updated : l)));
      void client.invalidateQueries({ queryKey: keys.files() });
      setBase(updated);
      setDraft({ name: updated.name, profile: updated.profile });
      setError(null);
      setProfileErrors({});
      toast.success("Saved", {
        description: sameProfile(updated.profile, base.profile)
          ? undefined
          : "Files not yet converted are re-checked against the new settings.",
      });
    },
    onError: (err) => {
      // A bad name or profile value goes under its own control; anything
      // else stays on the save bar.
      const profileField = err instanceof ApiError ? profileFieldOf(err.field, "profile") : null;
      if (err instanceof ApiError && err.field === "name") {
        setNameError(err.message);
        setError(FIX_HIGHLIGHTED);
      } else if (profileField) {
        setProfileErrors({ [profileField]: err.message });
        setError(FIX_HIGHLIGHTED);
      } else setError(errorMessage(err));
    },
  });

  const canSave = () => {
    if (!draft.name.trim()) {
      setNameError("Give the library a name.");
      return false;
    }
    return valid;
  };

  const discard = () => {
    setDraft({ name: base.name, profile: base.profile });
    setError(null);
    setNameError(null);
    setProfileErrors({});
    setResetKey((k) => k + 1);
  };

  // One padded panel of settings sections, as in Settings: the library itself, the profile editor's
  // groups, then removing it. The save bar sits below the panel.
  return (
    <div>
      <div className={SETTINGS_PANEL}>
        <SettingsSection title="Library" description="Its name, and pausing it.">
          <Field label="Name" error={nameError} className="max-w-sm">
            <Input
              value={draft.name}
              maxLength={80}
              onChange={(e) => {
                setNameError(null);
                setDraft((d) => ({ ...d, name: e.target.value }));
              }}
            />
          </Field>
          {/* Pausing takes effect right away: no save needed. */}
          <div className="flex flex-col items-start gap-3 @md:flex-row @md:items-center @md:justify-between @md:gap-6">
            <div className="min-w-0">
              <p className="text-sm font-label text-ink">{library.enabled ? "Active" : "Paused"}</p>
              <p className="mt-1 text-meta leading-relaxed text-muted">
                {library.enabled
                  ? "Scanned and converted as usual. Pausing stops both; nothing already converted changes."
                  : "Not scanned or converted until you resume it. Nothing already converted changed."}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setEnabled.mutate(!library.enabled)}
              loading={setEnabled.isPending}
              needsServer
            >
              {library.enabled ? "Pause library" : "Resume library"}
            </Button>
          </div>
        </SettingsSection>

        {/* The editor's own first group has no divider above it: this one separates it from Library. */}
        <div className="border-t border-line pt-6 pb-3">
          <ProfileEditor
            profile={draft.profile}
            onChange={(profile) => {
              setProfileErrors({});
              setDraft((d) => ({ ...d, profile }));
            }}
            errors={profileErrors}
            presets={presets.data}
            hardware={hardware.hw}
            hardwarePending={hardware.pending}
            preference={settings.data?.hardware}
            onValidityChange={setValid}
            resetKey={resetKey}
            headingLevel={2}
          />
        </div>

        <SettingsSection
          title="Remove library"
          description={
            <>
              Stops watching this folder and forgets its files and history.{" "}
              <span className="font-label text-ink">Your media files are not deleted.</span>
            </>
          }
        >
          {/* Its own width, not the column's. */}
          <div>
            <Button variant="secondary" onClick={() => setConfirmRemove(true)} needsServer>
              Remove library…
            </Button>
          </div>
        </SettingsSection>
      </div>

      <SaveBar
        dirty={dirty}
        saving={save.isPending}
        onSave={() => {
          if (canSave()) save.mutate();
        }}
        onDiscard={discard}
        error={error ?? (valid ? null : FIX_HIGHLIGHTED)}
        // Pointing at a field whose own error was already announced.
        errorRole={error && error !== FIX_HIGHLIGHTED ? "alert" : "status"}
        disabled={!valid}
        blocks={(target) =>
          !(target.segments[0] === "library" && target.segments[1] === library.id && target.segments[2] === "settings")
        }
        saveAndLeave={async () => {
          if (!canSave()) return false;
          try {
            await save.mutateAsync();
            return true;
          } catch {
            return false;
          }
        }}
      />
      <RemoveLibraryDialog
        library={library}
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
      />
    </div>
  );
}

export function LibraryScreen({ id, route }: { id: string; route: Route }) {
  const { library, isPending } = useLibrary(id);
  const tab = route.segments[2] === "settings" ? "settings" : "files";

  if (isPending) {
    return (
      <div>
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <Skeleton className="mt-8 h-[124px] w-full rounded-panel" />
      </div>
    );
  }
  if (!library) {
    return (
      <div className={PANEL}>
        {/* The page's one heading: nothing else is on it. */}
        <EmptyState
          as="h1"
          title="This library doesn't exist"
          action={
            <a href={href("/")} className={buttonVariants({ variant: "primary" })}>
              Go to overview
            </a>
          }
        >
          It may have been removed.
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <Header library={library} />
      {/* What needs a fix, in one place above the progress: the folder, then the setup problems files wait on. */}
      <div className="mb-6 flex flex-col gap-3 empty:hidden">
        <FolderProblem library={library} />
        <SetupNotice library={library} />
      </div>
      <Summary library={library} />
      <ScanBanner library={library} />
      <NavTabs
        label="Library views"
        className="mt-8 mb-6"
        tabs={[
          { href: href(`/library/${library.id}`), label: "Files", active: tab === "files", count: library.stats.file_count },
          { href: href(`/library/${library.id}/settings`), label: "Settings", active: tab === "settings" },
        ]}
      />
      {tab === "files" ? <FilesTab library={library} route={route} /> : <SettingsTab key={library.id} library={library} />}
    </div>
  );
}
