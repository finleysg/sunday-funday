"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { copyRosterFromLastGameAction, saveRosterAction } from "../actions";

type Player = { id: string; name: string; email: string };
type Tee = { id: string; name: string; rating: number; slope: number };
type Entry = {
  playerId: string;
  playerName: string;
  playerEmail: string;
  teeId: string;
  teeName: string;
  courseHandicap: number;
};

type Row = {
  playerId: string;
  selected: boolean;
  teeId: string;
  courseHandicap: number;
};

export function RosterBuilder({
  gameId,
  editable,
  allPlayers,
  tees,
  entries,
  lastUsed,
}: {
  gameId: string;
  editable: boolean;
  allPlayers: Player[];
  tees: Tee[];
  entries: Entry[];
  lastUsed: Record<string, { teeId: string; courseHandicap: number }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initial = useMemo<Row[]>(() => {
    const byPlayer = new Map<string, Entry>();
    for (const e of entries) byPlayer.set(e.playerId, e);
    const teeIdsAvailable = new Set(tees.map((t) => t.id));
    const fallbackTeeId = tees[0]?.id ?? "";
    return allPlayers.map((p) => {
      const entry = byPlayer.get(p.id);
      if (entry) {
        return {
          playerId: p.id,
          selected: true,
          teeId: entry.teeId,
          courseHandicap: entry.courseHandicap,
        };
      }
      const last = lastUsed[p.id];
      const teeId = last && teeIdsAvailable.has(last.teeId) ? last.teeId : fallbackTeeId;
      return {
        playerId: p.id,
        selected: false,
        teeId,
        courseHandicap: last?.courseHandicap ?? 18,
      };
    });
  }, [allPlayers, entries, lastUsed, tees]);

  const [rows, setRows] = useState<Row[]>(initial);

  function update(playerId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, ...patch } : r)));
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  const dirty = !sameRoster(initial, rows);

  function save() {
    setError(null);
    if (tees.length === 0) {
      setError("This course has no active tees");
      return;
    }
    const selected = rows.filter((r) => r.selected);
    if (selected.some((r) => !Number.isFinite(r.courseHandicap))) {
      setError("Enter a course handicap for each selected player");
      return;
    }
    const payload = selected.map((r) => ({
      playerId: r.playerId,
      teeId: r.teeId,
      courseHandicap: Number(r.courseHandicap),
    }));
    startTransition(async () => {
      const r = await saveRosterAction(gameId, payload);
      if (r.ok) {
        toast.success(`Roster saved (${payload.length})`);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function copyLast() {
    setError(null);
    startTransition(async () => {
      const r = await copyRosterFromLastGameAction(gameId);
      if (r.ok) {
        toast.success(
          r.added === 0
            ? "Already up to date with last game"
            : `Added ${r.added} ${r.added === 1 ? "player" : "players"} from last game`,
        );
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  if (!editable) {
    return <ReadOnlyRoster entries={entries} emptyHint="Roster is empty." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3 text-sm">
        <span className="text-muted-foreground">{selectedCount} selected</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyLast} disabled={pending}>
            Add from last game
          </Button>
          <Button onClick={save} disabled={pending || !dirty}>
            {pending ? "Saving…" : dirty ? "Save roster" : "Saved"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <ul className="divide-y rounded-lg border bg-white">
        {allPlayers.length === 0 ? (
          <li className="text-muted-foreground p-4 text-sm">
            No active players. Add some from the roster page first.
          </li>
        ) : (
          allPlayers.map((p) => {
            const row = rows.find((r) => r.playerId === p.id)!;
            return (
              <li
                key={p.id}
                className="grid items-center gap-2 p-3 sm:grid-cols-[auto_1fr_auto_auto]"
              >
                <Checkbox
                  checked={row.selected}
                  onCheckedChange={(c) => update(p.id, { selected: c === true })}
                  aria-label={`Include ${p.name}`}
                />
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-muted-foreground truncate text-xs">{p.email}</div>
                </div>
                <select
                  value={row.teeId}
                  onChange={(e) => update(p.id, { teeId: e.target.value })}
                  disabled={!row.selected || tees.length === 0}
                  className="border-input bg-background h-9 rounded-md border px-2 text-sm disabled:opacity-50"
                  aria-label={`Tee for ${p.name}`}
                >
                  {tees.length === 0 ? (
                    <option value="">No tees</option>
                  ) : (
                    tees.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.rating}/{t.slope})
                      </option>
                    ))
                  )}
                </select>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={-10}
                  max={54}
                  value={Number.isFinite(row.courseHandicap) ? row.courseHandicap : ""}
                  onChange={(e) =>
                    update(p.id, {
                      courseHandicap: e.target.value === "" ? Number.NaN : Number(e.target.value),
                    })
                  }
                  disabled={!row.selected}
                  className="h-9 w-20 text-center"
                  aria-label={`Course handicap for ${p.name}`}
                />
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function ReadOnlyRoster({ entries, emptyHint }: { entries: Entry[]; emptyHint: string }) {
  return (
    <ul className="divide-y rounded-lg border bg-white">
      {entries.length === 0 ? (
        <li className="text-muted-foreground p-4 text-sm">{emptyHint}</li>
      ) : (
        entries.map((e) => (
          <li key={e.playerId} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{e.playerName}</div>
              <div className="text-muted-foreground truncate text-xs">
                {e.teeName} · CH {e.courseHandicap}
              </div>
            </div>
          </li>
        ))
      )}
    </ul>
  );
}

function sameRoster(a: Row[], b: Row[]): boolean {
  if (a.length !== b.length) return false;
  const map = new Map(b.map((r) => [r.playerId, r]));
  for (const ar of a) {
    const br = map.get(ar.playerId);
    if (!br) return false;
    if (
      ar.selected !== br.selected ||
      ar.teeId !== br.teeId ||
      Number(ar.courseHandicap) !== Number(br.courseHandicap)
    )
      return false;
  }
  return true;
}
