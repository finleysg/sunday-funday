"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createGameAction } from "../actions";
import { toDateInputValue } from "../_utils";

export function CreateGameForm({ courses }: { courses: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createGameAction(null, fd);
      if (r.ok) {
        router.push(`/games/${r.gameId}`);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="text-muted-foreground text-sm">
        We&apos;ll generate a fun random name for the game (you can rename it later).
      </p>
      <section className="bg-card grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cg-date">Date</Label>
          <Input
            id="cg-date"
            name="date"
            type="date"
            required
            defaultValue={toDateInputValue(new Date())}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cg-course">Course</Label>
          <select
            id="cg-course"
            name="courseId"
            required
            className="border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-3 focus-visible:outline-none"
          >
            <option value="">Choose…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cg-format">Format</Label>
          <select
            id="cg-format"
            name="format"
            required
            defaultValue="STROKE"
            className="border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-3 focus-visible:outline-none"
          >
            <option value="STROKE">Stroke (net)</option>
            <option value="STABLEFORD">Stableford (net)</option>
            <option value="CHICAGO_39">Chicago 39</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cg-skins">Skins</Label>
          <select
            id="cg-skins"
            name="skinsType"
            required
            defaultValue="NONE"
            className="border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm focus-visible:ring-3 focus-visible:outline-none"
          >
            <option value="NONE">No skins</option>
            <option value="NET">Net skins</option>
            <option value="HALF_SHOT">Half-shot skins</option>
          </select>
        </div>
      </section>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create game"}
        </Button>
      </div>
    </form>
  );
}
