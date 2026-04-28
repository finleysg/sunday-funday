// Pure leaderboard aggregator. Pulls every dependency from the Phase 4
// scoring primitives so format ↔ display semantics stay aligned with the
// unit-tested math. Consumed by both the JSON API and any server-render path
// (e.g. an Excel export in Phase 8).

import { chicagoQuota, chicagoResult } from "@/lib/scoring/chicago";
import { halfShotSkinWinner } from "@/lib/scoring/skins-half-shot";
import { netSkinWinner } from "@/lib/scoring/skins-net";
import { stablefordResult } from "@/lib/scoring/stableford";
import { strokePlayResult } from "@/lib/scoring/stroke";
import { strokesOnHole } from "@/lib/scoring/strokes";

export type GameFormat = "STROKE" | "STABLEFORD" | "CHICAGO_39";
export type SkinsType = "NONE" | "NET" | "HALF_SHOT";

export type LeaderboardEntryInput = {
  gameEntryId: string;
  playerId: string;
  playerName: string;
  courseHandicap: number;
  strokeIndexes: number[]; // length 18
  scoresByHole: Record<number, number | null>; // 1..18 → strokes|null
};

export type LeaderboardInput = {
  format: GameFormat;
  skinsType: SkinsType;
  pars: number[]; // length 18
  entries: LeaderboardEntryInput[];
};

export type LeaderboardRow = {
  gameEntryId: string;
  playerId: string;
  playerName: string;
  courseHandicap: number;
  rank: number;
  thru: number;
  // Format-specific summary suitable for display.
  primary: number;
  primaryLabel: string;
  // Optional fields per format / for skins display.
  grossTotal?: number;
  quota?: number;
  skins: number;
};

export type LeaderboardResult = {
  format: GameFormat;
  skinsType: SkinsType;
  rows: LeaderboardRow[];
  // Per-hole skin winners; useful for the skins panel and the future export.
  skinsByHole: Array<{ holeNumber: number; winnerEntryId: string | null }>;
};

export function computeLeaderboard(input: LeaderboardInput): LeaderboardResult {
  const { format, skinsType, pars, entries } = input;

  const skinsByHole = skinsType === "NONE" ? [] : computeSkinsByHole(skinsType, pars, entries);
  const skinsTallies = new Map<string, number>();
  for (const s of skinsByHole) {
    if (s.winnerEntryId) {
      skinsTallies.set(s.winnerEntryId, (skinsTallies.get(s.winnerEntryId) ?? 0) + 1);
    }
  }

  const partials = entries.map((e) => formatRow(format, pars, e));
  const sorted = [...partials].sort(rowSorter(format));

  // Dense ranking on the primary metric (ties share a rank).
  let prevPrimary: number | null = null;
  let rank = 0;
  let i = 0;
  const rows: LeaderboardRow[] = sorted.map((p) => {
    i++;
    if (prevPrimary === null || !primaryEquals(p.primary, prevPrimary)) {
      rank = i;
      prevPrimary = p.primary;
    }
    return {
      ...p,
      rank,
      skins: skinsTallies.get(p.gameEntryId) ?? 0,
    };
  });

  return { format, skinsType, rows, skinsByHole };
}

function primaryEquals(a: number, b: number): boolean {
  return a === b;
}

function rowSorter(format: GameFormat) {
  return (a: PartialRow, b: PartialRow): number => {
    // STROKE: lower net is better. STABLEFORD/CHICAGO: higher points/vsQuota.
    if (format === "STROKE") {
      if (a.primary !== b.primary) return a.primary - b.primary;
    } else {
      if (a.primary !== b.primary) return b.primary - a.primary;
    }
    // Tiebreaker for display stability: more holes played first, then name.
    if (a.thru !== b.thru) return b.thru - a.thru;
    return a.playerName.localeCompare(b.playerName);
  };
}

type PartialRow = Omit<LeaderboardRow, "rank" | "skins">;

function formatRow(format: GameFormat, pars: number[], e: LeaderboardEntryInput): PartialRow {
  const holes = pars.map((par, i) => ({
    par,
    strokeIndex: e.strokeIndexes[i] ?? i + 1,
    grossStrokes: e.scoresByHole[i + 1] ?? null,
  }));

  if (format === "STROKE") {
    const r = strokePlayResult(
      e.courseHandicap,
      holes.map((h) => ({ strokeIndex: h.strokeIndex, grossStrokes: h.grossStrokes })),
    );
    return {
      gameEntryId: e.gameEntryId,
      playerId: e.playerId,
      playerName: e.playerName,
      courseHandicap: e.courseHandicap,
      thru: r.holesPlayed,
      primary: r.netTotal,
      primaryLabel: `${r.netTotal}`,
      grossTotal: r.grossTotal,
    };
  }
  if (format === "STABLEFORD") {
    const r = stablefordResult(e.courseHandicap, holes);
    return {
      gameEntryId: e.gameEntryId,
      playerId: e.playerId,
      playerName: e.playerName,
      courseHandicap: e.courseHandicap,
      thru: r.holesPlayed,
      primary: r.points,
      primaryLabel: `${r.points} pts`,
    };
  }
  // CHICAGO_39
  const r = chicagoResult(e.courseHandicap, holes);
  return {
    gameEntryId: e.gameEntryId,
    playerId: e.playerId,
    playerName: e.playerName,
    courseHandicap: e.courseHandicap,
    thru: r.holesPlayed,
    primary: r.vsQuota,
    primaryLabel: r.vsQuota >= 0 ? `+${r.vsQuota}` : `${r.vsQuota}`,
    quota: chicagoQuota(e.courseHandicap),
  };
}

function computeSkinsByHole(
  skinsType: Exclude<SkinsType, "NONE">,
  pars: number[],
  entries: LeaderboardEntryInput[],
): Array<{ holeNumber: number; winnerEntryId: string | null }> {
  const out: Array<{ holeNumber: number; winnerEntryId: string | null }> = [];
  for (let h = 1; h <= 18; h++) {
    const par = pars[h - 1] ?? 4;
    const players = entries.map((e) => {
      const gross = e.scoresByHole[h] ?? null;
      const si = e.strokeIndexes[h - 1] ?? h;
      const net = gross == null ? null : gross - strokesOnHole(e.courseHandicap, si);
      return { gameEntryId: e.gameEntryId, gross, net, par };
    });
    let winner: string | null = null;
    if (skinsType === "NET") {
      winner = netSkinWinner(players.map((p) => ({ playerId: p.gameEntryId, netStrokes: p.net })));
    } else {
      winner = halfShotSkinWinner(
        players.map((p) => ({
          playerId: p.gameEntryId,
          par: p.par,
          grossStrokes: p.gross,
          netStrokes: p.net,
        })),
      );
    }
    out.push({ holeNumber: h, winnerEntryId: winner });
  }
  return out;
}
