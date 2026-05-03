import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

import { AddPlayerForm } from "./add-player-form";
import { PlayerRow } from "./player-row";

export default async function RosterPage() {
  await requireSession();
  const playersRaw = await prisma.player.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      handicapIndex: true,
    },
  });
  const players = playersRaw.map((p) => ({
    ...p,
    handicapIndex: p.handicapIndex == null ? null : Number(p.handicapIndex),
  }));
  const active = players.filter((p) => p.active);
  const inactive = players.filter((p) => !p.active);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Roster</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Players added here can sign in via magic link.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Add player</h2>
        <AddPlayerForm />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">
          Active <span className="text-muted-foreground">({active.length})</span>
        </h2>
        <ul className="bg-card divide-y rounded-lg border">
          {active.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">No active players yet.</li>
          ) : (
            active.map((p) => <PlayerRow key={p.id} player={p} />)
          )}
        </ul>
      </section>

      {inactive.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            Inactive <span className="text-muted-foreground">({inactive.length})</span>
          </h2>
          <ul className="bg-card divide-y rounded-lg border">
            {inactive.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
