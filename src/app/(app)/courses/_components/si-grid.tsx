"use client";

import { Input } from "@/components/ui/input";

export function SiGrid({
  values,
  onChange,
}: {
  values: number[];
  onChange: (next: number[]) => void;
}) {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);

  function setOne(i: number, v: number) {
    const next = values.slice();
    next[i] = v;
    onChange(next);
  }

  return (
    <div className="grid grid-cols-9 gap-1.5">
      {values.map((v, i) => {
        const dup = v >= 1 && v <= 18 && (counts.get(v) ?? 0) > 1;
        return (
          <label key={i} className="flex flex-col items-center gap-1 text-center text-xs">
            <span className="text-muted-foreground">{i + 1}</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={18}
              value={v >= 1 && v <= 18 ? v : ""}
              onChange={(e) => setOne(i, Number(e.target.value))}
              className="h-9 px-1 text-center"
              aria-invalid={dup ? true : undefined}
            />
          </label>
        );
      })}
    </div>
  );
}
