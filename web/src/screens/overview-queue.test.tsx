import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { parseRoute } from "@/lib/router";
import type { Job, JobQuery, Library, LibraryStats, MediaFile, Overview, QueueState, Settings } from "@/lib/types";
import { OverviewScreen } from "./overview";
import { QueueScreen } from "./queue";

/**
 * The Overview and the Queue in the Popcorn family's layout (working.md
 * §5.2, §5.6): the space saved is the page's heading, status is a dot
 * beside neutral words, rows sit in one flat panel with dividers, empty
 * states sit in a panel without an icon, text buttons have no icon, and a
 * view has one primary action.
 */

const LIB = "33333333-3333-3333-3333-333333333333";

const stats: LibraryStats = {
  file_count: 420,
  total_bytes: 1.86e12,
  pending: 139,
  queued: 29,
  processing: 3,
  done: 213,
  skipped: 27,
  failed: 6,
  saved_bytes: 612e9,
  settling: 0,
};

const queue = (partial: Partial<QueueState> = {}): QueueState => ({
  paused: false,
  running: 2,
  queued: 29,
  max_jobs: 3,
  max_jobs_auto: true,
  max_jobs_source: "auto",
  waiting_for_schedule: false,
  ...partial,
});

const library = {
  id: LIB,
  name: "Demo Movies",
  path: "/media/movies",
  enabled: true,
  profile: { goal: "balanced", min_savings_pct: 10 },
  stats: { ...stats, failed: 1 },
  scanning: false,
  last_scan_at: null,
  path_error: null,
  created_at: "2026-10-01T05:10:00Z",
} as unknown as Library;

function job(id: string, partial: Partial<Job> = {}): Job {
  return {
    id,
    file_id: `file-${id}`,
    library_id: LIB,
    file_name: `Demo Movie ${id}.mkv`,
    file_path: `/media/movies/Demo Movie ${id}.mkv`,
    state: "running",
    stage: "transcoding",
    priority: 0,
    progress: 40,
    fps: null,
    speed: null,
    eta_secs: null,
    encoder: "libx265",
    hw_api: "software",
    attempt: 1,
    input_size: 4e9,
    output_size: null,
    freed_bytes: null,
    output_name: null,
    error: null,
    problem: null,
    skip_reason: null,
    validation: null,
    command: null,
    log_tail: null,
    notes: [],
    force: false,
    created_at: "2026-10-12T05:10:00Z",
    started_at: "2026-10-12T05:11:00Z",
    finished_at: null,
    ...partial,
  };
}

const failedFile = { id: "f1", library_id: LIB, status: "failed", error: "ffmpeg stopped.", problem: "encoder" } as MediaFile;

function mockApi({
  q = queue(),
  running = [job("001"), job("002")],
  queued = [] as Job[],
  history = [] as Job[],
}: { q?: QueueState; running?: Job[]; queued?: Job[]; history?: Job[] } = {}) {
  const overview: Overview = {
    totals: stats,
    video_codecs: [],
    audio_codecs: [],
    resolutions: [],
    savings_history: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      saved_bytes: (i % 4) * 1e10,
      files: i % 4,
    })),
    projected_savings_bytes: 468e9,
    queue: q,
  };
  vi.spyOn(api, "overview").mockResolvedValue(overview);
  vi.spyOn(api, "queue").mockResolvedValue(q);
  vi.spyOn(api, "libraries").mockResolvedValue([library]);
  vi.spyOn(api, "settings").mockResolvedValue({ output_mode: "replace", watch_folders: true, popcorn_sr_url: null } as Settings);
  vi.spyOn(api, "hardware").mockRejectedValue(new Error("not in this test"));
  vi.spyOn(api, "activity").mockResolvedValue({ items: [] });
  vi.spyOn(api, "file").mockRejectedValue(new Error("not in this test"));
  vi.spyOn(api, "files").mockImplementation(async (query) =>
    query.status === "failed" ? { items: [failedFile], total: 1 } : { items: [], total: 0 },
  );
  vi.spyOn(api, "jobs").mockImplementation(async (query: JobQuery) => {
    const items = query.state === "running" ? running : query.state === "queued" ? queued : query.state === "history" ? history : [];
    return { items, total: items.length };
  });
}

function show(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** The visible primary buttons and button-links (Action Blue fill). */
const primaries = (root: HTMLElement) => [...root.querySelectorAll("button, a")].filter((el) => el.className.includes("bg-accent"));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the Overview", () => {
  it("makes the space saved the page's heading, with \"saved\" its own words", async () => {
    mockApi();
    show(<OverviewScreen />);
    const h1 = await screen.findByRole("heading", { level: 1 });
    await waitFor(() => expect(h1.textContent).toBe("612 GB saved"));
    expect(within(h1).getByText("saved", { exact: true }).className).toContain("text-muted");
    expect(screen.queryByRole("heading", { name: "Overview" })).toBeNull();
  });

  it("says what is happening after a status dot, not an icon", async () => {
    mockApi();
    show(<OverviewScreen />);
    const status = await screen.findByText("Converting 2 files");
    const line = status.closest("[role=status]") as HTMLElement;
    expect(line.querySelector("svg")).toBeNull();
    expect(line.querySelector("span[aria-hidden]")?.className).toContain("bg-accent");
  });

  it("lists what needs attention in one panel, each cause after an amber or red dot, with text-only buttons", async () => {
    mockApi();
    show(<OverviewScreen />);
    const heading = await screen.findByRole("heading", { name: "Needs your attention" });
    const section = heading.closest("section") as HTMLElement;
    const row = (await within(section).findByText("1 file couldn't be converted")).closest("li") as HTMLElement;
    expect(row.parentElement?.className).toContain("rounded-panel");
    expect(row.querySelector("span[aria-hidden]")?.className).toContain("bg-error");
    expect(section.querySelector("svg")).toBeNull();
    expect(within(row).getByRole("link", { name: "Review" }).className).toContain("border-line");
  });

  it("shows the files converting now as job rows in one panel, not a grid of cards", async () => {
    mockApi();
    show(<OverviewScreen />);
    const heading = await screen.findByRole("heading", { name: "Converting now" });
    const section = heading.closest("section") as HTMLElement;
    await waitFor(() => expect(within(section).getAllByRole("article")).toHaveLength(2));
    const rows = within(section).getAllByRole("article");
    const panel = rows[0].parentElement as HTMLElement;
    expect(rows[1].parentElement).toBe(panel);
    expect(panel.className).toContain("rounded-panel");
    expect(panel.className).not.toMatch(/grid-cols/);
  });

  it("keeps Resume the one primary action while the queue is pausing", async () => {
    mockApi({ q: queue({ paused: true }) });
    const { container } = show(<OverviewScreen />);
    await screen.findByText("Pausing · 2 files finishing");
    await screen.findByRole("heading", { name: "Converting now" });
    const resumes = screen.getAllByRole("button", { name: "Resume" });
    expect(resumes).toHaveLength(2);
    expect(primaries(container)).toEqual([resumes[0]]);
    expect(resumes[1].className).toContain("border-line");
  });
});

describe("the Queue", () => {
  it("shows the running files as job rows in one panel", async () => {
    mockApi();
    show(<QueueScreen route={parseRoute("#/queue")} />);
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
    const [first, second] = screen.getAllByRole("article");
    expect(first.parentElement).toBe(second.parentElement);
    expect(first.parentElement?.className).toContain("rounded-panel");
  });

  it("puts an empty state in a panel, without an icon", async () => {
    mockApi({ q: queue({ running: 0, queued: 0, paused: true }), running: [] });
    show(<QueueScreen route={parseRoute("#/queue")} />);
    const title = await screen.findByText("The queue is paused");
    const panel = title.closest(".rounded-panel") as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.querySelector("svg")).toBeNull();
    expect(panel.textContent).toContain("Nothing new starts until you resume.");
  });

  it("names Up next's text-only buttons after the file", async () => {
    mockApi({ queued: [job("010", { state: "queued" }), job("011", { state: "queued" })] });
    show(<QueueScreen route={parseRoute("#/queue/next")} />);
    const move = await screen.findByRole("button", { name: "Move Demo Movie 011.mkv to the top" });
    const remove = screen.getByRole("button", { name: "Remove Demo Movie 010.mkv from the queue" });
    expect(move.textContent).toBe("Move to top");
    expect(remove.textContent).toBe("Remove");
    for (const button of [move, remove]) expect(button.querySelector("svg")).toBeNull();
    expect(move.closest("ol")?.className).toContain("rounded-panel");
  });

  it("offers Clear history and Try again as words only", async () => {
    mockApi({ history: [job("020", { state: "failed", error: "ffmpeg stopped.", finished_at: "2026-10-12T06:00:00Z" })] });
    show(<QueueScreen route={parseRoute("#/queue/history")} />);
    const clear = await screen.findByRole("button", { name: "Clear history" });
    expect(clear.querySelector("svg")).toBeNull();
    const retry = await screen.findByRole("button", { name: "Try again: Demo Movie 020.mkv" });
    expect(retry.textContent).toBe("Try again");
    expect(retry.querySelector("svg")).toBeNull();
  });
});
