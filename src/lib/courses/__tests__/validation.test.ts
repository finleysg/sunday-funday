import { describe, expect, it } from "vitest";

import { CourseInput, ParList, StrokeIndexList, TeeInput } from "../validation";

const ones = (n: number, val = 4) => Array.from({ length: n }, () => val);
const seq = (n: number, start = 1) => Array.from({ length: n }, (_, i) => start + i);

describe("ParList", () => {
  it("accepts 18 valid pars", () => {
    expect(ParList.safeParse(ones(18, 4)).success).toBe(true);
  });

  it("rejects fewer than 18", () => {
    expect(ParList.safeParse(ones(17, 4)).success).toBe(false);
  });

  it("rejects out-of-range pars", () => {
    const arr = ones(18, 4);
    arr[0] = 2;
    expect(ParList.safeParse(arr).success).toBe(false);
    arr[0] = 8;
    expect(ParList.safeParse(arr).success).toBe(false);
  });

  it("coerces numeric strings", () => {
    const r = ParList.safeParse(Array.from({ length: 18 }, () => "4"));
    expect(r.success).toBe(true);
  });
});

describe("StrokeIndexList", () => {
  it("accepts a 1–18 permutation", () => {
    expect(StrokeIndexList.safeParse(seq(18)).success).toBe(true);
  });

  it("rejects duplicates", () => {
    const arr = seq(18);
    arr[17] = 1;
    expect(StrokeIndexList.safeParse(arr).success).toBe(false);
  });

  it("rejects out-of-range values", () => {
    const arr = seq(18);
    arr[0] = 19;
    expect(StrokeIndexList.safeParse(arr).success).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(StrokeIndexList.safeParse(seq(17)).success).toBe(false);
  });
});

describe("TeeInput", () => {
  const valid = {
    name: "Blue",
    rating: 71.7,
    slope: 138,
    strokeIndexes: seq(18),
  };

  it("accepts a valid tee", () => {
    expect(TeeInput.safeParse(valid).success).toBe(true);
  });

  it("rejects slope out of range", () => {
    expect(TeeInput.safeParse({ ...valid, slope: 54 }).success).toBe(false);
    expect(TeeInput.safeParse({ ...valid, slope: 156 }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(TeeInput.safeParse({ ...valid, name: "  " }).success).toBe(false);
  });

  it("coerces string rating/slope", () => {
    const r = TeeInput.safeParse({
      ...valid,
      rating: "71.7",
      slope: "138",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.rating).toBe(71.7);
      expect(r.data.slope).toBe(138);
    }
  });
});

describe("CourseInput", () => {
  const tee = (name: string) => ({
    name,
    rating: 71.0,
    slope: 130,
    strokeIndexes: seq(18),
  });

  it("accepts a course with one tee", () => {
    const r = CourseInput.safeParse({
      name: "Pebble Beach",
      pars: ones(18, 4),
      tees: [tee("Blue")],
    });
    expect(r.success).toBe(true);
  });

  it("rejects zero tees", () => {
    expect(
      CourseInput.safeParse({
        name: "X",
        pars: ones(18, 4),
        tees: [],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate tee names (case-insensitive)", () => {
    const r = CourseInput.safeParse({
      name: "X",
      pars: ones(18, 4),
      tees: [tee("Blue"), tee("blue")],
    });
    expect(r.success).toBe(false);
  });
});
