// Authorisation helpers for score writes. Encapsulates "the signed-in user
// is allowed to edit this score row" so both the server action and the
// JSON API endpoint share the same rule.
//
// Per decisions.md, any group member can edit their group's scores. Admins
// can additionally edit any group's scores (mostly to fix things mid-round).

import { prisma } from "@/lib/db";

export type EditPermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string; status: number };

export async function canEditScore(opts: {
  userEmail: string;
  isAdmin: boolean;
  gameEntryId: string;
}): Promise<EditPermissionResult> {
  const target = await prisma.gameEntry.findUnique({
    where: { id: opts.gameEntryId },
    select: {
      gameId: true,
      member: { select: { groupId: true } },
      game: { select: { status: true } },
    },
  });
  if (!target) return { allowed: false, reason: "Score row not found", status: 404 };
  if (target.game.status === "COMPLETE") {
    return { allowed: false, reason: "Game is complete; scores are locked", status: 409 };
  }
  if (target.game.status !== "IN_PROGRESS") {
    return { allowed: false, reason: "Game is not in progress", status: 409 };
  }
  if (opts.isAdmin) return { allowed: true };

  if (!target.member) {
    return { allowed: false, reason: "Target player is not in any group yet", status: 409 };
  }
  // Find the editor's own GameEntry → group within this game.
  const editor = await prisma.gameEntry.findFirst({
    where: {
      gameId: target.gameId,
      player: { email: opts.userEmail.toLowerCase() },
    },
    select: { member: { select: { groupId: true } } },
  });
  if (!editor?.member) {
    return {
      allowed: false,
      reason: "You're not in a group for this game",
      status: 403,
    };
  }
  if (editor.member.groupId !== target.member.groupId) {
    return {
      allowed: false,
      reason: "You can only edit scores for your own group",
      status: 403,
    };
  }
  return { allowed: true };
}
