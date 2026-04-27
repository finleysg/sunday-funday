# Sunday Fun Day — Build Plan

Phased build order. Each phase is a discrete, demonstrable milestone. Sequencing respects data dependencies (can't score a game without a course; can't create a course without auth).

See `decisions.md` for the rationale behind each architectural choice referenced below.

---

## Phase 0 — Foundation

No user-facing features yet. The goal is a green CI pipeline producing a deployable container.

- [ ] Initialize Next.js 16 (App Router, TS, Tailwind, ESLint) — verify v16 specifics via context7 first
- [ ] Install shadcn/ui; add base components (Button, Input, Dialog, Sheet, Tabs)
- [ ] Install Prisma; configure MySQL provider; create `prisma/schema.prisma` skeleton
- [ ] Install TanStack Query, Zustand, React Hook Form, Zod, react-email, exceljs
- [ ] `docker-compose.yml` with project name `sunday-funday`:
  - MySQL on host port 3309
  - Mailpit on host ports 1029 (SMTP) / 8029 (UI)
- [ ] `prisma/seed.ts` skeleton (no data yet — fleshed out in later phases)
- [ ] `pnpm db:reset` script
- [ ] Configure Vitest; write one trivial passing test
- [ ] Configure testcontainers for MySQL integration tests
- [ ] ESLint + Prettier config; format check passes
- [ ] `Dockerfile` (multi-stage, `next start` standalone) — verify Next 16 standalone output config
- [ ] `captain-definition` pointing to Dockerfile
- [ ] GitHub Actions workflow: `lint → typecheck → test → build` on PRs and main
- [ ] Configure Portless subdomain; document in README
- [ ] `.env.example` with all required vars stubbed

**Done when:** `pnpm dev` runs against Dockerized MySQL; CI is green; container builds successfully.

---

## Phase 1 — Identity

- [ ] Install better-auth + Prisma adapter + magic-link plugin
- [ ] Generate better-auth tables in Prisma schema (`user`, `session`, `account`, `verification`)
- [ ] Add `Player` table (id, name, email unique, active) — link 1:1 to better-auth `user` by email on first sign-in
- [ ] Configure Resend in dev (Mailpit) and prod (real SMTP); abstract via `EMAIL_PROVIDER` env or single config
- [ ] Wire `sendMagicLink` callback: reject silently if email not in `Player` table
- [ ] Sign-in page (`app/(auth)/sign-in/page.tsx`): email input → magic link sent confirmation
- [ ] Magic link email template via react-email
- [ ] Session middleware; admin guard derived from `ADMIN_EMAILS` env var
- [ ] Sign-out flow
- [ ] `app/(app)` layout shell with bottom nav (placeholder links)
- [ ] Admin roster page (`app/(app)/roster`):
  - List players (active + inactive)
  - Add player (name + email)
  - Edit / deactivate player
- [ ] `BETTER_AUTH_URL` pointed at Portless subdomain for real-phone testing

**Done when:** an admin can add a player by email; that player can sign in via magic link from a real phone; non-roster emails get no email and no error leak.

---

## Phase 2 — Courses

- [ ] Add `Course`, `CourseHole`, `Tee`, `TeeHole` tables to Prisma schema; migrate
- [ ] Course list page (`app/(app)/courses`) — list + "add course" button
- [ ] Multi-step course creation form:
  - Step 1: name + 18 par inputs (default par 4)
  - Step 2: first tee — name, rating, slope, 18 SI inputs with permutation validation (1–18 each used once)
  - Step 3: "add another tee" repeats Step 2; "done" finishes
- [ ] Course detail / edit screen
- [ ] **Soft-immutable rule**: block edits if course is referenced by a `COMPLETE` game; offer "add new tee / deactivate" path instead
- [ ] Bulk import endpoint:
  - Upload `.xlsx`, parse with `exceljs`
  - Validate (course name, exactly 18 pars, SI permutations per tee, rating numeric, slope 55–155)
  - Surface all errors at once
  - Hard error if course name already exists
- [ ] Downloadable template generator (admin screen button)
- [ ] Seed two real courses for development

**Done when:** an admin can create a course manually OR via spreadsheet upload, and the courses appear in the database with correct par + SI per tee.

---

## Phase 3 — Game setup

- [ ] Add `Game`, `GameEntry`, `Group`, `GroupMember` tables; migrate
- [ ] Game list page (`app/(app)/games`) — sorted by date desc; today's `IN_PROGRESS` pinned at top
- [ ] Create game form (`/games/new`): name, date, course, format, skinsType — status starts `SETUP`
- [ ] Game detail / edit screen — header info, roster section, groups section
- [ ] Roster builder:
  - Active player checkboxes
  - "Add players from last game at this course" bulk action
  - Per-player tee selector (default to last-used at this course) + course handicap input
  - Save creates `GameEntry` rows
- [ ] Group builder:
  - "Unassigned players" list
  - "Group N" cards
  - Tap-to-select → tap-to-assign UI
  - Soft warning if group has more than 5
  - Allow rearrangement at any status; confirmation prompt if scores already exist
- [ ] `SETUP → IN_PROGRESS` transition button (admin or any authed user — TBD; default to admin)
  - On transition, pre-create `Score` rows for all entries × 18 holes
- [ ] Game discovery: home page auto-redirects to today's `IN_PROGRESS` if exactly one exists; otherwise shows games list

**Done when:** an admin can create a game, fill the roster, build groups, and transition to `IN_PROGRESS`.

---

## Phase 4 — Scoring math (TDD, no UI)

Pure functions only. Every function gets a table-driven test file with worked examples.

- [ ] `lib/scoring/strokes.ts` — `strokesOnHole(courseHandicap, strokeIndex)`
  - Test cases: H=18 (1 on every hole), H=22 (1 on all + 1 on SI 1–4), H=9 (1 on SI 1–9), H=0 (none), H=-2 (gives strokes on SI 17/18)
- [ ] `lib/scoring/match-play.ts` — `matchPlayStrokesOnHole(higherHcp, lowerHcp, higherPlayerSI)`
  - Test cases: 3 vs 10 → 7 shots distributed by 10's tee SI; equal hcps → 0 shots; plus vs +N
- [ ] `lib/scoring/stroke.ts` — round total (sum net)
- [ ] `lib/scoring/stableford.ts` — per-hole points (4/3/2/1/0) + round total
- [ ] `lib/scoring/chicago.ts` — quota = 39 − H, gross-based hole points (1/2/4/8/16), round total = sum − quota
- [ ] `lib/scoring/skins-net.ts` — per-hole resolver: lowest unique net wins; ties → null (skin dead)
- [ ] `lib/scoring/skins-half-shot.ts` — per-hole resolver: lowest unique net wins; on tie, gross birdie/eagle beats net birdie/eagle (lower gross among tied wins); remaining ties → null
- [ ] `lib/scoring/nassau.ts` — given two players' scores, returns `{ front: MatchResult, back: MatchResult, total: MatchResult }` where `MatchResult` describes "X up", "X up Y to play", "halved", "A wins N&M"

**Done when:** all scoring math has comprehensive unit-test coverage and zero UI integration.

---

## Phase 5 — Score entry UI

- [ ] Group discovery: `/games/:id` auto-detects user's group; "switch group" button lists others
- [ ] Score entry screen (`/games/:id/groups/:groupId/score`):
  - Per-hole layout with embla carousel for swipe
  - Default to first hole with a missing score (or hole 1)
  - Each player row: name, par-relative indicator, `−` / strokes / `+` steppers
  - Tap displayed strokes → opens numeric keyboard for direct entry
  - Stroke-receiving dot next to player name on holes where they get a stroke
  - Sub-2× par non-blocking warning
  - Auto-advance to next hole when all members entered, with undo toast
- [ ] Read-only mode when viewing a group you're not a member of
- [ ] Lock score editing when `Game.status === COMPLETE`
- [ ] Score write endpoint: PUT `{ gameEntryId, holeNumber, strokes }` — idempotent, LWW

**Done when:** a group can complete a full 18-hole round on real phones, with all scores persisted.

---

## Phase 6 — PWA & offline

- [ ] `manifest.json` (name, short_name, theme_color, icons 192/512)
- [ ] Generate icon set from source PNG via `pwa-asset-generator`
- [ ] Service worker setup (Workbox via Next 16-compatible plugin or hand-rolled)
- [ ] `BackgroundSyncPlugin` for score-write PUT requests — queue in IndexedDB on failure, replay on reconnect
- [ ] Pending-sync indicator (badge in header) showing count of queued writes
- [ ] Manual "sync now" button (iOS Safari fallback — background sync unsupported)
- [ ] Test on real iOS device via Portless: install to home screen, go offline, score a hole, come online, verify replay
- [ ] Test on real Android device similarly
- [ ] `NEXT_PUBLIC_ENABLE_SW=true` to enable in dev when needed; otherwise off

**Done when:** scores entered offline survive an airplane-mode round and replay correctly when service returns, on both iOS (with manual sync if needed) and Android.

---

## Phase 7 — Leaderboard

- [ ] Leaderboard endpoint: `GET /api/games/:id/leaderboard` returns format-specific computed standings + skins (if enabled)
- [ ] Leaderboard page (`/games/:id/leaderboard`):
  - Header: game name, date, course, format
  - Primary format section: rank, name, format-specific score, "thru"
  - Skins section (when enabled): name, skins won
  - Current user's row highlighted
- [ ] 15s polling via TanStack Query, paused on `document.hidden`
- [ ] Pull-to-refresh
- [ ] Toggle between leaderboard ↔ score entry (the "easy toggle" called out in the overview)

**Done when:** all players can see live standings; the leaderboard updates within 15 seconds of any score change.

---

## Phase 8 — Side bets, export, lifecycle close

- [ ] Side bet modal (triggered from leaderboard):
  - Tap player A → highlight, prompt "compare with…"
  - Tap player B → modal opens with Front/Back/Total Nassau result
  - Modal computes via `lib/scoring/nassau.ts` from current `Score` rows
- [ ] Excel export endpoint: `GET /api/games/:id/export.xlsx`
  - Sheets: Summary, Gross Scorecard, Net Scorecard, Skins (conditional)
  - Header on Summary: game name, date, course, format, skins type
- [ ] Export button on game detail / leaderboard
- [ ] `IN_PROGRESS → COMPLETE` transition button (any authed user; locks scoring)
- [ ] Admin-only "reopen" button on `COMPLETE` games (flips back to `IN_PROGRESS`)

**Done when:** a completed game can be locked, exported to Excel, and any pair of players can have their Nassau computed from the leaderboard.

---

## Phase 9 — Production deploy

- [ ] Register subdomain off existing domain for the app
- [ ] Configure Resend with subdomain — add SPF + DKIM DNS records
- [ ] Configure CapRover app: domain, env vars (DATABASE_URL, BETTER_AUTH_URL, RESEND_API_KEY, ADMIN_EMAILS, etc.), HTTPS via Let's Encrypt
- [ ] Configure GHCR pull credentials in CapRover
- [ ] First deploy via GitHub Actions → GHCR → CapRover CLI
- [ ] Verify `prisma migrate deploy` runs cleanly on container start
- [ ] Verify daily DO managed MySQL backup is enabled; check retention
- [ ] Add `/api/health` endpoint; configure UptimeRobot (5-min check, email on failure)
- [ ] Smoke test: sign in as admin, create a player, create a course, create a game, transition to IN_PROGRESS, enter a few scores, view leaderboard, export Excel, transition to COMPLETE, reopen, lock again
- [ ] Document the deploy process in README

**Done when:** the production app is live at the chosen subdomain, the admin account works, and the full v1 flow can be exercised end-to-end against real infrastructure.

---

## Cross-phase principles

- **Verify dep versions via context7 before generating boilerplate** — Next 16, better-auth, Prisma, TanStack Query, Workbox all moved recently.
- **Pure functions land first, UI second.** Phase 4 produces all the math with full test coverage before Phase 5 builds the UI on top.
- **Real device testing as soon as PWA work begins.** Portless URL is the default `BETTER_AUTH_URL` from Phase 1, so phone-based testing is possible from the very first sign-in.
- **Each phase is independently demonstrable.** A phase isn't "done" if you can't show it to someone end-to-end.
- **Defer ruthlessly.** The v2 list in `decisions.md` is sacred — no scope creep into v1.
