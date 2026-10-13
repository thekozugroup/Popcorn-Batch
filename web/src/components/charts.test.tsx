import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SavingsPoint } from "@/lib/types";
import { SavingsChart, worthCharting } from "./charts";

/**
 * Saved per day (working.md §7): real daily numbers as Action Blue columns
 * in a padded panel, the same numbers as a visible table under "Show the
 * daily numbers", and nothing decorative.
 */

const DAY = 86_400_000;
const points: SavingsPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 8, 14) + i * DAY).toISOString().slice(0, 10),
  saved_bytes: i % 3 === 0 ? 0 : (i + 1) * 1e9,
  files: i % 3 === 0 ? 0 : i + 1,
}));

afterEach(cleanup);

describe("the savings chart", () => {
  it("is a padded panel titled Saved per day, with the 30-day total", () => {
    const { container } = render(<SavingsChart points={points} />);
    const figure = container.querySelector("figure") as HTMLElement;
    expect(screen.getByRole("figure", { name: "Saved per day" })).toBe(figure);
    expect(figure.className).toContain("rounded-panel");
    expect(figure.className).toContain("p-7");
    expect(figure.className).toContain("max-roomy:p-5");
    const total = points.reduce((sum, p) => sum + p.saved_bytes, 0);
    expect(total).toBe(320e9);
    expect(figure.textContent).toContain("Last 30 days · 320 GB");
  });

  it("draws the columns in the one accent only, without animating them", () => {
    const { container } = render(<SavingsChart points={points} />);
    const columns = [...container.querySelectorAll("[data-day] > div")];
    expect(columns).toHaveLength(30);
    for (const column of columns) {
      expect(column.className).toContain("bg-accent");
      expect(column.className).not.toMatch(/animate|transition|gradient/);
    }
    // A day with nothing saved has no column; one with savings is at least 2% tall.
    expect((columns[0] as HTMLElement).style.height).toBe("0%");
    expect(parseFloat((columns[1] as HTMLElement).style.height)).toBeGreaterThanOrEqual(2);
  });

  it("reads a hovered day's numbers in the caption line", () => {
    const { container } = render(<SavingsChart points={points} />);
    const day = container.querySelectorAll("[data-day]")[1];
    fireEvent.mouseEnter(day);
    expect(container.querySelector("figcaption")?.textContent).toMatch(/: 2 GB · 2 files$/);
    expect(day.firstElementChild?.className).toContain("brightness-[.94]");
  });

  it("holds the daily numbers in a table under Show the daily numbers, for keyboard and touch too", () => {
    const { container } = render(<SavingsChart points={points} />);
    const disclosure = container.querySelector("details") as HTMLDetailsElement;
    expect(disclosure.open).toBe(false);
    expect(within(disclosure).getByText("Show the daily numbers").tagName).toBe("SUMMARY");
    const table = within(disclosure).getByRole("table", { name: "Space saved per day, last 30 days" });
    // The table is real content, not hidden for screen readers only.
    expect(table.className).not.toContain("sr-only");
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Day", "Saved", "Files"]);
    const rows = within(table).getAllByRole("row").slice(1);
    // Every day, including the ones where nothing was saved.
    expect(rows).toHaveLength(30);
    expect(within(rows[1]).getAllByRole("cell").map((td) => td.textContent)).toEqual(["2 GB", "2"]);
    expect(within(rows[0]).getAllByRole("cell").map((td) => td.textContent)).toEqual(["0 bytes", "0"]);
  });

  it("only appears once three days have savings", () => {
    expect(worthCharting(points)).toBe(true);
    expect(worthCharting(points.map((p, i) => (i < 28 ? { ...p, saved_bytes: 0 } : p)))).toBe(false);
  });
});
