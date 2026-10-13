import { cn } from "@/lib/utils";

/**
 * The app icon (`app/icon.svg`, `unraid/popcorn-batch.png`): a tile holding
 * three kernels in a pile, the top one Action Blue (the file being worked
 * on). Like Popcorn SR's mark, the tile takes the main text colour and the
 * kernels the page colour, so in the light theme it is the icon exactly
 * (zinc-900 and zinc-50) and in the dark theme it stays visible against the
 * zinc-900 sidebar.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="10" fill="var(--ink)" />
      <circle cx="16" cy="11.7" r="4.5" fill="var(--accent)" />
      <circle cx="11" cy="20.3" r="4.5" fill="var(--page)" />
      <circle cx="21" cy="20.3" r="4.5" fill="var(--page)" />
    </svg>
  );
}

/**
 * Mark plus wordmark: "Popcorn" with a smaller "Batch", in Popcorn SR's own
 * measurements. Read as one name, "Popcorn Batch".
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 text-[19px] leading-none font-[650] tracking-[-0.6px] whitespace-nowrap text-ink",
        className,
      )}
    >
      <BrandMark />
      <span>
        Popcorn <small className="text-xs font-medium tracking-[0.02em] text-muted">Batch</small>
      </span>
    </span>
  );
}
