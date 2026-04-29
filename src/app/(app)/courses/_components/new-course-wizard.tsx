"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { createCourseAction } from "../actions";

import { CourseStep, type CourseDraft } from "./course-step";
import { TeeStep, type TeeDraft, blankTee } from "./tee-step";

type Step = { kind: "course" } | { kind: "tee"; index: number } | { kind: "review" };

export function NewCourseWizard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>({ kind: "course" });
  const [course, setCourse] = useState<CourseDraft>({
    name: "",
    pars: Array.from({ length: 18 }, () => 4),
  });
  const [tees, setTees] = useState<TeeDraft[]>([blankTee()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[] | null>(null);

  function commitCourse(c: CourseDraft) {
    setCourse(c);
    setStep({ kind: "tee", index: 0 });
  }

  function commitTee(index: number, tee: TeeDraft) {
    setTees((prev) => prev.map((t, i) => (i === index ? tee : t)));
    setStep({ kind: "review" });
  }

  function addAnotherTee() {
    setTees((prev) => [...prev, blankTee()]);
    setStep({ kind: "tee", index: tees.length });
  }

  function editTee(i: number) {
    setStep({ kind: "tee", index: i });
  }

  function removeTee(i: number) {
    if (tees.length === 1) return;
    setTees((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit() {
    setSubmitError(null);
    setIssues(null);
    startTransition(async () => {
      const result = await createCourseAction({
        name: course.name,
        pars: course.pars,
        tees,
      });
      if (result.ok) {
        router.push(`/courses/${result.courseId}`);
      } else {
        setSubmitError(result.error);
        if ("issues" in result && result.issues) setIssues(result.issues);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Stepper step={step} teeCount={tees.length} />

      {step.kind === "course" ? <CourseStep initial={course} onNext={commitCourse} /> : null}

      {step.kind === "tee" ? (
        <TeeStep
          key={`tee-${step.index}`}
          index={step.index}
          initial={tees[step.index] ?? blankTee()}
          existingNames={tees
            .map((t, i) => (i !== step.index ? t.name.trim().toLowerCase() : null))
            .filter((s): s is string => !!s)}
          onBack={() =>
            step.index === 0 ? setStep({ kind: "course" }) : setStep({ kind: "review" })
          }
          onNext={(t) => commitTee(step.index, t)}
        />
      ) : null}

      {step.kind === "review" ? (
        <ReviewStep
          course={course}
          tees={tees}
          onEditCourse={() => setStep({ kind: "course" })}
          onEditTee={editTee}
          onRemoveTee={removeTee}
          onAddTee={addAnotherTee}
          onSubmit={submit}
          submitting={pending}
          submitError={submitError}
          issues={issues}
        />
      ) : null}
    </div>
  );
}

function Stepper({ step, teeCount }: { step: Step; teeCount: number }) {
  const labels = [
    { key: "course", label: "Course" },
    { key: "tees", label: `Tees (${teeCount})` },
    { key: "review", label: "Review" },
  ];
  const activeKey = step.kind === "course" ? "course" : step.kind === "tee" ? "tees" : "review";
  return (
    <ol className="flex items-center gap-2 text-xs">
      {labels.map((l, i) => (
        <li key={l.key} className="flex items-center gap-2">
          <span
            className={
              activeKey === l.key
                ? "bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-medium"
                : "text-muted-foreground rounded-full border px-2 py-0.5"
            }
          >
            {i + 1}. {l.label}
          </span>
          {i < labels.length - 1 ? <span className="text-muted-foreground">→</span> : null}
        </li>
      ))}
    </ol>
  );
}

function ReviewStep({
  course,
  tees,
  onEditCourse,
  onEditTee,
  onRemoveTee,
  onAddTee,
  onSubmit,
  submitting,
  submitError,
  issues,
}: {
  course: CourseDraft;
  tees: TeeDraft[];
  onEditCourse: () => void;
  onEditTee: (i: number) => void;
  onRemoveTee: (i: number) => void;
  onAddTee: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
  issues: string[] | null;
}) {
  const totalPar = course.pars.reduce((s, p) => s + p, 0);
  return (
    <div className="space-y-5">
      <section className="bg-card rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-medium">{course.name || "(unnamed course)"}</h2>
            <p className="text-muted-foreground text-sm">Total par {totalPar} · 18 holes</p>
          </div>
          <Button variant="outline" size="sm" onClick={onEditCourse}>
            Edit
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-9 gap-1 text-center text-xs">
          {course.pars.map((p, i) => (
            <div key={i} className="rounded border p-1">
              <div className="text-muted-foreground">{i + 1}</div>
              <div className="font-medium">{p}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Tees ({tees.length})</h2>
          <Button variant="outline" size="sm" onClick={onAddTee}>
            Add another tee
          </Button>
        </div>
        <ul className="bg-card divide-y rounded-lg border">
          {tees.map((t, i) => (
            <li key={i} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{t.name || `Tee ${i + 1}`}</div>
                <div className="text-muted-foreground text-sm">
                  Rating {t.rating || "—"} · Slope {t.slope || "—"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onEditTee(i)}>
                  Edit
                </Button>
                {tees.length > 1 ? (
                  <Button variant="ghost" size="sm" onClick={() => onRemoveTee(i)}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {submitError ? (
        <div className="text-destructive bg-destructive/10 space-y-1 rounded-lg border p-3 text-sm">
          <p className="font-medium">{submitError}</p>
          {issues && issues.length > 0 ? (
            <ul className="ml-4 list-disc">
              {issues.map((it, n) => (
                <li key={n}>{it}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save course"}
        </Button>
      </div>
    </div>
  );
}
