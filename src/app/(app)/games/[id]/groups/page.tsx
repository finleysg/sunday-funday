import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

import { GroupBuilder } from "../../_components/group-builder";

type Params = Promise<{ id: string }>;

export default async function GameGroupsPage({ params }: { params: Params }) {
  const session = await requireSession();
  const admin = isAdmin(session.user.email);
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      entries: {
        include: {
          player: { select: { name: true } },
          tee: { select: { name: true } },
          member: { select: { groupId: true } },
        },
        orderBy: { player: { name: "asc" } },
      },
      groups: {
        orderBy: { createdAt: "asc" },
        include: {
          members: {
            include: {
              gameEntry: {
                include: {
                  player: { select: { name: true } },
                  tee: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!game) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href={`/games/${game.id}`} className="text-muted-foreground text-sm underline">
          ← {game.name}
        </Link>
      </div>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Groups</h1>
        <p className="text-muted-foreground text-sm">
          {admin && game.status !== "COMPLETE"
            ? "Tap a player, then tap a group to assign them."
            : "Playing groups for this game."}
        </p>
      </header>

      <GroupBuilder
        gameId={game.id}
        status={game.status}
        admin={admin}
        unassigned={game.entries
          .filter((e) => !e.member)
          .map((e) => ({
            gameEntryId: e.id,
            playerName: e.player.name,
            teeName: e.tee.name,
          }))}
        groups={game.groups.map((g) => ({
          id: g.id,
          name: g.name,
          members: g.members.map((m) => ({
            gameEntryId: m.gameEntryId,
            playerName: m.gameEntry.player.name,
            teeName: m.gameEntry.tee.name,
          })),
        }))}
      />

      <nav className="flex items-center justify-between gap-2 border-t pt-4">
        <Link href={`/games/${game.id}/roster`} className="text-muted-foreground text-sm underline">
          ← Back to roster
        </Link>
        <Link href={`/games/${game.id}`} className="text-primary text-sm font-medium underline">
          Back to game →
        </Link>
      </nav>
    </div>
  );
}
