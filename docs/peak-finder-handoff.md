# Peak Finder handoff

Branch `lurk/peak-finder-v1-db63`, PR #49. Do not merge. Preview: https://bannquet-git-lurk-peak-finder-v1-db63-dcldev.vercel.app. The page is `/peak-finder`. This file is the state as of the ridge-and-label commit. Do not treat `prominenceDeg` on a visible peak as topographic prominence. That number is only how far the summit rises above the terrain behind it.

## Architecture

The page (`src/app/peak-finder/page.tsx`) renders `PeakFinder`. A web worker builds the skyline so the UI stays responsive. The worker posts a `SkylinePayload`: smoothed horizon, front-ridge layers, visible peaks, eye height, and `onSummit`.

| Piece | Role |
| --- | --- |
| `src/components/peak-finder/PeakFinder.tsx` | Modes, GPS, compass, worker, "You're on", peak card |
| `SpotPicker.tsx` | Drop a pin. Opens on USGS satellite imagery, with a toggle to the OpenFreeMap standard style |
| `DrawnView.tsx` / `CameraView.tsx` | Spot drawing, or the phone camera with the line on top |
| `SkylineStage.tsx` | Canvas ridges, compass ticks, diagonal labels. Drag looks around. Pinch changes the field of view |
| `LineUp.tsx` | "Drag the skyline onto a peak you know. Pinch to match its size." Stores a heading offset |
| `PeakCard.tsx` | The one selected peak: feet, miles, direction |
| `src/lib/peak-finder/peak-finder.worker.ts` | Load tiles, eye height, cast rays, snap summits, visibility, "You're on" |
| `payload.ts` | Worker message types |
| `peaks.ts` | 2° chunk index, decode, dedupe |
| `tiles.ts` / `tile-cache.ts` | Which Terrarium tiles to fetch, bilinear sample, Cache API |
| `skyline.ts` | Rays, horizon, the lines drawn in front of it |
| `visibility.ts` | Who is labeled, and the summit underfoot |
| `declutter.ts` | Which of those names fit on this screen |
| `projection.ts` | Bearing and angle to a pixel. Vertical field of view follows the pane's aspect |
| `geo.ts` | Distance, bearing, curvature, apparent elevation. Refraction `k = 0.13` |
| `orientation.ts` / `declination.ts` / `wmm.ts` | Compass to true heading. The WMM is baked into a table, not run in the browser |
| `location.ts` / `storage.ts` | "You've moved" after 1 km, and the last pin plus calibration in `localStorage` |
| `format.ts` | Feet, miles, compass labels |
| `src/lib/security-headers.ts` | Camera and motion sensors only on `/peak-finder` |

### Peak chunks

`public/peak-finder/peaks/index.json` is the US catalog (`coverage: "us"`, about 76,757 peaks, built 2026-11-10). Cells are 2°. A chunk is `public/peak-finder/peaks/us/{id}.v1.json`. Each row is `[name, lng×10⁴, lat×10⁴, elevation m or null]`, so the dot is good to about 10 m. The browser loads every chunk within 200 km and caches them (`pf-peaks-v1`).

Build dedupe, in `peaks.ts`: every OSM peak is kept, except two with the same name within 200 m collapse to the higher one. A GeoNames peak is dropped when any OSM peak is within 200 m, or an OSM peak with the same name is within 1.5 km. Chunks do not store topographic prominence, Wikipedia, or Wikidata.

### Terrain

Tiles are AWS Terrarium PNGs (`TERRARIUM_TILES` in `src/lib/map.ts`). The worker fetches them directly and caches the decoded heights (`pf-terrain-v1`, about 150 MB). Rings in `TERRAIN_RINGS`:

| Zoom | Out to |
| --- | --- |
| 12 | 8 km |
| 11 | 10 km |
| 10 | 50 km |
| 9 | 100 km |
| 8 | 200 km |

`sampleHeight` tries the preferred zoom, then a finer zoom, then coarser, and blends the four surrounding pixels. `zoomForDistance` matches the rings. Rays sample from 40 m out: every 80 m to 10 km, then 200 m, 400 m, and 800 m. Ray step is 0.1°. Apparent elevation uses curvature and refraction. A missing sample becomes 0 m inside the ray caster. Summit snap and eye height treat a missing sample as missing and skip it.

### Visibility

`eyeHeightM` is the highest ground within 10 m, plus 2 m. `raiseSummit` moves the dot onto the highest ground within 130 m (step 32 m) and uses `max(stored elevation, that sample)`.

A peak is dropped when it is closer than 30 m, farther than 200 km, or the ridges in front bury more than the top of it. `angleBefore` is the highest terrain from 60 m out to 300 m before the summit. The summit's own slopes inside that 300 m are not an occluder. Terrain behind the peak does not hide it. `summitInView` keeps the peak when its angle clears that occluder, or when `burialM` is at most 58 m (about the top 50 m, plus tile noise). `burialM` is how many meters of the summit sit behind the occluder's line, extended out to the peak.

`clearsSkyline`, `bigEnough`, `VISIBLE_TOLERANCE_DEG` (0.05°), `MIN_PROMINENCE_DEG` (0.1°), `CLOSE_ALWAYS_M` (5 km), and `EYE_ABOVE_TERRAIN_M` (1.7) are leftovers from the old "must reach the horizon and stick up behind" rule. `assessPeak` does not call them. `EYE_ABOVE_TERRAIN_M` is not what the worker uses.

From Marcy's summit this names 44 of the other 45 Adirondack High Peaks. Couchsachraga stays hidden, about 133 m behind the ridge in front. Nothing else on that list is even 20 m behind.

### Ridge lines

`viewProfile` smooths the horizon by 0.35°. In front of it, at most one line per band: 4–15 km, 15–40 km, 40–100 km. Nothing inside 4 km is drawn. That near ground was the scribbly hatching.

A band sample is kept only when the band itself has 0.55° of relief and sits at least 0.55° below the horizon. Short gaps are filled, the line is smoothed by 0.8°, samples that have climbed back up to the horizon or onto a nearer line (within 0.4°) are removed, and runs shorter than 6° are dropped.

The whole line is then dropped when its median sits within 0.35° of flat eye level. That is the ground meeting the sky, which the blue/beige fill already draws. A ridge above that, or one you look down on from a summit, stays. The old cutoff required the median to be at least +0.8°. From Marcy the front ridges are below the horizon, so that cutoff erased every one of them. The smoothing radii did not change when the lines came back.

### Labels

Names are 13 px, tilted 45° up and to the right, anchored on a 12 px vertical tick (`LABEL_TICK_PX`, box height 16 px). Overlap uses the rotated box. Nearer peaks are placed first. A farther name steps up the diagonal in 10 px steps, up to 240 px, and grows a thin leader. If it still overlaps, or the cap is full, it is dropped.

The cap is 80 when the drawing pane is at least 640 px wide, and 40 otherwise (`labelCap`). The desktop pane beside the map is about 980 px, so it gets 80. Default field of view is 70° (pinch from 22° to 110°). `LABEL_MIN_GAP_PX` (44) is unused. The old rule was a horizontal gap and "the higher name wins," which is why front peaks vanished until you zoomed in.

### Live, pick a spot, compass

Desktop is pick a spot: map on the left, drawing on the right. Phone starts on the map, then the drawing. Live (camera) is phone-only. On a phone, pick a spot can follow the compass.

Heading is magnetic plus the 1° declination cell (`public/peak-finder/declination.v1.json`, WMM2025 for 2026-11-10), plus screen angle, plus the calibration offset in `pf:calibration:v1`. The last pin is `pf:last:v1`. If the compass jumps or its accuracy is poor, the status says to line up. Line-up turns drag and pinch into a heading and size correction. Moving more than 1 km offers "You've moved. Update view" (checked every 30 s).

`/peak-finder` is its own `Permissions-Policy` rule: `camera=(self)` plus the motion sensors. Every other route sends `camera=()`. Two policy headers are intersected, so a site-wide `camera=()` on this path would turn the camera off. `src/lib/security-headers.test.ts` locks that in.

### You're on

`peakUnderfoot` is the nearest named peak within 322 m (0.2 mi), measured to the stored dot, not the snapped one. The line uses `max(stored elevation, terrain within 130 m)`. The same name is taken off the skyline when that peak is within 362 m. `assessPeak` also drops anything inside 30 m. The line is `You're on: {name}, {feet}` under the controls. Mount Marcy at 1,629 m formats as 5,344 ft.

## Scripts and tests

Peak and declination builds are one-offs. The raw OSM and GeoNames files are not in the repo. `osmium` is required for `--pbf`.

```bash
npx tsx scripts/peak-finder/build-peaks.ts \
  --states us-states.json --geonames US.zip \
  --region us --pbf us-latest.osm.pbf \
  --out public/peak-finder/peaks

npx tsx scripts/peak-finder/build-declination.ts \
  --zip WMM2025COF.zip --states us-states.json \
  --date 2026-11-10 --out public/peak-finder/declination.v1.json
```

`--region northeast` limits the chunks to NY, NJ, PA, CT, RI, MA, VT, NH, ME. The committed index is the whole US. `scripts/peak-finder/land.ts` is the state-polygon helper those scripts use.

Checks:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

New test files do nothing until they are added to the `test` script in `package.json`. `tsx --test` does not pick them up by itself.

| Test | What it locks |
| --- | --- |
| `src/lib/peak-finder/summit-view.test.ts` | Marcy: the named High Peaks are visible and Couchsachraga is not (44 of 45). Washington: Adams, Jefferson, Madison, Monroe. Front ridges: looking west at the default 70° on a 980×720 pane, a real front-ridge line is drawn, and Gray, Colden, and Algonquin are labeled from Marcy (`44.112857, -73.923784`). Haystack, Basin, and Marcy are labeled from `44.112, -73.852` |
| `visibility.test.ts` | A front peak shows with a taller mountain behind it. The top 50 m may sit behind a ridge. 200 m behind stays hidden. "You're on" is 0.2 mi |
| `skyline.test.ts` | No hatching inside 4 km. A ridge below the horizon is still drawn from a summit. A line glued to the horizon is left out |
| `declutter.test.ts` | The nearer name stays put. The farther one steps up or drops |

`summit-view.test.ts` downloads Terrarium tiles into `/tmp/pf-summit-tiles` and decodes the PNGs itself (the worker uses `createImageBitmap`, which this test does not). The first run needs the network. Later runs are a few seconds. The High Peak coordinates come from `config/challenges/adk46.json` and `nh48.json`, not from the OSM chunks. The page itself labels whatever name is in the chunks.

## Gotchas

- A steep bank just in front of you hides distant peaks. `burialM` extends that bank's angle out to the summit, so a slope at 80 m can "bury" a mountain by kilometers. `angleBefore` ignores only the first 60 m. The east shore of Lower Ausable Lake (`44.106, -73.834`) hides Haystack and Marcy this way. The open west view used in the test and the screenshots is `44.112, -73.852`, on Sawteeth' shoulder, and the line there says you're on Sawteeth.
- Zoom 12 tiles were fetched before they were ever sampled. `sampleHeight` used to skip anything finer than zoom 11. It now accepts zoom 12 and tries a finer zoom before a coarser one.
- From the highest summit, other peaks sit on or below the horizon. Gray Peak's label falls in the beige on purpose. That is the geometry, not a missing ridge.
- At Marcy's default zoom the diagonal names include a lot of minor OSM hills (Ice Cave Mountain and the like). The 46er test does not see those, because it feeds only the challenge list. The page loads the full chunks.
- `prominenceDeg` will not rank those hills. It is the angular rise above the ground behind the peak, and declutter does not read it.
- A second `Permissions-Policy` on `/peak-finder` that includes `camera=()` turns the camera off. Keep the route's own rule.
- `git commit` on this agent appends a `Co-authored-by` trailer. The repo does not want that. Commit with `git commit-tree` (or strip the trailer before pushing).
- Vercel previews and local dev use the Neon `preview` branch. Peak Finder does not need the database. Do not run `npm run db:migrate` against production.

## Known limits

- Labels are still dropped. The cap (80 or 40) stops the farthest names, and a name that cannot clear the others within 240 px is dropped. There is no tick left behind for an unlabeled visible peak, and no list of everything in view. The card only opens from a label.
- Rank is distance, then angle. Minor named bumps compete with High Peaks. Chunks have no topographic prominence and no Wikipedia or Wikidata tags.
- Bare earth. Trees and buildings can hide a summit the line still draws. The footer says so.
- The east-shore case above is real: a pin against a slope sees almost nothing west.
- Line-up is a heading offset plus pinch. It is not a "put this label on that summit" alignment.
- Declination is one table for 2026-11-10, one degree cells. It is not recomputed for the day.
- A ray sample with no tile is treated as sea level, which can cut a notch in the horizon.
- Live view and "Use compass" are phone-only. Desktop is pick a spot and drag.

## Next round

Do this on the same branch. Keep the Marcy 44/45 result, the front-ridge test, and the "You're on" line.

1. Topographic prominence for every US peak, computed once and stored in the chunks. That is the declutter signal, not `prominenceDeg`.
2. Rank a visible peak by that prominence, OSM Wikipedia and Wikidata tags, nearness, and how much of the summit is in view.
3. Cap how many names a screen slice gets, and loosen the cap as the field of view narrows.
4. Always keep a slot for the nearest peaks and for the "You're on" peak.
5. Every visible peak stays. If it has no name, leave a tappable tick. Do not delete it from the payload.
6. The drag-to-line-up compass fix that was proposed earlier, and a visible-peaks list.
