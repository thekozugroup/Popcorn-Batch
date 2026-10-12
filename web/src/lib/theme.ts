"use client";

/**
 * Light/dark theme. The choice is a per-browser convenience kept in
 * localStorage; "system" follows the OS. The inline script in the root layout
 * applies it before first paint so there is no flash.
 */

import { useEffect, useSyncExternalStore } from "react";
import { LEGACY_THEME_STORAGE_KEYS, THEME_STORAGE_KEY, THEME_STORAGE_KEYS } from "./theme-script";

export type ThemeChoice = "system" | "light" | "dark";

const listeners = new Set<() => void>();

/**
 * The saved choice: under the current key, else under the key of one of the
 * project's earlier names (newest first), so a choice made before a rename
 * stays.
 */
export function readThemeChoice(): ThemeChoice {
  try {
    for (const key of THEME_STORAGE_KEYS) {
      const value = window.localStorage.getItem(key);
      if (value === null) continue;
      if (value === "light" || value === "dark") return value;
      break;
    }
  } catch {
    // Storage blocked: fall back to the OS setting.
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply a theme choice to <html>. */
export function applyTheme(choice: ThemeChoice): void {
  const dark = choice === "dark" || (choice === "system" && systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

/** Remember and apply a theme choice. The earlier names' keys are removed. */
export function setTheme(choice: ThemeChoice): void {
  try {
    for (const key of LEGACY_THEME_STORAGE_KEYS) window.localStorage.removeItem(key);
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Not persisted; still applied for this visit.
  }
  applyTheme(choice);
  current = choice;
  listeners.forEach((l) => l());
}

let current: ThemeChoice | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): ThemeChoice {
  if (current === null) current = readThemeChoice();
  return current;
}

/** The current theme choice, and keep "system" in sync with the OS. */
export function useTheme(): ThemeChoice {
  const choice = useSyncExternalStore(subscribe, snapshot, () => "system" as ThemeChoice);
  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);
  return choice;
}
