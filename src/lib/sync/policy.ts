// Decides whether a failed score-write should be queued for replay or
// reported to the user as a hard failure. Network errors and 5xx are
// transient → queue. 4xx is a logical rejection (auth, validation, game
// complete) → bubble up. Reused by the service worker and unit-tested
// independently so the policy lives in plain JS and can evolve cleanly.

export type FetchOutcome = { kind: "ok"; status: number } | { kind: "error"; status?: number };

export function shouldQueueForReplay(outcome: FetchOutcome): boolean {
  if (outcome.kind === "ok") {
    // 2xx never queues; 5xx queues; everything else (3xx/4xx) does not.
    return outcome.status >= 500 && outcome.status < 600;
  }
  // Network failure (fetch threw) — always queue.
  return true;
}

// Match path of the score-write endpoint. Anchored to /api/games/<id>/scores.
export function isScoreWritePath(pathname: string): boolean {
  return /^\/api\/games\/[^/]+\/scores$/.test(pathname);
}
