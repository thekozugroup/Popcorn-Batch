import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readThemeChoice, setTheme } from "./theme";
import { LEGACY_THEME_STORAGE_KEYS, THEME_BOOT_SCRIPT, THEME_STORAGE_KEY } from "./theme-script";

/** Runs the boot script the layout inlines; whether it chose the dark theme. */
function boot(): boolean {
  document.documentElement.classList.remove("dark");
  new Function(THEME_BOOT_SCRIPT)();
  return document.documentElement.classList.contains("dark");
}

describe("saved theme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // The OS asks for the light theme.
    vi.stubGlobal("matchMedia", (media: string) => ({
      matches: false,
      media,
      addEventListener() {},
      removeEventListener() {},
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("keeps a choice saved under the earlier names, Szalinski and Chrysopoeia", () => {
    expect(THEME_STORAGE_KEY).toBe("popcorn-batch-theme");
    expect(LEGACY_THEME_STORAGE_KEYS).toEqual(["szalinski-theme", "chrysopoeia-theme"]);
    for (const key of LEGACY_THEME_STORAGE_KEYS) {
      window.localStorage.clear();
      window.localStorage.setItem(key, "dark");
      expect(readThemeChoice(), key).toBe("dark");
      expect(boot(), key).toBe(true);
    }
  });

  it("reads the current key first, then the newer earlier name", () => {
    window.localStorage.setItem("chrysopoeia-theme", "dark");
    window.localStorage.setItem("szalinski-theme", "light");
    expect(readThemeChoice()).toBe("light");
    expect(boot()).toBe(false);

    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(readThemeChoice()).toBe("dark");
    expect(boot()).toBe(true);
  });

  it("follows the OS when nothing is saved", () => {
    expect(readThemeChoice()).toBe("system");
    expect(boot()).toBe(false);
  });

  it("saves under the current key and removes the earlier names' keys", () => {
    window.localStorage.setItem("szalinski-theme", "light");
    window.localStorage.setItem("chrysopoeia-theme", "light");
    setTheme("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    for (const key of LEGACY_THEME_STORAGE_KEYS) expect(window.localStorage.getItem(key), key).toBeNull();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(boot()).toBe(true);

    // "Follow the system" is saved as no key at all, older ones included.
    window.localStorage.setItem("chrysopoeia-theme", "dark");
    setTheme("system");
    expect(window.localStorage.length).toBe(0);
    expect(readThemeChoice()).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
