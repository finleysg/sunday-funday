// Convert a WHS Handicap Index to a Course Handicap for a given tee.
//
//   CH = round( HI × (Slope / 113) + (Rating − Par) )
//
// Returns an integer (positive, zero, or negative for plus handicaps).
// Rounding is half-away-from-zero — Math.round in JS rounds half to +∞,
// which biases plus handicaps toward 0; we correct that explicitly so a
// computed -0.5 becomes -1 (more strokes given back), matching how WHS
// rounds.

export type CourseHandicapInput = {
  handicapIndex: number;
  slope: number;
  rating: number;
  par: number;
};

export function computeCourseHandicap({
  handicapIndex,
  slope,
  rating,
  par,
}: CourseHandicapInput): number {
  const raw = handicapIndex * (slope / 113) + (rating - par);
  const rounded = Math.sign(raw) * Math.round(Math.abs(raw));
  return rounded + 0; // normalize -0 to 0
}
