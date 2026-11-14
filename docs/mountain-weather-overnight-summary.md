# Mountain weather overnight summary

Branch: `lurk/site-overhaul-01d6` · PR [#54](https://github.com/jakedcl/bannquet/pull/54)

## Commits (newest first)

| Hash | What it shows |
|------|----------------|
| `25f069a` | Cosmetic: no “(new)” labels, state **Places by section** (one card), hide empty snow blocks, overflow tweaks, docs |
| `26d3862` | **M16:** `/mountain-weather/conditions` + **Live ticker** from `readNwsStationLatest` (M10 bindings, station + age); state/section place lines from `readNwsGridBaseline`; retired `REGION_WEATHER_SECTIONS` |
| `b96863f` | **M15 fix:** Compass clock-as-UTC timestamps; TMDD tenths-°C ESS fields; HTTP 500 called out |
| `f23def5` | **M15:** Ground & access (DEC/WFAS links, USDM drought, Compass ESS, AirNow stub) |
| `543364d` | **M14 fix:** USNO `dst=true`, EDT/EST per day |
| `9682c4b` | **M14:** Sun & moon (USNO RSTT) |
| `2a54974` | Maps fixes: SPC PNGs, alert polygons |
| `7b550f0` | **M13:** Maps hub + place maps |
| `3982134` | **M12:** Snow measured bindings |
| `b84eb09` | Avalanche polygon bindings |
| Earlier on branch | M10–M11 observations, M6–M9 bulletins/REC/AVG, catalog GNIS, station binding audits |

## Left out (by design)

- WFAS point fire-danger ratings (links only)
- DEC trail pages (403 — links only)
- Baxter conditions parse (Google Doc)
- Compass nearest cameras (no lat/lon in C2C snapshot feed)
- Nautical/astronomical twilight (not on USNO `rstt/oneday`)
- Live AirNow without `AIRNOW_API_KEY`
- Forecast-based rows on ticker/conditions extremes (measured only)

## Unbound places (no M10 station binding)

1. `snowy-mountain` — Snowy Mountain, NY  
2. `blue-mountain` — Blue Mountain, NY  
3. `pillsbury-mountain` — Pillsbury Mountain, NY  

(87 other catalog places have at least one visible binding.)

## Stations often silent or sparse

- **NWS mesonet** summit IDs (e.g. **A4090** Whiteface, other `A4xxx`) — can go missing between maintenance cycles; UI shows last error or empty fields.  
- **KSLK** — bound as valley ASOS for many Adirondack peaks; summit temps come from mesonet or REC, not KSLK.  
- **KMWN** — when MWOBS feed hiccups, Washington summit obs may stale quickly.  
- **MMNV1** — Mansfield mesonet; tied into pack, can disagree with catalog elevation metadata.

## Waiting on Jake

See [mountain-weather-final-pass.md](./mountain-weather-final-pass.md). Highlights:

- **`AIRNOW_API_KEY`**  
- **M17**  
- Migrations **0028** (preview), **0024–0028** (prod)  
- **Merge PR #54**

## Preview URLs (Vercel)

After the latest push, open the branch preview (exact host may vary):

- Hub: `/mountain-weather`  
- Conditions: `/mountain-weather/conditions`  
- Legacy redirect: `/conditions`  
- State (NY): `/mountain-weather/new-york`  
- Section: `/mountain-weather/new-york/adirondack-high-peaks`  
- Place: `/mountain-weather/new-york/adirondack-high-peaks/mount-marcy`  
- Snow hub: `/mountain-weather/snow`  
- Avalanche hub: `/mountain-weather/snow/avalanche`  
- Maps hub: `/mountain-weather/maps`  
- VT Compass sample: `/mountain-weather/vermont/central-greens/mount-ellen`  
- NH ticker extremes: home + `/mountain-weather/conditions`

Full preview base (typical): `https://bannquet-git-lurk-site-overhaul-01d6-jakedcl.vercel.app` — confirm in the Vercel deployment for this branch.