import { describe, expect, it } from "vitest";

import { isScoreWritePath, shouldQueueForReplay } from "../policy";

describe("shouldQueueForReplay", () => {
  it.each<[number, boolean]>([
    [200, false],
    [201, false],
    [204, false],
    [301, false],
    [400, false],
    [401, false],
    [403, false],
    [404, false],
    [409, false],
    [422, false],
    [500, true],
    [502, true],
    [503, true],
    [504, true],
  ])("status %i → queue=%s", (status, expected) => {
    expect(shouldQueueForReplay({ kind: "ok", status })).toBe(expected);
  });

  it("queues on network error (kind=error)", () => {
    expect(shouldQueueForReplay({ kind: "error" })).toBe(true);
  });
});

describe("isScoreWritePath", () => {
  it.each<[string, boolean]>([
    ["/api/games/abc123/scores", true],
    ["/api/games/cmoXYZ/scores", true],
    ["/api/games//scores", false],
    ["/api/games/abc/scores/extra", false],
    ["/api/games/abc/leaderboard", false],
    ["/api/courses/abc/scores", false],
    ["/api/games/abc/scores?force=1", false],
  ])("%s → %s", (path, expected) => {
    expect(isScoreWritePath(path)).toBe(expected);
  });
});
