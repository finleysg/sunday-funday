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

import { setPlayerActiveAction, updatePlayerAction } from "./actions";

type PlayerLite = {
  id: string;
  name: string;
  email: string;
  active: boolean;
};

export function PlayerRow({ player }: { player: PlayerLite }) {
  return (
    <li className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="truncate font-medium">{player.name}</div>
        <div className="text-muted-foreground truncate text-sm">{player.email}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ToggleActive id={player.id} active={player.active} />
        <EditDialog player={player} />
      </div>
    </li>
  );
}

function ToggleActive({ id, active }: { id: string; active: boolean }) {
  return (
    <form action={setPlayerActiveAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Button type="submit" variant="ghost" size="sm">
        {active ? "Deactivate" : "Activate"}
      </Button>
    </form>
  );
}

function EditDialog({ player }: { player: PlayerLite }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<{ message: string; field?: "name" | "email" } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePlayerAction(null, formData);
      if (result.ok) {
        setError(null);
        setOpen(false);
      } else {
        setError({ message: result.error, field: result.field });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit player</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={player.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${player.id}`}>Name</Label>
            <Input
              id={`edit-name-${player.id}`}
              name="name"
              defaultValue={player.name}
              required
              aria-invalid={error?.field === "name" ? true : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-email-${player.id}`}>Email</Label>
            <Input
              id={`edit-email-${player.id}`}
              name="email"
              type="email"
              defaultValue={player.email}
              required
              aria-invalid={error?.field === "email" ? true : undefined}
            />
          </div>
          {error ? <p className="text-destructive text-sm">{error.message}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
