"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { generateGameName } from "@/lib/games/name";
import { requireAdmin, requireSession } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

const FORMATS = ["STROKE", "STABLEFORD", "CHICAGO_39"] as const;
const SKINS = ["NONE", "NET", "HALF_SHOT"] as const;

const CreateGameInput = z.object({
  date: z.coerce.date(),
  courseId: z.string().min(1, "Course is required"),
  format: z.enum(FORMATS),
  skinsType: z.enum(SKINS),
});

const UpdateGameInput = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Name is required").max(120).optional(),
  date: z.coerce.date().optional(),
  courseId: z.string().min(1).optional(),
  format: z.enum(FORMATS).optional(),
  skinsType: z.enum(SKINS).optional(),
});

export async function createGameAction(
  _prev: { ok: boolean; error?: string; gameId?: string } | null,
  formData: FormData,
): Promise<{ ok: true; gameId: string } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = CreateGameInput.safeParse({
    date: formData.get("date"),
    courseId: formData.get("courseId"),
    format: formData.get("format"),
    skinsType: formData.get("skinsType"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const existing = await prisma.game.findMany({ select: { name: true } });
  const name = generateGameName({ taken: new Set(existing.map((g) => g.name)) });
  const game = await prisma.game.create({
    data: { ...parsed.data, name, status: "SETUP" },
  });
  revalidatePath("/games");
  return { ok: true, gameId: game.id };
}

export async function updateGameAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = UpdateGameInput.safeParse({
    id: formData.get("id"),
    name: formData.get("name") ?? undefined,
    date: formData.get("date") ?? undefined,
    courseId: formData.get("courseId") ?? undefined,
    format: formData.get("format") ?? undefined,
    skinsType: formData.get("skinsType") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, ...data } = parsed.data;
  await prisma.game.update({ where: { id }, data });
  revalidatePath(`/games/${id}`);
  revalidatePath("/games");
  return { ok: true };
}

const RosterRow = z.object({
  playerId: z.string().min(1),
  teeId: z.string().min(1),
  courseHandicap: z.coerce.number().int().min(-10).max(54),
});

export async function saveRosterAction(gameId: string, rows: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = z.array(RosterRow).safeParse(rows);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid roster" };
  }
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return { ok: false, error: "Game not found" };
  if (game.status === "COMPLETE") {
    return { ok: false, error: "Game is complete; roster is locked" };
  }

  // Validate every tee belongs to the game's course.
  const teeIds = Array.from(new Set(parsed.data.map((r) => r.teeId)));
  if (teeIds.length > 0) {
    const tees = await prisma.tee.findMany({
      where: { id: { in: teeIds } },
      select: { id: true, courseId: true },
    });
    if (tees.some((t) => t.courseId !== game.courseId)) {
      return { ok: false, error: "One or more tees don't belong to this course" };
    }
  }

  const playerIds = parsed.data.map((r) => r.playerId);

  await prisma.$transaction(async (tx) => {
    // Remove entries for players no longer in the roster (cascade deletes
    // GroupMember + Score rows).
    if (playerIds.length === 0) {
      await tx.gameEntry.deleteMany({ where: { gameId } });
    } else {
      await tx.gameEntry.deleteMany({
        where: { gameId, playerId: { notIn: playerIds } },
      });
    }
    for (const r of parsed.data) {
      await tx.gameEntry.upsert({
        where: { gameId_playerId: { gameId, playerId: r.playerId } },
        create: {
          gameId,
          playerId: r.playerId,
          teeId: r.teeId,
          courseHandicap: r.courseHandicap,
        },
        update: { teeId: r.teeId, courseHandicap: r.courseHandicap },
      });
    }
  });

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games/${gameId}/roster`);
  revalidatePath(`/games/${gameId}/groups`);
  return { ok: true };
}

export async function addGroupAction(gameId: string): Promise<ActionResult> {
  await requireSession();
  const count = await prisma.group.count({ where: { gameId } });
  await prisma.group.create({
    data: { gameId, name: `Group ${count + 1}` },
  });
  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games/${gameId}/groups`);
  return { ok: true };
}

export async function removeGroupAction(groupId: string): Promise<ActionResult> {
  await requireSession();
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, error: "Group not found" };
  await prisma.group.delete({ where: { id: groupId } });
  revalidatePath(`/games/${group.gameId}`);
  revalidatePath(`/games/${group.gameId}/groups`);
  return { ok: true };
}

export async function assignToGroupAction(
  groupId: string,
  gameEntryId: string,
): Promise<ActionResult> {
  await requireSession();
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { ok: false, error: "Group not found" };
  await prisma.groupMember.upsert({
    where: { gameEntryId },
    create: { groupId, gameEntryId },
    update: { groupId },
  });
  revalidatePath(`/games/${group.gameId}`);
  revalidatePath(`/games/${group.gameId}/groups`);
  return { ok: true };
}

export async function unassignFromGroupAction(gameEntryId: string): Promise<ActionResult> {
  await requireSession();
  const member = await prisma.groupMember.findUnique({
    where: { gameEntryId },
    include: { group: true },
  });
  if (!member) return { ok: true };
  await prisma.groupMember.delete({
    where: { groupId_gameEntryId: { groupId: member.groupId, gameEntryId } },
  });
  revalidatePath(`/games/${member.group.gameId}`);
  revalidatePath(`/games/${member.group.gameId}/groups`);
  return { ok: true };
}

export async function startGameAction(gameId: string): Promise<ActionResult> {
  await requireAdmin();
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { entries: { select: { id: true } } },
  });
  if (!game) return { ok: false, error: "Game not found" };
  if (game.status !== "SETUP") {
    return { ok: false, error: "Game is not in SETUP status" };
  }
  if (game.entries.length === 0) {
    return { ok: false, error: "Add at least one player to the roster first" };
  }

  await prisma.$transaction(async (tx) => {
    // Pre-create 18 Score rows per entry. Skip ones that already exist (in
    // case the game is being restarted after a partial transition).
    for (const e of game.entries) {
      const existing = await tx.score.findMany({
        where: { gameEntryId: e.id },
        select: { holeNumber: true },
      });
      const have = new Set(existing.map((s) => s.holeNumber));
      const missing = [];
      for (let h = 1; h <= 18; h++) {
        if (!have.has(h)) missing.push({ gameEntryId: e.id, holeNumber: h });
      }
      if (missing.length > 0) await tx.score.createMany({ data: missing });
    }
    await tx.game.update({
      where: { id: gameId },
      data: { status: "IN_PROGRESS" },
    });
  });

  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
  revalidatePath("/");
  return { ok: true };
}

export async function completeGameAction(gameId: string): Promise<ActionResult> {
  await requireSession();
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return { ok: false, error: "Game not found" };
  if (game.status !== "IN_PROGRESS") {
    return { ok: false, error: "Game is not in progress" };
  }
  await prisma.game.update({
    where: { id: gameId },
    data: { status: "COMPLETE" },
  });
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
  return { ok: true };
}

export async function reopenGameAction(gameId: string): Promise<ActionResult> {
  await requireAdmin();
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return { ok: false, error: "Game not found" };
  if (game.status !== "COMPLETE") {
    return { ok: false, error: "Game is not complete" };
  }
  await prisma.game.update({
    where: { id: gameId },
    data: { status: "IN_PROGRESS" },
  });
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
  return { ok: true };
}

export async function copyRosterFromLastGameAction(
  gameId: string,
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  await requireSession();
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return { ok: false, error: "Game not found" };
  if (game.status === "COMPLETE") {
    return { ok: false, error: "Game is complete; roster is locked" };
  }

  const previous = await prisma.game.findFirst({
    where: {
      courseId: game.courseId,
      id: { not: gameId },
      date: { lt: game.date },
    },
    orderBy: { date: "desc" },
    include: {
      entries: {
        include: { player: { select: { active: true } } },
      },
    },
  });
  if (!previous || previous.entries.length === 0) {
    return { ok: false, error: "No prior game at this course to copy from" };
  }

  const existing = await prisma.gameEntry.findMany({
    where: { gameId },
    select: { playerId: true },
  });
  const existingIds = new Set(existing.map((e) => e.playerId));
  const toAdd = previous.entries.filter((e) => e.player.active && !existingIds.has(e.playerId));

  for (const e of toAdd) {
    await prisma.gameEntry.create({
      data: {
        gameId,
        playerId: e.playerId,
        teeId: e.teeId,
        courseHandicap: e.courseHandicap,
      },
    });
  }

  revalidatePath(`/games/${gameId}`);
  revalidatePath(`/games/${gameId}/roster`);
  return { ok: true, added: toAdd.length };
}
