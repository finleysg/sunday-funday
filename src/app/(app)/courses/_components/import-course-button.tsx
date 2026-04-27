"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ImportCourseButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [issues, setIssues] = useState<string[] | null>(null);

  function pick() {
    setIssues(null);
    fileRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    e.target.value = "";

    startTransition(async () => {
      const res = await fetch("/api/courses/import", {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Imported "${body.courseName ?? "course"}"`);
        router.refresh();
      } else if (Array.isArray(body.issues) && body.issues.length > 0) {
        setIssues(body.issues);
      } else {
        toast.error(body.error ?? "Import failed");
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={pick} disabled={pending}>
        {pending ? "Importing…" : "Import .xlsx"}
      </Button>
      <a
        href="/api/courses/template"
        className="text-muted-foreground self-center text-xs underline"
      >
        Template
      </a>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={onChange}
      />
      {issues ? (
        <div className="bg-destructive/10 text-destructive fixed inset-x-4 top-20 z-50 max-w-3xl space-y-1 rounded-lg border p-4 text-sm shadow-md">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">Import failed — fix these issues:</p>
            <button type="button" onClick={() => setIssues(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
          <ul className="ml-4 list-disc">
            {issues.map((i, n) => (
              <li key={n}>{i}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
