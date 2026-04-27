import { describe, expect, it } from "vitest";

import { generateGameName } from "../name";

describe("generateGameName", () => {
  it("returns a two-word capitalized name", () => {
    const name = generateGameName();
    expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it("avoids names already taken", () => {
    const taken = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const n = generateGameName({ taken });
      expect(taken.has(n)).toBe(false);
      taken.add(n);
    }
  });

  it("falls back to a numeric suffix once attempts are exhausted", () => {
    // Force every random pick to collide by pre-filling the namespace with
    // the small attempt budget — the function should still return *some*
    // unique string (with or without a suffix).
    const taken = new Set<string>();
    for (let i = 0; i < 20; i++) taken.add(generateGameName({ taken }));
    const next = generateGameName({ taken, maxAttempts: 0 });
    expect(next).toMatch(/#\d+$/);
    expect(taken.has(next)).toBe(false);
  });
});
