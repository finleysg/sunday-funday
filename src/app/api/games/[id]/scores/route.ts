import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { canEditScore } from "@/lib/scores/membership";
import { requireSession } from "@/lib/session";

// PUT /api/games/:id/scores
// Body: { gameEntryId, holeNumber, strokes }
// Idempotent (last-write-wins). Used by both the live UI and Phase 6
// background sync. Returns the updated row.

const Body = z.object({
  gameEntryId: z.string().min(1),
  holeNumber: z.number().int().min(1).max(18),
  strokes: z.number().int().min(1).max(30).nullable(),
});

type Params = Promise<{ id: string }>;

export async function PUT(request: Request, ctx: { params: Params }) {
  const session = await requireSession();
  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { gameEntryId, holeNumber, strokes } = parsed.data;

  // Confirm the gameEntry actually belongs to the game in the URL — this
  // guards against malformed PUTs from clients that mismatch them.
  const entry = await prisma.gameEntry.findUnique({
    where: { id: gameEntryId },
    select: { gameId: true },
  });
  if (!entry || entry.gameId !== id) {
    return NextResponse.json({ error: "Game entry not in this game" }, { status: 404 });
  }

  const permission = await canEditScore({
    userEmail: session.user.email,
    isAdmin: isAdmin(session.user.email),
    gameEntryId,
  });
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.reason }, { status: permission.status });
  }

  const updated = await prisma.score.upsert({
    where: { gameEntryId_holeNumber: { gameEntryId, holeNumber } },
    create: {
      gameEntryId,
      holeNumber,
      strokes,
      enteredByUserId: session.user.id,
      enteredAt: new Date(),
    },
    update: {
      strokes,
      enteredByUserId: session.user.id,
      enteredAt: new Date(),
    },
    select: { gameEntryId: true, holeNumber: true, strokes: true },
  });

  return NextResponse.json({ ok: true, score: updated });
}
