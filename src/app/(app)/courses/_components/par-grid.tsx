"use client";

import { Input } from "@/components/ui/input";

export function ParGrid({
  values,
  onChange,
}: {
  values: number[];
  onChange: (next: number[]) => void;
}) {
  function setOne(i: number, v: number) {
    const next = values.slice();
    next[i] = v;
    onChange(next);
  }
  return (
    <div className="grid grid-cols-9 gap-1.5">
      {values.map((v, i) => (
        <label key={i} className="flex flex-col items-center gap-1 text-center text-xs">
          <span className="text-muted-foreground">{i + 1}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={3}
            max={7}
            value={Number.isFinite(v) ? v : ""}
            onChange={(e) => setOne(i, Number(e.target.value))}
            className="h-9 px-1 text-center"
          />
        </label>
      ))}
    </div>
  );
}
