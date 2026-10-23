# AGENTS.md — bannquet

Mountain weather, trip posts, peaks challenges, trips, and a map for a Northeast hiking crew (Adirondacks, Catskills, Gunks, Greens, Whites, Maine). Live at www.bannquet.com.

## Stack
- Next.js 16.3 (App Router), React 19.2, TypeScript, Tailwind CSS 4, Framer Motion, MapLibre GL 6.
- Neon Postgres + Drizzle ORM 0.45 (PostGIS). Neon Auth (`@neondatabase/auth` beta). Vercel Blob for photos.
- Weather is the NWS API. Fishing uses USGS Water Data. Map tiles are free (OpenFreeMap, USGS, AWS Terrarium); no paid map APIs.
- Vercel. CI (`.github/workflows/ci.yml`) runs `npm ci`, lint, typecheck, test, build.
- Sanity is no longer read by the site. It's only the source for the one-off trip-report import.

## Layout
- `src/app/` routes incl. `posts/`, `peaks/`, `trips/`, `map/`, `weather/`, `conditions/`, `fishing/`, `community/`, `admin/`, `user/[username]`, `api/`.
- `src/db/schema.ts` (Drizzle schema) and `drizzle/` (SQL migrations). `src/lib/` domain logic with `*.test.ts` beside it. `src/proxy.ts`.
- `config/weather-regions.json` (adding a spot is a data change), `config/challenges/` (peak lists), `config/packing-templates.json`.
- `scripts/migrate-sanity-trip-reports.ts`. `API_DOCUMENTATION.md` covers weather endpoints.

## Commands
- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (tsx --test; new test files must be added to the script list).
- `npm run db:generate` (SQL from schema). Do **not** run `npm run db:migrate` on production; see `docs/environments.md`.

## Gotchas
- `DATABASE_URL` is the pooled Neon URL (`-pooler`); `DATABASE_URL_UNPOOLED` is the direct one.
- **Read `docs/environments.md` before any DB, auth or preview work.** In short: Vercel previews use the Neon `preview` branch (its own data and Neon Auth), and production uses `main`. Migrations from 0010 on are applied by hand with `IF NOT EXISTS` SQL. Cloud agents write the SQL file but don't apply it. Test with the standing `bqtester` account on preview only. Blob and Sanity are still shared with live.
- Sanity import writes only with `CONFIRM_SANITY_MIGRATION=yes`. Always `--dry-run` first, against a branch.
- New sign-ups can read but can't post until approved on `/admin`; invite links skip that. `ADMIN_EMAIL` (comma-separated) are admins.
- Old `/trip-reports/<id>` links redirect to `/posts/<id>`; `/hikers/<u>` redirects to `/user/<u>`. Keep those redirects.
- Weather pages must work with no keys. The live-map socket server is a separate repo, `jakedcl/bannquet-io`.
- **Images:** Bannquet does not use Vercel Image Optimization (`next/image` with `unoptimized` on Blob and NWS URLs). Uploads get a browser-made ~480px JPEG thumb in Blob (`photos.thumb_url`); small UI uses that thumb. Legacy photos without `thumb_url` still fall back to Vercel resizing.
