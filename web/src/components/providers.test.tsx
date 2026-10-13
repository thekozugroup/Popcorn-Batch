import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppToaster } from "./providers";

/**
 * Toasts in the family's look (DESIGN.md, Sheets, dialogs, menus, tooltips,
 * toasts), not sonner's default: no icon, no small round close button, no
 * shadow, and the 2px Action Blue focus outline 4px away.
 */

beforeEach(() => {
  // jsdom has no matchMedia; sonner asks it for the system theme.
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    })),
  );
});

afterEach(() => {
  act(() => toast.dismiss());
  cleanup();
  vi.unstubAllGlobals();
});

describe("toasts", () => {
  it("have no icon, no close button and no shadow, and the family's focus outline", async () => {
    render(<AppToaster />);
    act(() => {
      toast.success("Resumed");
    });
    const words = await screen.findByText("Resumed");
    const item = words.closest("[data-sonner-toast]") as HTMLElement;
    await waitFor(() => expect(item).not.toBeNull());
    expect(item.querySelector("svg")).toBeNull();
    expect(item.querySelector("[data-close-button]")).toBeNull();
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
    const classes = item.className.split(/\s+/);
    expect(classes).toEqual(
      expect.arrayContaining([
        "![box-shadow:none]",
        "!border-ok",
        "!rounded-control",
        "focus-visible:!outline-2",
        "focus-visible:!outline-offset-4",
        "focus-visible:!outline-accent",
      ]),
    );
  });
});
