import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { parseRoute } from "@/lib/router";
import type { Library, Settings } from "@/lib/types";
import { App, HostNotAllowed, NotFound, documentTitle } from "./app";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = "";
});

/** The app while its first answers are on their way (they never come here). */
function showLoading(hash: string) {
  window.location.hash = hash;
  vi.spyOn(api, "settings").mockReturnValue(new Promise<Settings>(() => {}));
  vi.spyOn(api, "libraries").mockReturnValue(new Promise<Library[]>(() => {}));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

describe("the boot frame", () => {
  it("says it is loading in a status line, not in a label nothing reads", () => {
    const { container } = showLoading("#/");
    const frame = container.querySelector("[aria-busy='true']") as HTMLElement;
    expect(frame).not.toBeNull();
    // aria-label on an element without a role is prohibited (axe aria-prohibited-attr).
    expect(frame.hasAttribute("aria-label")).toBe(false);
    expect(screen.getByRole("status").textContent).toBe("Loading Popcorn Batch…");
    expect(screen.getByRole("status").className).toContain("sr-only");
  });

  it("has the frame's main region and a full-height sidebar with the brand where the real one has it", () => {
    const { container } = showLoading("#/");
    expect(container.querySelector("main")).not.toBeNull();
    const sidebar = container.querySelector(".wide\\:flex") as HTMLElement;
    for (const c of ["wide:sticky", "wide:top-0", "wide:h-dvh"]) expect(sidebar.className.split(" ")).toContain(c);
    const brandRow = screen.getByText("Batch").closest(".min-h-11") as HTMLElement;
    expect(brandRow.className).toContain("items-center");
  });
});

describe("the tab title", () => {
  it("names the screen, and Welcome during setup", () => {
    expect(documentTitle(parseRoute("#/queue"), false)).toBe("Queue — Popcorn Batch");
    expect(documentTitle(parseRoute("#/libraries"), false)).toBe("Libraries — Popcorn Batch");
    expect(documentTitle(parseRoute("#/library/abc/settings"), false)).toBe("Library — Popcorn Batch");
    expect(documentTitle(parseRoute("#/"), false)).toBe("Overview — Popcorn Batch");
    expect(documentTitle(parseRoute("#/nope"), false)).toBe("Not found — Popcorn Batch");
    expect(documentTitle(parseRoute("#/"), true)).toBe("Welcome — Popcorn Batch");
  });

  it("is a title element the app renders itself, from the first render on", () => {
    showLoading("#/queue");
    // React keeps it in the head; layout.tsx's metadata has none to overwrite it after hydration.
    expect(document.head.querySelector("title")?.textContent).toBe("Queue — Popcorn Batch");
    expect(document.title).toBe("Queue — Popcorn Batch");
  });
});

describe("the not-found screen", () => {
  it("has the page's h1", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "This page doesn't exist" })).toBeTruthy();
  });
});

describe("the unknown-address screen", () => {
  it("is titled with the wording of the docs and the server's error, with the address in it", () => {
    render(<HostNotAllowed retrying={false} onRetry={() => {}} host="media.example.com" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      'Popcorn Batch doesn\'t answer to the address "media.example.com"',
    );
  });

  it("names the browser's own address when none is given", () => {
    // jsdom's page is http://localhost:3000/.
    render(<HostNotAllowed retrying={false} onRetry={() => {}} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      `Popcorn Batch doesn't answer to the address "${window.location.hostname}"`,
    );
  });

  it("still has a title when the address isn't known", () => {
    render(<HostNotAllowed retrying={false} onRetry={() => {}} host="" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Popcorn Batch doesn't answer to this address");
  });

  it("tells nginx to pass the host with its port, so changes and live updates keep working", () => {
    render(<HostNotAllowed retrying={false} onRetry={() => {}} host="media.example.com" />);
    const hint = screen.getByText("proxy_set_header Host $http_host;");
    expect(hint.tagName).toBe("CODE");
    // `$host` drops the port, which breaks everything but ports 80 and 443.
    expect(document.body.textContent).not.toMatch(/Host \$host;/);
    // The variable the screen tells you to set holds the name it shows.
    expect(document.body.textContent).toContain("ALLOWED_HOSTS=media.example.com");
  });

  it("is the frame's main region", () => {
    const { container } = render(<HostNotAllowed retrying={false} onRetry={() => {}} host="media.example.com" />);
    const main = container.querySelector("main");
    expect(main?.querySelector("h1")).not.toBeNull();
  });

  it("offers to try again", () => {
    const onRetry = vi.fn();
    render(<HostNotAllowed retrying={false} onRetry={onRetry} host="media.example.com" />);
    screen.getByRole("button", { name: "Try again" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("uses the family's frame: the brand as one name, a system-sans headline and a text-only primary button", () => {
    render(<HostNotAllowed retrying={false} onRetry={() => {}} host="media.example.com" />);
    expect(screen.getByText("Batch").tagName).toBe("SMALL");
    expect(screen.getByText("Batch").parentElement?.textContent).toBe("Popcorn Batch");
    const h1 = screen.getByRole("heading", { level: 1 });
    // The headline token (30px, 600, -0.025em; see globals.css), not a display face.
    expect(h1.className).toContain("text-headline");
    expect(h1.className).not.toContain("font-display");
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry.querySelector("svg")).toBeNull();
    expect(retry.className).toContain("bg-accent");
  });
});
