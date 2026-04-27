"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { addPlayerAction, type RosterActionResult } from "./actions";

export function AddPlayerForm() {
  const [state, formAction, pending] = useActionState<RosterActionResult | null, FormData>(
    addPlayerAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <div className="space-y-1.5">
        <Label htmlFor="add-name">Name</Label>
        <Input
          id="add-name"
          name="name"
          required
          autoComplete="off"
          aria-invalid={state && !state.ok && state.field === "name" ? true : undefined}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="add-email">Email</Label>
        <Input
          id="add-email"
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="off"
          aria-invalid={state && !state.ok && state.field === "email" ? true : undefined}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </Button>
      {state && !state.ok ? (
        <p className="text-destructive text-sm sm:col-span-3">{state.error}</p>
      ) : null}
    </form>
  );
}
