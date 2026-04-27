import { describe, expect, it } from "vitest";

import {
  endOfLocalDay,
  formatFormat,
  formatSkins,
  startOfLocalDay,
  toDateInputValue,
} from "../_utils";

describe("date helpers", () => {
  it("startOfLocalDay zeroes the time", () => {
    const d = new Date(2026, 3, 27, 14, 30, 5, 123);
    const s = startOfLocalDay(d);
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    expect(s.getSeconds()).toBe(0);
    expect(s.getMilliseconds()).toBe(0);
    expect(s.getDate()).toBe(27);
  });

  it("endOfLocalDay sets to last millisecond", () => {
    const d = new Date(2026, 3, 27, 1, 0, 0);
    const e = endOfLocalDay(d);
    expect(e.getHours()).toBe(23);
    expect(e.getMinutes()).toBe(59);
    expect(e.getSeconds()).toBe(59);
    expect(e.getMilliseconds()).toBe(999);
  });

  it("toDateInputValue formats yyyy-mm-dd", () => {
    expect(toDateInputValue(new Date(2026, 3, 27))).toBe("2026-04-27");
    expect(toDateInputValue(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("label helpers", () => {
  it("formats game formats", () => {
    expect(formatFormat("STROKE")).toBe("Stroke");
    expect(formatFormat("STABLEFORD")).toBe("Stableford");
    expect(formatFormat("CHICAGO_39")).toBe("Chicago 39");
  });

  it("formats skins types", () => {
    expect(formatSkins("NONE")).toBe("No skins");
    expect(formatSkins("NET")).toBe("Net skins");
    expect(formatSkins("HALF_SHOT")).toBe("Half-shot skins");
  });
});
