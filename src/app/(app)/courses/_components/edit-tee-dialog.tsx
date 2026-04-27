"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateTeeAction } from "../actions";

import { SiGrid } from "./si-grid";

export function EditTeeDialog({
  teeId,
  initial,
  siblingNames,
}: {
  teeId: string;
  initial: { name: string; rating: number; slope: number; strokeIndexes: number[] };
  siblingNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [rating, setRating] = useState<number | "">(initial.rating);
  const [slope, setSlope] = useState<number | "">(initial.slope);
  const [si, setSi] = useState<number[]>(initial.strokeIndexes);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(initial.name);
    setRating(initial.rating);
    setSlope(initial.slope);
    setSi(initial.strokeIndexes);
    setError(null);
  }

  function save() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return setError("Name is required");
    if (siblingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase()))
      return setError("Another tee already uses that name");
    if (rating === "" || rating < 55 || rating > 85)
      return setError("Rating must be between 55 and 85");
    if (slope === "" || !Number.isInteger(slope) || slope < 55 || slope > 155)
      return setError("Slope must be a whole number between 55 and 155");
    if (si.some((n) => !Number.isInteger(n) || n < 1 || n > 18))
      return setError("Each stroke index must be 1–18");
    if (new Set(si).size !== 18) return setError("Each of 1–18 must be used exactly once");

    startTransition(async () => {
      const r = await updateTeeAction(teeId, {
        name: trimmed,
        rating,
        slope,
        strokeIndexes: si,
      });
      if (r.ok) setOpen(false);
      else setError(r.error);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit tee</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`et-name-${teeId}`}>Name</Label>
            <Input id={`et-name-${teeId}`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`et-rating-${teeId}`}>Rating</Label>
            <Input
              id={`et-rating-${teeId}`}
              type="number"
              step="0.1"
              min={55}
              max={85}
              value={rating === "" ? "" : rating}
              onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`et-slope-${teeId}`}>Slope</Label>
            <Input
              id={`et-slope-${teeId}`}
              type="number"
              min={55}
              max={155}
              value={slope === "" ? "" : slope}
              onChange={(e) => setSlope(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Stroke index</Label>
          <SiGrid values={si} onChange={setSi} />
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <DialogFooter>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
