"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { firstHoleNeedingScore, isSuspiciouslyHigh } from "@/lib/scores/entry";
import { strokesOnHole } from "@/lib/scoring/strokes";
import { cn } from "@/lib/utils";

type Player = {
  gameEntryId: string;
  playerId: string;
  playerName: string;
  teeName: string;
  courseHandicap: number;
  strokeIndexes: number[]; // length 18, [hole-1..hole-18]
  scoresByHole: Record<number, number | null>;
};

type Props = {
  gameId: string;
  canEdit: boolean;
  parsByHole: number[]; // length 18
  players: Player[];
};

const HOLES = 18;
const MIN_STROKES = 1;
const MAX_STROKES = 15;

// In-flight requests are keyed by (gameEntryId, holeNumber). Used to ignore
// stale responses if the user has retyped while a slower PUT is still
// resolving.
type RequestKey = string;
const reqKey = (gameEntryId: string, holeNumber: number): RequestKey =>
  `${gameEntryId}:${holeNumber}`;

export function ScoreEntry({ gameId, canEdit, parsByHole, players }: Props) {
  // Local optimistic copy of the scores. Initialised from the server snapshot.
  const [scores, setScores] = useState(() => {
    const m = new Map<RequestKey, number | null>();
    for (const p of players) {
      for (let h = 1; h <= HOLES; h++) {
        m.set(reqKey(p.gameEntryId, h), p.scoresByHole[h] ?? null);
      }
    }
    return m;
  });

  const initialHole = useMemo(
    () =>
      firstHoleNeedingScore(
        Array.from({ length: HOLES }, (_, i) => ({
          holeNumber: i + 1,
          entries: players.map((p) => ({
            gameEntryId: p.gameEntryId,
            strokes: p.scoresByHole[i + 1] ?? null,
          })),
        })),
      ),
    [players],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: initialHole - 1,
    loop: false,
    watchDrag: true,
    duration: 18,
  });
  const [holeIndex, setHoleIndex] = useState(initialHole - 1);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setHoleIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const goToHole = useCallback(
    (h: number) => {
      const clamped = Math.max(0, Math.min(HOLES - 1, h));
      emblaApi?.scrollTo(clamped);
    },
    [emblaApi],
  );

  // Track in-flight requests so a slower previous response doesn't clobber a
  // newer optimistic value. We store the *latest* requestId per key; only
  // that one wins the response.
  const latestReqId = useRef(new Map<RequestKey, number>());
  const reqCounter = useRef(0);

  const writeScore = useCallback(
    async (gameEntryId: string, holeNumber: number, strokes: number | null) => {
      if (!canEdit) return;
      const key = reqKey(gameEntryId, holeNumber);
      const prevValue = scores.get(key) ?? null;
      // Optimistic update.
      setScores((m) => {
        const next = new Map(m);
        next.set(key, strokes);
        return next;
      });
      const myReq = ++reqCounter.current;
      latestReqId.current.set(key, myReq);

      try {
        const res = await fetch(`/api/games/${gameId}/scores`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ gameEntryId, holeNumber, strokes }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as { error?: string });
          throw new Error(body.error ?? `Save failed (HTTP ${res.status})`);
        }
        // No need to apply the response — our optimistic value matches.
      } catch (err) {
        // Only revert if no newer write has come in for this cell.
        if (latestReqId.current.get(key) === myReq) {
          setScores((m) => {
            const next = new Map(m);
            next.set(key, prevValue);
            return next;
          });
          toast.error(err instanceof Error ? err.message : "Save failed");
        }
      }
    },
    [canEdit, gameId, scores],
  );

  return (
    <div className="space-y-4">
      <HoleNav
        holeIndex={holeIndex}
        parsByHole={parsByHole}
        onPrev={() => goToHole(holeIndex - 1)}
        onNext={() => goToHole(holeIndex + 1)}
        onJump={(h) => goToHole(h - 1)}
      />

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {Array.from({ length: HOLES }, (_, i) => i + 1).map((holeNumber) => (
            <div
              key={holeNumber}
              className="min-w-0 shrink-0 grow-0 basis-full px-1"
              aria-hidden={holeIndex !== holeNumber - 1}
            >
              <HolePanel
                holeNumber={holeNumber}
                par={parsByHole[holeNumber - 1] ?? 4}
                players={players}
                scores={scores}
                canEdit={canEdit}
                onWrite={writeScore}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HoleNav({
  holeIndex,
  parsByHole,
  onPrev,
  onNext,
  onJump,
}: {
  holeIndex: number;
  parsByHole: number[];
  onPrev: () => void;
  onNext: () => void;
  onJump: (hole: number) => void;
}) {
  const hole = holeIndex + 1;
  const par = parsByHole[holeIndex] ?? 4;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrev}
          disabled={holeIndex <= 0}
          aria-label="Previous hole"
        >
          <ChevronLeft />
        </Button>
        <div className="text-center">
          <div className="text-muted-foreground text-xs tracking-wide uppercase">Hole</div>
          <div className="text-2xl leading-none font-semibold">{hole}</div>
          <div className="text-muted-foreground text-xs">par {par}</div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          disabled={holeIndex >= 17}
          aria-label="Next hole"
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-9 gap-1 sm:grid-cols-18">
        {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onJump(h)}
            className={cn(
              "rounded border bg-white py-1 text-xs",
              h === hole ? "border-primary bg-primary/10 font-semibold" : "border-border",
            )}
            aria-current={h === hole ? "true" : undefined}
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}

function HolePanel({
  holeNumber,
  par,
  players,
  scores,
  canEdit,
  onWrite,
}: {
  holeNumber: number;
  par: number;
  players: Player[];
  scores: Map<RequestKey, number | null>;
  canEdit: boolean;
  onWrite: (gameEntryId: string, holeNumber: number, strokes: number | null) => void;
}) {
  return (
    <ul className="divide-y rounded-lg border bg-white">
      {players.length === 0 ? (
        <li className="text-muted-foreground p-4 text-sm">No players in this group.</li>
      ) : (
        players.map((p) => (
          <PlayerRow
            key={p.gameEntryId}
            player={p}
            holeNumber={holeNumber}
            par={par}
            strokes={scores.get(reqKey(p.gameEntryId, holeNumber)) ?? null}
            canEdit={canEdit}
            onWrite={(strokes) => onWrite(p.gameEntryId, holeNumber, strokes)}
          />
        ))
      )}
    </ul>
  );
}

function PlayerRow({
  player,
  holeNumber,
  par,
  strokes,
  canEdit,
  onWrite,
}: {
  player: Player;
  holeNumber: number;
  par: number;
  strokes: number | null;
  canEdit: boolean;
  onWrite: (strokes: number | null) => void;
}) {
  const [draft, setDraft] = useState(() => (strokes != null ? String(strokes) : ""));
  const focusedRef = useRef(false);

  // Sync the input from external updates (initial load, optimistic save round-
  // trip, another collaborator's write) only when the user isn't actively
  // editing — otherwise we'd clobber their in-progress keystrokes.
  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(strokes != null ? String(strokes) : "");
  }, [strokes]);

  const si = player.strokeIndexes[holeNumber - 1] ?? holeNumber;
  const strokesOnThisHole = strokesOnHole(player.courseHandicap, si);

  const commit = () => {
    if (!canEdit) return;
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (strokes != null) onWrite(null);
      return;
    }
    const n = Number.parseInt(trimmed, 10);
    if (Number.isFinite(n) && n >= MIN_STROKES && n <= MAX_STROKES) {
      if (n !== strokes) onWrite(n);
      setDraft(String(n));
    } else {
      // Out-of-range or unparseable: revert to the last saved value.
      setDraft(strokes != null ? String(strokes) : "");
    }
  };

  const high = isSuspiciouslyHigh(strokes, par);
  const showStrokeDot = strokesOnThisHole > 0;
  const giveBackStrokeDot = strokesOnThisHole < 0;

  return (
    <li className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{player.playerName}</span>
          {showStrokeDot
            ? Array.from({ length: strokesOnThisHole }).map((_, i) => (
                <span
                  key={i}
                  aria-label={`Receives ${strokesOnThisHole} stroke${strokesOnThisHole > 1 ? "s" : ""}`}
                  title="Stroke received on this hole"
                  className="bg-primary inline-block size-2 rounded-full"
                />
              ))
            : null}
          {giveBackStrokeDot ? (
            <span
              aria-label="Gives a stroke back on this hole"
              title="Gives stroke back on this hole"
              className="border-foreground/40 inline-block size-2 rounded-full border"
            />
          ) : null}
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {player.teeName} · CH{" "}
          {player.courseHandicap > 0 ? player.courseHandicap : `+${-player.courseHandicap}`}
          {high ? <span className="ml-2 text-amber-700">· {strokes}? double-check</span> : null}
        </div>
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={MIN_STROKES}
        max={MAX_STROKES}
        step={1}
        value={draft}
        disabled={!canEdit}
        aria-label={`Strokes for ${player.playerName} on hole ${holeNumber}`}
        onFocus={(e) => {
          focusedRef.current = true;
          e.currentTarget.select();
        }}
        onBlur={() => {
          focusedRef.current = false;
          commit();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={cn(
          "border-input ring-ring h-10 w-16 rounded-md border bg-white text-center text-lg font-semibold tabular-nums focus-visible:ring-2 focus-visible:outline-none",
          strokes == null && "text-muted-foreground border-dashed",
          !canEdit && "cursor-default opacity-90",
        )}
      />
    </li>
  );
}
