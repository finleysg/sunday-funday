// Spreadsheet format for course import / template generation.
//
// Workbook layout (single course per file):
//   "Course" sheet:
//     A1: "Course Name" | B1: <name>
//     row 3+:           "Hole" | "Par"
//     rows 4..21:       1..18  | <par>
//
//   "Tees" sheet:
//     row 1 headers:    "Name" | "Rating" | "Slope" | "SI 1" .. "SI 18"
//     rows 2+:          <name> | <rating> | <slope> | <si values...>
//
// Import surfaces *all* validation errors at once. Hard error on duplicate
// course name (no merge, no overwrite).

import ExcelJS from "exceljs";

import { CourseInput } from "./validation";

export const COURSE_SHEET = "Course";
export const TEES_SHEET = "Tees";

export type ParsedCourse = {
  name: string;
  pars: number[];
  tees: Array<{
    name: string;
    rating: number;
    slope: number;
    strokeIndexes: number[];
  }>;
};

export type ParseResult = { ok: true; course: ParsedCourse } | { ok: false; issues: string[] };

export async function parseCourseWorkbook(buffer: ArrayBuffer): Promise<ParseResult> {
  const issues: string[] = [];
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return { ok: false, issues: ["File is not a valid .xlsx workbook"] };
  }

  const courseSheet = wb.getWorksheet(COURSE_SHEET);
  const teesSheet = wb.getWorksheet(TEES_SHEET);
  if (!courseSheet) issues.push(`Missing sheet: "${COURSE_SHEET}"`);
  if (!teesSheet) issues.push(`Missing sheet: "${TEES_SHEET}"`);
  if (!courseSheet || !teesSheet) return { ok: false, issues };

  // Course name
  const nameCell = courseSheet.getCell("B1").value;
  const name = String(nameCell ?? "").trim();
  if (!name) issues.push(`Cell ${COURSE_SHEET}!B1 (course name) is empty`);

  // Pars (rows 4-21)
  const pars: number[] = [];
  for (let h = 1; h <= 18; h++) {
    const row = h + 3;
    const cell = courseSheet.getCell(`B${row}`).value;
    const num = toNumber(cell);
    if (num === null) {
      issues.push(`${COURSE_SHEET}!B${row} (par for hole ${h}) is not a number`);
      pars.push(NaN);
    } else {
      pars.push(num);
    }
  }

  // Tees (header row 1, data row 2+)
  const tees: ParsedCourse["tees"] = [];
  const teeRowCount = teesSheet.actualRowCount ?? 0;
  if (teeRowCount < 2) {
    issues.push(`${TEES_SHEET} sheet has no tee rows`);
  } else {
    for (let r = 2; r <= teeRowCount; r++) {
      const row = teesSheet.getRow(r);
      if (!hasAnyValue(row, 21)) continue; // skip blank rows
      const teeName = String(row.getCell(1).value ?? "").trim();
      const rating = toNumber(row.getCell(2).value);
      const slope = toNumber(row.getCell(3).value);
      const sis: number[] = [];
      for (let c = 4; c <= 21; c++) {
        const v = toNumber(row.getCell(c).value);
        sis.push(v ?? NaN);
      }
      const label = teeName || `row ${r}`;
      if (!teeName) issues.push(`${TEES_SHEET}!A${r} (tee name) is empty`);
      if (rating === null) issues.push(`${TEES_SHEET}!B${r} (rating for ${label}) is not a number`);
      if (slope === null) issues.push(`${TEES_SHEET}!C${r} (slope for ${label}) is not a number`);
      sis.forEach((v, i) => {
        if (Number.isNaN(v))
          issues.push(
            `${TEES_SHEET}!${colLetter(4 + i)}${r} (SI hole ${i + 1} for ${label}) is not a number`,
          );
      });
      tees.push({
        name: teeName,
        rating: rating ?? NaN,
        slope: slope ?? NaN,
        strokeIndexes: sis,
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  // Schema-level validation (range, permutation, etc.) — collect all messages
  const schemaResult = CourseInput.safeParse({ name, pars, tees });
  if (!schemaResult.success) {
    return {
      ok: false,
      issues: schemaResult.error.issues.map((i) => {
        const path = i.path.length ? ` (at ${i.path.join(".")})` : "";
        return `${i.message}${path}`;
      }),
    };
  }

  return { ok: true, course: schemaResult.data };
}

export async function buildCourseTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sunday Fun Day";

  const course = wb.addWorksheet(COURSE_SHEET);
  course.getCell("A1").value = "Course Name";
  course.getCell("A1").font = { bold: true };
  course.getCell("B1").value = "";
  course.getCell("A3").value = "Hole";
  course.getCell("B3").value = "Par";
  course.getRow(3).font = { bold: true };
  for (let h = 1; h <= 18; h++) {
    course.getCell(`A${h + 3}`).value = h;
    course.getCell(`B${h + 3}`).value = 4;
  }
  course.getColumn(1).width = 14;
  course.getColumn(2).width = 14;

  const tees = wb.addWorksheet(TEES_SHEET);
  const headers = ["Name", "Rating", "Slope"];
  for (let i = 1; i <= 18; i++) headers.push(`SI ${i}`);
  tees.addRow(headers);
  tees.getRow(1).font = { bold: true };

  // Sample tee row to make the format obvious
  const sampleSi = Array.from({ length: 18 }, (_, i) => i + 1);
  tees.addRow(["Blue", 71.0, 130, ...sampleSi]);
  tees.getColumn(1).width = 14;
  tees.getColumn(2).width = 10;
  tees.getColumn(3).width = 10;

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === "object" && v !== null && "result" in v) {
    return toNumber((v as { result: unknown }).result);
  }
  return null;
}

function hasAnyValue(row: ExcelJS.Row, lastCol: number): boolean {
  for (let c = 1; c <= lastCol; c++) {
    const v = row.getCell(c).value;
    if (v !== null && v !== undefined && v !== "") return true;
  }
  return false;
}

function colLetter(col: number): string {
  let s = "";
  let n = col;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
