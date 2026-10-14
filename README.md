# Bannquet

Mountain weather and trip reports for the Northeast. Bannquet pulls National Weather Service forecasts for summits and valleys across the Adirondacks, Catskills, Shawangunks, Green Mountains, White Mountains and Maine, and keeps published trip reports for the crew.

Live at [bannquet.com](https://www.bannquet.com).

![Bannquet homepage](docs/screenshot.png)

## What it does

- Hourly and daily forecasts, wind, precipitation and alerts for each mountain. Regions live in `config/weather-regions.json`, so adding a spot is a data change.
- A ticker at the top of the homepage showing the current extremes across those regions.
- Published trip reports read from Postgres. The old Sanity editor and email-link flow are gone. New reports will be in-site forms in a later phase.

More detail on the weather endpoints is in `API_DOCUMENTATION.md`.

## Stack

Next.js 16.3, React 19.2, TypeScript, Tailwind CSS 4, Framer Motion, Drizzle ORM, and Neon Postgres. Weather comes from the NWS API. Deployed on Vercel.

## Running it locally

You need Node.js 20 or newer.

```sh
npm install
npm run dev
```

Then open http://localhost:3000. Copy `.env.example` to `.env.local`.

Weather pages work with no keys. Trip reports stay empty until `DATABASE_URL` points at a Postgres database and the schema has been migrated. Reading the site stays public. Sign-in is invite-only: Jake texts a link from `/admin`, and that email chooses a password. After that they sign in with email and password. `ADMIN_EMAIL` is the address that can sign in without an invite. Sessions last a week and refresh when someone comes back, which is as long as Neon Auth keeps them.

## Database

`DATABASE_URL` is the pooled Neon connection (the host contains `-pooler`). `DATABASE_URL_UNPOOLED` is the direct connection Drizzle uses for migrations.

```sh
npm run db:generate   # write a new SQL migration from src/db/schema.ts
npm run db:migrate    # apply drizzle/ to DATABASE_URL_UNPOOLED
```

Run migrations against a Neon branch before production. The first migration enables PostGIS.

### Sanity import

`scripts/migrate-sanity-trip-reports.ts` copies existing `tripReport` documents into `trip_reports`, `photos`, and `pins`. It is not part of the site build, and it will not write unless you opt in.

```sh
npm run db:migrate-sanity -- --dry-run
CONFIRM_SANITY_MIGRATION=yes npm run db:migrate-sanity
```

The dry run only talks to Sanity. The real run needs `SANITY_PROJECT_ID`, `SANITY_API_TOKEN`, and `DATABASE_URL`. Set `BLOB_READ_WRITE_TOKEN` if images should be copied into Vercel Blob. Without it, photo rows keep the Sanity CDN URL.

Old `/trip-reports/<sanity-id>` links redirect to the new id after a report is imported.

## Scripts

- `npm run dev` starts the dev server
- `npm run build` builds for production
- `npm run start` serves the production build
- `npm run lint` runs ESLint
- `npm run typecheck` runs TypeScript
- `npm test` runs the small node tests

The live-conditions socket server for the user map is a separate project, [bannquet-io](https://github.com/jakedcl/bannquet-io).
