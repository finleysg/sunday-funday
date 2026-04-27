import Link from "next/link";

import { requireAdmin } from "@/lib/session";

import { NewCourseWizard } from "../_components/new-course-wizard";

export default async function NewCoursePage() {
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link href="/courses" className="text-muted-foreground text-sm underline">
          ← All courses
        </Link>
        <h1 className="mt-2 text-xl font-semibold">New course</h1>
      </div>
      <NewCourseWizard />
    </div>
  );
}
