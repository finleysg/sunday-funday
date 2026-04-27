import { describe, expect, it } from "vitest";

import { halfShotSkinWinner, type HalfShotEntry } from "../skins-half-shot";

const e = (
  playerId: string,
  par: number,
  grossStrokes: number | null,
  netStrokes: number | null,
): HalfShotEntry => ({ playerId, par, grossStrokes, netStrokes });

describe("halfShotSkinWinner", () => {
  it("lowest unique net wins (no tiebreaker needed)", () => {
    // par 4 hole. a: gross 3 net 3 (natural birdie). b: gross 5 net 4. c: gross 4 net 4.
    expect(halfShotSkinWinner([e("a", 4, 3, 3), e("b", 4, 5, 4), e("c", 4, 4, 4)])).toBe("a");
  });

  it("natural birdie beats net birdie at same net", () => {
    // a: gross 3 net 3 (natural birdie). b: gross 4 net 3 (net birdie via stroke).
    expect(halfShotSkinWinner([e("a", 4, 3, 3), e("b", 4, 4, 3)])).toBe("a");
  });

  it("net pars tied with no naturals → skin dead", () => {
    // a: gross 4 net 4 (par, no stroke). b: gross 5 net 4 (par via stroke).
    expect(halfShotSkinWinner([e("a", 4, 4, 4), e("b", 4, 5, 4)])).toBeNull();
  });

  it("two natural birdies tied → skin dead", () => {
    // both a and b: gross 3 net 3 on par-4
    expect(halfShotSkinWinner([e("a", 4, 3, 3), e("b", 4, 3, 3)])).toBeNull();
  });

  it("natural eagle beats natural birdie when nets are equal", () => {
    // par 5. a: gross 3 net 3 (natural eagle). b: gross 4 net 3 (natural birdie + stroke).
    expect(halfShotSkinWinner([e("a", 5, 3, 3), e("b", 5, 4, 3)])).toBe("a");
  });

  it("returns null when fewer than two valid entries", () => {
    expect(halfShotSkinWinner([])).toBeNull();
    expect(halfShotSkinWinner([e("a", 4, 4, 4)])).toBeNull();
    expect(halfShotSkinWinner([e("a", 4, 4, 4), e("b", 4, null, null)])).toBeNull();
  });

  it("ignores entries missing gross or net", () => {
    expect(halfShotSkinWinner([e("a", 4, 4, 4), e("b", 4, null, 3), e("c", 4, 5, 5)])).toBe("a");
  });

  it("three-way scenario: natural birdie wins over two net birdies", () => {
    expect(halfShotSkinWinner([e("a", 4, 3, 3), e("b", 4, 4, 3), e("c", 4, 4, 3)])).toBe("a");
  });

  it("three-way: two natural birdies tied with one net birdie → skin dead", () => {
    expect(halfShotSkinWinner([e("a", 4, 3, 3), e("b", 4, 3, 3), e("c", 4, 4, 3)])).toBeNull();
  });

  it("does not award when tied min is a non-natural and a third has a higher net even if natural", () => {
    // a: gross 4 net 4 (par-with-stroke). b: gross 5 net 4 (bogey-with-stroke).
    // c: gross 3 net 3 (natural birdie). c has the lowest net → c wins outright.
    expect(halfShotSkinWinner([e("a", 4, 4, 4), e("b", 4, 5, 4), e("c", 4, 3, 3)])).toBe("c");
  });

  it("plus-handicap player who shoots gross birdie still wins outright with negative stroke", () => {
    // a (+2, gives strokes): par 4, gross 3, net 4 (3 + 1 from giving back).
    // b (scratch): gross 4, net 4 (par).
    // Both net 4. a is a natural birdie (gross 3 ≤ par-1). a wins.
    expect(halfShotSkinWinner([e("a", 4, 3, 4), e("b", 4, 4, 4)])).toBe("a");
  });
});
