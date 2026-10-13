import { describe, expect, it } from "vitest";
import { bugReportText } from "./hardware";
import {
  POPCORN_SR_URL_MAX_LEN,
  SR_URL_HAS_LOGIN,
  SR_URL_NOT_FULL,
  SR_URL_TOO_LONG,
  popcornSrLink,
  popcornSrUrlError,
} from "./popcorn-sr";

/**
 * The client's check of the Popcorn SR address agrees with the server's
 * (crates/popcorn-batch-server/src/services/settings.rs): the same cases,
 * the same words.
 */

describe("the Popcorn SR address check", () => {
  it("uses the server's words", () => {
    expect(SR_URL_NOT_FULL).toBe("Enter the full address, starting with http:// or https://, such as http://tower:8787.");
    expect(SR_URL_HAS_LOGIN).toBe("Leave out the user name and password. Popcorn SR asks for its key when you open it.");
    expect(SR_URL_TOO_LONG).toBe("This address is too long. Use the address you open Popcorn SR at.");
  });

  it("accepts full http and https addresses", () => {
    for (const ok of [
      "http://tower:8787",
      "https://sr.example.com/",
      "HTTPS://Tower.local:8787/sr?x=1#top",
      "http://192.168.1.20:8787",
      "http://[fd00::20]:8787/",
      "http://tower/path@with-at",
      "  http://tower:8787  ",
    ]) {
      expect(popcornSrUrlError(ok), ok).toBeNull();
    }
    const longest = `http://tower/${"a".repeat(POPCORN_SR_URL_MAX_LEN - 13)}`;
    expect(longest).toHaveLength(2048);
    expect(popcornSrUrlError(longest)).toBeNull();
  });

  it("treats empty as no address, which clears the setting", () => {
    expect(popcornSrUrlError(null)).toBeNull();
    expect(popcornSrUrlError(undefined)).toBeNull();
    expect(popcornSrUrlError("")).toBeNull();
    expect(popcornSrUrlError("   ")).toBeNull();
  });

  it("asks for a full http or https address", () => {
    for (const bad of [
      "javascript:alert(1)",
      "ftp://tower",
      "file:///etc/passwd",
      "data:text/html,hi",
      "ws://tower:8787",
      "tower:8787",
      "tower",
      "/sr",
      "//tower:8787",
      "http:tower",
      "http:/tower",
      "http://",
      "http:///",
      "http://:8787",
      "http://tower:99999",
      "http://to wer:8787",
      "http://tow\ner:8787",
      "http://tower:8787 /sr",
    ]) {
      expect(popcornSrUrlError(bad), JSON.stringify(bad)).toBe(SR_URL_NOT_FULL);
    }
  });

  it("asks to leave out a user name or password, even an empty one", () => {
    for (const bad of [
      "http://user:pass@tower:8787",
      "https://user@tower",
      "http://:pass@tower",
      "http://@tower:8787",
      "http://:@tower:8787/sr",
    ]) {
      expect(popcornSrUrlError(bad), bad).toBe(SR_URL_HAS_LOGIN);
    }
  });

  it("counts characters, not bytes, up to 2,048", () => {
    const long = `http://tower/${"a".repeat(POPCORN_SR_URL_MAX_LEN - 12)}`;
    expect(long).toHaveLength(2049);
    expect(popcornSrUrlError(long)).toBe(SR_URL_TOO_LONG);
    expect(popcornSrUrlError(`http://tower/${"é".repeat(POPCORN_SR_URL_MAX_LEN - 13)}`)).toBeNull();
    // Too long wins over everything else wrong with it.
    expect(popcornSrUrlError("x".repeat(POPCORN_SR_URL_MAX_LEN + 1))).toBe(SR_URL_TOO_LONG);
  });
});

describe("the Popcorn SR link", () => {
  it("is only there for a saved address that passes the check", () => {
    expect(popcornSrLink(undefined)).toBeNull();
    expect(popcornSrLink({ popcorn_sr_url: null })).toBeNull();
    expect(popcornSrLink({ popcorn_sr_url: "" })).toBeNull();
    expect(popcornSrLink({ popcorn_sr_url: "javascript:alert(1)" })).toBeNull();
    expect(popcornSrLink({ popcorn_sr_url: "http://user:pass@tower:8787" })).toBeNull();
    expect(popcornSrLink({ popcorn_sr_url: " http://tower:8787 " })).toBe("http://tower:8787");
  });

  it("is never part of a bug report", () => {
    const text = bugReportText({
      system: { version: "0.4.0", build: null, in_container: true },
      settings: { hardware: "auto", popcorn_sr_url: "http://tower:8787" } as never,
    });
    expect(text).not.toContain("tower");
    expect(text).not.toMatch(/Popcorn SR/);
  });
});
