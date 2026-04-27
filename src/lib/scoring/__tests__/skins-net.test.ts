import { describe, expect, it } from "vitest";

import { netSkinWinner, type SkinEntry } from "../skins-net";

const e = (playerId: string, netStrokes: number | null): SkinEntry => ({
  playerId,
  netStrokes,
});

describe("netSkinWinner", () => {
  it("returns the player with the lowest unique net", () => {
    const winner = netSkinWinner([e("a", 4), e("b", 5), e("c", 6)]);
    expect(winner).toBe("a");
  });

  it("returns null when the lowest is tied", () => {
    expect(netSkinWinner([e("a", 4), e("b", 4), e("c", 5)])).toBeNull();
  });

  it("ignores nulls when finding the min", () => {
    expect(netSkinWinner([e("a", null), e("b", 5), e("c", 6)])).toBe("b");
  });

  it("returns null when fewer than two players have entered", () => {
    expect(netSkinWinner([e("a", null), e("b", null)])).toBeNull();
    expect(netSkinWinner([e("a", 4), e("b", null)])).toBeNull();
    expect(netSkinWinner([])).toBeNull();
  });

  it("handles negative nets (plus handicaps)", () => {
    expect(netSkinWinner([e("a", -1), e("b", 0), e("c", 1)])).toBe("a");
  });

  it("ties at min kill the skin even if a third is also lower than non-tied", () => {
    // a tied for min with b, c worse; tie still wins out
    expect(netSkinWinner([e("a", 3), e("b", 3), e("c", 4)])).toBeNull();
  });

  it("min appearing later in array still wins", () => {
    expect(netSkinWinner([e("a", 5), e("b", 4), e("c", 3)])).toBe("c");
  });
});
