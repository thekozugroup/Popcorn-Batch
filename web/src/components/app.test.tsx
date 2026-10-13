import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HostNotAllowed } from "./app";

afterEach(cleanup);

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
    expect(h1.className).toContain("font-semibold");
    expect(h1.className).toContain("text-3xl");
    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry.querySelector("svg")).toBeNull();
    expect(retry.className).toContain("bg-accent");
  });
});
