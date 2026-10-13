"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/overlays";
import { connectLive } from "@/lib/live";
import { shouldRetry } from "@/lib/queries";
import { useLive } from "@/lib/store";

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });
}

/** Opens the WebSocket once the app is mounted in the browser. */
function LiveConnection() {
  const client = useQueryClient();
  useEffect(() => connectLive(client), [client]);
  return null;
}

/** One polite live region for progress announcements. */
function LiveAnnouncer() {
  const text = useLive((s) => s.announcement);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {text}
    </div>
  );
}

/**
 * Announce `text` politely, at most once per `intervalMs`, but immediately
 * when `key` changes (e.g. a new stage). Keeps screen readers informed about
 * long-running work without chattering every second.
 */
export function useThrottledAnnouncement(text: string | null, key: string, intervalMs = 20_000): void {
  const last = useRef<{ at: number; key: string }>({ at: 0, key: "" });
  useEffect(() => {
    if (!text) return;
    const now = Date.now();
    if (key !== last.current.key || now - last.current.at >= intervalMs) {
      last.current = { at: now, key };
      useLive.getState().announce(text);
    }
  }, [text, key, intervalMs]);
}

/**
 * The family's focus ring on a toast and its buttons: sonner's own styles
 * (unlayered, so they beat the base `:focus-visible` rule) set no outline
 * and draw the ring as a shadow, which toasts don't have.
 */
const TOAST_FOCUS =
  "focus-visible:!outline-2 focus-visible:!outline-offset-4 focus-visible:!outline-accent focus-visible:![outline-style:solid] focus-visible:![box-shadow:none]";

/**
 * Toasts (DESIGN.md): the control radius, a 1px divider border (emerald or
 * red for success or error), 14px text, bottom right 16px from the edges.
 * No icon (the words and the border say it), no shadow, no close button:
 * they go away on their own (sooner with a swipe) and wait while hovered
 * or focused.
 */
export function AppToaster() {
  return (
    <Toaster
      theme="system"
      position="bottom-right"
      offset={16}
      mobileOffset={16}
      // null, not undefined: sonner then leaves the icon out instead of drawing its own.
      icons={{ success: null, error: null, info: null, warning: null, loading: null }}
      toastOptions={{
        classNames: {
          toast: `!rounded-control !border !border-line !bg-surface !text-ink ![box-shadow:none] !font-sans !text-sm ${TOAST_FOCUS}`,
          success: "!border-ok",
          error: "!border-error",
          description: "!text-muted",
          actionButton: `!min-h-11 !rounded-control !bg-accent !px-3 !text-accent-ink !font-semibold ${TOAST_FOCUS}`,
          cancelButton: `!min-h-11 !rounded-control !bg-subtle !px-3 !text-ink ${TOAST_FOCUS}`,
        },
      }}
    />
  );
}

/** App-wide providers: data cache, live updates, tooltips and toasts. */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delay={350}>
        <LiveConnection />
        {children}
        <LiveAnnouncer />
        <AppToaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
