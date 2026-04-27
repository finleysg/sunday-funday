"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ParGrid } from "./par-grid";

export type CourseDraft = {
  name: string;
  pars: number[];
};

export function CourseStep({
  initial,
  onNext,
}: {
  initial: CourseDraft;
  onNext: (draft: CourseDraft) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [pars, setPars] = useState<number[]>(initial.pars);
  const [error, setError] = useState<string | null>(null);

  function next() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Course name is required");
      return;
    }
    if (pars.some((p) => !Number.isInteger(p) || p < 3 || p > 7)) {
      setError("Each par must be a whole number between 3 and 7");
      return;
    }
    setError(null);
    onNext({ name: trimmed, pars });
  }

  const totalPar = pars.reduce((s, p) => s + (Number.isFinite(p) ? p : 0), 0);

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-lg border bg-white p-4">
        <div className="space-y-1.5">
          <Label htmlFor="course-name">Course name</Label>
          <Input
            id="course-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Pebble Beach Golf Links"
            autoFocus
            required
          />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Pars</h2>
          <p className="text-muted-foreground text-sm">Total {totalPar}</p>
        </div>
        <ParGrid values={pars} onChange={setPars} />
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <Button onClick={next}>Next: tees</Button>
      </div>
    </div>
  );
}
