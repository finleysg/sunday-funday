import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { isCourseLocked } from "@/lib/courses/lock";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

import { setCourseActiveAction, setTeeActiveAction } from "../actions";
import { AddTeeDialog } from "../_components/add-tee-dialog";
import { EditParsDialog } from "../_components/edit-pars-dialog";
import { EditTeeDialog } from "../_components/edit-tee-dialog";

type Params = Promise<{ id: string }>;

export default async function CourseDetailPage({ params }: { params: Params }) {
  await requireAdmin();
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      holes: { orderBy: { holeNumber: "asc" } },
      tees: {
        orderBy: [{ active: "desc" }, { name: "asc" }],
        include: { holes: { orderBy: { holeNumber: "asc" } } },
      },
    },
  });
  if (!course) notFound();

  const locked = await isCourseLocked(course.id);
  const totalPar = course.holes.reduce((s, h) => s + h.par, 0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href="/courses" className="text-muted-foreground text-sm underline">
          ← All courses
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{course.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Par {totalPar} · {course.tees.length} {course.tees.length === 1 ? "tee" : "tees"}
              {course.active ? null : (
                <span className="text-muted-foreground ml-2">· inactive</span>
              )}
            </p>
          </div>
          <form action={setCourseActiveAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="active" value={course.active ? "false" : "true"} />
            <Button type="submit" variant="ghost" size="sm">
              {course.active ? "Deactivate" : "Activate"}
            </Button>
          </form>
        </div>
      </div>

      {locked ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This course has been used in a completed game and is locked. Add a new tee or deactivate
          an old one instead of editing.
        </div>
      ) : null}

      <section className="space-y-3 rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Pars</h2>
          {locked ? null : (
            <EditParsDialog courseId={course.id} pars={course.holes.map((h) => h.par)} />
          )}
        </div>
        <ParRow pars={course.holes.map((h) => h.par)} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Tees</h2>
          <AddTeeDialog courseId={course.id} />
        </div>
        <ul className="divide-y rounded-lg border bg-white">
          {course.tees.map((t) => (
            <li key={t.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {t.name}
                    {t.active ? null : (
                      <span className="text-muted-foreground ml-2 text-xs">inactive</span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Rating {String(t.rating)} · Slope {t.slope}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {locked ? null : (
                    <EditTeeDialog
                      teeId={t.id}
                      initial={{
                        name: t.name,
                        rating: Number(t.rating),
                        slope: t.slope,
                        strokeIndexes: t.holes.map((h) => h.strokeIndex),
                      }}
                      siblingNames={course.tees.filter((o) => o.id !== t.id).map((o) => o.name)}
                    />
                  )}
                  <form action={setTeeActiveAction}>
                    <input type="hidden" name="teeId" value={t.id} />
                    <input type="hidden" name="active" value={t.active ? "false" : "true"} />
                    <Button type="submit" variant="ghost" size="sm">
                      {t.active ? "Deactivate" : "Activate"}
                    </Button>
                  </form>
                </div>
              </div>
              <SiRow values={t.holes.map((h) => h.strokeIndex)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ParRow({ pars }: { pars: number[] }) {
  return (
    <div className="grid grid-cols-9 gap-1 text-center text-xs">
      {pars.map((p, i) => (
        <div key={i} className="rounded border p-1">
          <div className="text-muted-foreground">{i + 1}</div>
          <div className="font-medium">{p}</div>
        </div>
      ))}
    </div>
  );
}

function SiRow({ values }: { values: number[] }) {
  return (
    <div className="grid grid-cols-9 gap-1 text-center text-xs">
      {values.map((v, i) => (
        <div key={i} className="rounded border p-1">
          <div className="text-muted-foreground">{i + 1}</div>
          <div className="font-medium">{v}</div>
        </div>
      ))}
    </div>
  );
}
