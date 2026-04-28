"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { completeGameAction, reopenGameAction } from "../actions";
import { formatFormat, formatGameDate, formatSkins } from "../_utils";

type GameSummary = {
  id: string;
  name: string;
  date: Date;
  status: "SETUP" | "IN_PROGRESS" | "COMPLETE";
  format: string;
  skinsType: string;
  course: { name: string };
  entryCount: number;
};

export function GameHeader({ game, admin }: { game: GameSummary; admin: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function complete() {
    setError(null);
    startTransition(async () => {
      const r = await completeGameAction(game.id);
      if (!r.ok) setError(r.error);
    });
  }
  function reopen() {
    setError(null);
    startTransition(async () => {
      const r = await reopenGameAction(game.id);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <header className="space-y-2 rounded-lg border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{game.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatGameDate(game.date)} · {game.course.name}
          </p>
          <p className="text-muted-foreground text-sm">
            {formatFormat(game.format)} · {formatSkins(game.skinsType)}
          </p>
        </div>
        <StatusBadge status={game.status} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {game.status !== "SETUP" ? (
          <Button asChild variant="outline" size="sm">
            <a href={`/api/games/${game.id}/export.xlsx`} download>
              Export Excel
            </a>
          </Button>
        ) : null}
        {game.status === "IN_PROGRESS" ? (
          <Button variant="outline" size="sm" onClick={complete} disabled={pending}>
            {pending ? "…" : "Mark complete"}
          </Button>
        ) : null}
        {game.status === "COMPLETE" && admin ? (
          <Button variant="outline" size="sm" onClick={reopen} disabled={pending}>
            {pending ? "…" : "Reopen game"}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </header>
  );
}

function StatusBadge({ status }: { status: GameSummary["status"] }) {
  const styles: Record<GameSummary["status"], string> = {
    SETUP: "border-amber-300 bg-amber-50 text-amber-900",
    IN_PROGRESS: "border-emerald-300 bg-emerald-50 text-emerald-900",
    COMPLETE: "border-slate-300 bg-slate-50 text-slate-700",
  };
  const label: Record<GameSummary["status"], string> = {
    SETUP: "Setup",
    IN_PROGRESS: "Live",
    COMPLETE: "Complete",
  };
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {label[status]}
    </span>
  );
}
