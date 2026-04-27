import Link from "next/link";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

import { CreateGameForm } from "../_components/create-game-form";

export default async function NewGamePage() {
  await requireAdmin();
  const courses = await prisma.course.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href="/games" className="text-muted-foreground text-sm underline">
          ← All games
        </Link>
        <h1 className="mt-2 text-xl font-semibold">New game</h1>
      </div>
      {courses.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          You need at least one active course before creating a game.{" "}
          <Link href="/courses" className="underline">
            Add one
          </Link>
          .
        </p>
      ) : (
        <CreateGameForm courses={courses} />
      )}
    </div>
  );
}
