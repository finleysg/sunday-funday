import Link from "next/link";

import { cn } from "@/lib/utils";

type Group = {
  id: string;
  name: string;
  memberNames: string[];
};

// Surfaced on the game detail page once the game is IN_PROGRESS. The user's
// own group gets the primary "Enter scores" call-to-action; the rest open
// in read-only mode. Per Phase 5 plan: "auto-detects user's group; switch
// group button lists others".
export function ScoreEntrySection({
  gameId,
  groups,
  userGroupId,
}: {
  gameId: string;
  groups: Group[];
  userGroupId: string | null;
}) {
  if (groups.length === 0) {
    return (
      <section className="bg-card rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">
          No groups yet — set up groups to start entering scores.
        </p>
      </section>
    );
  }

  const ownGroup = groups.find((g) => g.id === userGroupId);
  const otherGroups = groups.filter((g) => g.id !== userGroupId);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Score entry</h2>
        <Link
          href={`/games/${gameId}/leaderboard`}
          className="text-muted-foreground text-xs underline"
        >
          View leaderboard →
        </Link>
      </div>
      {ownGroup ? (
        <Link
          href={`/games/${gameId}/groups/${ownGroup.id}/score`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-col gap-1 rounded-lg p-4 transition-colors"
        >
          <span className="text-xs font-medium opacity-90">Your group</span>
          <span className="text-base font-semibold">{ownGroup.name} — Enter scores</span>
          <span className="text-xs opacity-90">{ownGroup.memberNames.join(" · ")}</span>
        </Link>
      ) : (
        <p className="text-muted-foreground bg-card rounded-lg border p-3 text-sm">
          You&apos;re not in a group for this game. View any group below in read-only mode.
        </p>
      )}

      {otherGroups.length > 0 ? (
        <ul className="grid gap-2">
          {otherGroups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/games/${gameId}/groups/${g.id}/score`}
                className={cn(
                  "hover:bg-muted bg-card flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors",
                )}
              >
                <div className="min-w-0">
                  <div className="font-medium">{g.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {g.memberNames.join(" · ") || "No players yet"}
                  </div>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">View</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
