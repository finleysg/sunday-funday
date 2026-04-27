// Seed script for local dev. Run via `pnpm db:reset` (which calls
// `prisma migrate reset --force`, which then runs this seed).
//
// Phase 1: seeds an active Player row for each ADMIN_EMAILS entry so the
//          admin can sign in immediately after a fresh DB reset.
// Phase 2: seeds two real courses with multiple tees so the rest of the app
//          has realistic data to develop against.
// Phase 3 — sample games in each lifecycle status

import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";

function buildPrisma(): PrismaClient {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set");
  const parsed = new URL(url);
  const adapter = new PrismaMariaDb({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  });
  return new PrismaClient({ adapter });
}

const prisma = buildPrisma();

function adminEmails(): string[] {
  return (process.env["ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

type SeedTee = {
  name: string;
  rating: number;
  slope: number;
  strokeIndexes: number[];
};
type SeedCourse = { name: string; pars: number[]; tees: SeedTee[] };

const COURSES: SeedCourse[] = [
  {
    name: "Pebble Beach Golf Links",
    pars: [4, 5, 4, 4, 3, 5, 3, 4, 4, 4, 4, 3, 4, 4, 3, 4, 4, 5],
    tees: [
      {
        name: "Blue",
        rating: 74.7,
        slope: 144,
        strokeIndexes: [7, 11, 5, 13, 15, 1, 17, 9, 3, 6, 8, 16, 4, 10, 18, 2, 14, 12],
      },
      {
        name: "White",
        rating: 71.7,
        slope: 135,
        strokeIndexes: [7, 11, 5, 13, 15, 1, 17, 9, 3, 6, 8, 16, 4, 10, 18, 2, 14, 12],
      },
      {
        name: "Red",
        rating: 70.4,
        slope: 128,
        strokeIndexes: [9, 3, 11, 13, 17, 1, 15, 5, 7, 6, 10, 18, 4, 8, 16, 2, 14, 12],
      },
    ],
  },
  {
    name: "Bandon Dunes",
    pars: [4, 4, 4, 5, 4, 3, 4, 3, 5, 4, 5, 3, 4, 4, 5, 3, 4, 4],
    tees: [
      {
        name: "Black",
        rating: 74.6,
        slope: 143,
        strokeIndexes: [3, 7, 11, 1, 9, 17, 5, 15, 13, 4, 2, 16, 14, 10, 6, 18, 12, 8],
      },
      {
        name: "Green",
        rating: 71.9,
        slope: 130,
        strokeIndexes: [3, 7, 11, 1, 9, 17, 5, 15, 13, 4, 2, 16, 14, 10, 6, 18, 12, 8],
      },
    ],
  },
];

async function seedCourse(c: SeedCourse) {
  const existing = await prisma.course.findUnique({ where: { name: c.name } });
  if (existing) {
    console.log(`seed: course already exists (${c.name})`);
    return;
  }
  const course = await prisma.course.create({ data: { name: c.name } });
  for (let i = 0; i < c.pars.length; i++) {
    await prisma.courseHole.create({
      data: { courseId: course.id, holeNumber: i + 1, par: c.pars[i]! },
    });
  }
  for (const t of c.tees) {
    const tee = await prisma.tee.create({
      data: {
        courseId: course.id,
        name: t.name,
        rating: t.rating,
        slope: t.slope,
      },
    });
    for (let i = 0; i < t.strokeIndexes.length; i++) {
      await prisma.teeHole.create({
        data: {
          teeId: tee.id,
          holeNumber: i + 1,
          strokeIndex: t.strokeIndexes[i]!,
        },
      });
    }
  }
  console.log(`seed: created course "${c.name}" with ${c.tees.length} tee(s)`);
}

async function main() {
  const emails = adminEmails();
  if (emails.length === 0) {
    console.log("seed: ADMIN_EMAILS is empty — no admin player seeded");
  } else {
    for (const email of emails) {
      const existing = await prisma.player.findUnique({ where: { email } });
      if (existing) {
        console.log(`seed: admin player already exists (${email})`);
        continue;
      }
      const player = await prisma.player.create({
        data: { email, name: email.split("@")[0]!, active: true },
      });
      console.log(`seed: created admin player ${player.email} (id=${player.id})`);
    }
  }

  for (const c of COURSES) await seedCourse(c);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
