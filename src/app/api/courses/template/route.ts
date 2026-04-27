import { buildCourseTemplate } from "@/lib/courses/xlsx";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  await requireAdmin();
  const buf = await buildCourseTemplate();
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="course-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
