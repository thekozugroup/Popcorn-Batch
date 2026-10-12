/**
 * Theme constants shared by the server-rendered layout and the client.
 * Kept free of "use client" so the layout can inline the boot script.
 */

/** localStorage key holding "light" or "dark" (absent = follow the OS). */
export const THEME_STORAGE_KEY = "popcorn-batch-theme";

/**
 * The key under the project's earlier names, newest first: Szalinski, then
 * Chrysopoeia. Read while the current one is unset, removed when a theme is
 * chosen.
 */
export const LEGACY_THEME_STORAGE_KEYS = ["szalinski-theme", "chrysopoeia-theme"] as const;

/** Every key a theme choice may be saved under, in the order they are read. */
export const THEME_STORAGE_KEYS = [THEME_STORAGE_KEY, ...LEGACY_THEME_STORAGE_KEYS] as const;

/** Script run in <head> before the app loads. Keep in sync with readThemeChoice and applyTheme. */
export const THEME_BOOT_SCRIPT = `(function(){try{var s=localStorage,k=${JSON.stringify(THEME_STORAGE_KEYS)},c=null;for(var i=0;c===null&&i<k.length;i++)c=s.getItem(k[i]);var d=c==="dark"||(c!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){document.documentElement.classList.add("dark");}})();`;
