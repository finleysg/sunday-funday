# Sunday Fun Day

Mobile-first PWA to orchestrate a weekly net golf game (8–24 players). Tracks game setup, group assignments, hole-by-hole scoring, leaderboard, side bets (Nassau), and Excel export.

See [`overview.md`](./overview.md) for the original product brief, [`decisions.md`](./decisions.md) for architectural decisions and rationale, and [`plan.md`](./plan.md) for the phased build plan.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma 7 · MySQL · better-auth (magic-link) · TanStack Query · Zustand · React Hook Form + Zod · Vitest + testcontainers · ESLint + Prettier · Workbox · Resend + react-email · CapRover on Digital Ocean.

## Local development

### Prerequisites

- Node.js ≥ 20.9 (Next.js 16 minimum; Node 24 recommended)
- pnpm ≥ 10
- Docker Desktop (for MySQL + Mailpit)
- [Portless](https://portless.dev) — recommended for real-phone PWA testing and magic-link emails

### First-time setup

```bash
# 1. Install deps
pnpm install

# 2. Copy env template and edit
cp .env.example .env
#    - DATABASE_URL is pre-filled to point at the docker-compose MySQL on port 3309
#    - Set ADMIN_EMAILS to your own email
#    - Set BETTER_AUTH_URL to your Portless tunnel URL (or http://localhost:3000 for non-PWA work)
#    - Generate BETTER_AUTH_SECRET: openssl rand -base64 32

# 3. Start MySQL + Mailpit
pnpm dev:db:up

# 4. Run migrations + generate Prisma client
pnpm db:migrate

# 5. Start the dev server
pnpm dev
```

App at `http://localhost:3000`. Mailpit UI (captured magic-link emails) at `http://localhost:8029`.

### Day-to-day commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run Next dev server with Turbopack |
| `pnpm build` | Production build (verifies standalone output) |
| `pnpm test` | Run Vitest once |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check (CI runs this) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:migrate` | Create + apply a new migration in dev |
| `pnpm db:reset` | Drop, re-migrate, run seed |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm dev:db:up` | Start MySQL + Mailpit containers |
| `pnpm dev:db:down` | Stop them |

### Portless tunnel

Magic-link emails contain a clickable URL. To test sign-in from a real phone (not just `localhost`), expose the dev server through Portless:

```bash
portless 3000 --subdomain sunday-funday
# → https://sunday-funday.portless.dev
```

Then set in `.env`:

```
BETTER_AUTH_URL="https://sunday-funday.portless.dev"
NEXT_PUBLIC_APP_URL="https://sunday-funday.portless.dev"
```

Restart `pnpm dev`. Magic links will now point at the public HTTPS URL.

### Commit conventions

Commits are validated by [commitlint](https://commitlint.js.org/) (conventional-commits) via a husky `commit-msg` hook. Format:

```
<type>(<scope>): <subject>
```

**Types** (required, errors if missing/invalid): `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `chore`, `revert`.

**Scopes** (optional, warns if outside the list): `auth`, `roster`, `courses`, `games`, `groups`, `scoring`, `score-entry`, `leaderboard`, `side-bets`, `export`, `pwa`, `ui`, `db`, `infra`, `ci`, `deps`.

Examples:

```
feat(auth): add magic-link sign-in
fix(scoring): correct stroke index distribution for plus handicaps
chore(deps): bump prisma to 7.9
```

The `pre-commit` hook also runs `lint-staged` (ESLint + Prettier on changed files), then `pnpm typecheck` and `pnpm test`. Hooks are installed automatically by `pnpm install` (via the `prepare` script).

### Service worker / PWA in dev

Disabled by default to avoid cache headaches. Enable explicitly:

```
NEXT_PUBLIC_ENABLE_SW="true"
```

## Deployment

Deploy is fully automated on push to `main`:

1. GitHub Actions builds the Docker image (multi-stage, Next 16 standalone).
2. Image is pushed to GHCR (`ghcr.io/<owner>/sunday-funday:<sha>` + `:latest`).
3. CapRover CLI is invoked with the image tag — CapRover pulls and rolls.
4. Container startup runs `prisma migrate deploy` before `next start`.

### Required GitHub repository secrets

| Secret | Purpose |
| --- | --- |
| `CAPROVER_URL` | e.g. `https://captain.your-droplet.com` |
| `CAPROVER_PASSWORD` | CapRover root password |
| `CAPROVER_APP` | The app name in CapRover |

### Required CapRover app env vars

Mirrors `.env.example`. At minimum: `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `SMTP_*`, `ADMIN_EMAILS`.

GHCR is private by default — configure CapRover to pull with a personal access token (scope: `read:packages`).

## Project layout

```
src/
  app/                 # Next.js App Router (route groups added in Phase 1+)
  components/ui/       # shadcn primitives
  lib/                 # shared utilities + scoring math (Phase 4)
  test/                # test helpers (testcontainers MySQL)
  generated/prisma/    # generated Prisma client (gitignored)
prisma/
  schema.prisma
  migrations/
compose.yml            # MySQL + Mailpit for local dev
Dockerfile             # production image
captain-definition     # CapRover deployment manifest
```

## License

Private.
