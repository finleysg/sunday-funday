import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

import { GameHeader } from "../_components/game-header";
import { ScoreEntrySection } from "../_components/score-entry-section";
import { StartGameButton } from "../_components/start-game-button";

type Params = Promise<{ id: string }>;

export default async function GameDetailPage({ params }: { params: Params }) {
  const session = await requireSession();
  const admin = isAdmin(session.user.email);
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      course: { select: { name: true } },
      entries: {
        select: {
          id: true,
          player: { select: { id: true, name: true, email: true } },
          member: { select: { groupId: true } },
        },
      },
      groups: {
        orderBy: { createdAt: "asc" },
        include: {
          members: {
            include: {
              gameEntry: {
                include: { player: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!game) notFound();

  const userEmail = session.user.email.toLowerCase();
  const userEntry = game.entries.find((e) => e.player.email.toLowerCase() === userEmail);
  const userGroupId = userEntry?.member?.groupId ?? null;

  const unassignedCount = game.entries.filter((e) => !e.member).length;
  const setupAndAdmin = admin && game.status === "SETUP";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href="/games" className="text-muted-foreground text-sm underline">
          ← All games
        </Link>
      </div>

      <GameHeader
        game={{
          id: game.id,
          name: game.name,
          date: game.date,
          status: game.status,
          format: game.format,
          skinsType: game.skinsType,
          course: { name: game.course.name },
          entryCount: game.entries.length,
        }}
        admin={admin}
      />

      {game.status === "IN_PROGRESS" || game.status === "COMPLETE" ? (
        <ScoreEntrySection
          gameId={game.id}
          userGroupId={userGroupId}
          groups={game.groups.map((g) => ({
            id: g.id,
            name: g.name,
            memberNames: g.members.map((m) => m.gameEntry.player.name),
          }))}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Setup</h2>
          {setupAndAdmin ? (
            <StartGameButton gameId={game.id} disabled={game.entries.length === 0} />
          ) : null}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          <SetupStepCard
            href={`/games/${game.id}/roster`}
            title="Roster"
            primary={`${game.entries.length} ${game.entries.length === 1 ? "player" : "players"}`}
            hint={
              setupAndAdmin
                ? game.entries.length === 0
                  ? "Add players to get started."
                  : "Edit who's playing and which tees they're using."
                : "View who's playing and their tees."
            }
          />
          <SetupStepCard
            href={`/games/${game.id}/groups`}
            title="Groups"
            primary={`${game.groups.length} ${game.groups.length === 1 ? "group" : "groups"}`}
            hint={
              game.entries.length === 0
                ? "Add a roster first."
                : unassignedCount > 0
                  ? `${unassignedCount} ${unassignedCount === 1 ? "player" : "players"} still unassigned.`
                  : "All players assigned."
            }
          />
        </ul>
      </section>
    </div>
  );
}

function SetupStepCard({
  href,
  title,
  primary,
  hint,
}: {
  href: string;
  title: string;
  primary: string;
  hint: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="hover:bg-muted block space-y-1 rounded-lg border bg-white p-4 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <span className="text-muted-foreground text-xs">→</span>
        </div>
        <p className="text-base font-semibold">{primary}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </Link>
    </li>
  );
}
