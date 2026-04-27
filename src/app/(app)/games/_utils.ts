// Date / display helpers used by the games list and detail pages.

export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function formatGameDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const FORMAT_LABEL: Record<string, string> = {
  STROKE: "Stroke",
  STABLEFORD: "Stableford",
  CHICAGO_39: "Chicago 39",
};

export function formatFormat(f: string): string {
  return FORMAT_LABEL[f] ?? f;
}

const SKINS_LABEL: Record<string, string> = {
  NONE: "No skins",
  NET: "Net skins",
  HALF_SHOT: "Half-shot skins",
};

export function formatSkins(s: string): string {
  return SKINS_LABEL[s] ?? s;
}
