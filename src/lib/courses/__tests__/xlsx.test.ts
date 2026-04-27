import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildCourseTemplate, parseCourseWorkbook, COURSE_SHEET, TEES_SHEET } from "../xlsx";

const seq = (n: number, start = 1) => Array.from({ length: n }, (_, i) => start + i);

async function buildValidWorkbook(
  opts: {
    name?: string;
    pars?: number[];
    tees?: Array<{ name: string; rating: number; slope: number; si: number[] }>;
  } = {},
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const c = wb.addWorksheet(COURSE_SHEET);
  c.getCell("B1").value = opts.name ?? "Test Course";
  c.getCell("A3").value = "Hole";
  c.getCell("B3").value = "Par";
  const pars = opts.pars ?? Array.from({ length: 18 }, () => 4);
  for (let h = 1; h <= 18; h++) {
    c.getCell(`A${h + 3}`).value = h;
    c.getCell(`B${h + 3}`).value = pars[h - 1];
  }
  const t = wb.addWorksheet(TEES_SHEET);
  const headers = ["Name", "Rating", "Slope"];
  for (let i = 1; i <= 18; i++) headers.push(`SI ${i}`);
  t.addRow(headers);
  const tees = opts.tees ?? [{ name: "Blue", rating: 71.0, slope: 130, si: seq(18) }];
  for (const tee of tees) {
    t.addRow([tee.name, tee.rating, tee.slope, ...tee.si]);
  }
  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

describe("parseCourseWorkbook", () => {
  it("parses a valid workbook", async () => {
    const buf = await buildValidWorkbook();
    const r = await parseCourseWorkbook(buf);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.course.name).toBe("Test Course");
      expect(r.course.pars).toHaveLength(18);
      expect(r.course.tees).toHaveLength(1);
      expect(r.course.tees[0]!.name).toBe("Blue");
    }
  });

  it("collects all SI permutation errors at once", async () => {
    const badSi = seq(18);
    badSi[0] = 2; // duplicate
    const buf = await buildValidWorkbook({
      tees: [{ name: "Blue", rating: 71, slope: 130, si: badSi }],
    });
    const r = await parseCourseWorkbook(buf);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.toLowerCase().includes("permutation"))).toBe(true);
    }
  });

  it("reports missing course name", async () => {
    const buf = await buildValidWorkbook({ name: "" });
    const r = await parseCourseWorkbook(buf);
    expect(r.ok).toBe(false);
  });

  it("reports invalid pars", async () => {
    const pars = Array.from({ length: 18 }, () => 4);
    pars[0] = 9;
    const buf = await buildValidWorkbook({ pars });
    const r = await parseCourseWorkbook(buf);
    expect(r.ok).toBe(false);
  });

  it("reports junk file", async () => {
    const r = await parseCourseWorkbook(new Uint8Array([1, 2, 3]).buffer);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toMatch(/not a valid/i);
  });
});

describe("buildCourseTemplate", () => {
  it("produces a parseable workbook (with sample row)", async () => {
    const buf = await buildCourseTemplate();
    const r = await parseCourseWorkbook(new Uint8Array(buf).buffer);
    // Template ships with empty course name, which is invalid by design.
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.join(" ")).toMatch(/course name/i);
    }
  });
});
