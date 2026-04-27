// Seed script for local dev. Run via `pnpm db:reset` (which calls
// `prisma migrate reset --force`, which then runs this seed).
//
// Phase 0: skeleton only — no data inserted yet.
// Real seed data lands in later phases:
//   Phase 1 — players + admin user
//   Phase 2 — two real courses with tees
//   Phase 3 — sample games in each lifecycle status

async function main() {
  console.log("seed: skeleton (no data inserted yet — see prisma/seed.ts)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
