import { isAdmin } from "@/lib/admin";
import { requireSession } from "@/lib/session";

export default async function HomePage() {
  const session = await requireSession();
  const admin = isAdmin(session.user.email);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Welcome, {session.user.name}.</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Phase 1 is live: identity. Games, scoring, and leaderboards land in the next phases.
      </p>
      {admin ? (
        <p className="mt-4 text-sm">
          You&apos;re an admin. Head to{" "}
          <a className="underline" href="/roster">
            Roster
          </a>{" "}
          to add players.
        </p>
      ) : null}
    </div>
  );
}
