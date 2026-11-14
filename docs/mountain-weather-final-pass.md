# Mountain weather — Jake follow-ups

Mountain weather M1–M16 and cosmetic pass are on `lurk/site-overhaul-01d6`. This file lists **only open decisions** for Jake.

## Open for Jake

- **`AIRNOW_API_KEY`:** Ground section is link-only until a key is set in Vercel env.
- **Station bindings (3 unbound NY places):** `snowy-mountain`, `blue-mountain`, `pillsbury-mountain` — no M10 observation binding yet.
- **DB migrations:** Apply **0028** on **preview**; on **prod** apply **0024–0028** manually per `docs/environments.md` (not part of weather branch merge).
- **Merge:** Review PR #54 and merge when satisfied.
- **M17:** Next planned milestone (post-cosmetic).

## Done (for reference)

- Bald Mountain (VT) GNIS / ALY coords aligned.
- `mtn-points.xml` office vs CWA documented in AGENTS-style bindings (e.g. Lyon Mountain BTV XML under KALY cwa).
- Northeast Kingdom, Monadnock Region, Northern Maine section titles (removed “(new)”).
- Compass ESS timestamps (clock-as-UTC) and TMDD tenths-°C decoding.
- Conditions + ticker use cached `readNwsStationLatest` + `readNwsGridBaseline`; `REGION_WEATHER_SECTIONS` removed.