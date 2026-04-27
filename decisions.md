# Sunday Fun Day — Design Decisions

Locked-in decisions from the v1 design grilling. Source of truth for "why is it built this way."

## Audience & tenancy

- **Single-tenant.** One friend group, one shared roster. No org/team entity, no per-tenant data isolation.

## Identity & authentication

- **Magic-link auth via better-auth.** Email-based, no passwords.
- **Invite-only roster.** Admin (you, identified by `ADMIN_EMAILS` env var) creates `Player` rows with name + email. Magic-link requests for unknown emails are silently rejected.
- **Players are linked to better-auth `user` rows by email** on first successful sign-in.
- **Any group member can edit their group's scores** — no designated scorekeeper. Trust the group socially; engineer LWW.

## Stack

- **Next.js 16** (App Router) · TypeScript · Tailwind · shadcn/ui
- **Prisma + MySQL** (DO managed)
- **better-auth** (magic-link plugin, Prisma adapter)
- **Resend** (transactional email) + **react-email** (templates)
- **TanStack Query** (server state) + **Zustand** (client UI state)
- **React Hook Form + Zod** (forms/validation)
- **Vitest + testcontainers** (tests)
- **ESLint + Prettier**
- **embla-carousel-react** (swipe between holes, via shadcn `Carousel`)
- **exceljs** (Excel export)
- **Workbox** (service worker, background sync)
- All deps pinned to most recent stable at install time. Verify version-specific syntax via context7 before generating boilerplate.

## Hosting & deploy

- **CapRover** on existing DO Droplet (handles nginx, TLS via Let's Encrypt, container swaps).
- **GitHub Actions** builds Docker image → pushes to **GHCR** → calls CapRover CLI to deploy.
- **`captain-definition`** in repo root pointing to Dockerfile.
- **Container startup runs `prisma migrate deploy` before `next start`** (single replica, no race).
- **Environment variables** managed in CapRover dashboard. `.env.example` documents required vars.
- **DB:** DO managed MySQL. Daily backups built in (verify retention in DO dashboard).
- **Health check:** `/api/health` endpoint, monitored by UptimeRobot (free tier).

## Local development

- **Docker Compose** with project name `sunday-funday` for namespace isolation.
- Non-default host ports to avoid collisions with other projects on the machine:
  - MySQL: `3309 → 3306`
  - Mailpit SMTP: `1029 → 1025`
  - Mailpit UI: `8029 → 8025`
- **Mailpit** for local SMTP capture (magic-link emails appear in browser inbox).
- **Portless** (Vercel) for public HTTPS tunnel:
  - `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` point to the Portless URL
  - Enables real-phone PWA / "Add to Home Screen" / magic-link testing
- **`prisma/seed.ts`** seeds: a few players, two courses with tees, sample games in each status. `pnpm db:reset` = `prisma migrate reset --force` + seed.
- **Service worker disabled in dev by default**; enable via `NEXT_PUBLIC_ENABLE_SW=true`.

## Project structure

- **App Router** with route groups:
  - `app/(auth)/sign-in/...` — auth (no app shell)
  - `app/(app)/...` — main app
    - `games/`, `games/[id]/`, `games/[id]/groups/[groupId]/score/`, `games/[id]/leaderboard/`
    - `roster/` (admin), `courses/` (admin)
  - `app/api/games/[id]/export.xlsx/route.ts`
- **Server Components by default**; `"use client"` only for score entry, leaderboard polling, group builder, side-bet modal.
- **Admin gating** via middleware on `isAdmin` flag derived from `ADMIN_EMAILS`.

## Domain model

### Course / tee

- `Course` — id, name
- `CourseHole` — (courseId, holeNumber 1–18, par) — par is course-level
- `Tee` — id, courseId, name, rating, slope
- `TeeHole` — (teeId, holeNumber 1–18, strokeIndex) — SI is tee-level (varies between forward/back tees)
- 18 holes only for v1. No yardage stored.

### Player

- `Player` — id, name, email (unique), active, linked 1:1 to better-auth `user` by email
- No defaults stored on `Player`; tee defaults derived from most recent `GameEntry` at the same course

### Game

- `Game` — id, name, date, courseId, format (`STROKE | STABLEFORD | CHICAGO_39`), skinsType (`NONE | NET | HALF_SHOT`), status (`SETUP | IN_PROGRESS | COMPLETE`)
- `GameEntry` — (gameId, playerId, teeId, courseHandicap), unique on (gameId, playerId)
- `Group` — id, gameId, name (e.g. "Group 1"). No starting hole (no shotgun support).
- `GroupMember` — (groupId, gameEntryId), unique on gameEntryId
- Group size: range 1–5, soft warning above 5, no hard block

### Score

- `Score` — id, gameEntryId, holeNumber (1–18), strokes (int, nullable), enteredByUserId, enteredAt, updatedAt
- Unique index on (gameEntryId, holeNumber)
- Pre-created (all 18 rows per `GameEntry`) when game moves to `IN_PROGRESS`
- `strokes IS NULL` = not yet entered

## Game lifecycle

- `SETUP` → roster/groups editable, scores not enterable
- `IN_PROGRESS` → scores enterable, roster locked
- `COMPLETE` → scores locked
- **Admins can reopen** a `COMPLETE` game (flips back to `IN_PROGRESS`); regular players cannot.

## Course administration

- **Admins only** can create/edit courses.
- **Manual multi-step form**: course basics (name + 18 pars) → first tee (name, rating, slope, 18 SIs with permutation validation) → additional tees.
- **Bulk import via `.xlsx`**:
  - Single course per workbook
  - Downloadable template
  - Validation surfaces all errors at once
  - Hard error on name conflict (no merge, no overwrite)
- **Soft-immutable once used**: courses/tees that have been part of a `COMPLETE` game cannot be edited. Escape hatch: create a new tee, deactivate old one.

## Scoring math

### Pure functions (TDD)

- `strokesOnHole(courseHandicap, strokeIndex) → int`
  - Used for main game formats (Stroke / Stableford / Chicago 39) and Half-shot Skins
  - Formula: 1 stroke on holes where SI ≤ H mod 18, plus floor(H/18) on every hole
  - Supports plus handicaps (negative H) — same formula
- `matchPlayStrokesOnHole(higherHcp, lowerHcp, higherPlayerSI) → int`
  - Used for Nassau side bets only
  - Lower hcp plays scratch; higher hcp receives the difference, distributed using their own tee's SI

### Format definitions

- **Stroke (net):** sum of (gross − strokesOnHole). Lowest wins.
- **Stableford (net):** standard 4/3/2/1/0 scale (eagle/birdie/par/bogey/double+) computed on net score. Highest wins.
- **Chicago 39:** quota = 39 − courseHandicap. Hole points (gross-based): bogey 1, par 2, birdie 4, eagle 8, double-eagle 16. Round score = sum − quota. Highest wins.
- **Net skins:** lowest unique net per hole wins. Ties → skin is dead (no carryover).
- **Half-shot Skins:** like net skins, but a gross birdie/eagle beats a net birdie/eagle of equal net value. Tied gross birdies/eagles still tie (skin dead).
- **Nassau (side bet):** three matches (Front 9, Back 9, Total 18). Net match-play. No presses. Computed on-demand from `Score` table; not persisted.

### Allowances

- **None.** Players enter the course handicap they want to play off; system uses it as-is for every format.

## Leaderboard

- **Single screen** — primary format on top, skins section stacked below (when skins enabled).
- **Format-specific row contents:**
  - Stroke: rank, name, net total, thru
  - Stableford: rank, name, points, thru
  - Chicago: rank, name, points-vs-quota, thru
  - Skins section: name, skins won
- **Current user's row highlighted.**
- **Sort by current total**; "thru" displayed prominently. No projection math.
- **15-second polling** while screen is visible (`document.hidden` pauses); pull-to-refresh as escape hatch.
- **Side bet flow:** tap player → "compare with…" → tap second player → modal showing Front/Back/Total result.

## Score entry UX

- **Per-hole layout** (one hole at a time, all group members listed vertically).
- **Steppers** (`−` / strokes / `+`) starting at par; tapping the displayed number opens numeric keyboard for direct entry.
- **No par-relative chips.**
- **Auto-advance** to next hole when all group members have entered a score, with undo toast.
- **Stroke-receiving indicator** (small dot) on holes where the player gets a stroke.
- **Sub-2× par warning** (non-blocking) for likely fat-fingers.
- **Default landing hole**: first hole with at least one missing score, or hole 1 if blank.
- **Group-scoped screen**: all members on one page; any member can edit.

## Discovery & navigation

- **Home:** auto-redirect to today's `IN_PROGRESS` game if exactly one exists; otherwise list of games.
- **Group:** auto-detect the user's group within a game; "switch group" exposes others (read-only when viewing a group you're not in).
- **History:** all signed-in users see all games. No separate "history" page — the games list is history.
- **Bulk add players** at game setup: "add players from last game" copies the prior roster with their tees pre-filled.

## Offline / PWA

- **Installable PWA** (manifest, 192/512 icons generated from a single source PNG).
- **App name:** "Sunday Fun Day" / short: "SunFunDay" / theme color `#0f5132` (placeholder).
- **No iOS splash images** for v1 (deferred).
- **No push notifications** for v1.
- **Workbox `BackgroundSyncPlugin`** queues failed score-write requests in IndexedDB; replays on reconnect.
- **iOS fallback** (background sync unsupported on iOS Safari): pending-count indicator + manual "sync now" button.
- **LWW** for concurrent writes (no version checks, no conflict UI).

## Excel export

- **Endpoint:** `GET /api/games/:id/export.xlsx`
- **Library:** `exceljs` (server-side).
- **Sheets:**
  1. **Summary** — game info header (name, date, course, format, skins type) + final standings
  2. **Gross Scorecard** — players × 18 holes, gross strokes
  3. **Net Scorecard** — players × 18 holes, net strokes
  4. **Skins** (conditional) — hole-by-hole winners + per-player totals
- **Available** any time after game enters `IN_PROGRESS` (partial rounds export with empty cells).

## Email

- **Provider:** Resend (free tier, 3k emails/month).
- **Sender:** subdomain off existing domain with SPF + DKIM configured via Resend DNS records.
- **Templates:** react-email components, rendered server-side via `@react-email/render`.

## Testing

- **Heavy unit-test coverage on scoring math** — every format and side bet, table-driven `(input → expected)` cases. No DB.
- **Light integration tests** — one happy-path per important API route, against real MySQL via testcontainers.
- **Skip Playwright e2e** for v1.
- **Vitest** as runner.

## CI

- **GitHub Actions** on PRs and `main`: `lint → typecheck → test → build`.
- **Solo developer**: single `main` branch, no `develop`. Branch protection limited to "require CI green" (no PR templates, no code owners).

## Out of scope

- 9-hole courses
- Multiple primary formats per game
- Match-play presses
- Push notifications
- Per-game allowance % override
- Money / payouts on skins
- Read-only full scorecard view alongside per-hole
- Stroke-rating-driven course handicap calculation
- Sentry / error monitoring (CapRover logs sufficient for v1)
- Analytics
