import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

import { endOfLocalDay, startOfLocalDay } from "./games/_utils";

export default async function HomePage() {
  await requireSession();
  const now = new Date();

  const todayInProgress = await prisma.game.findMany({
    where: {
      status: "IN_PROGRESS",
      date: { gte: startOfLocalDay(now), lte: endOfLocalDay(now) },
    },
    select: { id: true },
    take: 2,
  });
  if (todayInProgress.length === 1) {
    redirect(`/games/${todayInProgress[0]!.id}`);
  }
  redirect("/games");
}
