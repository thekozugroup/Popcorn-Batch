import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api";
import { profileForGoal } from "@/lib/profile";
import { parseRoute } from "@/lib/router";
import type { QueueState, Settings } from "@/lib/types";
import { SettingsScreen } from "./settings";

/**
 * Settings › Advanced: the optional Popcorn SR address (working.md §8). The
 * field says what to fix in the server's words before Save is enabled,
 * "" clears it as null, a server error lands on it, and About links to
 * Popcorn SR only once an address is saved.
 */

const NOT_FULL = "Enter the full address, starting with http:// or https://, such as http://tower:8787.";
const HAS_LOGIN = "Leave out the user name and password. Popcorn SR asks for its key when you open it.";
const TOO_LONG = "This address is too long. Use the address you open Popcorn SR at.";

const saved: Settings = {
  auto_queue: true,
  watch_folders: true,
  rescan_interval_hours: 24,
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

function showSettings(partial: Partial<Settings> = {}, section = "advanced") {
  const settings = { ...saved, ...partial };
  vi.spyOn(api, "settings").mockResolvedValue(settings);
  vi.spyOn(api, "system").mockResolvedValue({
    version: "0.4.0",
    build: "main-1a2b3c4",
    default_temp_dir: null,
    browse_roots: ["/media"],
    data_dir: "/config",
    in_container: true,
  });
  vi.spyOn(api, "hardware").mockRejectedValue(new Error("not in this test"));
  vi.spyOn(api, "presets").mockRejectedValue(new Error("not in this test"));
  vi.spyOn(api, "queue").mockResolvedValue(queue);
  vi.spyOn(api, "libraries").mockResolvedValue([]);
  vi.spyOn(api, "files").mockResolvedValue({ items: [], total: 0 });
  vi.spyOn(api, "jobs").mockResolvedValue({ items: [], total: 0 });
  vi.spyOn(api, "settingsFolders").mockResolvedValue([]);
  const update = vi
    .spyOn(api, "updateSettings")
    .mockImplementation(async (patch) => ({ ...settings, ...patch }) as Settings);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SettingsScreen route={parseRoute(`#/settings/${section}`)} />
    </QueryClientProvider>,
  );
  return { update };
}

/** Type into the field and leave it, as a person would. */
function typeAddress(field: HTMLElement, value: string) {
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value } });
  fireEvent.blur(field);
}

const saveButton = () => screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the Popcorn SR address in Settings › Advanced", () => {
  it("is an empty, optional field with its help, and nothing else says anything about Popcorn SR", async () => {
    showSettings();
    const field = (await screen.findByRole("textbox", { name: "Popcorn SR address" })) as HTMLInputElement;
    expect(screen.getByRole("heading", { name: "Popcorn SR" })).toBeTruthy();
    expect(screen.getByText("Link to the Popcorn SR manager on your network.")).toBeTruthy();
    expect(field.value).toBe("");
    expect(field.type).toBe("url");
    expect(field.getAttribute("inputmode")).toBe("url");
    expect(field.getAttribute("autocomplete")).toBe("off");
    expect(field.getAttribute("spellcheck")).toBe("false");
    expect(field.placeholder).toBe("http://tower:8787");
    const help = document.getElementById(field.getAttribute("aria-describedby") ?? "");
    expect(help?.textContent).toBe(
      "Optional. The address you open Popcorn SR at, starting with http:// or https://. Popcorn Batch only shows a link to it and never connects to it.",
    );
    await screen.findByText(/^Popcorn Batch/, { selector: "p" });
    expect(screen.queryByRole("link", { name: /Popcorn SR/ })).toBeNull();
    expect(document.body.textContent).not.toMatch(/Not connected|Connected to Popcorn SR/);
  });

  it("says what to fix, in the server's words, once the field is left, and keeps Save off until it's fixed", async () => {
    const { update } = showSettings();
    const field = await screen.findByRole("textbox", { name: "Popcorn SR address" });

    fireEvent.change(field, { target: { value: "tower:8787" } });
    // Not while typing.
    expect(screen.queryByText(NOT_FULL)).toBeNull();
    fireEvent.blur(field);
    expect(within(screen.getByRole("alert")).getByText(NOT_FULL)).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText("Fix the highlighted fields to save.")).toBeTruthy();
    // Pointing at the field is no failure: the save bar keeps its neutral border.
    const bar = screen.getByRole("region", { name: "Unsaved changes" });
    expect(bar.className).toContain("border-line");
    expect(bar.className).not.toContain("border-error");

    typeAddress(field, "http://user:pass@tower:8787");
    expect(screen.getByText(HAS_LOGIN)).toBeTruthy();
    expect(saveButton().disabled).toBe(true);

    typeAddress(field, `http://tower/${"a".repeat(2037)}`);
    expect(screen.getByText(TOO_LONG)).toBeTruthy();
    expect(saveButton().disabled).toBe(true);

    typeAddress(field, "http://tower:8787");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(field.getAttribute("aria-invalid")).toBeNull();
    expect(saveButton().disabled).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("saves a full address as typed, without the spaces around it", async () => {
    const { update } = showSettings();
    const field = await screen.findByRole("textbox", { name: "Popcorn SR address" });
    typeAddress(field, "  http://tower:8787  ");
    fireEvent.click(saveButton());
    await waitFor(() => expect(update).toHaveBeenCalledWith({ popcorn_sr_url: "http://tower:8787" }));
  });

  it("is cleared with an empty field, sent as null", async () => {
    const { update } = showSettings({ popcorn_sr_url: "http://tower:8787" });
    const field = (await screen.findByRole("textbox", { name: "Popcorn SR address" })) as HTMLInputElement;
    await waitFor(() => expect(field.value).toBe("http://tower:8787"));
    typeAddress(field, "");
    fireEvent.click(saveButton());
    await waitFor(() => expect(update).toHaveBeenCalledWith({ popcorn_sr_url: null }));
  });

  it("shows the server's message on the field it names", async () => {
    const { update } = showSettings();
    update.mockRejectedValue(new ApiError(400, "invalid_settings", HAS_LOGIN, "popcorn_sr_url"));
    const field = await screen.findByRole("textbox", { name: "Popcorn SR address" });
    typeAddress(field, "http://tower:8787");
    fireEvent.click(saveButton());
    expect(await screen.findByText(HAS_LOGIN)).toBeTruthy();
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Fix the highlighted setting to save.")).toBeTruthy();
  });

  it("turns the save bar red only when saving failed", async () => {
    const { update } = showSettings();
    update.mockRejectedValue(new ApiError(500, "internal", "Popcorn Batch hit a problem saving."));
    const field = await screen.findByRole("textbox", { name: "Popcorn SR address" });
    typeAddress(field, "http://tower:8787");
    fireEvent.click(saveButton());
    expect(await screen.findByText("Popcorn Batch hit a problem saving.")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Unsaved changes" }).className).toContain("border-error");
  });
});

describe("the Popcorn SR link in About", () => {
  it("opens the saved address in a new tab, and says so", async () => {
    showSettings({ popcorn_sr_url: "http://tower:8787" }, "processing");
    const about = (await screen.findByRole("heading", { name: "About" })).closest("section") as HTMLElement;
    const link = await within(about).findByRole("link", { name: "Open Popcorn SR (opens in a new tab)" });
    expect(link.getAttribute("href")).toBe("http://tower:8787");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    // A secondary button, beside Copy for a bug report.
    expect(link.className).toContain("border-line");
    expect(within(about).getByRole("button", { name: /Copy for a bug report/ })).toBeTruthy();
  });

  it("isn't shown for an address that doesn't pass the checks", async () => {
    showSettings({ popcorn_sr_url: "javascript:alert(1)" }, "processing");
    await screen.findByRole("heading", { name: "About" });
    await screen.findByRole("button", { name: /Copy for a bug report/ });
    expect(screen.queryByRole("link", { name: /Open Popcorn SR/ })).toBeNull();
  });
});
