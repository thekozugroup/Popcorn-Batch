/**
 * The optional Popcorn SR address (`Settings.popcorn_sr_url`): the same
 * checks and words as the server (services/settings.rs,
 * `check_popcorn_sr_url`), so Settings can say what to fix before Save, and
 * the link the sidebar and About show. Popcorn Batch never fetches, pings
 * or embeds the address: it only links to it.
 */

import type { Settings } from "./types";

/** The longest address Settings accepts, in characters (not bytes), like the server. */
export const POPCORN_SR_URL_MAX_LEN = 2048;

export const SR_URL_NOT_FULL =
  "Enter the full address, starting with http:// or https://, such as http://tower:8787.";
export const SR_URL_HAS_LOGIN = "Leave out the user name and password. Popcorn SR asks for its key when you open it.";
export const SR_URL_TOO_LONG = "This address is too long. Use the address you open Popcorn SR at.";

/** Spaces, line breaks and control characters, which address parsers drop or refuse differently. */
const UNCLEAN = /[\s\p{Cc}]/u;

/**
 * What is wrong with an address typed into Settings, in the server's words,
 * or `null` when it is fine or empty (empty clears the setting). Checked as
 * the server does, after trimming: at most 2,048 characters; starting with
 * `http://` or `https://` ("http:tower" would also parse); no spaces;
 * parsed with a host; no user name or password, not even an empty one
 * ("http://@tower", which the parser drops).
 */
export function popcornSrUrlError(value: string | null | undefined): string | null {
  const address = (value ?? "").trim();
  if (!address) return null;
  if ([...address].length > POPCORN_SR_URL_MAX_LEN) return SR_URL_TOO_LONG;
  const lower = address.toLowerCase();
  const afterScheme = lower.startsWith("http://")
    ? lower.slice("http://".length)
    : lower.startsWith("https://")
      ? lower.slice("https://".length)
      : null;
  if (afterScheme === null || UNCLEAN.test(address)) return SR_URL_NOT_FULL;
  let parsed: URL;
  try {
    parsed = new URL(address);
  } catch {
    return SR_URL_NOT_FULL;
  }
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname) return SR_URL_NOT_FULL;
  const authorityEnd = afterScheme.search(/[/?#\\]/);
  const authority = authorityEnd < 0 ? afterScheme : afterScheme.slice(0, authorityEnd);
  if (parsed.username || parsed.password || authority.includes("@")) return SR_URL_HAS_LOGIN;
  return null;
}

/**
 * The address to link to, only once it is saved and passes the checks
 * above (an older or edited database can't put a `javascript:` link on
 * screen); `null` shows no link and nothing else about Popcorn SR.
 */
export function popcornSrLink(settings: Pick<Settings, "popcorn_sr_url"> | undefined): string | null {
  const address = settings?.popcorn_sr_url?.trim();
  if (!address || popcornSrUrlError(address) !== null) return null;
  return address;
}
