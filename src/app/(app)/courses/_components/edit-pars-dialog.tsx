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

import { updateCourseParsAction } from "../actions";

import { ParGrid } from "./par-grid";

export function EditParsDialog({ courseId, pars: initial }: { courseId: string; pars: number[] }) {
  const [open, setOpen] = useState(false);
  const [pars, setPars] = useState<number[]>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    startTransition(async () => {
      const r = await updateCourseParsAction(courseId, pars);
      if (r.ok) {
        setOpen(false);
        setError(null);
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
        if (o) setPars(initial);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit pars
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit pars</DialogTitle>
        </DialogHeader>
        <ParGrid values={pars} onChange={setPars} />
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
