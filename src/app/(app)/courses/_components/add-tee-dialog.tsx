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

import { addTeeAction } from "../actions";

import { SiGrid } from "./si-grid";

export function AddTeeDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [slope, setSlope] = useState<number | "">("");
  const [si, setSi] = useState<number[]>(Array.from({ length: 18 }, () => 0));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setRating("");
    setSlope("");
    setSi(Array.from({ length: 18 }, () => 0));
    setError(null);
  }

  function save() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return setError("Name is required");
    if (rating === "" || rating < 55 || rating > 85)
      return setError("Rating must be between 55 and 85");
    if (slope === "" || !Number.isInteger(slope) || slope < 55 || slope > 155)
      return setError("Slope must be a whole number between 55 and 155");
    if (si.some((n) => !Number.isInteger(n) || n < 1 || n > 18))
      return setError("Each stroke index must be 1–18");
    if (new Set(si).size !== 18) return setError("Each of 1–18 must be used exactly once");

    startTransition(async () => {
      const r = await addTeeAction(courseId, {
        name: trimmed,
        rating,
        slope,
        strokeIndexes: si,
      });
      if (r.ok) {
        setOpen(false);
        reset();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add tee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add tee</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="at-name">Name</Label>
            <Input id="at-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-rating">Rating</Label>
            <Input
              id="at-rating"
              type="number"
              step="0.1"
              min={55}
              max={85}
              value={rating === "" ? "" : rating}
              onChange={(e) => setRating(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-slope">Slope</Label>
            <Input
              id="at-slope"
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
