# Peak Finder handoff

Live at `/peak-finder` ([bannquet.com](https://www.bannquet.com/peak-finder)). This document describes **main** as of the current Peak Finder stack: offline saves, label declutter, explore UI, and no tap-to-open peak cards.

Do not treat `prominenceDeg` on a visible peak as topographic prominence. It is only how far the summit rises above the terrain behind it along the skyline (a declutter signal, not stored chunk metadata).

## Architecture

The App Router page (`src/app/peak-finder/page.tsx`) renders `PeakFinder`. A web worker builds the skyline so the UI stays responsive. The worker posts a `SkylinePayload`: smoothed horizon, front-ridge layers, visible peaks, eye height, and `onSummit`.

| Piece | Role |
| --- | --- |
| `PeakFinder.tsx` | Modes (start, pick, explore, offline hub), GPS, compass, worker, controls, status |
| `SpotPicker.tsx` | Map pin; USGS satellite with OpenFreeMap style toggle |
| `DrawnView.tsx` / `CameraView.tsx` | Drawn skyline or phone camera with overlays |
| `SkylineStage.tsx` | Canvas ridges, labels and tick marks, gestures, centered heading readout |
| `LineUp.tsx` | Short caption during line-up mode |
| `PeakFinderBackButton.tsx` | Shared top-left Back |
| `PeakFinderOffline.tsx` / `OfflineAreaPicker.tsx` | Save and open offline areas |
| `peak-finder.worker.ts` | Tiles, rays, visibility, pack payload |
| `payload.ts` | Worker message types |
| `peaks.ts` | 2° chunk index, decode, dedupe |
| `tiles.ts` / `tile-cache.ts` | Terrarium fetch, bilinear sample, Cache API |
| `skyline.ts` | Rays, horizon, front-ridge profile |
| `visibility.ts` | Visible peaks, burial/occlusion, `onSummit` |
| `declutter.ts` | Label box geometry, legacy distance-first `declutter` (tests) |
| `label-ranking.ts` | Importance score, FOV-scaled cap, distance typography |
| `label-placement.ts` | Greedy placement by importance, markers in view |
| `line-up-offset.ts` | ±15° pitch offset on top of gyro pitch |
| `projection.ts` | Bearing and angle to pixels; vertical FOV from aspect |
| `geo.ts` | Distance, bearing, curvature, apparent elevation (`k = 0.13`) |
| `orientation.ts` / `declination.ts` / `wmm.ts` | Compass → true heading; WMM table baked in |
| `location.ts` / `storage.ts` | “You've moved”, last pin, heading/pitch calibration in `localStorage` |
| `offline.ts` / `offline-areas-idb.ts` | Offline manifest, IndexedDB area list |
| `start-screen-offline.ts` | Start screen when offline / saved areas |
| `sw-routing.ts` | Which URLs the Peak Finder service worker handles |
| `explore-gestures.ts` | `pan` vs `adjust` (line-up) gesture mode |
| `format.ts` | Feet, miles, compass labels |
| `src/lib/security-headers.ts` | Camera and motion only on `/peak-finder` |

There is **no** `PeakCard` or tap-to-open peak detail. Labels and tick marks are display-only.

## Data and chunks

`public/peak-finder/peaks/index.json` is the US catalog (`coverage: "us"`, on the order of 76k peaks). Cells are **2°**. Each chunk is `public/peak-finder/peaks/us/{id}.v1.json` (for example `n44w074.v1.json`). Rows are `[name, lng×10⁴, lat×10⁴, elevation m or null]`, so coordinates resolve to about 10 m. The worker loads every chunk within **200 km** and caches them under **`pf-peaks-v1`**.

Build dedupe (`peaks.ts`): keep all OSM peaks except same name within 200 m → higher elevation wins. GeoNames drops if any OSM peak is within 200 m, or same-name OSM within 1.5 km. Chunks do not store topographic prominence, Wikipedia, or Wikidata.

Declination: `public/peak-finder/declination.v1.json` (WMM2025, dated 2026-11-10), 1° cells.

## Terrain

AWS Terrarium PNGs (`TERRARIUM_TILES` in `src/lib/map.ts`). The worker fetches directly; decoded heights live in **`pf-terrain-v1`** (about 150 MB cap). Ring distances match `TERRAIN_RINGS` (zoom 12 → 8 km … zoom 8 → 200 km). `sampleHeight` tries preferred zoom, then finer, then coarser, with bilinear blend. Rays use 0.1° steps; missing samples become 0 m in the caster; summit snap treats missing as skip.

## Visibility and ridges

`eyeHeightM`: highest ground within 10 m plus 2 m. `raiseSummit`: highest within 130 m, `max(stored, sampled)`.

Peaks drop if closer than 30 m, farther than 200 km, or ridges bury more than the top. `summitInView` and burial logic are unchanged from v1; integration tests on Marcy and Washington still guard this.

`viewProfile` draws banded front ridges (4–15, 15–40, 40–100 km), with smoothing and filters described in `skyline.test.ts`. Hidden ridges render dashed on the canvas.

## Labels (declutter)

Client-side only; no extra downloads.

1. **Ranking** (`peakImportanceScore`): `prominenceDeg`, nearness (~30 km scale), elevation.
2. **Placement** (`placeLabels`): sort by importance; greedy overlap test on tilted label boxes (`declutter.labelCorners`); skip colliding labels at slide 0; nearest three peaks and `onSummit` name may slide up to 120 px to find a gap.
3. **Cap** (`labelCapForView`): base 40 (phone) / 80 (desktop), scaled up when `hfov` narrows (pinch zoom in).
4. **Ticks**: every in-view visible peak gets a small ridge tick; unlabeled peaks are ticks only (not tappable).
5. **Typography**: font size, weight, and opacity scale with distance; tilt ~−45° (slightly shallower when few labels).

`declutter.ts` still exposes the older distance-first `declutter` (240 px slides) for unit tests and `legacyLabelsInView` comparisons.

## Gestures and modes

| Mode | Gestures |
| --- | --- |
| Explore + gyro on | Skyline follows device; gestures off unless line-up |
| Explore + gyro off, or pick-view | One-finger pan (heading + pitch), pinch FOV |
| Line-up (`adjust`) | Overrides gyro follow: drag shifts stored offsets; pinch FOV |

`explore-gestures.ts`: line-up → `adjust`; else gyro on explore → `off`; else → `pan`.

### Orientation and line-up

Gyro path is unchanged in `orientation.ts`: magnetic heading + declination + screen angle + yaw calibration. Stored **`headingOffset`** (`pf:calibration:v1`) is added on top of the live compass heading when following.

**Gyro on explore** (`motion-enable.ts`, `orientation.ts`):

- **Gyro on** in the UI means live sensor data, not permission or session memory. After permission allows listening, the app arms `deviceorientation` and waits up to **~1.5 s** (`GYRO_VERIFY_MS`) for events with non-null alpha/beta/gamma and a usable pose (`orientationEventHasData`). Only then is gyro marked on.
- If nothing arrives in that window, gyro stays off and **Tap to turn on motion** shows (iOS `requestPermission` runs in that tap handler).
- Entering explore re-runs auto arm + verify when the platform can call the permission API without a gesture, or when this tab already got **granted** once this session (`motionSessionGrantedRef` — in-memory only, never drives the Gyro toggle). Nothing is persisted in `localStorage`.
- **Cam** (user gesture) requests motion when required, waits for live verification, then starts the camera — camera mode does not run with gyro off.
- **Gyro** toggle turns follow on/off; the tap chip is the same path as tapping Gyro/Cam when motion is not active.

**Line-up** (camera on, explore): single bottom-bar control toggles Done/Line up. Drag in any direction:

- **Horizontal**: updates `headingOffset` against the current compass base heading.
- **Vertical**: updates **`pitchOffset`** (±15°, `line-up-offset.ts`), applied on top of `clampGyroViewPitch` output without changing sensor math.

Pinch still changes `hfov` (22°–110°). Finishing line-up writes `headingOffset`, `pitchOffset`, and `hfov` to calibration.

### Heading readout

Centered at the top of `SkylineStage` with safe-area inset. Shown on drawn and camera explore views (`Looking N`, `ENE`, etc.). Does not overlap the top-left Back button.

## Explore and pick UI

**Start**: Explore current location, pick on map, offline hub (when online). Offline start adapts (`start-screen-offline.ts`): offline badge, hide map pick when offline, list saved areas, geolocation gate, outside-saved-area messaging.

**Explore (phone)**: optional live camera under the skyline; Cam and Gyro toggles; line-up when camera is on. **Desktop pick**: map + drawn pane; keyboard/wheel pan when not using sensors.

**Bottom bar** (skyline, all phone widths): one compact strip at the bottom — **Cam**, **Gyro**, **Line up** / **Done**, **Change spot** (pick-view stacked layout only), **⋯** info. Semi-opaque bar, black/dark text readable on camera. Credits and disclaimers live **only** in the overlay opened by ⋯ (`PEAK_CREDITS`, `BARE_EARTH_NOTE`, partial-coverage note). Collapsed: **zero layout space** (popover is `absolute` above the bar). **You're on:** sits in a single line above the bar when applicable.

**Status** (top center): loading, errors, gyro unsure, coverage none, etc. — separate from the info popover.

## Offline mode

- **Save radius**: default **100 km** per area (`OFFLINE_RADIUS_M`; picker clamp 50–100 km).
- **Storage**: IndexedDB **`pf-offline-v1`**, store **`areas`** (metadata). Terrain URLs and peak chunk URLs cached via Cache API (`pf-terrain-v1`, `pf-peaks-v1`) using manifests from `offline.ts` (ocean tiles filtered against the peak index).
- **Service worker**: `public/sw-peak-finder.js`, registered from the Peak Finder client; scope **`/`** (so `/peak-finder` navigation is controlled — see `sw-routing.test.ts`). Passthrough for `/map`, MapLibre worker, etc.
- **Offline hub**: save flow, area picker map (`OfflineAreaPicker`), open saved skyline at pinned center.
- **Refresh offline**: app shell can load from SW cache; worker still needs cached tiles/chunks for the spot.

## You're on

`peakUnderfoot`: nearest named peak within **322 m** (0.2 mi) to stored coordinates. Same name removed from skyline list when within 362 m. Footer line: `You're on: {name}, {feet}`.

## Scripts and tests

Peak and declination builds are one-offs (raw OSM/GeoNames not in repo; `osmium` for `--pbf`):

```bash
npx tsx scripts/peak-finder/build-peaks.ts \
  --states us-states.json --geonames US.zip \
  --region us --pbf us-latest.osm.pbf \
  --out public/peak-finder/peaks

npx tsx scripts/peak-finder/build-declination.ts \
  --zip WMM2025COF.zip --states us-states.json \
  --date 2026-11-10 --out public/peak-finder/declination.v1.json
```

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

New test files must be listed in the `test` script in `package.json`.

| Area | Tests (representative) |
| --- | --- |
| Summit integration | `summit-view.test.ts` — Marcy/Washington visibility, front-ridge labels, Colden declutter counts, Keene Valley sparsity |
| Labels | `label-ranking.test.ts`, `label-placement.test.ts`, `declutter.test.ts` |
| Line-up / motion | `line-up-offset.test.ts`, `motion-enable.test.ts`, `explore-gestures.test.ts` |
| Offline | `offline.test.ts`, `start-screen-offline.test.ts`, `offline-area-picker-map.test.ts`, `offline-area-picker-layout.test.ts` |
| SW | `sw-routing.test.ts` |
| Core lib | `visibility`, `skyline`, `tiles`, `peaks`, `orientation`, `geo`, `location`, `gyro-*` |
| Headers | `security-headers.test.ts` — camera/motion on `/peak-finder` only |

`summit-view.test.ts` downloads Terrarium tiles to `/tmp/pf-summit-tiles` on first run (network).

## Gotchas

- Steep foreground hides distant peaks (`burialM`); Lower Ausable east-shore case remains the classic bad pin.
- Bare-earth terrain: trees/buildings vs drawn line (`BARE_EARTH_NOTE` in info popover).
- `prominenceDeg` is angular, not topographic prominence in chunks.
- Second `Permissions-Policy` with `camera=()` on `/peak-finder` breaks the camera — keep the route-specific rule.
- Peak Finder does not use the Neon DB; previews use Neon `preview` for the rest of the app only.
- Line-up pitch offset is for alignment only; it does not replace gyro pitch math.

## Known limits

- No peak detail card or tap targets; identify peaks by label text only.
- Label cap and overlap skipping still hide some names; ticks show unlabeled summits without names.
- Chunk list has no topo prominence / Wikipedia rank; importance uses skyline `prominenceDeg` + distance + elevation.
- No visible-peaks list UI.
- Declination table is fixed to the built date, not recomputed per day.
- Live camera + full gyro: phone explore; desktop remains pick-and-pan unless sensors are available.

## Next ideas (not scheduled)

- **Field feedback**: Jake and friends are testing the live build; expect UX and compass tweaks from real use (no fixed checklist yet).
- **v2 (parked)**: sun/moon position and integration with site **Mountain Forecast** — explicitly deferred.
- Longer term (from earlier plans): topo prominence in chunks, richer rank signals, visible-peaks panel, tappable peaks if tap UX is redesigned.
