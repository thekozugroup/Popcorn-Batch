import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { FileStatus } from "@/lib/types";
import { FileStatusBadge } from "./status";

/**
 * Every file status tag has a dot in its tone (DESIGN.md, Colors › Status):
 * "To convert" is a waiting state, so it has the Zinc Status dot like "In
 * queue" and "Skipped".
 */

afterEach(cleanup);

const dotOf = (status: FileStatus) => {
  const { container } = render(<FileStatusBadge status={status} />);
  const dot = container.querySelector("[data-tag] > span[aria-hidden]");
  const colour = dot?.className.match(/bg-(field|accent|ok|warn|error)/)?.[1] ?? null;
  cleanup();
  return colour;
};

describe("file status tags", () => {
  it("give To convert the Zinc Status dot of a waiting state", () => {
    expect(dotOf("pending")).toBe("field");
  });

  it("give every status a dot in its tone", () => {
    expect(["pending", "queued", "processing", "done", "skipped", "failed"].map((s) => dotOf(s as FileStatus))).toEqual([
      "field",
      "field",
      "accent",
      "ok",
      "field",
      "error",
    ]);
  });
});
