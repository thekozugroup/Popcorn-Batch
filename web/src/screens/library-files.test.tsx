import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { parseRoute } from "@/lib/router";
import type { Library, LibraryStats, MediaFile, QueueState, Settings } from "@/lib/types";
import { FilesTab, LibraryScreen, Summary } from "./library";

/**
 * A library's page in the Popcorn design: status in words with a dot, text
 * buttons and filters without icons, and every list, table and empty state
 * inside a flat panel.
 */

const LIB = "55555555-5555-5555-5555-555555555555";

function stats(partial: Partial<LibraryStats> = {}): LibraryStats {
  return {
    file_count: 3,
    total_bytes: 3_000_000_000,
    pending: 1,
    queued: 0,
    processing: 0,
    done: 2,
    skipped: 0,
    failed: 0,
    saved_bytes: 1_000_000_000,
    settling: 0,
    ...partial,
  };
}

function library(partial: Partial<Omit<Library, "stats">> & { stats?: Partial<LibraryStats> } = {}): Library {
  const { stats: s, ...rest } = partial;
  return {
    id: LIB,
    name: "Movies",
    path: "/media/Movies",
    enabled: true,
    profile: { goal: "balanced", video_codec: "hevc", container: "mkv", min_savings_pct: 10, skip_efficient: true },
    stats: stats(s),
    scanning: false,
    last_scan_at: null,
    path_error: null,
    changed_mount: null,
    created_at: "2026-10-01T05:10:00Z",
    ...rest,
  } as unknown as Library;
}

function file(partial: Partial<MediaFile> = {}): MediaFile {
  return {
    id: "66666666-6666-6666-6666-666666666666",
    library_id: LIB,
    path: "/media/Movies/Clip (2020)/Clip (2020).mkv",
    relative_path: "Clip (2020)/Clip (2020).mkv",
    file_name: "Clip (2020).mkv",
    size_bytes: 2_000_000_000,
    modified_at: "2026-09-28T05:10:00Z",
    status: "done",
    container: "matroska",
    video_codec: "hevc",
    audio_codec: "aac",
    resolution: "1080p",
    hdr: null,
    duration_secs: 120,
    bit_rate: null,
    original_size_bytes: 3_000_000_000,
    saved_bytes: 1_000_000_000,
    skip_reason: null,
    error: null,
    problem: null,
    job_id: null,
    progress: null,
    scanned_at: "2026-09-28T05:10:00Z",
    updated_at: "2026-09-28T05:12:00Z",
    ...partial,
  };
}

const LARGER = file({
  id: "77777777-7777-7777-7777-777777777777",
  file_name: "Grew (2021).mkv",
  relative_path: "Grew (2021)/Grew (2021).mkv",
  saved_bytes: -200_000_000,
});
const WAITING = file({
  id: "88888888-8888-8888-8888-888888888888",
  file_name: "Waiting (2019).mkv",
  relative_path: "Waiting (2019)/Waiting (2019).mkv",
  status: "pending",
  saved_bytes: null,
  original_size_bytes: null,
});

const queueState: QueueState = {
  paused: false,
  running: 0,
  queued: 0,
  max_jobs: 2,
  max_jobs_auto: true,
  max_jobs_source: "auto",
  waiting_for_schedule: false,
};

function mockApi(items: MediaFile[], libraries: Library[] = [library()]) {
  vi.spyOn(api, "settings").mockResolvedValue({ output_mode: "replace", auto_queue: true } as Settings);
  vi.spyOn(api, "libraries").mockResolvedValue(libraries);
  vi.spyOn(api, "queue").mockResolvedValue(queueState);
  vi.spyOn(api, "activity").mockResolvedValue({ items: [] });
  // The failed-file reader asks by status; this page's own list asks without one.
  vi.spyOn(api, "files").mockImplementation(async (query) =>
    query.status === "failed" ? { items: [], total: 0 } : { items, total: items.length },
  );
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("a library's file list", () => {
  it("marks a file that came out larger with an amber dot beside neutral words", async () => {
    mockApi([file(), LARGER, WAITING]);
    renderWithClient(<FilesTab library={library()} route={parseRoute(`#/library/${LIB}`)} />);
    await waitFor(() => expect(screen.getAllByTitle("The converted file came out larger").length).toBeGreaterThan(0));
    for (const larger of screen.getAllByTitle("The converted file came out larger")) {
      // The colour is the dot alone; the words stay in main text and say "larger".
      expect(larger.className).toContain("text-ink");
      expect(larger.className).not.toMatch(/text-(error|warn|danger)/);
      expect(larger.querySelector(".bg-warn")).not.toBeNull();
      expect(larger.textContent).toMatch(/larger/);
    }
  });

  it("filters by status with text-only toggle buttons whose pressed state isn't fill alone", async () => {
    mockApi([file(), LARGER, WAITING]);
    renderWithClient(<FilesTab library={library()} route={parseRoute(`#/library/${LIB}`)} />);
    const filters = await screen.findByRole("group", { name: "Filter by status" });
    const buttons = within(filters).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["All3", "To convert1", "Converted2"]);
    for (const button of buttons) {
      expect(button.querySelector("svg")).toBeNull();
      expect(button.className).toContain("min-h-11");
    }
    const all = within(filters).getByRole("button", { name: /^All/ });
    expect(all.getAttribute("aria-pressed")).toBe("true");
    expect(all.className).toContain("border-field");
  });

  it("names its actions in words, without icons, and keeps the selection's actions in view", async () => {
    mockApi([file(), LARGER, WAITING]);
    renderWithClient(<FilesTab library={library()} route={parseRoute(`#/library/${LIB}`)} />);
    const add = await screen.findByRole("button", { name: "Add 1 file to the queue" });
    expect(add.querySelector("svg")).toBeNull();

    // Phones get a list and wider screens a table; both are in the DOM here, so pick the first box.
    fireEvent.click((await screen.findAllByRole("checkbox", { name: "Select Waiting (2019).mkv" }))[0]);
    const selected = await screen.findByText("1 file selected");
    const row = selected.parentElement as HTMLElement;
    expect(row.className).toContain("sticky");
    expect(row.className).toContain("top-0");
    for (const name of ["Convert", "Skip", "Clear selection"]) {
      expect(within(row).getByRole("button", { name }).querySelector("svg")).toBeNull();
    }
  });

  it("puts the table and the phone list each in one flat panel, with 44px name buttons", async () => {
    mockApi([file(), LARGER, WAITING]);
    renderWithClient(<FilesTab library={library()} route={parseRoute(`#/library/${LIB}`)} />);
    const table = await screen.findByRole("table");
    const panel = table.parentElement as HTMLElement;
    expect(panel.className).toContain("rounded-panel");
    expect(panel.className).toContain("wide:block");
    const list = screen.getAllByRole("list").find((l) => l.className.includes("wide:hidden"));
    expect(list?.className).toContain("rounded-panel");
    for (const button of within(table).getAllByRole("button")) expect(button.className).toContain("min-h-11");
  });

  it("shows an empty library's explanation inside a panel, without an icon", async () => {
    mockApi([]);
    renderWithClient(<FilesTab library={library({ stats: { file_count: 0, done: 0, pending: 0 } })} route={parseRoute(`#/library/${LIB}`)} />);
    const title = await screen.findByText("No videos found yet");
    expect(title.closest(".rounded-panel")).not.toBeNull();
    expect(title.closest(".rounded-panel")?.querySelector("svg")).toBeNull();
  });
});

describe("a library page's summary", () => {
  it("is a padded panel with the saving in main text and no icons", () => {
    mockApi([]);
    const { container } = renderWithClient(<Summary library={library({ stats: { settling: 2 } })} />);
    const section = screen.getByRole("region", { name: "Progress" });
    expect(section.className).toContain("p-7");
    expect(section.className).toContain("max-roomy:p-5");
    expect(screen.getByText("1 GB saved").className).toContain("text-ink");
    // The copying line has words and no hourglass.
    expect(container.textContent).toContain("Waiting for 2 files to finish copying");
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("a library page's header", () => {
  it("shows the whole folder, the goal as a plain tag and a paused library without an icon", async () => {
    const paused = library({ enabled: false, path: "/mnt/user/media/A very long share name/Movies" });
    mockApi([], [paused]);
    renderWithClient(<LibraryScreen id={LIB} route={parseRoute(`#/library/${LIB}`)} />);
    await screen.findByRole("heading", { level: 1, name: "Movies" });
    const path = screen.getByText("/mnt/user/media/A very long share name/Movies");
    // It wraps instead of being cut short.
    expect(path.className).not.toContain("truncate");
    expect(path.className).toContain("[overflow-wrap:anywhere]");
    const goal = screen.getByText("Balanced");
    expect(goal.querySelector("svg, [aria-hidden]")).toBeNull();
    const tag = screen.getAllByText("Paused").find((el) => el.className.includes("rounded-tag"));
    expect(tag?.querySelector("svg")).toBeNull();
    expect(tag?.querySelector(".bg-field")).not.toBeNull();
  });

  it("says a library doesn't exist inside a panel", async () => {
    mockApi([], []);
    renderWithClient(<LibraryScreen id={LIB} route={parseRoute(`#/library/${LIB}`)} />);
    const title = await screen.findByText("This library doesn't exist");
    expect(title.closest(".rounded-panel")).not.toBeNull();
  });
});
