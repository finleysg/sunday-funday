// Seed script for local dev. Run via `pnpm db:reset` (which calls
// `prisma migrate reset --force`, which then runs this seed).
//
// Phase 1: seeds an active Player row for each ADMIN_EMAILS entry so the
//          admin can sign in immediately after a fresh DB reset.
// Phase 2 — two real courses with tees
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

async function main() {
  const emails = adminEmails();
  if (emails.length === 0) {
    console.log("seed: ADMIN_EMAILS is empty — no admin player seeded");
    return;
  }

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

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
