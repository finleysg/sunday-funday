"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { SiGrid } from "./si-grid";

export type TeeDraft = {
  name: string;
  rating: number | "";
  slope: number | "";
  strokeIndexes: number[];
};

export function blankTee(): TeeDraft {
  return {
    name: "",
    rating: "",
    slope: "",
    strokeIndexes: Array.from({ length: 18 }, () => 0),
  };
}

export function TeeStep({
  index,
  initial,
  existingNames,
  onBack,
  onNext,
}: {
  index: number;
  initial: TeeDraft;
  existingNames: string[];
  onBack: () => void;
  onNext: (tee: TeeDraft) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [rating, setRating] = useState<number | "">(initial.rating);
  const [slope, setSlope] = useState<number | "">(initial.slope);
  const [si, setSi] = useState<number[]>(initial.strokeIndexes);
  const [error, setError] = useState<string | null>(null);

  const siErrors = useMemo(() => validateSi(si), [si]);

  function next() {
    const trimmed = name.trim();
    if (!trimmed) return setError("Tee name is required");
    if (existingNames.includes(trimmed.toLowerCase()))
      return setError("Another tee already uses that name");
    if (rating === "" || rating < 55 || rating > 85)
      return setError("Rating must be between 55 and 85");
    if (slope === "" || !Number.isInteger(slope) || slope < 55 || slope > 155)
      return setError("Slope must be a whole number between 55 and 155");
    if (siErrors) return setError(siErrors);
    setError(null);
    onNext({ name: trimmed, rating, slope, strokeIndexes: si });
  }

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-medium">Tee {index + 1}</h2>

      <section className="space-y-3 rounded-lg border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="tee-name">Name</Label>
            <Input
              id="tee-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Blue"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tee-rating">Rating</Label>
            <Input
              id="tee-rating"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={55}
              max={85}
              value={rating === "" ? "" : rating}
              onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tee-slope">Slope</Label>
            <Input
              id="tee-slope"
              type="number"
              inputMode="numeric"
              min={55}
              max={155}
              value={slope === "" ? "" : slope}
              onChange={(e) => setSlope(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Stroke index</h3>
          <p className={siErrors ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
            {siErrors ?? "Each of 1–18 used exactly once"}
          </p>
        </div>
        <SiGrid values={si} onChange={setSi} />
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={next}>Next: review</Button>
      </div>
    </div>
  );
}

function validateSi(arr: number[]): string | null {
  if (arr.some((n) => !Number.isInteger(n) || n < 1 || n > 18)) {
    return "Each stroke index must be a whole number 1–18";
  }
  if (new Set(arr).size !== 18) return "Each of 1–18 must be used exactly once";
  return null;
}
