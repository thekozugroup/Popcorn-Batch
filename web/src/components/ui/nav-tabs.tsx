"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { clampOffset } from "@/lib/progress";
import { updateParams } from "@/lib/router";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface NavTab {
  href: string;
  label: ReactNode;
  active: boolean;
  count?: number | null;
}

/**
 * Tabs that are links, so each tab has its own URL and survives reloads. The
 * current tab has a 2px bottom border in the main text colour. The tabs fit
 * at 390px; should they ever not, the row scrolls sideways and keeps the
 * current tab in view.
 */
export function NavTabs({ tabs, label, className }: { tabs: NavTab[]; label: string; className?: string }) {
  const scroller = useRef<HTMLElement>(null);
  const activeHref = tabs.find((t) => t.active)?.href;

  // Keep the current tab visible when the row is wider than the screen.
  useEffect(() => {
    const el = scroller.current;
    const active = el?.querySelector<HTMLElement>("[aria-current='page']");
    if (!el || !active) return;
    const start = active.offsetLeft - 16;
    const end = active.offsetLeft + active.offsetWidth + 16;
    if (start < el.scrollLeft) el.scrollLeft = start;
    else if (end > el.scrollLeft + el.clientWidth) el.scrollLeft = end - el.clientWidth;
  }, [activeHref]);

  return (
    <nav ref={scroller} aria-label={label} className={cn("overflow-x-auto [scrollbar-width:none]", className)}>
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <a
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                // The outline sits inside the tab: the scrolling row would clip it outside.
                "relative -mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium no-underline focus-visible:-outline-offset-2",
                tab.active ? "border-ink text-ink" : "border-transparent text-muted hover:border-line hover:text-ink",
              )}
            >
              {tab.label}
              {/* A zero count says nothing the empty tab doesn't. */}
              {tab.count ? (
                <span className="rounded-tag bg-subtle px-1.5 text-xs text-muted tabular">{tab.count.toLocaleString()}</span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** "1–50 of 1,208" with previous/next buttons. */
export function Pager({
  offset,
  limit,
  total,
  onPage,
  noun = "items",
}: {
  offset: number;
  limit: number;
  total: number;
  onPage: (offset: number) => void;
  noun?: string;
}) {
  if (total <= limit && offset === 0) return null;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(total, offset + limit);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-muted tabular" aria-live="polite">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} {noun}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => onPage(Math.max(0, offset - limit))} disabled={offset === 0}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onPage(offset + limit)} disabled={to >= total}>
          Next
        </Button>
      </div>
    </div>
  );
}

/**
 * When the page in `?offset=` points past the end of a list (the list
 * shrank, or an old link), move to the last page that exists instead of
 * showing an empty page that claims there is nothing.
 */
export function useClampedOffset(offset: number, total: number | undefined, limit: number): void {
  useEffect(() => {
    if (total === undefined) return;
    const fixed = clampOffset(offset, total, limit);
    if (fixed !== null) updateParams({ offset: fixed || null });
  }, [offset, total, limit]);
}
