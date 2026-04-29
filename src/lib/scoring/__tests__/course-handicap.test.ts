import { describe, expect, it } from "vitest";

import { computeCourseHandicap } from "../course-handicap";

describe("computeCourseHandicap", () => {
  it("returns 0 for scratch on a par-rating course", () => {
    expect(computeCourseHandicap({ handicapIndex: 0, slope: 113, rating: 72, par: 72 })).toBe(0);
  });

  it("scales index by slope/113", () => {
    // HI 10.0 on slope 130, rating == par → 10 * 130/113 ≈ 11.504 → 12
    expect(computeCourseHandicap({ handicapIndex: 10.0, slope: 130, rating: 72, par: 72 })).toBe(
      12,
    );
  });

  it("adds (rating − par) adjustment", () => {
    // HI 12.3, slope 113, rating 73.5, par 72 → 12.3 + 1.5 = 13.8 → 14
    expect(computeCourseHandicap({ handicapIndex: 12.3, slope: 113, rating: 73.5, par: 72 })).toBe(
      14,
    );
  });

  it("rounds half away from zero for positive indexes", () => {
    // HI 11.3, slope 113, rating 72, par 72 → 11.3 → 11
    expect(computeCourseHandicap({ handicapIndex: 11.3, slope: 113, rating: 72, par: 72 })).toBe(
      11,
    );
    // HI 11.5 → 12
    expect(computeCourseHandicap({ handicapIndex: 11.5, slope: 113, rating: 72, par: 72 })).toBe(
      12,
    );
  });

  it("handles plus handicaps (negative index) and rounds away from zero", () => {
    // HI -2.0, slope 113, rating 72, par 72 → -2 → -2
    expect(computeCourseHandicap({ handicapIndex: -2.0, slope: 113, rating: 72, par: 72 })).toBe(
      -2,
    );
    // HI -0.4 → -0.4 → 0 (round-to-zero)
    expect(computeCourseHandicap({ handicapIndex: -0.4, slope: 113, rating: 72, par: 72 })).toBe(0);
    // HI -0.5 → rounds away from zero → -1
    expect(computeCourseHandicap({ handicapIndex: -0.5, slope: 113, rating: 72, par: 72 })).toBe(
      -1,
    );
    // HI -3.2, slope 140, rating 74, par 72 → -3.2*140/113 + 2 ≈ -3.965 + 2 = -1.965 → -2
    expect(computeCourseHandicap({ handicapIndex: -3.2, slope: 140, rating: 74, par: 72 })).toBe(
      -2,
    );
  });

  it("handles a real-world high handicap", () => {
    // HI 24.7, slope 135, rating 71.2, par 71 → 24.7*135/113 + 0.2 ≈ 29.51 + 0.2 = 29.71 → 30
    expect(computeCourseHandicap({ handicapIndex: 24.7, slope: 135, rating: 71.2, par: 71 })).toBe(
      30,
    );
  });
});
