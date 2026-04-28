import { describe, expect, it } from "vitest";

import { computeLeaderboard, type LeaderboardEntryInput, type LeaderboardInput } from "../compute";

const par4s = (): number[] => Array<number>(18).fill(4);
const seqSI = (): number[] => Array.from({ length: 18 }, (_, i) => i + 1);

const entry = (
  id: string,
  name: string,
  hcp: number,
  gross: (number | null)[],
  sis = seqSI(),
): LeaderboardEntryInput => ({
  gameEntryId: id,
  playerId: id,
  playerName: name,
  courseHandicap: hcp,
  strokeIndexes: sis,
  scoresByHole: Object.fromEntries(gross.map((g, i) => [i + 1, g ?? null])) as Record<
    number,
    number | null
  >,
});

describe("computeLeaderboard — STROKE", () => {
  const base = (entries: LeaderboardEntryInput[]): LeaderboardInput => ({
    format: "STROKE",
    skinsType: "NONE",
    pars: par4s(),
    entries,
  });

  it("ranks lowest net first; ties share a rank", () => {
    const a = entry("a", "Alice", 0, Array(18).fill(4)); // net 72
    const b = entry("b", "Bob", 18, Array(18).fill(5)); // gross 90 - 18 = 72
    const c = entry("c", "Cara", 0, Array(18).fill(5)); // net 90
    const r = computeLeaderboard(base([c, b, a]));
    expect(r.rows.map((row) => row.gameEntryId)).toEqual(["a", "b", "c"]);
    expect(r.rows[0]!.primary).toBe(72);
    expect(r.rows[1]!.primary).toBe(72);
    expect(r.rows[0]!.rank).toBe(1);
    expect(r.rows[1]!.rank).toBe(1); // tied at 72
    expect(r.rows[2]!.rank).toBe(3);
  });

  it("primaryLabel is the bare net total", () => {
    const a = entry("a", "Alice", 0, Array(18).fill(4));
    const r = computeLeaderboard(base([a]));
    expect(r.rows[0]!.primaryLabel).toBe("72");
  });

  it("partial rounds report `thru` and only sum entered holes", () => {
    const partial = Array<number | null>(18).fill(null);
    partial[0] = 4;
    partial[1] = 5;
    const a = entry("a", "Alice", 0, partial);
    const r = computeLeaderboard(base([a]));
    expect(r.rows[0]!.thru).toBe(2);
    expect(r.rows[0]!.primary).toBe(9);
  });
});

describe("computeLeaderboard — STABLEFORD", () => {
  it("ranks highest points first", () => {
    const allPars = Array<number>(18).fill(4);
    const allBirds = Array<number>(18).fill(3);
    const a = entry("a", "Alice", 0, allBirds); // 18 birdies × 3 pts
    const b = entry("b", "Bob", 0, allPars); // 18 pars × 2 pts
    const r = computeLeaderboard({
      format: "STABLEFORD",
      skinsType: "NONE",
      pars: allPars,
      entries: [b, a],
    });
    expect(r.rows[0]!.gameEntryId).toBe("a");
    expect(r.rows[0]!.primary).toBe(54);
    expect(r.rows[0]!.primaryLabel).toBe("54 pts");
    expect(r.rows[1]!.primary).toBe(36);
  });
});

describe("computeLeaderboard — CHICAGO_39", () => {
  it("primaryLabel is signed and ranks highest vsQuota first", () => {
    const allPars = Array<number>(18).fill(4);
    // scratch player shoots all pars: 36 points, quota 39 → -3
    const a = entry("a", "Alice", 0, allPars);
    // 18-hcp player shoots all pars: 36 pts, quota 21 → +15
    const b = entry("b", "Bob", 18, allPars);
    const r = computeLeaderboard({
      format: "CHICAGO_39",
      skinsType: "NONE",
      pars: allPars,
      entries: [a, b],
    });
    expect(r.rows[0]!.gameEntryId).toBe("b");
    expect(r.rows[0]!.primary).toBe(15);
    expect(r.rows[0]!.primaryLabel).toBe("+15");
    expect(r.rows[1]!.primaryLabel).toBe("-3");
    expect(r.rows[0]!.quota).toBe(21);
  });
});

describe("computeLeaderboard — skins (NET)", () => {
  it("tallies skins per player from per-hole resolver", () => {
    // par-4 hole 1: a shoots 3 (net 3), b shoots 4 (net 4). a wins.
    // par-4 hole 2: both shoot 4 (net 4 each). Tied → null.
    // par-4 hole 3: a 5 (net 5), b 3 (net 3). b wins.
    const pars = Array<number>(18).fill(4);
    const aGross: (number | null)[] = Array(18).fill(null);
    const bGross: (number | null)[] = Array(18).fill(null);
    aGross[0] = 3;
    bGross[0] = 4;
    aGross[1] = 4;
    bGross[1] = 4;
    aGross[2] = 5;
    bGross[2] = 3;
    const a = entry("a", "Alice", 0, aGross);
    const b = entry("b", "Bob", 0, bGross);
    const r = computeLeaderboard({
      format: "STROKE",
      skinsType: "NET",
      pars,
      entries: [a, b],
    });
    expect(r.skinsByHole[0]).toEqual({ holeNumber: 1, winnerEntryId: "a" });
    expect(r.skinsByHole[1]).toEqual({ holeNumber: 2, winnerEntryId: null });
    expect(r.skinsByHole[2]).toEqual({ holeNumber: 3, winnerEntryId: "b" });
    const aRow = r.rows.find((row) => row.gameEntryId === "a");
    const bRow = r.rows.find((row) => row.gameEntryId === "b");
    expect(aRow!.skins).toBe(1);
    expect(bRow!.skins).toBe(1);
  });
});

describe("computeLeaderboard — skins (HALF_SHOT)", () => {
  it("natural birdie beats net birdie at equal net", () => {
    const pars = Array<number>(18).fill(4);
    // a: gross 3, no stroke (CH=0) → net 3. b: gross 4, 1 stroke (CH=18) → net 3.
    // a wins via natural.
    const aGross: (number | null)[] = Array(18).fill(null);
    const bGross: (number | null)[] = Array(18).fill(null);
    aGross[0] = 3;
    bGross[0] = 4;
    const a = entry("a", "Alice", 0, aGross);
    const b = entry("b", "Bob", 18, bGross);
    const r = computeLeaderboard({
      format: "STROKE",
      skinsType: "HALF_SHOT",
      pars,
      entries: [a, b],
    });
    expect(r.skinsByHole[0]).toEqual({ holeNumber: 1, winnerEntryId: "a" });
    expect(r.rows.find((row) => row.gameEntryId === "a")!.skins).toBe(1);
    expect(r.rows.find((row) => row.gameEntryId === "b")!.skins).toBe(0);
  });
});

describe("computeLeaderboard — empty input", () => {
  it("returns no rows and a full skinsByHole when skins enabled", () => {
    const r = computeLeaderboard({
      format: "STROKE",
      skinsType: "NET",
      pars: par4s(),
      entries: [],
    });
    expect(r.rows).toEqual([]);
    expect(r.skinsByHole).toHaveLength(18);
    expect(r.skinsByHole.every((s) => s.winnerEntryId === null)).toBe(true);
  });

  it("returns empty skinsByHole when skinsType is NONE", () => {
    const r = computeLeaderboard({
      format: "STROKE",
      skinsType: "NONE",
      pars: par4s(),
      entries: [],
    });
    expect(r.skinsByHole).toEqual([]);
  });
});
