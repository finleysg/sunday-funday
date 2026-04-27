import { requireAdmin } from "@/lib/session";

export default async function CoursesPage() {
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">Courses</h1>
      <p className="text-muted-foreground mt-2 text-sm">Coming in Phase 2.</p>
    </div>
  );
}
