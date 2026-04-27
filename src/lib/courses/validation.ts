// Validation for course / tee inputs. Pure Zod schemas — no DB access.
// Reused by the multi-step form server actions and the .xlsx import endpoint
// so both surfaces enforce the same rules.

import { z } from "zod";

export const HOLES = 18;
export const PAR_MIN = 3;
export const PAR_MAX = 7;
export const SLOPE_MIN = 55;
export const SLOPE_MAX = 155;
export const RATING_MIN = 55;
export const RATING_MAX = 85;

export const ParList = z
  .array(z.coerce.number().int(`Par must be a whole number`).min(PAR_MIN).max(PAR_MAX))
  .length(HOLES, `Need exactly ${HOLES} pars`);

export const StrokeIndexList = z
  .array(z.coerce.number().int().min(1).max(HOLES))
  .length(HOLES, `Need exactly ${HOLES} stroke indexes`)
  .refine((arr) => new Set(arr).size === HOLES, {
    message: `Stroke indexes must be a permutation of 1–${HOLES} (each used exactly once)`,
  });

export const TeeInput = z.object({
  name: z.string().trim().min(1, "Tee name is required").max(40, "Tee name is too long"),
  rating: z.coerce
    .number()
    .min(RATING_MIN, `Rating must be ≥ ${RATING_MIN}`)
    .max(RATING_MAX, `Rating must be ≤ ${RATING_MAX}`),
  slope: z.coerce
    .number()
    .int("Slope must be a whole number")
    .min(SLOPE_MIN, `Slope must be ≥ ${SLOPE_MIN}`)
    .max(SLOPE_MAX, `Slope must be ≤ ${SLOPE_MAX}`),
  strokeIndexes: StrokeIndexList,
});
export type TeeInput = z.infer<typeof TeeInput>;

export const CourseInput = z.object({
  name: z.string().trim().min(1, "Course name is required").max(120),
  pars: ParList,
  tees: z
    .array(TeeInput)
    .min(1, "At least one tee is required")
    .refine((tees) => new Set(tees.map((t) => t.name.toLowerCase())).size === tees.length, {
      message: "Tee names must be unique within a course",
    }),
});
export type CourseInput = z.infer<typeof CourseInput>;
