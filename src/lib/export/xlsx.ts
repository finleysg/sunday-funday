// Excel export for a Game (decisions.md → "Excel export").
//
// Workbook layout:
//   "Summary"        — game header (name/date/course/format/skins) + standings
//   "Gross Scorecard" — players × 18 holes, gross strokes
//   "Net Scorecard"  — players × 18 holes, net strokes (gross − strokes-on-hole)
//   "Skins"          — hole-by-hole winners + per-player tallies (only when
//                       the game has a skins format)
//
// Pure: takes a structured snapshot and returns a Buffer. The route handler
// is responsible for fetching DB data and shaping it into `GameExportInput`.

import ExcelJS from "exceljs";

import type { GameFormat, LeaderboardResult, SkinsType } from "@/lib/leaderboard/compute";
import { strokesOnHole } from "@/lib/scoring/strokes";

export const SUMMARY_SHEET = "Summary";
export const GROSS_SHEET = "Gross Scorecard";
export const NET_SHEET = "Net Scorecard";
export const SKINS_SHEET = "Skins";

export type ExportEntry = {
  gameEntryId: string;
  playerName: string;
  teeName: string;
  courseHandicap: number;
  strokeIndexes: number[]; // length 18, 1..18 each used once
  scoresByHole: Record<number, number | null>; // hole → strokes | null
};

export type GameExportInput = {
  game: {
    name: string;
    date: Date;
    courseName: string;
    format: GameFormat;
    skinsType: SkinsType;
  };
  pars: number[]; // length 18
  entries: ExportEntry[];
  leaderboard: LeaderboardResult;
};

const FORMAT_LABEL: Record<GameFormat, string> = {
  STROKE: "Stroke",
  STABLEFORD: "Stableford",
  CHICAGO_39: "Chicago 39",
};

const SKINS_LABEL: Record<SkinsType, string> = {
  NONE: "No skins",
  NET: "Net skins",
  HALF_SHOT: "Half-shot skins",
};

export async function buildGameExportWorkbook(input: GameExportInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sunday Fun Day";
  wb.created = new Date();

  buildSummarySheet(wb, input);
  buildGrossSheet(wb, input);
  buildNetSheet(wb, input);
  if (input.game.skinsType !== "NONE") {
    buildSkinsSheet(wb, input);
  }

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

function buildSummarySheet(wb: ExcelJS.Workbook, input: GameExportInput): void {
  const ws = wb.addWorksheet(SUMMARY_SHEET);

  const header: Array<[string, string]> = [
    ["Game", input.game.name],
    ["Date", formatDateForSheet(input.game.date)],
    ["Course", input.game.courseName],
    ["Format", FORMAT_LABEL[input.game.format] ?? input.game.format],
    ["Skins", SKINS_LABEL[input.game.skinsType] ?? input.game.skinsType],
  ];
  header.forEach(([k, v], i) => {
    const row = i + 1;
    ws.getCell(`A${row}`).value = k;
    ws.getCell(`A${row}`).font = { bold: true };
    ws.getCell(`B${row}`).value = v;
  });

  const standingsHeaderRow = header.length + 2;
  const showSkins = input.leaderboard.skinsType !== "NONE";
  const cols: string[] = [
    "Rank",
    "Player",
    "Tee",
    "CH",
    primaryHeaderForFormat(input.game.format),
    "Thru",
  ];
  if (showSkins) cols.push("Skins");
  ws.getRow(standingsHeaderRow).values = cols;
  ws.getRow(standingsHeaderRow).font = { bold: true };

  const teeByEntry = new Map(input.entries.map((e) => [e.gameEntryId, e.teeName]));
  input.leaderboard.rows.forEach((row, i) => {
    const r = standingsHeaderRow + 1 + i;
    const values: Array<string | number> = [
      row.rank,
      row.playerName,
      teeByEntry.get(row.gameEntryId) ?? "",
      formatCh(row.courseHandicap),
      row.primaryLabel,
      row.thru === 18 ? "F" : row.thru,
    ];
    if (showSkins) values.push(row.skins);
    ws.getRow(r).values = values;
  });

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 8;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 8;
  if (showSkins) ws.getColumn(7).width = 8;
}

function buildGrossSheet(wb: ExcelJS.Workbook, input: GameExportInput): void {
  const ws = wb.addWorksheet(GROSS_SHEET);
  writeScorecardHeader(ws);
  writeParRow(ws, input.pars);

  input.entries.forEach((e, i) => {
    const row = 3 + i;
    const values: Array<string | number | null> = [
      `${e.playerName} (CH ${formatCh(e.courseHandicap)})`,
    ];
    let total = 0;
    let played = 0;
    for (let h = 1; h <= 18; h++) {
      const v = e.scoresByHole[h];
      if (v == null) {
        values.push(null);
      } else {
        values.push(v);
        total += v;
        played++;
      }
    }
    values.push(played === 18 ? total : played === 0 ? null : total);
    ws.getRow(row).values = values;
  });

  formatScorecardColumns(ws);
}

function buildNetSheet(wb: ExcelJS.Workbook, input: GameExportInput): void {
  const ws = wb.addWorksheet(NET_SHEET);
  writeScorecardHeader(ws);
  writeParRow(ws, input.pars);

  input.entries.forEach((e, i) => {
    const row = 3 + i;
    const values: Array<string | number | null> = [
      `${e.playerName} (CH ${formatCh(e.courseHandicap)})`,
    ];
    let total = 0;
    let played = 0;
    for (let h = 1; h <= 18; h++) {
      const gross = e.scoresByHole[h];
      if (gross == null) {
        values.push(null);
      } else {
        const si = e.strokeIndexes[h - 1] ?? h;
        const net = gross - strokesOnHole(e.courseHandicap, si);
        values.push(net);
        total += net;
        played++;
      }
    }
    values.push(played === 18 ? total : played === 0 ? null : total);
    ws.getRow(row).values = values;
  });

  formatScorecardColumns(ws);
}

function buildSkinsSheet(wb: ExcelJS.Workbook, input: GameExportInput): void {
  const ws = wb.addWorksheet(SKINS_SHEET);

  ws.getRow(1).values = ["Hole", "Par", "Winner"];
  ws.getRow(1).font = { bold: true };

  const nameByEntry = new Map(input.entries.map((e) => [e.gameEntryId, e.playerName]));
  for (let h = 1; h <= 18; h++) {
    const winnerEntry = input.leaderboard.skinsByHole.find((s) => s.holeNumber === h);
    const winnerName =
      winnerEntry?.winnerEntryId != null ? (nameByEntry.get(winnerEntry.winnerEntryId) ?? "") : "—";
    ws.getRow(h + 1).values = [h, input.pars[h - 1] ?? 4, winnerName];
  }

  // Per-player tally section starts two rows below the per-hole grid.
  const tallyHeaderRow = 21;
  ws.getRow(tallyHeaderRow).values = ["Player", "Skins"];
  ws.getRow(tallyHeaderRow).font = { bold: true };
  const winners = [...input.leaderboard.rows]
    .filter((r) => r.skins > 0)
    .sort((a, b) => b.skins - a.skins || a.playerName.localeCompare(b.playerName));
  winners.forEach((row, i) => {
    ws.getRow(tallyHeaderRow + 1 + i).values = [row.playerName, row.skins];
  });

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 22;
}

function writeScorecardHeader(ws: ExcelJS.Worksheet): void {
  const header: Array<string | number> = ["Player"];
  for (let h = 1; h <= 18; h++) header.push(h);
  header.push("Total");
  ws.getRow(1).values = header;
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { horizontal: "center" };
  ws.getCell("A1").alignment = { horizontal: "left" };
}

function writeParRow(ws: ExcelJS.Worksheet, pars: number[]): void {
  const row: Array<string | number> = ["Par"];
  let total = 0;
  for (let h = 1; h <= 18; h++) {
    const par = pars[h - 1] ?? 4;
    row.push(par);
    total += par;
  }
  row.push(total);
  ws.getRow(2).values = row;
  ws.getRow(2).font = { italic: true };
}

function formatScorecardColumns(ws: ExcelJS.Worksheet): void {
  ws.getColumn(1).width = 28;
  for (let c = 2; c <= 19; c++) {
    ws.getColumn(c).width = 5;
    ws.getColumn(c).alignment = { horizontal: "center" };
  }
  ws.getColumn(20).width = 8;
  ws.getColumn(20).alignment = { horizontal: "center" };
}

function formatDateForSheet(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCh(ch: number): string {
  return ch >= 0 ? String(ch) : `+${-ch}`;
}

function primaryHeaderForFormat(format: GameFormat): string {
  if (format === "STROKE") return "Net";
  if (format === "STABLEFORD") return "Points";
  return "vs Quota";
}
