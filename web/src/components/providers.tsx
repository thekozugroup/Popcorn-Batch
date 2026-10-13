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

/** Toasts: flat, bottom right, 16px from the edges; success and error are a 1px border only. */
function AppToaster() {
  return (
    <Toaster
      theme="system"
      position="bottom-right"
      offset={16}
      mobileOffset={16}
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-control !border !border-line !bg-surface !text-ink !shadow-none !font-sans !text-sm",
          success: "!border-ok",
          error: "!border-error",
          description: "!text-muted",
          actionButton: "!bg-accent !text-accent-ink !font-semibold",
          cancelButton: "!bg-subtle !text-ink",
          closeButton: "!bg-surface !border-line !text-muted",
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
