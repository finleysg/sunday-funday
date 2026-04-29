"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const HandicapIndexInput = z
  .union([z.literal(""), z.coerce.number().min(-9.9).max(54)])
  .transform((v) => (v === "" ? null : v));

const PlayerInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.email("Invalid email").transform((s) => s.toLowerCase()),
  handicapIndex: HandicapIndexInput,
});

export type RosterActionResult =
  | { ok: true }
  | { ok: false; error: string; field?: "name" | "email" | "handicapIndex" };

function flatten(
  err: z.ZodError<{ name: string; email: string; handicapIndex: number | null }>,
): RosterActionResult {
  const fieldErrors = z.flattenError(err).fieldErrors;
  if (fieldErrors.email?.[0]) {
    return { ok: false, error: fieldErrors.email[0], field: "email" };
  }
  if (fieldErrors.name?.[0]) {
    return { ok: false, error: fieldErrors.name[0], field: "name" };
  }
  if (fieldErrors.handicapIndex?.[0]) {
    return { ok: false, error: fieldErrors.handicapIndex[0], field: "handicapIndex" };
  }
  return { ok: false, error: "Invalid input" };
}

export async function addPlayerAction(
  _prev: RosterActionResult | null,
  formData: FormData,
): Promise<RosterActionResult> {
  await requireAdmin();
  const parsed = PlayerInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    handicapIndex: formData.get("handicapIndex") ?? "",
  });
  if (!parsed.success) return flatten(parsed.error);

  const existing = await prisma.player.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { ok: false, error: "A player with that email already exists", field: "email" };
  }

  await prisma.player.create({ data: parsed.data });
  revalidatePath("/roster");
  return { ok: true };
}

export async function updatePlayerAction(
  _prev: RosterActionResult | null,
  formData: FormData,
): Promise<RosterActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Missing id" };

  const parsed = PlayerInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    handicapIndex: formData.get("handicapIndex") ?? "",
  });
  if (!parsed.success) return flatten(parsed.error);

  const conflict = await prisma.player.findUnique({
    where: { email: parsed.data.email },
  });
  if (conflict && conflict.id !== id) {
    return { ok: false, error: "A player with that email already exists", field: "email" };
  }

  await prisma.player.update({ where: { id }, data: parsed.data });
  revalidatePath("/roster");
  return { ok: true };
}

export async function setPlayerActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;
  await prisma.player.update({ where: { id }, data: { active } });
  revalidatePath("/roster");
}
