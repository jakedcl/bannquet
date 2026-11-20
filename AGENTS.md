# AGENTS.md — bannquet

Mountain weather, trip posts, peaks challenges, trips, and a map for a Northeast hiking crew (Adirondacks, Catskills, Gunks, Greens, Whites, Maine). Live at www.bannquet.com.

Parked product work (fishing redesign, map, Dependabot #55, etc.): see [docs/internal/parked.md](docs/internal/parked.md).

## Stack
- Next.js 16.3 (App Router), React 19.2, TypeScript, Tailwind CSS 4, MapLibre GL 6. Motion is CSS only.
- Neon Postgres + Drizzle ORM 0.45 (PostGIS). Self-hosted Better Auth (`better-auth` + `neon_auth` schema). Vercel Blob for photos.
- Weather is the NWS API. Fishing uses USGS Water Data. Map tiles are free (OpenFreeMap, USGS, AWS Terrarium); no paid map APIs.
- Vercel (builds on push). Local checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Layout
- `src/app/` routes incl. `peaks/`, `trips/`, `map/`, `mountain-weather/`, `conditions/`, `fishing/`, `community/`, `admin/`, `user/[username]`, `api/`.
- Peak Finder (`/peak-finder`) is public and has no database. Peaks are static files in `public/peak-finder/`, logic is `src/lib/peak-finder/`, and `scripts/peak-finder/` rebuilds the chunks. Terrain is fetched in the browser from AWS Terrain Tiles.
- `src/db/schema.ts` (Drizzle schema) and `drizzle/` (SQL migrations). `src/lib/` domain logic with `*.test.ts` beside it. `src/proxy.ts`.
- `config/weather-regions.json` (adding a spot is a data change), `config/challenges/` (peak lists), `config/packing-templates.json`.
- `API_DOCUMENTATION.md` covers weather endpoints.

## Commands
- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (tsx --test; new test files must be added to the script list), `npm run check:ui` (fails on raw colors in components), `npm run shots` (Playwright screenshots; see `docs/internal/ui-system.md`).
- `npm run db:generate` (SQL from schema). Do **not** run `npm run db:migrate` on production; see `docs/environments.md`.

## UI
- Design values live in `src/app/styles/tokens.css`; shared looks in `components.css`. Use `Button`, `Card`, `Notice`, `Tag`, `PageHero` and friends from `src/components/hub`, never raw hex, `retro-*` or arbitrary color classes (`npm run check:ui` enforces it). Where to change what: `docs/internal/ui-system.md`.
- No bottom tab bar; one menu (`MENU_SECTIONS` in `src/lib/sections.ts`) reaches every page. Back goes up one level (`pageTrail`).
- No competition between members: no leaderboards, rankings or counts that compare people.

## Gotchas
- **Git commits:** do not add `Co-authored-by` trailers. In cloud agent VMs, run `git config --local core.hooksPath .git/hooks` before committing so Cursor’s managed hooks do not append co-authors.
- `DATABASE_URL` is the pooled Neon URL (`-pooler`); `DATABASE_URL_UNPOOLED` is the direct one.
- **Read `docs/environments.md` before any DB, auth or preview work.** In short: Vercel previews and local dev use the Neon `preview` branch (its own data and auth rows in `neon_auth`), and only production uses `main`. Migrations from 0010 on are applied by hand with `IF NOT EXISTS` SQL. Cloud agents write the SQL file but don't apply it. Test with the standing `bqtester` account on preview only. Blob is still shared with live.
- New sign-ups can read but can't post until approved on `/admin`; invite links skip that. `ADMIN_EMAIL` (comma-separated) are admins.
- **Edits and deletes:** the author or an admin. Show controls with `canEditOwned`/`canDeleteOwned`; enforce in SQL with `(admin or <owner column> = actor id)`. An edit never changes the owner column. Admins don't edit other people's accounts or settings.
- Old links redirect in `next.config.ts`: `/trips` and `/trip-reports` to `/posts`, `/trips/new` to `/upload?kind=post`, `/weather` to `/mountain-weather`, `/hikers/<u>` to `/user/<u>`, `/routes` and `/pins` to `/map`. Keep those redirects.
- Weather pages must work with no keys.
- **Route privacy:** a route with `hide_ends` loses its first and last ~400 m for everyone but its owner. Any query that sends route geometry to a page must go through `routeCutSql`/`shownLineSql` in `src/lib/route-privacy-sql.ts`, never `t.line` directly.
- **Images:** Bannquet does not use Vercel Image Optimization (`next/image` with `unoptimized` on Blob and NWS URLs). Uploads get a browser-made ~480px JPEG thumb in Blob (`photos.thumb_url`); small UI uses that thumb. Legacy photos without `thumb_url` still fall back to Vercel resizing.
