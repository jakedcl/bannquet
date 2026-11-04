# AGENTS.md — bannquet

Mountain weather, trip posts, peaks challenges, trips, and a map for a Northeast hiking crew (Adirondacks, Catskills, Gunks, Greens, Whites, Maine). Live at www.bannquet.com.

## Dev framework

This repo follows Jake's dev framework: [jakedcl/dev-framework](https://github.com/jakedcl/dev-framework) (start at its `AGENTS.md`). The framework is the source of truth; if anything in this file conflicts with it, the framework wins.

The framework repo is private. Cloud agents open it with `git clone --depth 1 https://x-access-token:${DEV_FRAMEWORK_READ_TOKEN}@github.com/jakedcl/dev-framework /tmp/dev-framework` (the token is a Cursor secret; never print or commit it).

## Stack
- Next.js 16.3 (App Router), React 19.2, TypeScript, Tailwind CSS 4, Framer Motion, MapLibre GL 6.
- Neon Postgres + Drizzle ORM 0.45 (PostGIS). Neon Auth (`@neondatabase/auth` beta). Vercel Blob for photos.
- Weather is the NWS API. Fishing uses USGS Water Data. Map tiles are free (OpenFreeMap, USGS, AWS Terrarium); no paid map APIs.
- Vercel. CI (`.github/workflows/ci.yml`) runs `npm ci`, lint, typecheck, test, build.

## Layout
- `src/app/` routes incl. `peaks/`, `trips/`, `map/`, `mountain-weather/`, `conditions/`, `fishing/`, `community/`, `admin/`, `user/[username]`, `api/`.
- `src/db/schema.ts` (Drizzle schema) and `drizzle/` (SQL migrations). `src/lib/` domain logic with `*.test.ts` beside it. `src/proxy.ts`.
- `config/weather-regions.json` (adding a spot is a data change), `config/challenges/` (peak lists), `config/packing-templates.json`.
- `API_DOCUMENTATION.md` covers weather endpoints.

## Commands
- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (tsx --test; new test files must be added to the script list).
- `npm run db:generate` (SQL from schema). Do **not** run `npm run db:migrate` on production; see `docs/environments.md`.

## Gotchas
- `DATABASE_URL` is the pooled Neon URL (`-pooler`); `DATABASE_URL_UNPOOLED` is the direct one.
- **Read `docs/environments.md` before any DB, auth or preview work.** In short: Vercel previews and local dev use the Neon `preview` branch (its own data and Neon Auth), and only production uses `main` (its Neon Auth refuses localhost). Migrations from 0010 on are applied by hand with `IF NOT EXISTS` SQL. Cloud agents write the SQL file but don't apply it. Test with the standing `bqtester` account on preview only. Blob is still shared with live.
- New sign-ups can read but can't post until approved on `/admin`; invite links skip that. `ADMIN_EMAIL` (comma-separated) are admins.
- **Edits and deletes:** the author or an admin. Show controls with `canEditOwned`/`canDeleteOwned`; enforce in SQL with `(admin or <owner column> = actor id)`. An edit never changes the owner column. Admins don't edit other people's accounts or settings.
- Old `/trip-reports` and `/posts` links redirect to `/trips` (their `new` pages to `/upload?kind=trip`), `/trips/new` to `/upload?kind=trip`, `/weather` to `/mountain-weather`, and `/hikers/<u>` to `/user/<u>`, all in `next.config.ts`. Keep those redirects.
- Weather pages must work with no keys.
- **Route privacy:** a route with `hide_ends` loses its first and last ~400 m for everyone but its owner. Any query that sends route geometry to a page must go through `routeCutSql`/`shownLineSql` in `src/lib/route-privacy-sql.ts`, never `t.line` directly.
- **Images:** Bannquet does not use Vercel Image Optimization (`next/image` with `unoptimized` on Blob and NWS URLs). Uploads get a browser-made ~480px JPEG thumb in Blob (`photos.thumb_url`); small UI uses that thumb. Legacy photos without `thumb_url` still fall back to Vercel resizing.
