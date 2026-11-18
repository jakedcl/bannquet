# Bannquet

[Bannquet](https://www.bannquet.com) is a Northeast hiking crew site: mountain weather for summits and trails, a shared trail map, fishing conditions, peak challenges, photos, posts, and chat.

![Bannquet homepage](docs/screenshot.png)

## Features

- **Home / map** (`/` and `/map`) — MapLibre map of crew **pins** and **GPX routes** (OpenFreeMap labels, USGS topo/satellite, AWS Terrarium terrain; no paid tile APIs). `/routes` and `/pins` redirect here.
- **Mountain weather** (`/mountain-weather`) — **90 catalog peaks and trailheads** in NY, VT, NH, and ME, each tied to an NWS forecast office (Burlington/BTV, Albany/ALY, Gray/GYX, or Caribou/CAR). Place pages pull hourly and daily NWS grid forecasts, station observations, area discussions, hazardous weather outlooks, summit (REC) and avalanche (AVG) text, snow graphics and measured depth tables, alert polygons, and regional radar/GOES layers. Attribution stays on-page.
  - **Ingested on place pages:** NWS API products, Iowa Environmental Mesonet local storm reports (nearby snow), NOAA/USGS drought monitor by county, NE Compass road weather (ESS XML), and—when `AIRNOW_API_KEY` is set—AirNow `/aq/data/` for regional PM2.5 and ozone.
  - **Links only (not parsed in-app):** NY DEC and other land-manager pages, WFAS/DEC fire-danger maps, state 511 pages, Baxter’s Google Doc conditions, and the long “more sources” link lists (CoCoRaHS, office product pages, etc.).
- **Conditions board** (`/mountain-weather/conditions`; `/conditions` redirects) — measured extremes from bound NWS stations plus short forecast lines per catalog place. The homepage ticker links here (`config/weather-regions.json` for station bindings).
- **Peak Finder** (`/peak-finder`) — browser-based summit skyline tool (static peak data; terrain in the client).
- **Peaks** (`/peaks`) — challenge lists (Adirondack 46, Catskill 35, NH 48, VT/ME 4000-footers, and related combos in `config/challenges/`).
- **Posts & uploads** — `/posts` is the trip-report style feed. Approved members use `/upload` to add a **post** (optional links to pins, routes, or photos), upload a **route** (GPX), drop a **pin** on the map, or add a **photo** (Vercel Blob). Legacy `/trips` URLs redirect to `/posts`.
- **Photos** (`/photos`) — gallery of uploaded images.
- **Fishing** (`/fishing`) — saltwater tides and marine conditions, USGS freshwater flows, stocking calendars, and guides.
- **Community** (`/community`, `/chat`, `/members`) — hub previews, one group chat, and the members directory (no separate gear list).

Weather and fishing boards work without API keys. Member content needs Neon Postgres and Vercel Blob for uploads.

API notes for the original region weather endpoints: `API_DOCUMENTATION.md`.

## Stack

- **App:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion
- **Data:** Neon Postgres, Drizzle ORM (PostGIS), self-hosted [Better Auth](https://www.better-auth.com/) with the Drizzle adapter (`neon_auth` schema)
- **Hosting:** Vercel (builds on push), Vercel Blob for photos
- **Maps:** MapLibre GL

## Run locally

Node.js 20+.

```sh
npm install
cp .env.example .env.local   # fill DATABASE_URL etc. for full features
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (the map).

`DATABASE_URL` should be the pooled Neon URL (`-pooler` host). Use `DATABASE_URL_UNPOOLED` for Drizzle migrations. Preview and local dev target the Neon `preview` branch; production uses `main`. See `docs/environments.md` before changing schema or auth.

New sign-ups can read the site; posting requires admin approval on `/admin` (invite links skip the wait). `ADMIN_EMAIL` lists admins.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (tsx) |
| `npm run db:generate` | SQL from `src/db/schema.ts` |

Do not run `npm run db:migrate` against production `main`; migrations from 0010 onward are applied manually per `docs/environments.md`.

## License

See [LICENSE](LICENSE).