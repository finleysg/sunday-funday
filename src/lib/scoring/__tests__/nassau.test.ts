import { describe, expect, it } from "vitest";

import { nassau, type NassauPlayer } from "../nassau";

const mkPlayer = (
  id: string,
  courseHandicap: number,
  gross: (number | null)[],
  sis?: number[],
): NassauPlayer => ({
  playerId: id,
  courseHandicap,
  holes: Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    grossStrokes: gross[i] ?? null,
    strokeIndex: sis?.[i] ?? i + 1,
  })),
});

const allPars = (): number[] => Array<number>(18).fill(4);

describe("nassau", () => {
  it("identical scores → all three segments halved", () => {
    const a = mkPlayer("a", 0, allPars());
    const b = mkPlayer("b", 0, allPars());
    const r = nassau(a, b);
    expect(r.front.status).toBe("halved");
    expect(r.front.description).toBe("Halved");
    expect(r.back.status).toBe("halved");
    expect(r.total.status).toBe("halved");
  });

  it("A wins front 1 up by winning hole 9", () => {
    const aGross = allPars();
    const bGross = allPars();
    aGross[8] = 3; // A birdies hole 9
    const a = mkPlayer("a", 0, aGross);
    const b = mkPlayer("b", 0, bGross);
    const r = nassau(a, b, { aDisplay: "Alice", bDisplay: "Bob" });
    expect(r.front.status).toBe("won");
    expect(r.front.leaderId).toBe("a");
    expect(r.front.margin).toBe(1);
    expect(r.front.description).toBe("Alice wins 1 up");
    // Back and total: A is +1 for the round, but back 9 is independent
    expect(r.back.status).toBe("halved");
    expect(r.total.status).toBe("won");
    expect(r.total.leaderId).toBe("a");
    expect(r.total.margin).toBe(1);
  });

  it("decides total at 4&3 when A is +4 after hole 15", () => {
    const aGross = allPars();
    const bGross = allPars();
    // A wins holes 1, 2, 3, 15 outright
    aGross[0] = 3;
    aGross[1] = 3;
    aGross[2] = 3;
    aGross[14] = 3;
    const a = mkPlayer("a", 0, aGross);
    const b = mkPlayer("b", 0, bGross);
    const r = nassau(a, b, { aDisplay: "A", bDisplay: "B" });
    expect(r.total.status).toBe("won");
    expect(r.total.leaderId).toBe("a");
    expect(r.total.margin).toBe(4);
    expect(r.total.holesRemaining).toBe(3);
    expect(r.total.description).toBe("A wins 4&3");
    // The front match decides early: A +3 after hole 3 with 6 to play → not yet.
    // Halves 4 and 5; after hole 6: A +3 with 3 to play (still 3>3 false).
    // After hole 7: A +3 with 2 to play → 3>2 → decided 3&2.
    expect(r.front.status).toBe("won");
    expect(r.front.margin).toBe(3);
    expect(r.front.description).toBe("A wins 3&2");
  });

  it("decides front 9 early when one player is up 5 with 4 to play", () => {
    const aGross = allPars();
    const bGross = allPars();
    // A wins holes 1–5 outright; then halves 6–9
    for (let i = 0; i < 5; i++) aGross[i] = 3;
    const a = mkPlayer("a", 0, aGross);
    const b = mkPlayer("b", 0, bGross);
    const r = nassau(a, b, { aDisplay: "A", bDisplay: "B" });
    // After 5 holes: A +5, 4 to play, 5>4 → decided at hole 5
    expect(r.front.status).toBe("won");
    expect(r.front.margin).toBe(5);
    expect(r.front.holesRemaining).toBe(4);
    expect(r.front.description).toBe("A wins 5&4");
  });

  it("frozen at hole-by-hole status when a hole is unentered", () => {
    const aGross: (number | null)[] = Array(18).fill(null);
    const bGross: (number | null)[] = Array(18).fill(null);
    for (let i = 0; i < 5; i++) {
      aGross[i] = 4;
      bGross[i] = 4;
    }
    const a = mkPlayer("a", 0, aGross);
    const b = mkPlayer("b", 0, bGross);
    const r = nassau(a, b, { aDisplay: "A", bDisplay: "B" });
    expect(r.front.status).toBe("in_progress");
    expect(r.front.holesPlayed).toBe(5);
    expect(r.front.holesRemaining).toBe(4);
    expect(r.front.description).toBe("All square, 4 to play");
    // Back hasn't started
    expect(r.back.status).toBe("in_progress");
    expect(r.back.holesPlayed).toBe(0);
    expect(r.back.description).toBe("Not started, 9 to play");
  });

  it("applies match-play strokes from differential and decides correctly", () => {
    // A=5, B=0. Diff=5 → A gets a stroke on A's SI 1–5.
    // Both gross 4 every hole. With strokes A nets 3 on SI 1–5 (= holes 1–5),
    // halves the rest. After hole 14: A +5, 4 to play → 5 & 4.
    const aGross = allPars();
    const bGross = allPars();
    const a = mkPlayer("a", 5, aGross);
    const b = mkPlayer("b", 0, bGross);
    const r = nassau(a, b);
    expect(r.total.status).toBe("won");
    expect(r.total.leaderId).toBe("a");
    expect(r.total.margin).toBe(5);
    expect(r.total.holesRemaining).toBe(4);
    // Front 9: A wins holes 1–5 → after hole 5, A +5 with 4 to play → 5&4
    expect(r.front.status).toBe("won");
    expect(r.front.margin).toBe(5);
    expect(r.front.holesRemaining).toBe(4);
    expect(r.front.description).toMatch(/wins 5&4$/);
  });

  it("applies match-play strokes when B is the higher handicap", () => {
    // A=0, B=10. Diff=10 → B gets strokes on B's SI 1–10 (= holes 1–10).
    // Both gross 4 every hole. B nets 3 on holes 1–10. B wins 1–10, halves
    // the rest. After hole 10: B +10 with 8 to play → 10&8.
    const aGross = allPars();
    const bGross = allPars();
    const a = mkPlayer("a", 0, aGross);
    const b = mkPlayer("b", 10, bGross);
    const r = nassau(a, b, { aDisplay: "A", bDisplay: "B" });
    expect(r.total.status).toBe("won");
    expect(r.total.leaderId).toBe("b");
    expect(r.total.margin).toBe(10);
    expect(r.total.holesRemaining).toBe(8);
    expect(r.total.description).toBe("B wins 10&8");
  });

  it("describes ongoing match while leader is ahead", () => {
    const aGross: (number | null)[] = Array(18).fill(null);
    const bGross: (number | null)[] = Array(18).fill(null);
    aGross[0] = 3;
    bGross[0] = 4;
    aGross[1] = 4;
    bGross[1] = 4;
    const a = mkPlayer("a", 0, aGross);
    const b = mkPlayer("b", 0, bGross);
    const r = nassau(a, b, { aDisplay: "A", bDisplay: "B" });
    expect(r.front.status).toBe("in_progress");
    expect(r.front.leaderId).toBe("a");
    expect(r.front.margin).toBe(1);
    expect(r.front.holesRemaining).toBe(7);
    expect(r.front.description).toBe("A 1 up, 7 to play");
  });

  it("front 9 decides without affecting back 9 progress", () => {
    const aGross = allPars();
    const bGross = allPars();
    // A wins holes 1–5 outright (front decided 5&4)
    for (let i = 0; i < 5; i++) aGross[i] = 3;
    // B wins hole 18 (back 9 ends 1 up to B)
    bGross[17] = 3;
    aGross[17] = 4;
    const a = mkPlayer("a", 0, aGross);
    const b = mkPlayer("b", 0, bGross);
    const r = nassau(a, b, { aDisplay: "A", bDisplay: "B" });
    expect(r.front.description).toBe("A wins 5&4");
    expect(r.back.status).toBe("won");
    expect(r.back.leaderId).toBe("b");
    expect(r.back.description).toBe("B wins 1 up");
  });

  it("plus-handicap player gives strokes on the highest-SI holes", () => {
    // A=-2 (+2), B=0. Diff=2 → B gets strokes on B's SI 1–2 (= holes 1–2).
    // Both gross 4. B nets 3 on holes 1–2; halves 3–18.
    // After hole 2: B +2 with 16 to play. Halves through 17. At hole 17:
    // B +2 with 1 to play → 2>1 → decided 2&1.
    const a = mkPlayer("a", -2, allPars());
    const b = mkPlayer("b", 0, allPars());
    const r = nassau(a, b);
    expect(r.total.status).toBe("won");
    expect(r.total.leaderId).toBe("b");
    expect(r.total.margin).toBe(2);
    expect(r.total.holesRemaining).toBe(1);
  });
});
