"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { SERVER_DOWN_TITLE, useServerDown } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Shared button styling, also used for links that look like buttons. Every
 * size is at least 44px tall with every pointer. Primary is Action Blue with
 * dark text, the one next step of a view; secondary is the surface with a
 * thin border; quiet has neither. There is no red button: a destructive
 * action is a secondary button with exact words and a confirmation.
 */
const buttonClasses = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 min-h-11 rounded-control border text-sm leading-[1.4285714286] font-semibold whitespace-nowrap no-underline select-none hover:brightness-[.94] active:scale-[.98] disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-accent bg-accent text-accent-ink",
        secondary: "border-line bg-surface text-ink",
        quiet: "border-transparent bg-transparent text-muted hover:bg-subtle hover:text-ink hover:brightness-100",
        // Only for a link inside a sentence; it is the one control below 44px.
        link: "min-h-0 border-0 bg-transparent font-medium text-ink underline hover:text-muted hover:brightness-100 active:scale-100",
      },
      size: {
        sm: "px-3 py-[11px]",
        md: "px-[17px] py-[11px]",
        // Icon-only buttons are 44px squares with a 16px glyph and an aria-label.
        icon: "size-11 p-0",
        "icon-sm": "size-11 p-0",
      },
    },
    compoundVariants: [
      { variant: "quiet", size: "md", className: "px-2.5" },
      { variant: "link", className: "p-0" },
    ],
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

/** The button's classes, for links and triggers that look like buttons. */
export function buttonVariants(props?: VariantProps<typeof buttonClasses>): string {
  return cn(buttonClasses(props));
}

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonClasses> & {
    /** Show a spinner and block clicks while an action runs. */
    loading?: boolean;
    /**
     * The action changes something on the server, so it is disabled (and
     * says why) while the server can't be reached.
     */
    needsServer?: boolean;
  };

/** A button. Defaults to `type="button"` so it never submits a form by accident. */
export function Button({
  className,
  variant,
  size,
  loading = false,
  needsServer = false,
  disabled,
  children,
  title,
  type = "button",
  ...props
}: ButtonProps) {
  const serverDown = useServerDown();
  const offline = needsServer && serverDown;
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading || offline}
      aria-busy={loading || undefined}
      title={offline ? SERVER_DOWN_TITLE : title}
      {...props}
    >
      {loading ? <LoaderCircle className="spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
