import Link from "next/link";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

import { ImportCourseButton } from "./_components/import-course-button";

export default async function CoursesPage() {
  await requireAdmin();
  const courses = await prisma.course.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { tees: true } },
      holes: { select: { par: true } },
    },
  });

  const active = courses.filter((c) => c.active);
  const inactive = courses.filter((c) => !c.active);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Courses</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Add courses manually or import from a spreadsheet.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ImportCourseButton />
          <Button asChild>
            <Link href="/courses/new">Add course</Link>
          </Button>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">
          Active <span className="text-muted-foreground">({active.length})</span>
        </h2>
        <ul className="divide-y rounded-lg border bg-white">
          {active.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              No courses yet. Click “Add course” to create one.
            </li>
          ) : (
            active.map((c) => <CourseRow key={c.id} course={c} />)
          )}
        </ul>
      </section>

      {inactive.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            Inactive <span className="text-muted-foreground">({inactive.length})</span>
          </h2>
          <ul className="divide-y rounded-lg border bg-white">
            {inactive.map((c) => (
              <CourseRow key={c.id} course={c} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

type CourseRowData = {
  id: string;
  name: string;
  _count: { tees: number };
  holes: { par: number }[];
};

function CourseRow({ course }: { course: CourseRowData }) {
  const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
  return (
    <li className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <Link href={`/courses/${course.id}`} className="block truncate font-medium hover:underline">
          {course.name}
        </Link>
        <div className="text-muted-foreground truncate text-sm">
          Par {totalPar} · {course._count.tees} {course._count.tees === 1 ? "tee" : "tees"}
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/courses/${course.id}`}>Open</Link>
      </Button>
    </li>
  );
}
