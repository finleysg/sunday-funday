"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NassauResult } from "@/lib/scoring/nassau";

export type NassauResponse = {
  a: { id: string; name: string; courseHandicap: number };
  b: { id: string; name: string; courseHandicap: number };
  result: NassauResult;
};

export function NassauModal({
  open,
  loading,
  error,
  data,
  onOpenChange,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: NassauResponse | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nassau · Side bet</DialogTitle>
          <DialogDescription>Net match-play across Front 9, Back 9, and Total.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-sm">Computing…</p>
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : data ? (
          <div className="space-y-3 text-sm">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>
                <span className="text-foreground font-medium">{data.a.name}</span> · CH{" "}
                {formatCh(data.a.courseHandicap)}
              </span>
              <span className="px-2">vs</span>
              <span>
                <span className="text-foreground font-medium">{data.b.name}</span> · CH{" "}
                {formatCh(data.b.courseHandicap)}
              </span>
            </div>
            <Segment label="Front 9" segment={data.result.front} />
            <Segment label="Back 9" segment={data.result.back} />
            <Segment label="Total" segment={data.result.total} />
          </div>
        ) : null}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function Segment({ label, segment }: { label: string; segment: NassauResult["front"] }) {
  const tone =
    segment.status === "won"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : segment.status === "halved"
        ? "border-slate-300 bg-slate-50 text-slate-700"
        : "border-amber-300 bg-amber-50 text-amber-900";
  return (
    <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${tone}`}>
      <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      <span className="text-sm font-medium">{segment.description}</span>
    </div>
  );
}

function formatCh(ch: number): string {
  return ch >= 0 ? String(ch) : `+${-ch}`;
}
