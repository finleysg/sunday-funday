"use client";

import { CloudOffIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSyncQueue } from "@/lib/sync/use-sync-queue";

// Phase 6: shows the count of score writes still waiting to replay against
// the server. Hidden when no SW is registered (dev default) or the queue
// is empty. The "Sync now" action is the iOS fallback — Background Sync
// isn't supported there, so users who notice the badge can drain it on demand.
export function SyncBadge() {
  const { enabled, count, syncNow } = useSyncQueue();
  if (!enabled || count === 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
      <CloudOffIcon className="size-3.5" aria-hidden />
      <span>
        <span className="font-medium tabular-nums">{count}</span>
        <span className="ml-1">unsynced</span>
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={syncNow}
        aria-label="Retry pending score writes now"
        className="text-amber-900 hover:bg-amber-100"
      >
        <RefreshCwIcon />
      </Button>
    </div>
  );
}
