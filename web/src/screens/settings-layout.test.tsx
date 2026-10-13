import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { profileForGoal } from "@/lib/profile";
import { parseRoute } from "@/lib/router";
import type { EncoderStatus, HardwareInfo, QueueState, Settings } from "@/lib/types";
import { SettingsScreen } from "./settings";

/**
 * Settings at laptop widths (the design review): beside the sidebar and the
 * settings navigation, a 1024px screen left the controls 140px. The section
 * navigation is a column only from 1280px, every settings page is one panel
 * that is a size container, and a group lays its heading beside its controls
 * by that panel's width, never the screen's.
 */

const saved: Settings = {
  auto_queue: true,
  watch_folders: true,
  rescan_interval_hours: 12,
  max_jobs: null,
  hardware: "auto",
  cpu_fallback: true,
  validation: "standard",
  output_mode: "replace",
  output_folder: null,
  temp_dir: null,
  keep_file_dates: true,
  low_priority: true,
  active_hours: null,
  ignore_patterns: [],
  min_file_size_mb: 0,
  default_profile: profileForGoal("save_space"),
  onboarded: true,
  popcorn_sr_url: null,
};

const queue: QueueState = {
  paused: false,
  running: 0,
  queued: 0,
  max_jobs: 2,
  max_jobs_auto: true,
  max_jobs_source: "auto",
  waiting_for_schedule: false,
};

function enc(name: string, codec: EncoderStatus["codec"], api: EncoderStatus["api"]): EncoderStatus {
  return { name, codec, api, available: true, verified: true, device: null, error: null };
}

const hardware: HardwareInfo = {
  cpu: { model: "Test CPU", logical_cores: 8, physical_cores: 4, cgroup_limit: null },
  memory: { total_bytes: 16e9, available_bytes: 8e9, cgroup_limit_bytes: null },
  gpus: [],
  encoders: [enc("libx265", "hevc", "software"), enc("libsvtav1", "av1", "software")],
  audio_encoders: [],
  filters: [],
  ffmpeg: { ffmpeg_path: "ffmpeg", ffprobe_path: "ffprobe", found: true, ffprobe_found: true, version: "6.1" },
  recommended_jobs: { cpu_jobs: 2, gpu_jobs: 0, total: 2, reason: "Two at once." },
  hints: [{ level: "warning", title: "No GPU is passed to the container", detail: "Pass /dev/dri through.", fix: null }],
  in_container: true,
  detecting: false,
  detected_at: "2026-09-28T00:00:00Z",
};

function showSettings(section: string) {
  vi.spyOn(api, "settings").mockResolvedValue(saved);
  vi.spyOn(api, "system").mockResolvedValue({
    version: "0.4.0",
    build: "main-1a2b3c4",
    default_temp_dir: null,
    browse_roots: ["/media"],
    data_dir: "/config",
    in_container: true,
  });
  vi.spyOn(api, "hardware").mockResolvedValue(hardware);
  vi.spyOn(api, "presets").mockRejectedValue(new Error("not in this test"));
  vi.spyOn(api, "queue").mockResolvedValue(queue);
  vi.spyOn(api, "libraries").mockResolvedValue([]);
  vi.spyOn(api, "files").mockResolvedValue({ items: [], total: 0 });
  vi.spyOn(api, "jobs").mockResolvedValue({ items: [], total: 0 });
  vi.spyOn(api, "settingsFolders").mockResolvedValue([]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SettingsScreen route={parseRoute(`#/settings/${section}`)} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Settings at laptop widths", () => {
  it("makes the section navigation a column only from 1280px, a wrapping row below", async () => {
    showSettings("processing");
    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    const layout = nav.parentElement as HTMLElement;
    expect(layout.className).toContain("xl:grid-cols-[11rem_minmax(0,1fr)]");
    expect(layout.className).not.toMatch(/(^|\s)lg:/);
    const list = nav.querySelector("ul") as HTMLElement;
    expect(list.className).toContain("flex-wrap");
    expect(list.className).toContain("xl:flex-col");
  });

  it("lays each group's heading beside its controls by the panel's width", async () => {
    showSettings("processing");
    const heading = await screen.findByRole("heading", { level: 2, name: "Finding files" });
    const group = heading.closest("section") as HTMLElement;
    expect(group.className).toContain("@3xl:grid-cols-[15rem_minmax(0,1fr)]");
    expect(group.className).not.toMatch(/(^|\s)lg:/);
    // The panel is the size container the groups measure.
    expect(group.parentElement?.className).toContain("@container");
    const controls = group.querySelector("[data-settings-controls]") as HTMLElement;
    expect(controls.className).toEqual(expect.stringContaining("@container"));
    expect(controls.className).toContain("max-w-2xl");
  });

  it("puts Hardware in one panel: This machine, then Setup tips, then Preferences", async () => {
    showSettings("hardware");
    const machine = await screen.findByRole("heading", { level: 2, name: "This machine" });
    const tips = await screen.findByRole("heading", { level: 2, name: "Setup tips" });
    const preferences = screen.getByRole("heading", { level: 2, name: "Preferences" });
    const panel = machine.closest(".rounded-panel") as HTMLElement;
    expect(panel.className).toContain("@container");
    expect(tips.closest(".rounded-panel")).toBe(panel);
    expect(preferences.closest(".rounded-panel")).toBe(panel);
    expect(machine.compareDocumentPosition(tips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tips.compareDocumentPosition(preferences) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("No GPU is passed to the container").closest(".rounded-panel")).toBe(panel);
  });
});
