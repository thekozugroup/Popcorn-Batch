import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { FsBrowse, HardwareInfo, Settings } from "@/lib/types";
import { SetupScreen } from "./setup";

/**
 * First run in the Popcorn design: the step in plain words, the three
 * reassurances as text under dividers (no tinted icon circles), headline
 * headings and text-only buttons with the primary one first.
 */

const cpuOnly = {
  detecting: false,
  encoders: [],
  gpus: [],
  cpu: { logical_cores: 8 },
  ffmpeg: { found: true },
  hints: [],
} as unknown as HardwareInfo;

const media: FsBrowse = {
  path: "/media",
  parent: "/",
  roots: ["/"],
  entries: [],
  media_count: 12,
  media_count_capped: false,
};

function show() {
  vi.spyOn(api, "hardware").mockResolvedValue(cpuOnly);
  vi.spyOn(api, "libraries").mockResolvedValue([]);
  vi.spyOn(api, "browse").mockResolvedValue(media);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SetupScreen settings={{ output_mode: "replace", onboarded: false } as Settings} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("first-run setup", () => {
  it("says which step it is in plain words, not a dot stepper", async () => {
    show();
    const step = screen.getByText("Step 1 of 3");
    expect(step.tagName).toBe("P");
    expect(step.getAttribute("role")).toBeNull();
    expect(screen.queryByRole("img", { name: /Step/ })).toBeNull();
    await screen.findByText(/No GPU found\. Your 8-core CPU will do the work/);
  });

  it("gives the three reassurances as text under dividers, without icons", async () => {
    const { container } = show();
    const heading = screen.getByRole("heading", { level: 1, name: "Make your video library smaller, safely." });
    // The headline token, not a display face.
    expect(heading.className).toContain("text-3xl");
    expect(heading.className).toContain("max-roomy:text-[28px]");
    const facts = container.querySelectorAll("main ul > li");
    expect([...facts].map((li) => li.querySelector("p")?.textContent)).toEqual([
      "Nothing is replaced until it passes its checks",
      "Uses your hardware automatically",
      "About a minute to set up",
    ]);
    for (const fact of facts) {
      expect(fact.className).toContain("border-t");
      expect(fact.querySelector("svg")).toBeNull();
    }
    await screen.findByText(/No GPU found/);
  });

  it("puts the primary action first and uses text-only buttons through the folder step", async () => {
    show();
    const choose = screen.getByRole("button", { name: "Choose a folder" });
    const skip = screen.getByRole("button", { name: "Skip for now" });
    expect(choose.compareDocumentPosition(skip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(choose.className).toContain("bg-accent");
    expect(skip.querySelector("svg")).toBeNull();

    fireEvent.click(choose);
    expect(await screen.findByRole("heading", { level: 1, name: /Where are your videos\?/ })).toBeTruthy();
    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    const back = screen.getByRole("button", { name: "Back" });
    expect(back.querySelector("svg")).toBeNull();
    fireEvent.click(back);
    expect(await screen.findByRole("heading", { level: 1, name: "Make your video library smaller, safely." })).toBeTruthy();
  });
});
