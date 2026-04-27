// Soft-immutable check: a course (or one of its tees) is "locked" once it has
// been used in a COMPLETE game. Locked courses can't be edited; the escape
// hatch is to add a new tee or deactivate the existing one.
//
// Phase 2 ships this scaffold so the UI and server actions can call it from
// day one. Phase 3 adds the Game / GameEntry tables — at that point this
// function becomes a real query against `Game.status === "COMPLETE"`.

export async function isCourseLocked(courseId: string): Promise<boolean> {
  void courseId;
  return false;
}
