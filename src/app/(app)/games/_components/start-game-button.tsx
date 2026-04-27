"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { startGameAction } from "../actions";

export function StartGameButton({ gameId, disabled }: { gameId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const r = await startGameAction(gameId);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button onClick={start} disabled={pending || disabled}>
        {pending ? "Starting…" : "Start game"}
      </Button>
    </div>
  );
}
