# How it works

Bannquet is a Next.js app with two halves: live mountain weather pulled from the National Weather Service, and community trip reports stored in Sanity. There is no database of its own and no user accounts. This page covers the parts that take a minute to work out from the code. Paths are relative to the repo root.

## Weather

Everything comes from `api.weather.gov`, which needs no key but does want a User-Agent (set in `src/lib/weather.ts`).

- **Places.** `src/lib/regions.ts` is the config. It lists the four regions (NY, VT, NH, ME), the spots in each one (summits, notches, crags, parks, each with lat/lon) and a Mapbox map config per region. The chosen region is kept in React context and saved in `localStorage` (`RegionContext.tsx`).
- **Per-spot detail** (`/weather`). `WeatherDashboard.tsx` calls `getWeather` from the browser. It asks NWS `points/{lat},{lon}` for the grid location, then in parallel fetches the hourly forecast, the daily forecast, the raw gridpoint data (wind chill, snow level, visibility and so on) and active alerts for that point. The daily high/low is built by pairing each day period with its night period.
- **The ticker** (`WeatherTicker.tsx`, `src/app/api/weather/extremes/route.ts`). The ticker asks `/api/weather/extremes` every 5 minutes. The route takes all spots, sorts summits first, keeps only the first 12 to stay inside serverless time limits, and fetches them in batches of 4 with a 4.5 second timeout each. It then picks the highest wind, highest and lowest temperature, lowest wind chill and anywhere that is snowing. Spots that fail are dropped and counted. If every spot fails it returns a 200 with `success: false` so the ticker can show an error instead of hanging. Responses are cached with `s-maxage=300`.

## Trip reports

Trip reports are `tripReport` documents in Sanity (schemas in `src/schemas/`, also used by the embedded Studio at `/studio`). The public site only ever lists documents where `published == true`.

Submitting is a draft-then-confirm flow with no login, using emailed tokens:

1. `TripSubmitForm.tsx` compresses any image over 4 MB in the browser, then uploads it to `/api/trip-reports/upload`, which checks it is an image under 4 MB and stores it as a Sanity asset.
2. The form posts to `/api/trip-reports/submit`. It validates the fields and an optional author whitelist, and creates the report with `published: false`. It also creates a `tripReportVerification` document holding the author's email and two random 32-byte tokens, one to publish and one to edit.
3. Resend emails the author a publish link and an edit link. If `RESEND_API_KEY` isn't set, the links are logged to the server console instead, and in development they are also returned in the response.
4. The publish link hits `/api/trip-reports/verify`. It finds the verification document by token and report id, sets `published: true`, then deletes the verification document.
5. The edit link opens `/trip-reports/edit`, which loads the report through `/api/trip-reports/edit` and saves changes with a `PUT`. Both calls look up the verification document by edit token.

Reads go through the Sanity CDN client, writes through a separate client that needs `SANITY_API_TOKEN` (`src/lib/sanity.ts`). If the project id or token is missing, the routes return 503 rather than crashing.

## Environment variables

Names only.

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION` | Sanity project (API version is optional) |
| `SANITY_API_TOKEN` | Server-side writes and image uploads |
| `RESEND_API_KEY`, `EMAIL_FROM` | Emailing the publish and edit links |
| `NEXT_PUBLIC_APP_URL` | Base URL used in those links |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Location picker on the submit form |
| `ALLOWED_AUTHORS` | Optional comma-separated list of author names allowed to submit |

## Limits worth knowing

These are things the code does today, not things it is meant to do.

- **The edit link stops working after publishing.** Both tokens live in one verification document, and `verify` deletes the whole document. A comment there says the edit token is kept, but it isn't, so the edit routes return 403 once the publish link has been used.
- **The "24 hours" isn't enforced.** The email says the publish link expires in 24 hours, but `submit` stores an expiry a year out and `verify` only compares against that stored value.
- **Ticker gusts are just wind speed.** The extremes route uses the hourly wind speed for both speed and gust, so "highest wind" is the sustained figure.
- **The ticker covers 12 spots**, not every spot on the map.
- **`ALLOWED_AUTHORS` matches on a name string** the submitter types, so it is a light filter and not authentication.
