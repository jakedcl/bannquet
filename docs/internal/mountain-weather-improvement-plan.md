# Mountain weather improvement plan

Status: proposed, 2026-11-16. Scope: public routes under `/mountain-weather/**` only. This is a planning PR; it changes no runtime behavior.

## Goal

A visitor choosing a Northeast hike should find the relevant forecast immediately, understand when a number is a forecast versus a measurement, and know how local and current each supporting report is. Preserve Bannquet's existing visual identity and source depth.

## Evidence and limits

This plan consolidates two live-site review passes with a check of current `main` on November 16. The earlier review verified that overnight lows, search, Conditions loading, map fallback, and state/section reading order improved after the first fixes. The second pass observed the issues below on desktop, including six broken WPC graphics on the Snow hub and sampled peak pages. Those images and upstream feeds change with time, so reproduce the failure before choosing a URL fix. The code inspection confirms the page order, station metadata gap in Conditions, office-wide LSR selection, and Marcy data on the Snow hub. Mobile and every catalog peak have not been audited.

`docs/mountain-weather-final-pass.md` and `docs/mountain-weather-overnight-summary.md` describe the earlier M1–M16 rollout and historical merge/migration decisions. Do not treat their old PR #54, branch, preview URL, or migration instructions as tasks for this plan.

## Priority 1 — Make peak pages answer the forecast question first

**Observed:** On Mount Washington, a visitor scrolls past bulletins, avalanche, snow, maps, sun/moon, access, and freezing-level material before reaching the mountain and basic forecasts. In `src/app/mountain-weather/[state]/[section]/[place]/page.tsx`, `BasicForecastSection` is last among the weather sections, and its default state is collapsed. `MountainForecastSection` is also far down.

**Change:**

- Put a compact, visible forecast summary directly below the place title, elevation, and active hazard notices. Show the next useful forecast periods, temperature, sustained wind/gusts, precipitation, and the forecast's source, valid time, and point/grid elevation where available. Clearly say that an NWS grid value is a forecast, not a summit measurement.
- Follow with the relevant mountain-specific forecast (when issued) and an expanded path into hourly/daily NWS details. Do not render a blank or stale specialized product as the leading answer; fall back to the basic NWS forecast with its limitations stated.
- Put current summit/nearby observations after the forecast, with their existing distance/elevation/time context. Keep urgent hazard and avalanche status visible near the top when applicable, while moving the full bulletin, snow, maps, sky, and access sections lower. Avoid presenting an expired/off-season avalanche product as a current danger rating.
- Use one consistent section order for all places. Keep detailed source text and specialist tables reachable; avoid a full redesign or source-data rewrite.

**Acceptance:** On Marcy and Washington at desktop and phone widths, a visitor sees a useful dated forecast without opening a disclosure or scrolling through maps. A weather alert and active avalanche guidance remain easy to notice. Missing mountain-specific guidance yields a labeled basic forecast, not an empty lead card. Forecast and measured readings cannot be mistaken for each other.

Likely files: peak `page.tsx`, `BasicForecastSection.tsx`, `MountainForecastSection.tsx`, `WeatherHazardsHeader.tsx`, shared layout/summary component if useful.

## Priority 2 — Tell the truth about Conditions stations

**Observed:** `/mountain-weather/conditions` can show the same KSLK reading against multiple Adirondack peaks. `SpotsTable` displays a peak name, station ID, age, and measurements but no station kind, distance, or elevation gap. The detailed `ObservationsSection` already has placement metadata that can guide this work.

**Change:**

- Carry station name, kind (summit, nearby higher, valley/base), distance, station elevation, and difference from the catalog place through `measured-conditions.ts` → `weather-extremes.ts` → `SpotsTable.tsx`, using the existing station binding rather than deriving labels from the ID.
- Show a concise row label such as “KSLK · nearby valley station · 13 mi · 3,000 ft lower” and age. If metadata is unknown, say so. At narrow widths, preserve the distinction before the user must scroll sideways.
- In the “extremes” summary, attribute the reading to the station and the associated place without implying that a valley reading is the summit extreme. Consider grouping by unique station for the extrema calculation so a reused station does not count as multiple independent readings.
- Keep stale/missing measurements out of current extrema; retain the existing forecast lines as forecasts.

**Acceptance:** Marcy and Ampersand rows that share KSLK visibly identify one valley station and each place's own distance/elevation gap. A user can tell what was measured, where, and when. Sorting and filters still work on desktop and phone.

Likely files: `src/lib/mountain-weather/measured-conditions.ts`, `src/lib/weather-extremes.ts`, `src/components/weather/SpotsTable.tsx`, `ConditionsReport.tsx`.

## Priority 3 — Repair WPC snow graphics with a truthful fallback

**Observed:** The prior desktop pass showed six broken WPC probability images on the Snow hub and sampled peak pages. `readers/wpc-pwpf-snow.ts` constructs GIF URLs from a cycle string and “latest” suffix; `SnowSection.tsx` renders plain `img` tags without an error state. `MapRemoteImage.tsx` already demonstrates a client-side image failure fallback for another part of the site.

**Change:**

- Reproduce with the current WPC source: inspect the returned cycle and each generated URL/status/content type. Check actual WPC product naming and valid-period semantics before changing the template. WPC's public interface offers GIF images; an older PWPF page currently advertises discontinuation on November 30, 2026, so verify the supported replacement/source page rather than hard-coding another fragile page.
- Only render a graphic when its actual asset resolves. Handle server-side URL resolution failures and browser image failures with a compact “graphic unavailable” state and a working official source link. Do not display a broken image or claim a graphic is current when its cycle is old.
- Translate raw `validTimeLabel` cycle tokens into a human-readable valid window, including timezone and 24/48-hour duration. If WPC no longer offers an equivalent graphic, remove just that graphic card and keep the official product link.

**Acceptance:** All six WPC cards either load correctly and show the correct forecast window or show a clear fallback; no broken icon appears on Snow, Marcy, or Washington. Tests cover a valid cycle, a missing/changed cycle, and the unavailable asset state.

Likely files: `readers/wpc-pwpf-snow.ts`, `SnowSection.tsx`, image fallback component and focused tests. Official references: https://www.wpc.ncep.noaa.gov/pwpf/wwd_percentiles_new.php and https://www.wpc.ncep.noaa.gov/pwpf/about_pwpf_products_new.shtml.

## Priority 4 — Make snow reports genuinely local

**Observed:** Marcy's “LSR snowfall (14d, BTV)” list contained PA, MA, NH, and distant NY reports. The parser in `parse/iem-lsr.ts` limits results to Northeast states; `read-place-snow.ts` passes the entire office feed to every place with that office. `SnowSection.tsx` shows the first 25 by time, with no distance. The office parameter on the IEM request is not a promise that every returned report is local to a particular mountain.

**Change:**

- Keep office-wide fetch/caching, then select for each place using validated coordinates and a documented radius. Start with a candidate radius (for example 30 miles), inspect real samples around Marcy/Washington and rural Maine, and choose the threshold from coverage. Sort by proximity and recency in a way that does not bury a recent nearby report. Show distance, report location, amount, and time.
- Deduplicate equivalent reports by event/location/time/amount when the feed supplies different IDs for the same event. Preserve distinct reports from the same storm. Reject invalid coordinates, implausible dates, and non-snow records as appropriate.
- Rename the section “Snowfall reports near [place] (within X mi, past 14 days)” and show “No nearby reports” when empty. Keep the reporting office as source attribution rather than an implied geographic radius.
- Separate `/mountain-weather/snow` from Marcy's place data. Today `src/app/mountain-weather/snow/page.tsx` copies Marcy's PNS and LSR into the hub. Either make this explicitly a Marcy example with a link or replace it with genuinely regional, clearly labeled reports; do not call a Marcy subset a Northeast snow summary.
- Preserve the distinctions among observed station snow depth, storm reports, WPC probability, and modeled snow. A valley depth must not be presented as summit snow.

**Acceptance:** No PA/MA/NH or far NY entries appear under Marcy's nearby-report heading; displayed rows have verified distance and time. An empty local window is explained. The Snow hub accurately names the geography of every PNS/LSR list. Tests include near/far, duplicate, missing coordinates, and empty cases.

Likely files: `parse/iem-lsr.ts`, `read-place-snow.ts`, `SnowSection.tsx`, `snow/page.tsx`, `snow-types.ts`, focused tests.

## Priority 5 — Replace internal notes and clean avalanche presentation

**Observed:** The Avalanche hub prints the JSON binding rule summary (“point-in-polygon on cached ... geometry”). The Snow measured block prints the M10 rule summary. Several sections expose cache/binding terms and raw cycle strings. The prior live pass also saw a repeated hour-label row in an avalanche weather guidance table; this needs a sample and parser check before changing code.

**Change:**

- Replace visitor copy with short explanations of coverage and limitations: which center issues the guidance, whether a location is in the forecast area, what station snow represents, and when each product was issued/expires. Keep technical binding rules in config/docs rather than rendering them.
- On the Avalanche hub and per-place sections, distinguish official avalanche danger from NWS avalanche weather guidance (AVG). Show off-season/expired status clearly; keep source links.
- Capture a real duplicate-header AVG product, trace `parse/avg*.ts` and `AvgForecastSection.tsx`, and remove the duplicate only after determining whether it came from the source, parser, or display. Hide raw JSON fields or explain them in plain words if they are useful to visitors.
- Review all `/mountain-weather/**` visitor labels for “M10,” “binding,” “cache,” “point-in-polygon,” and machine cycle strings. Change copy only where the technical word does not help a visitor make a decision.

**Acceptance:** Snow, Avalanche, state/section, and sampled peak pages contain no unexplained implementation notes. Active versus off-season avalanche products are distinct. AVG time headings appear once per actual period, with a fixture demonstrating the issue if reproducible.

Likely files: `SnowSection.tsx`, `snow/avalanche/page.tsx`, `AvalancheSection.tsx`, `AvgForecastSection.tsx`, `parse/avg*.ts`, state/section components.

## Delivery order and verification

Build these as **small implementation PRs**, not one large rewrite: (1) peak forecast hierarchy, (2) Conditions provenance, (3) WPC assets, (4) local snow reports and hub geography, (5) copy/AVG cleanup. If WPC graphics are currently broken, its fix may ship before the layout change. Keep each PR reviewable and include before/after screenshots for visual changes.

For each PR, run the repo's relevant focused tests plus `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` as required by its CI. Test the preview at phone and desktop widths across Marcy, Washington, one place with no mountain-specific product, Conditions, Snow, Avalanche, and Maps. Exercise fresh, stale, missing, and off-season data; inspect links and source timestamps. After Jake merges, check the production page before calling an issue fixed. Do not merge this plan or any implementation PR without Jake's go-ahead.

## Out of scope for this plan

New weather feeds, a forecast synthesis engine, database/auth work, unrelated Bannquet pages, and the older M17/migration follow-ups. If a source cannot be verified, record the uncertainty and keep a labeled official link rather than presenting an unverified value.
