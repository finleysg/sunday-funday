import { prisma } from "@/lib/db";

// A course is "locked" once it has been used in a COMPLETE game. Locked
// courses can't have their pars or tee data edited; the escape hatch is to
// add a new tee or deactivate the existing one. (See decisions.md.)

export async function isCourseLocked(courseId: string): Promise<boolean> {
  const game = await prisma.game.findFirst({
    where: { courseId, status: "COMPLETE" },
    select: { id: true },
  });
  return game !== null;
}
