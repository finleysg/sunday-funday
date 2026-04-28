import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { computeLeaderboard } from "@/lib/leaderboard/compute";

import {
  buildGameExportWorkbook,
  GROSS_SHEET,
  NET_SHEET,
  SKINS_SHEET,
  SUMMARY_SHEET,
  type ExportEntry,
  type GameExportInput,
} from "../xlsx";

const PARS = Array.from({ length: 18 }, () => 4);
const SI = Array.from({ length: 18 }, (_, i) => i + 1);

function entryWithScores(
  partial: Partial<ExportEntry> & { gameEntryId: string; playerName: string },
  scores: Array<number | null>,
): ExportEntry {
  const scoresByHole: Record<number, number | null> = {};
  scores.forEach((s, i) => (scoresByHole[i + 1] = s));
  return {
    teeName: "Blue",
    courseHandicap: 10,
    strokeIndexes: SI,
    scoresByHole,
    ...partial,
  };
}

function buildInput(overrides: Partial<GameExportInput> = {}): GameExportInput {
  const entries: ExportEntry[] = overrides.entries ?? [
    entryWithScores(
      { gameEntryId: "e1", playerName: "Alice", courseHandicap: 8 },
      Array.from({ length: 18 }, () => 4),
    ),
    entryWithScores(
      { gameEntryId: "e2", playerName: "Bob", courseHandicap: 18 },
      Array.from({ length: 18 }, () => 5),
    ),
  ];
  const leaderboard = computeLeaderboard({
    format: overrides.game?.format ?? "STROKE",
    skinsType: overrides.game?.skinsType ?? "NONE",
    pars: PARS,
    entries: entries.map((e) => ({
      gameEntryId: e.gameEntryId,
      playerId: e.gameEntryId,
      playerName: e.playerName,
      courseHandicap: e.courseHandicap,
      strokeIndexes: e.strokeIndexes,
      scoresByHole: e.scoresByHole,
    })),
  });
  return {
    game: {
      name: "Test Game",
      date: new Date("2026-04-26T12:00:00Z"),
      courseName: "Pebble Beach",
      format: "STROKE",
      skinsType: "NONE",
      ...overrides.game,
    },
    pars: PARS,
    entries,
    leaderboard,
    ...overrides,
  };
}

describe("buildGameExportWorkbook", () => {
  it("creates a workbook with Summary, Gross, and Net sheets when no skins", async () => {
    const buf = await buildGameExportWorkbook(buildInput());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(buf).buffer);
    expect(wb.getWorksheet(SUMMARY_SHEET)).toBeDefined();
    expect(wb.getWorksheet(GROSS_SHEET)).toBeDefined();
    expect(wb.getWorksheet(NET_SHEET)).toBeDefined();
    expect(wb.getWorksheet(SKINS_SHEET)).toBeUndefined();
  });

  it("adds the Skins sheet when skins are enabled", async () => {
    const buf = await buildGameExportWorkbook(
      buildInput({
        game: { name: "x", date: new Date(), courseName: "x", format: "STROKE", skinsType: "NET" },
      }),
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(buf).buffer);
    expect(wb.getWorksheet(SKINS_SHEET)).toBeDefined();
  });

  it("populates Summary header with game info", async () => {
    const buf = await buildGameExportWorkbook(
      buildInput({
        game: {
          name: "Spring Open",
          date: new Date("2026-05-01T12:00:00Z"),
          courseName: "Augusta",
          format: "STABLEFORD",
          skinsType: "HALF_SHOT",
        },
      }),
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(buf).buffer);
    const ws = wb.getWorksheet(SUMMARY_SHEET)!;
    expect(ws.getCell("A1").value).toBe("Game");
    expect(ws.getCell("B1").value).toBe("Spring Open");
    expect(ws.getCell("A3").value).toBe("Course");
    expect(ws.getCell("B3").value).toBe("Augusta");
    expect(ws.getCell("B4").value).toBe("Stableford");
    expect(ws.getCell("B5").value).toBe("Half-shot skins");
  });

  it("writes par row and gross strokes per hole", async () => {
    const scores = Array.from({ length: 18 }, (_, i) => 4 + (i % 2)); // 4,5,4,5,...
    const entry = entryWithScores(
      { gameEntryId: "e", playerName: "Solo", courseHandicap: 0 },
      scores,
    );
    const input = buildInput({ entries: [entry] });
    const buf = await buildGameExportWorkbook(input);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(buf).buffer);
    const ws = wb.getWorksheet(GROSS_SHEET)!;
    // Header row 1: "Player" then 1..18 then "Total"
    expect(ws.getCell("A1").value).toBe("Player");
    expect(ws.getCell("B1").value).toBe(1);
    expect(ws.getCell("S1").value).toBe(18);
    expect(ws.getCell("T1").value).toBe("Total");
    // Par row
    expect(ws.getCell("A2").value).toBe("Par");
    expect(ws.getCell("T2").value).toBe(72);
    // Player row
    expect(String(ws.getCell("A3").value)).toContain("Solo");
    expect(ws.getCell("B3").value).toBe(4);
    expect(ws.getCell("C3").value).toBe(5);
    // Total = sum(scores) = 9 sets of (4+5) = 81
    expect(ws.getCell("T3").value).toBe(81);
  });

  it("computes net by subtracting strokes-on-hole using player's SI", async () => {
    // Player has CH 18 → 1 stroke on every hole. Gross 5 every hole → net 4.
    const entry = entryWithScores(
      { gameEntryId: "e", playerName: "Solo", courseHandicap: 18 },
      Array.from({ length: 18 }, () => 5),
    );
    const buf = await buildGameExportWorkbook(buildInput({ entries: [entry] }));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(buf).buffer);
    const ws = wb.getWorksheet(NET_SHEET)!;
    expect(ws.getCell("B3").value).toBe(4);
    expect(ws.getCell("T3").value).toBe(72);
  });

  it("leaves missing scores blank and skips them in the total", async () => {
    const scores: Array<number | null> = Array.from({ length: 18 }, (_, i) => (i < 9 ? 4 : null));
    const entry = entryWithScores(
      { gameEntryId: "e", playerName: "Solo", courseHandicap: 0 },
      scores,
    );
    const buf = await buildGameExportWorkbook(buildInput({ entries: [entry] }));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(buf).buffer);
    const ws = wb.getWorksheet(GROSS_SHEET)!;
    // K3 is column 11 → hole 10 (col 1 is the player label, col 2 is hole 1).
    expect(ws.getCell("K3").value).toBeNull();
    expect(ws.getCell("T3").value).toBe(36); // partial-round total of holes played
  });

  it("Skins sheet records hole winners and per-player tally", async () => {
    // Two scratch players. Hole 1: A 3, B 5 → A wins (gross & net).
    // All other holes both 4 → tied → no winner.
    const a = entryWithScores({ gameEntryId: "a", playerName: "Ada", courseHandicap: 0 }, [
      3,
      ...Array.from({ length: 17 }, () => 4),
    ]);
    const b = entryWithScores({ gameEntryId: "b", playerName: "Bea", courseHandicap: 0 }, [
      5,
      ...Array.from({ length: 17 }, () => 4),
    ]);
    const buf = await buildGameExportWorkbook(
      buildInput({
        entries: [a, b],
        game: {
          name: "x",
          date: new Date(),
          courseName: "x",
          format: "STROKE",
          skinsType: "NET",
        },
      }),
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(buf).buffer);
    const ws = wb.getWorksheet(SKINS_SHEET)!;
    expect(ws.getCell("A1").value).toBe("Hole");
    expect(ws.getCell("C2").value).toBe("Ada"); // hole 1 winner
    // Hole 2 was tied → no winner
    expect(ws.getCell("C3").value).toBe("—");
    // Tally header
    expect(ws.getCell("A21").value).toBe("Player");
    expect(ws.getCell("A22").value).toBe("Ada");
    expect(ws.getCell("B22").value).toBe(1);
  });
});
