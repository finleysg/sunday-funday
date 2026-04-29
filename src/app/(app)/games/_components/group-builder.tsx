"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  addGroupAction,
  assignToGroupAction,
  removeGroupAction,
  unassignFromGroupAction,
} from "../actions";

type Member = {
  gameEntryId: string;
  playerName: string;
  teeName: string;
};
type Group = { id: string; name: string; members: Member[] };

const SOFT_MAX = 5;

export function GroupBuilder({
  gameId,
  status,
  admin,
  unassigned,
  groups,
}: {
  gameId: string;
  status: "SETUP" | "IN_PROGRESS" | "COMPLETE";
  admin: boolean;
  unassigned: Member[];
  groups: Group[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // selected is a gameEntryId of the player currently picked.

  const editable = admin && status !== "COMPLETE";

  function clearSelection() {
    setSelected(null);
  }

  function tapPlayer(gameEntryId: string) {
    if (!editable) return;
    setSelected((prev) => (prev === gameEntryId ? null : gameEntryId));
  }

  function withGuard(message: string, fn: () => Promise<void>) {
    if (status === "IN_PROGRESS") {
      const ok = window.confirm(
        `${message}\n\nThe game is in progress — players may already have scores. Continue?`,
      );
      if (!ok) return;
    }
    setError(null);
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function assignSelectedTo(groupId: string) {
    if (!selected) return;
    withGuard("Move this player into a different group?", async () => {
      const r = await assignToGroupAction(groupId, selected);
      if (!r.ok) setError(r.error);
      setSelected(null);
    });
  }

  function unassignSelected() {
    if (!selected) return;
    withGuard("Remove this player from their group?", async () => {
      const r = await unassignFromGroupAction(selected);
      if (!r.ok) setError(r.error);
      setSelected(null);
    });
  }

  function addGroup() {
    setError(null);
    startTransition(async () => {
      const r = await addGroupAction(gameId);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  function removeGroup(groupId: string, hasMembers: boolean) {
    if (hasMembers) {
      const ok = window.confirm(
        "This group still has players. Remove anyway? Players will return to unassigned.",
      );
      if (!ok) return;
    }
    setError(null);
    startTransition(async () => {
      const r = await removeGroupAction(groupId);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
        <span className="text-muted-foreground">
          {selected
            ? "Tap a group to assign — or tap the player again to cancel."
            : `${unassigned.length} unassigned · ${groups.length} ${
                groups.length === 1 ? "group" : "groups"
              }`}
        </span>
        {editable ? (
          <Button variant="outline" size="sm" onClick={addGroup} disabled={pending}>
            Add group
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <section className={`bg-card space-y-2 rounded-lg border p-3 ${selected ? "" : ""}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Unassigned</h3>
          {selected && editable ? (
            <button
              type="button"
              className="text-muted-foreground text-xs underline"
              onClick={unassignSelected}
            >
              Move here
            </button>
          ) : null}
        </div>
        {unassigned.length === 0 ? (
          <p className="text-muted-foreground text-sm">All players are in groups.</p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {unassigned.map((m) => (
              <PlayerChip
                key={m.gameEntryId}
                m={m}
                selected={selected === m.gameEntryId}
                onTap={() => tapPlayer(m.gameEntryId)}
                editable={editable}
              />
            ))}
          </ul>
        )}
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => {
          const over = g.members.length > SOFT_MAX;
          return (
            <li
              key={g.id}
              className="bg-card space-y-2 rounded-lg border p-3"
              onClick={() => editable && selected && assignSelectedTo(g.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {g.name}
                  <span className="text-muted-foreground ml-2 text-xs">({g.members.length})</span>
                </h3>
                {editable ? (
                  <button
                    type="button"
                    className="text-muted-foreground text-xs underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGroup(g.id, g.members.length > 0);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {over ? (
                <p className="text-warning text-xs">
                  More than {SOFT_MAX} players — pace may suffer.
                </p>
              ) : null}
              {g.members.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {selected
                    ? "Tap to assign the selected player here."
                    : "Empty. Tap a player above first."}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {g.members.map((m) => (
                    <PlayerChip
                      key={m.gameEntryId}
                      m={m}
                      selected={selected === m.gameEntryId}
                      onTap={() => tapPlayer(m.gameEntryId)}
                      editable={editable}
                    />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {selected ? (
        <div className="bg-background sticky right-0 bottom-20 left-0 flex justify-center">
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Cancel selection
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PlayerChip({
  m,
  selected,
  onTap,
  editable,
}: {
  m: Member;
  selected: boolean;
  onTap: () => void;
  editable: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTap();
        }}
        disabled={!editable}
        className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
          selected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted"
        } disabled:opacity-70`}
      >
        <span className="truncate font-medium">{m.playerName}</span>
        <span className="text-muted-foreground shrink-0 text-xs">{m.teeName}</span>
      </button>
    </li>
  );
}
