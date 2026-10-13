import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { Library, LibraryStats } from "@/lib/types";
import { LibrariesScreen } from "@/screens/libraries";
import { LibrariesPanel, LibraryRow } from "./libraries-panel";

/**
 * The library rows of the Overview and the Libraries screen (the design
 * review): the "to review" link's focus outline shows whole, a row never
 * fills on hover (so its bar's track stays visible), and both screens show
 * the bar's legend.
 */

const LIB = "12121212-1212-4212-8212-121212121212";

function library(partial: Partial<Omit<Library, "stats">> & { stats?: Partial<LibraryStats> } = {}): Library {
  const { stats, ...rest } = partial;
  return {
    id: LIB,
    name: "Movies",
    path: "/media/Movies",
    enabled: true,
    profile: { goal: "balanced", min_savings_pct: 10 },
    stats: {
      file_count: 10,
      total_bytes: 10_000_000_000,
      pending: 4,
      queued: 0,
      processing: 0,
      done: 3,
      skipped: 1,
      failed: 2,
      saved_bytes: 2_000_000_000,
      settling: 0,
      ...stats,
    },
    scanning: false,
    last_scan_at: null,
    path_error: null,
    created_at: "2026-10-01T05:10:00Z",
    ...rest,
  } as unknown as Library;
}

function show(ui: React.ReactElement, libraries: Library[]) {
  vi.spyOn(api, "libraries").mockResolvedValue(libraries);
  vi.spyOn(api, "files").mockResolvedValue({ items: [], total: 0 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("a library row", () => {
  it("lets its status line wrap, so the to-review link's focus outline isn't clipped", () => {
    show(<LibraryRow library={library()} />, [library()]);
    const link = screen.getByRole("link", { name: "2 to review" });
    // 27px tall without moving the line, and above the row's covering link.
    for (const c of ["relative", "z-10", "-my-1", "inline-block", "py-1"]) expect(link.className.split(" ")).toContain(c);
    const line = link.parentElement as HTMLElement;
    expect(line.className).not.toContain("truncate");
    expect(line.className).toContain("[overflow-wrap:anywhere]");
    expect(link.getAttribute("href")).toBe(`#/library/${LIB}?status=failed`);
  });

  it("underlines its name on hover instead of filling, so its bar's track stays visible", () => {
    const { container } = show(<LibraryRow library={library()} />, [library()]);
    const row = container.querySelector("li") as HTMLElement;
    expect(row.className).not.toContain("hover:bg-subtle");
    expect(screen.getByRole("link", { name: "Movies" }).className).toContain("group-hover:underline");
    // Marked as a track, so a filled row would turn it to the surface colour (globals.css).
    expect(screen.getByRole("img").hasAttribute("data-track")).toBe(true);
  });
});

describe("the libraries panel", () => {
  it("puts the bar's legend under the rows", () => {
    show(<LibrariesPanel libraries={[library()]} />, [library()]);
    const legend = screen.getByText("Converted").closest("ul") as HTMLElement;
    expect(within(legend).getByText("Skipped")).toBeTruthy();
    expect(legend.parentElement?.className).toContain("border-t");
  });

  it("is what the Libraries screen shows, legend included", async () => {
    show(<LibrariesScreen />, [library(), library({ id: "34343434-3434-4434-8434-343434343434", name: "TV" })]);
    await screen.findByRole("link", { name: "TV" });
    const legend = screen.getByText("Converted").closest("ul") as HTMLElement;
    // Both libraries' counts, added up.
    expect(within(legend).getByText("Converted").textContent).toBe("Converted 6");
  });
});
