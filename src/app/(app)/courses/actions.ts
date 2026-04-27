"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCourseLocked } from "@/lib/courses/lock";
import { CourseInput, ParList, TeeInput as TeeInputSchema } from "@/lib/courses/validation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createCourseAction(
  input: unknown,
): Promise<{ ok: true; courseId: string } | { ok: false; error: string; issues?: string[] }> {
  await requireAdmin();
  const parsed = CourseInput.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message);
    return { ok: false, error: "Invalid course data", issues };
  }

  const existing = await prisma.course.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return { ok: false, error: "A course with that name already exists" };
  }

  const courseId = await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({ data: { name: parsed.data.name } });
    await tx.courseHole.createMany({
      data: parsed.data.pars.map((par, i) => ({
        courseId: course.id,
        holeNumber: i + 1,
        par,
      })),
    });
    for (const t of parsed.data.tees) {
      const tee = await tx.tee.create({
        data: {
          courseId: course.id,
          name: t.name,
          rating: t.rating,
          slope: t.slope,
        },
      });
      await tx.teeHole.createMany({
        data: t.strokeIndexes.map((si, i) => ({
          teeId: tee.id,
          holeNumber: i + 1,
          strokeIndex: si,
        })),
      });
    }
    return course.id;
  });

  revalidatePath("/courses");
  return { ok: true, courseId };
}

export async function addTeeAction(courseId: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = TeeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tee data" };
  }
  const t = parsed.data;

  const existing = await prisma.tee.findUnique({
    where: { courseId_name: { courseId, name: t.name } },
  });
  if (existing) {
    return { ok: false, error: `Tee "${t.name}" already exists for this course` };
  }

  await prisma.$transaction(async (tx) => {
    const tee = await tx.tee.create({
      data: { courseId, name: t.name, rating: t.rating, slope: t.slope },
    });
    await tx.teeHole.createMany({
      data: t.strokeIndexes.map((si, i) => ({
        teeId: tee.id,
        holeNumber: i + 1,
        strokeIndex: si,
      })),
    });
  });

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  return { ok: true };
}

export async function updateCourseParsAction(
  courseId: string,
  pars: number[],
): Promise<ActionResult> {
  await requireAdmin();
  if (await isCourseLocked(courseId)) {
    return { ok: false, error: "Course is locked: it has been used in a completed game" };
  }
  const parsed = ParList.safeParse(pars);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid pars" };
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < parsed.data.length; i++) {
      await tx.courseHole.update({
        where: { courseId_holeNumber: { courseId, holeNumber: i + 1 } },
        data: { par: parsed.data[i]! },
      });
    }
  });

  revalidatePath(`/courses/${courseId}`);
  return { ok: true };
}

export async function updateTeeAction(teeId: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const tee = await prisma.tee.findUnique({ where: { id: teeId } });
  if (!tee) return { ok: false, error: "Tee not found" };
  if (await isCourseLocked(tee.courseId)) {
    return {
      ok: false,
      error: "Course is locked: add a new tee or deactivate this one instead",
    };
  }

  const parsed = TeeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tee data" };
  }
  const t = parsed.data;

  if (t.name.toLowerCase() !== tee.name.toLowerCase()) {
    const conflict = await prisma.tee.findUnique({
      where: { courseId_name: { courseId: tee.courseId, name: t.name } },
    });
    if (conflict && conflict.id !== teeId) {
      return { ok: false, error: `Another tee named "${t.name}" already exists` };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.tee.update({
      where: { id: teeId },
      data: { name: t.name, rating: t.rating, slope: t.slope },
    });
    for (let i = 0; i < t.strokeIndexes.length; i++) {
      await tx.teeHole.update({
        where: { teeId_holeNumber: { teeId, holeNumber: i + 1 } },
        data: { strokeIndex: t.strokeIndexes[i]! },
      });
    }
  });

  revalidatePath(`/courses/${tee.courseId}`);
  return { ok: true };
}

export async function setTeeActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const teeId = String(formData.get("teeId") ?? "");
  const active = formData.get("active") === "true";
  if (!teeId) return;
  const tee = await prisma.tee.update({
    where: { id: teeId },
    data: { active },
  });
  revalidatePath(`/courses/${tee.courseId}`);
}

export async function setCourseActiveAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  const active = formData.get("active") === "true";
  if (!courseId) return;
  await prisma.course.update({ where: { id: courseId }, data: { active } });
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
}

export async function redirectToCourse(courseId: string): Promise<never> {
  redirect(`/courses/${courseId}`);
}
