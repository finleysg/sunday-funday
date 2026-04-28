"use client";

import { useCallback, useEffect, useState } from "react";

// Client-side hook owning two responsibilities:
// 1. Register the service worker once (gated by NEXT_PUBLIC_ENABLE_SW so dev
//    environments don't get sticky SW caches by accident).
// 2. Surface the SW's queued-write count to the React tree, plus a manual
//    "sync now" trigger for iOS Safari (no BackgroundSync API there).
//
// The SW is the source of truth; we just listen for `queue-count` messages
// and ask the SW to recount on mount, online events, and visibilitychange.

const SW_PATH = "/sw.js";
const SW_ENABLED = process.env["NEXT_PUBLIC_ENABLE_SW"] === "true";

export type SyncQueueState = {
  enabled: boolean;
  count: number;
  syncNow: () => void;
};

export function useSyncQueue(): SyncQueueState {
  const [count, setCount] = useState(0);

  const ask = useCallback(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.serviceWorker?.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: "queue-count" });
  }, []);

  const syncNow = useCallback(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.serviceWorker?.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: "sync-now" });
  }, []);

  useEffect(() => {
    if (!SW_ENABLED) return;
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    void navigator.serviceWorker
      .register(SW_PATH)
      .then(() => {
        if (cancelled) return;
        ask();
      })
      .catch(() => {
        // Registration failures shouldn't break the UI — the page still
        // works, the user just doesn't get offline queueing.
      });

    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; count?: number } | undefined;
      if (data?.type === "queue-count" && typeof data.count === "number") {
        setCount(data.count);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    const onOnline = () => {
      syncNow();
      ask();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") ask();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ask, syncNow]);

  return { enabled: SW_ENABLED, count, syncNow };
}
