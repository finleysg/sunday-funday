// Nassau side bet (decisions.md → "Format definitions"). Three match-play
// segments: Front 9 (1–9), Back 9 (10–18), Total (1–18). Net match-play —
// the higher-handicap player gets strokes equal to the differential,
// distributed using their own tee's SI. No presses (decisions.md).
//
// A match-play segment ends early when one side leads by more than the
// number of holes remaining in that segment ("X & Y"). All holes played
// with a leader → "X up". All holes played all square → "Halved".
// Holes without scores freeze the segment status at the last consecutive
// completed hole.

import { matchPlayStrokesOnHole } from "./match-play";

export type NassauHole = {
  holeNumber: number;
  grossStrokes: number | null;
  strokeIndex: number;
};

export type NassauPlayer = {
  playerId: string;
  courseHandicap: number;
  holes: NassauHole[];
};

export type MatchSegmentStatus = "in_progress" | "halved" | "won";

export type MatchSegmentResult = {
  status: MatchSegmentStatus;
  leaderId: string | null;
  margin: number;
  holesRemaining: number;
  holesPlayed: number;
  description: string;
};

export type NassauResult = {
  front: MatchSegmentResult;
  back: MatchSegmentResult;
  total: MatchSegmentResult;
};

export type NassauOptions = {
  aDisplay?: string;
  bDisplay?: string;
};

export function nassau(
  a: NassauPlayer,
  b: NassauPlayer,
  options: NassauOptions = {},
): NassauResult {
  const aDisplay = options.aDisplay ?? a.playerId;
  const bDisplay = options.bDisplay ?? b.playerId;
  return {
    front: matchSegment(a, b, 1, 9, aDisplay, bDisplay),
    back: matchSegment(a, b, 10, 18, aDisplay, bDisplay),
    total: matchSegment(a, b, 1, 18, aDisplay, bDisplay),
  };
}

function matchSegment(
  a: NassauPlayer,
  b: NassauPlayer,
  startHole: number,
  endHole: number,
  aDisplay: string,
  bDisplay: string,
): MatchSegmentResult {
  const totalHoles = endHole - startHole + 1;
  // Positive = A ahead, negative = B ahead.
  let signedMargin = 0;
  let holesPlayed = 0;
  let decidedAtHole: number | null = null;

  for (let hole = startHole; hole <= endHole; hole++) {
    const winner = matchHoleWinner(a, b, hole);
    // Missing data freezes the segment — match play status is hole-by-hole.
    if (winner === undefined) break;
    holesPlayed++;
    if (winner === a.playerId) signedMargin++;
    else if (winner === b.playerId) signedMargin--;

    const remaining = totalHoles - holesPlayed;
    if (Math.abs(signedMargin) > remaining && remaining > 0) {
      decidedAtHole = hole;
      break;
    }
  }

  const margin = Math.abs(signedMargin);
  const leaderId = signedMargin > 0 ? a.playerId : signedMargin < 0 ? b.playerId : null;
  const leaderDisplay =
    leaderId === a.playerId ? aDisplay : leaderId === b.playerId ? bDisplay : null;

  if (decidedAtHole != null && leaderId != null) {
    const holesRemaining = endHole - decidedAtHole;
    return {
      status: "won",
      leaderId,
      margin,
      holesRemaining,
      holesPlayed,
      description: `${leaderDisplay} wins ${margin}&${holesRemaining}`,
    };
  }

  if (holesPlayed === totalHoles) {
    if (leaderId == null) {
      return {
        status: "halved",
        leaderId: null,
        margin: 0,
        holesRemaining: 0,
        holesPlayed,
        description: "Halved",
      };
    }
    return {
      status: "won",
      leaderId,
      margin,
      holesRemaining: 0,
      holesPlayed,
      description: `${leaderDisplay} wins ${margin} up`,
    };
  }

  const holesRemaining = totalHoles - holesPlayed;
  if (leaderId == null) {
    return {
      status: "in_progress",
      leaderId: null,
      margin: 0,
      holesRemaining,
      holesPlayed,
      description:
        holesPlayed === 0
          ? `Not started, ${holesRemaining} to play`
          : `All square, ${holesRemaining} to play`,
    };
  }
  return {
    status: "in_progress",
    leaderId,
    margin,
    holesRemaining,
    holesPlayed,
    description: `${leaderDisplay} ${margin} up, ${holesRemaining} to play`,
  };
}

function matchHoleWinner(
  a: NassauPlayer,
  b: NassauPlayer,
  hole: number,
): string | "halved" | undefined {
  const aHole = a.holes.find((h) => h.holeNumber === hole);
  const bHole = b.holes.find((h) => h.holeNumber === hole);
  if (!aHole || !bHole) return undefined;
  if (aHole.grossStrokes == null || bHole.grossStrokes == null) return undefined;

  let aStrokes = 0;
  let bStrokes = 0;
  if (a.courseHandicap > b.courseHandicap) {
    aStrokes = matchPlayStrokesOnHole(a.courseHandicap, b.courseHandicap, aHole.strokeIndex);
  } else if (b.courseHandicap > a.courseHandicap) {
    bStrokes = matchPlayStrokesOnHole(b.courseHandicap, a.courseHandicap, bHole.strokeIndex);
  }
  const aNet = aHole.grossStrokes - aStrokes;
  const bNet = bHole.grossStrokes - bStrokes;
  if (aNet < bNet) return a.playerId;
  if (bNet < aNet) return b.playerId;
  return "halved";
}
