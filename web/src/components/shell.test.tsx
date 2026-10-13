import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { parseRoute } from "@/lib/router";
import { useLive } from "@/lib/store";
import type { Library, QueueState, Settings } from "@/lib/types";
import { BrandMark } from "./brand";
import { PageHeader, Shell, queueSummary } from "./shell";

/**
 * The app frame of the Popcorn family (DESIGN.md, Layout; working.md §2):
 * one sidebar element for every width, the sections Overview, Libraries,
 * Queue and Settings as text, the libraries under them, the queue status as
 * a link with a dot, the version in the footer, and no theme switch.
 */

const MOVIES = "11111111-1111-1111-1111-111111111111";
const TV = "22222222-2222-2222-2222-222222222222";

const queue = (partial: Partial<QueueState> = {}): QueueState => ({
  paused: false,
  running: 0,
  queued: 0,
  max_jobs: 2,
  max_jobs_auto: true,
  max_jobs_source: "auto",
  waiting_for_schedule: false,
  ...partial,
});

function library(id: string, name: string, partial: Partial<Library> = {}): Library {
  return {
    id,
    name,
    path: `/media/${name}`,
    enabled: true,
    profile: { goal: "balanced", min_savings_pct: 10 },
    stats: {
      file_count: 5,
      total_bytes: 5_000_000,
      pending: 2,
      queued: 0,
      processing: 0,
      done: 2,
      skipped: 1,
      failed: 0,
      saved_bytes: 1_000_000,
      settling: 0,
    },
    scanning: false,
    last_scan_at: null,
    path_error: null,
    created_at: "2026-10-01T05:10:00Z",
    ...partial,
  } as unknown as Library;
}

function showShell(hash: string, libraries: Library[] = [library(MOVIES, "Movies"), library(TV, "TV")]) {
  vi.spyOn(api, "libraries").mockResolvedValue(libraries);
  vi.spyOn(api, "queue").mockResolvedValue(queue({ running: 2 }));
  vi.spyOn(api, "settings").mockResolvedValue({ watch_folders: true } as Settings);
  vi.spyOn(api, "system").mockResolvedValue({
    version: "0.4.0",
    build: null,
    default_temp_dir: null,
    browse_roots: ["/media"],
    data_dir: "/config",
    in_container: true,
  });
  vi.spyOn(api, "jobs").mockResolvedValue({ items: [], total: 0 } as never);
  vi.spyOn(api, "hardware").mockRejectedValue(new Error("not in this test"));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Shell route={parseRoute(hash)}>
        <PageHeader title="A screen" />
      </Shell>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useLive.setState({ connection: "open", polling: false, serverDown: false });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the app frame", () => {
  it("offers a skip link to the content first, and the content is the focusable main region", () => {
    const { container } = showShell("#/");
    const first = container.querySelector("a, button");
    expect(first?.textContent).toBe("Skip to content");
    expect(first?.getAttribute("href")).toBe("#main");
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("tabindex")).toBe("-1");
  });

  it("names the four sections in Popcorn SR's order, as text only, in one navigation for every width", () => {
    showShell("#/");
    const navs = screen.getAllByRole("navigation", { name: "Sections" });
    // The bottom tab bar is gone: the one sidebar becomes the compact top block.
    expect(navs).toHaveLength(1);
    const links = within(navs[0]).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Overview", "Libraries", "Queue", "Settings"]);
    expect(navs[0].querySelector("svg")).toBeNull();
    expect(links[0].getAttribute("aria-current")).toBe("page");
  });

  it("marks Libraries as the section of a library, and the library's own item as the page", async () => {
    showShell(`#/library/${TV}`);
    const sections = screen.getByRole("navigation", { name: "Sections" });
    expect(within(sections).getByRole("link", { name: "Libraries" }).getAttribute("aria-current")).toBe("true");
    const list = screen.getByRole("navigation", { name: "Libraries" });
    await waitFor(() => expect(within(list).getAllByRole("link").length).toBe(3));
    const current = within(list)
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current"));
    expect(current.map((l) => [l.textContent?.startsWith("TV"), l.getAttribute("aria-current")])).toEqual([[true, "page"]]);
  });

  it("makes Libraries the page for the list and for adding one, and never marks Add library", async () => {
    for (const hash of ["#/libraries", "#/libraries/new"]) {
      showShell(hash);
      const sections = screen.getByRole("navigation", { name: "Sections" });
      expect(within(sections).getByRole("link", { name: "Libraries" }).getAttribute("aria-current")).toBe("page");
      const add = await screen.findByRole("link", { name: "Add library" });
      expect(add.getAttribute("aria-current")).toBeNull();
      cleanup();
    }
  });

  it("lists the libraries without a second visible \"Libraries\" label", async () => {
    showShell("#/");
    const list = screen.getByRole("navigation", { name: "Libraries" });
    await waitFor(() => expect(within(list).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Movies60% finished",
      "TV60% finished",
      "Add library",
    ]));
    // The section item above already says it; the list keeps the name for screen readers only.
    expect(screen.getAllByText("Libraries")).toHaveLength(1);
  });

  it("puts a status dot, not a spinner, before Folder missing and Scanning", async () => {
    showShell("#/", [library(MOVIES, "Movies", { path_error: "The folder is missing." }), library(TV, "TV", { scanning: true })]);
    const list = screen.getByRole("navigation", { name: "Libraries" });
    const missing = await within(list).findByText("Folder missing");
    expect(missing.querySelector("span[aria-hidden]")?.className).toContain("bg-warn");
    expect(list.querySelector(".spin")).toBeNull();
    expect(within(list).getByText("Scanning")).toBeTruthy();
  });

  it("reads \"Popcorn\" with a smaller \"Batch\" as one name, Popcorn Batch", () => {
    showShell("#/");
    const brand = screen.getByRole("link", { name: "Popcorn Batch overview" });
    expect(brand.textContent).toBe("Popcorn Batch");
    expect(brand.querySelector("small")?.textContent).toBe("Batch");
    expect(brand.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the queue as a link with a dot, and the server's version in the footer", async () => {
    showShell("#/");
    const status = await screen.findAllByRole("link", { name: "Converting 2 files" });
    // One in the compact top block, one in the sidebar footer; CSS shows one of them.
    expect(status).toHaveLength(2);
    for (const link of status) {
      expect(link.getAttribute("href")).toBe("#/queue");
      expect(link.querySelector("span[aria-hidden]")?.className).toContain("bg-accent");
    }
    expect(await screen.findByText("Version 0.4.0")).toBeTruthy();
  });

  it("shows the last known state with a hollow dot while live updates are down", async () => {
    useLive.setState({ connection: "reconnecting", polling: false, serverDown: false });
    showShell("#/");
    const [status] = await screen.findAllByRole("link", { name: /Converting 2 files/ });
    expect(status.textContent).toContain("(last known state)");
    expect(status.getAttribute("title")).toBe("Last known: converting 2 files");
    const dot = status.querySelector("span[aria-hidden]");
    expect(dot?.className).toContain("border-field");
    expect(dot?.className).not.toContain("bg-accent");
  });

  it("has no light/dark switch: the theme follows the system", () => {
    showShell("#/settings");
    expect(screen.queryByRole("radiogroup", { name: "Appearance" })).toBeNull();
    expect(screen.queryByText("Match system")).toBeNull();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("titles each screen with the headline token in system sans, never a display face", () => {
    showShell("#/");
    const h1 = screen.getByRole("heading", { level: 1, name: "A screen" });
    expect(h1.className).toContain("font-semibold");
    expect(h1.className).toContain("text-3xl");
    expect(h1.className).toContain("tracking-[-0.025em]");
  });
});

describe("the brand mark", () => {
  it("is the app icon's tile and three kernels, the top one in the accent", () => {
    const { container } = render(<BrandMark />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.querySelector("rect")?.getAttribute("rx")).toBe("10");
    expect(Array.from(svg?.querySelectorAll("circle") ?? []).map((c) => c.getAttribute("fill"))).toEqual([
      "var(--accent)",
      "var(--page)",
      "var(--page)",
    ]);
  });
});

describe("the queue status dot", () => {
  it("is Action Blue while converting or pausing, amber for a fix, emerald when idle, Zinc Status when waiting", () => {
    expect(queueSummary(queue({ running: 2 }), undefined).dot).toBe("accent");
    expect(queueSummary(queue({ paused: true, running: 1 }), undefined)).toMatchObject({ tone: "paused", dot: "accent" });
    expect(queueSummary(queue({ paused: true }), undefined)).toMatchObject({ text: "Paused", tone: "paused", dot: "info" });
    expect(queueSummary(queue(), undefined, false, true).dot).toBe("warning");
    expect(queueSummary(queue(), undefined).dot).toBe("success");
    expect(queueSummary(queue(), { watch_folders: false } as Settings)).toMatchObject({ text: "All caught up", dot: "success" });
    expect(queueSummary(queue({ queued: 3 }), undefined).dot).toBe("info");
    expect(queueSummary(queue(), undefined, true)).toMatchObject({ text: "Scanning", dot: "info" });
    expect(queueSummary(queue({ waiting_for_schedule: true }), undefined).dot).toBe("info");
  });

  it("has no icon any more", () => {
    expect(Object.keys(queueSummary(queue(), undefined)).sort()).toEqual(["dot", "text", "tone"]);
  });
});
