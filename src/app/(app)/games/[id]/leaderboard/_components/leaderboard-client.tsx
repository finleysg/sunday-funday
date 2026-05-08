"use client";

import { ListChecksIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { LeaderboardResult } from "@/lib/leaderboard/compute";
import { cn } from "@/lib/utils";

import { formatFormat, formatGameDate, formatSkins } from "../../../_utils";
import { NassauModal, type NassauResponse } from "./nassau-modal";

const POLL_INTERVAL_MS = 15_000;

export type LeaderboardSnapshot = {
  game: {
    id: string;
    name: string;
    date: string; // ISO — server passes a Date that we serialise here
    courseName: string;
    status: "SETUP" | "IN_PROGRESS" | "COMPLETE";
    format: "STROKE" | "STABLEFORD" | "CHICAGO_39";
    skinsType: "NONE" | "NET" | "HALF_SHOT";
  };
  leaderboard: LeaderboardResult;
  fetchedAt: string;
};

export function LeaderboardClient({
  gameId,
  userEntryId,
  userGroupId,
  initial,
}: {
  gameId: string;
  userEntryId: string | null;
  userGroupId: string | null;
  initial: LeaderboardSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/leaderboard`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as LeaderboardSnapshot;
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [gameId]);

  // 15s polling, paused while the page is hidden — per decisions.md.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const start = () => {
      stop();
      timerRef.current = setInterval(refetch, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Catch up immediately, then resume the cadence.
        void refetch();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch]);

  const { game, leaderboard } = snapshot;
  const showSkins = leaderboard.skinsType !== "NONE";
  const primaryHeader = primaryHeaderForFormat(game.format);

  // Side-bet (Nassau) selection: tap row A → highlight; tap row B → modal.
  // Tapping the same row twice cancels. Fetch is fired from the click handler
  // (not an effect) — React's docs explicitly recommend event handlers over
  // effects for user-initiated network calls.
  const [selectedAId, setSelectedAId] = useState<string | null>(null);
  const [nassauOpen, setNassauOpen] = useState(false);
  const [nassauLoading, setNassauLoading] = useState(false);
  const [nassauError, setNassauError] = useState<string | null>(null);
  const [nassauData, setNassauData] = useState<NassauResponse | null>(null);
  const nassauRequestId = useRef(0);
  const selectedAName = useMemo(
    () => leaderboard.rows.find((r) => r.gameEntryId === selectedAId)?.playerName ?? null,
    [leaderboard.rows, selectedAId],
  );
  const onRowSelect = useCallback(
    async (entryId: string) => {
      if (selectedAId === null) {
        setSelectedAId(entryId);
        return;
      }
      if (selectedAId === entryId) {
        setSelectedAId(null);
        return;
      }
      const a = selectedAId;
      const b = entryId;
      const id = ++nassauRequestId.current;
      setNassauOpen(true);
      setNassauLoading(true);
      setNassauError(null);
      setNassauData(null);
      try {
        const res = await fetch(`/api/games/${gameId}/nassau?a=${a}&b=${b}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as NassauResponse;
        if (id === nassauRequestId.current) setNassauData(json);
      } catch (err) {
        if (id === nassauRequestId.current) {
          setNassauError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (id === nassauRequestId.current) setNassauLoading(false);
      }
    },
    [gameId, selectedAId],
  );

  return (
    <>
      <header className="bg-card space-y-2 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{game.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatGameDate(new Date(game.date))} · {game.courseName}
            </p>
            <p className="text-muted-foreground text-sm">
              {formatFormat(game.format)} · {formatSkins(game.skinsType)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={refreshing}
              aria-label="Refresh leaderboard"
            >
              <RefreshCwIcon className={cn(refreshing && "animate-spin")} />
              {refreshing ? "…" : "Refresh"}
            </Button>
            {game.status !== "SETUP" ? (
              <Button asChild variant="ghost" size="sm">
                <a href={`/api/games/${gameId}/export.xlsx`} download>
                  Export Excel
                </a>
              </Button>
            ) : null}
          </div>
        </div>
        {userGroupId ? (
          <div>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/games/${gameId}/groups/${userGroupId}/score`}>
                <ListChecksIcon /> Enter scores
              </Link>
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </header>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Standings</h2>
          {selectedAId ? (
            <p className="text-warning text-xs">
              Comparing with <span className="font-medium">{selectedAName}</span> — tap another
              player.{" "}
              <button type="button" className="underline" onClick={() => setSelectedAId(null)}>
                Cancel
              </button>
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">Tap two players to compare (Nassau)</p>
          )}
        </div>
        <div className="bg-card overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground bg-muted/40 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">Player</th>
                <th className="px-3 py-2 text-right font-medium tabular-nums">{primaryHeader}</th>
                <th className="text-muted-foreground px-3 py-2 text-right font-medium tabular-nums">
                  Gross
                </th>
                <th className="text-muted-foreground px-3 py-2 text-right font-medium">Thru</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leaderboard.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted-foreground p-4 text-sm">
                    No players yet.
                  </td>
                </tr>
              ) : (
                leaderboard.rows.map((row) => {
                  const isMe = row.gameEntryId === userEntryId;
                  const isSelected = row.gameEntryId === selectedAId;
                  return (
                    <tr
                      key={row.gameEntryId}
                      className={cn(
                        "hover:bg-muted/40 cursor-pointer",
                        isMe && "bg-primary/5",
                        isSelected && "bg-warning/10 ring-warning/40 ring-1",
                      )}
                      aria-current={isMe ? "true" : undefined}
                      aria-selected={isSelected}
                      onClick={() => onRowSelect(row.gameEntryId)}
                    >
                      <td className="px-3 py-2 font-medium tabular-nums">{row.rank}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-medium", isMe && "text-primary")}>
                            {row.playerName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            CH{" "}
                            {row.courseHandicap >= 0
                              ? row.courseHandicap
                              : `+${-row.courseHandicap}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.primaryLabel}</td>
                      <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                        {row.thru > 0 ? row.grossTotal : "—"}
                      </td>
                      <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                        {row.thru === 18 ? "F" : row.thru}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <NassauModal
        open={nassauOpen}
        loading={nassauLoading}
        error={nassauError}
        data={nassauData}
        onOpenChange={(o) => {
          if (!o) {
            setNassauOpen(false);
            setSelectedAId(null);
            setNassauData(null);
            setNassauError(null);
          }
        }}
      />

      {showSkins ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            Skins ·{" "}
            <span className="text-muted-foreground">{formatSkins(leaderboard.skinsType)}</span>
          </h2>
          <div className="bg-card overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground bg-muted/40 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Player</th>
                  <th className="px-3 py-2 text-right font-medium tabular-nums">Skins</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...leaderboard.rows]
                  .sort((a, b) => b.skins - a.skins || a.playerName.localeCompare(b.playerName))
                  .filter((r) => r.skins > 0).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-muted-foreground p-4 text-sm">
                      No skins won yet.
                    </td>
                  </tr>
                ) : (
                  [...leaderboard.rows]
                    .sort((a, b) => b.skins - a.skins || a.playerName.localeCompare(b.playerName))
                    .filter((r) => r.skins > 0)
                    .map((row) => {
                      const isMe = row.gameEntryId === userEntryId;
                      return (
                        <tr
                          key={row.gameEntryId}
                          className={cn(isMe && "bg-primary/5")}
                          aria-current={isMe ? "true" : undefined}
                        >
                          <td className="px-3 py-2">
                            <span className={cn("font-medium", isMe && "text-primary")}>
                              {row.playerName}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.skins}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}

function primaryHeaderForFormat(format: LeaderboardSnapshot["game"]["format"]): string {
  if (format === "STROKE") return "Net";
  if (format === "STABLEFORD") return "Points";
  return "vs Quota";
}
