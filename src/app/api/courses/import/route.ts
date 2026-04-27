import { NextResponse } from "next/server";

import { parseCourseWorkbook } from "@/lib/courses/xlsx";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function POST(request: Request) {
  await requireAdmin();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  const buf = await file.arrayBuffer();
  const parsed = await parseCourseWorkbook(buf);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const existing = await prisma.course.findUnique({
    where: { name: parsed.course.name },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: `A course named "${parsed.course.name}" already exists`,
        issues: [`Course name conflict: "${parsed.course.name}"`],
      },
      { status: 409 },
    );
  }

  const courseId = await prisma.$transaction(async (tx) => {
    const c = await tx.course.create({ data: { name: parsed.course.name } });
    await tx.courseHole.createMany({
      data: parsed.course.pars.map((par, i) => ({
        courseId: c.id,
        holeNumber: i + 1,
        par,
      })),
    });
    for (const t of parsed.course.tees) {
      const tee = await tx.tee.create({
        data: { courseId: c.id, name: t.name, rating: t.rating, slope: t.slope },
      });
      await tx.teeHole.createMany({
        data: t.strokeIndexes.map((si, i) => ({
          teeId: tee.id,
          holeNumber: i + 1,
          strokeIndex: si,
        })),
      });
    }
    return c.id;
  });

  return NextResponse.json({ ok: true, courseId, courseName: parsed.course.name });
}
