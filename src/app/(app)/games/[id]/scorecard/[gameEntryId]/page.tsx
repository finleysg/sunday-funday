import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { strokesOnHole } from "@/lib/scoring/strokes";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type Params = Promise<{ id: string; gameEntryId: string }>;

type Hole = {
  hole: number;
  par: number;
  si: number;
  gross: number | null;
  net: number | null;
  strokesReceived: number;
};

export default async function ScorecardPage({ params }: { params: Params }) {
  await requireSession();
  const { id: gameId, gameEntryId } = await params;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      course: { include: { holes: { orderBy: { holeNumber: "asc" } } } },
    },
  });
  if (!game) notFound();

  const entry = await prisma.gameEntry.findUnique({
    where: { id: gameEntryId },
    include: {
      player: { select: { id: true, name: true } },
      tee: { include: { holes: { orderBy: { holeNumber: "asc" } } } },
      scores: { orderBy: { holeNumber: "asc" } },
    },
  });
  if (!entry || entry.gameId !== gameId) notFound();

  const parsByHole = new Map(game.course.holes.map((h) => [h.holeNumber, h.par]));
  const siByHole = new Map(entry.tee.holes.map((h) => [h.holeNumber, h.strokeIndex]));
  const grossByHole = new Map(entry.scores.map((s) => [s.holeNumber, s.strokes]));

  const holes: Hole[] = Array.from({ length: 18 }, (_, i) => {
    const h = i + 1;
    const par = parsByHole.get(h) ?? 4;
    const si = siByHole.get(h) ?? h;
    const gross = grossByHole.get(h) ?? null;
    const strokesReceived = strokesOnHole(entry.courseHandicap, si);
    const net = gross == null ? null : gross - strokesReceived;
    return { hole: h, par, si, gross, net, strokesReceived };
  });

  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  const ch = entry.courseHandicap;
  const chLabel = ch >= 0 ? String(ch) : `+${-ch}`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/games/${gameId}/leaderboard`}
          className="text-muted-foreground text-sm underline"
        >
          ← Leaderboard
        </Link>
        <span className="text-muted-foreground text-xs">{game.name}</span>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">{entry.player.name}</h1>
          <p className="text-muted-foreground text-sm">
            {entry.tee.name} · CH {chLabel} · {game.course.name}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <NineTable holes={front} totalLabel="Out" />
          <NineTable holes={back} totalLabel="In" />
          <Totals holes={holes} />
        </CardContent>
      </Card>
    </div>
  );
}

function NineTable({ holes, totalLabel }: { holes: Hole[]; totalLabel: string }) {
  const par = holes.reduce((a, x) => a + x.par, 0);
  const entered = holes.some((x) => x.gross != null);
  const gross = entered ? holes.reduce((a, x) => a + (x.gross ?? 0), 0) : null;
  const net = entered ? holes.reduce((a, x) => a + (x.net ?? 0), 0) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-center text-sm tabular-nums">
        <thead className="text-muted-foreground bg-muted/40 text-xs">
          <tr>
            <th className="px-2 py-1 text-left font-medium">Hole</th>
            {holes.map((h) => (
              <th key={h.hole} className="px-2 py-1 font-medium">
                {h.hole}
              </th>
            ))}
            <th className="px-2 py-1 font-semibold">{totalLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          <tr className="text-muted-foreground">
            <th scope="row" className="px-2 py-1 text-left text-xs font-medium">
              Par
            </th>
            {holes.map((h) => (
              <td key={h.hole} className="px-2 py-1 text-xs">
                {h.par}
              </td>
            ))}
            <td className="px-2 py-1 text-xs font-semibold">{par}</td>
          </tr>
          <tr>
            <th scope="row" className="px-2 py-1 text-left text-xs font-medium">
              Gross
            </th>
            {holes.map((h) => (
              <td
                key={h.hole}
                className={cn("relative px-2 py-1", h.gross == null && "text-muted-foreground")}
              >
                {h.gross ?? "—"}
                {h.strokesReceived > 0 ? (
                  <Dots n={h.strokesReceived} className="absolute top-0.5 right-1" />
                ) : null}
                {h.strokesReceived < 0 ? (
                  <GiveBackDot className="absolute top-0.5 right-1" />
                ) : null}
              </td>
            ))}
            <td className="px-2 py-1 font-semibold">{gross ?? "—"}</td>
          </tr>
          <tr>
            <th scope="row" className="px-2 py-1 text-left text-xs font-medium">
              Net
            </th>
            {holes.map((h) => (
              <td
                key={h.hole}
                className={cn("px-2 py-1", h.net == null && "text-muted-foreground")}
              >
                {h.net ?? "—"}
              </td>
            ))}
            <td className="px-2 py-1 font-semibold">{net ?? "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Totals({ holes }: { holes: Hole[] }) {
  const par = holes.reduce((a, x) => a + x.par, 0);
  const entered = holes.some((x) => x.gross != null);
  const gross = entered ? holes.reduce((a, x) => a + (x.gross ?? 0), 0) : null;
  const net = entered ? holes.reduce((a, x) => a + (x.net ?? 0), 0) : null;
  const holesPlayed = holes.filter((x) => x.gross != null).length;
  const thru = holesPlayed === 18 ? "F" : holesPlayed === 0 ? "—" : holesPlayed;
  return (
    <div className="bg-muted/40 grid grid-cols-4 gap-2 rounded-md p-3">
      <Stat label="Par" value={par} />
      <Stat label="Gross" value={gross ?? "—"} />
      <Stat label="Net" value={net ?? "—"} />
      <Stat label="Thru" value={thru} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <div className="text-muted-foreground text-xs tracking-wide uppercase">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Dots({ n, className }: { n: number; className?: string }) {
  return (
    <span
      aria-label={`Receives ${n} stroke${n > 1 ? "s" : ""}`}
      className={cn("inline-flex gap-0.5", className)}
    >
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="bg-primary inline-block size-1.5 rounded-full" />
      ))}
    </span>
  );
}

function GiveBackDot({ className }: { className?: string }) {
  return (
    <span
      aria-label="Gives a stroke back"
      className={cn("border-foreground/40 inline-block size-1.5 rounded-full border", className)}
    />
  );
}
