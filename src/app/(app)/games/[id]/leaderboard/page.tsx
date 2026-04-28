import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { loadLeaderboard } from "@/lib/leaderboard/load";
import { requireSession } from "@/lib/session";

import { LeaderboardClient } from "./_components/leaderboard-client";

type Params = Promise<{ id: string }>;

export default async function GameLeaderboardPage({ params }: { params: Params }) {
  const session = await requireSession();
  const { id } = await params;

  const r = await loadLeaderboard(id);
  if (!r.ok) notFound();

  // Find the signed-in user's gameEntry/group within this game so we can
  // highlight their row and offer a one-tap toggle to score entry.
  const userEntry = await prisma.gameEntry.findFirst({
    where: { gameId: id, player: { email: session.user.email.toLowerCase() } },
    select: { id: true, member: { select: { groupId: true } } },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/games/${id}`} className="text-muted-foreground text-sm underline">
          ← {r.game.name}
        </Link>
      </div>

      <LeaderboardClient
        gameId={id}
        userEntryId={userEntry?.id ?? null}
        userGroupId={userEntry?.member?.groupId ?? null}
        initial={{
          game: { ...r.game, date: r.game.date.toISOString() },
          leaderboard: r.leaderboard,
          fetchedAt: new Date().toISOString(),
        }}
      />
    </div>
  );
}
