# Mountain weather: quality pass and plan (2026-11-20)

How this was tested: production build run locally, every weather page loaded on a phone-width
browser (390 px). Pages checked: the hub, New York, Adirondack High Peaks, Conditions, Snow,
Avalanche and Maps, plus every tab for Mount Washington, Mount Mansfield, Mount Marcy, Katahdin
and Gunks Ridge. Source data was checked against the raw NWS API where something looked off.

**Decisions (Jake, 2026-11-20):** the Sources page is public; there's no AirNow key, so air
quality is a plain link; when no avalanche forecast is issued, the avalanche bar is hidden
(the Snow tab panel still says so).

**Status:** Step 6 (small version) is done: Conditions shows one row per station, peaks that
share it listed together (`groupSpotsByStation` in `SpotsTable.tsx`). Not done: load speed
(stream each panel) and the optional live status column on the Sources page.

Step 5 (public Sources page) is done: `/mountain-weather/sources`, built from `SOURCE_REGISTRY`
through `src/lib/mountain-weather/source-catalog.ts` (plain names, tab, who runs it, how often,
terms, link, and the developer notes in plain words). It is linked from the hub and from every
place's "Sources for this page". A test fails if a new registry feed has no plain name. Live
up/down status stays per place (More tab); the page does not fetch every feed on load.

Step 4 (duplicates and tab order) is done. Phone heights before → after:
Forecast tab, Washington 6,259 → 3,119 px, Mansfield 8,704 → 5,034, Marcy 8,499 → 4,617,
Katahdin 4,711 → 2,500, Gunks 4,663 → 2,798. Snow tab, Washington 6,644 → 2,808, Mansfield
8,564 → 3,952. "Forecast at a glance" is deleted. "This hour" starts closed. REC bands share
one panel, and the allLocations copy shows only when that office's REC failed. Long tables
show the next 24 rows or the next 2 days, with the rest behind a toggle. The Measured tab
says when a summit has no station.

Step 3 (clear titles) is done. Every panel title says what the panel is, and the
official product name is the subtitle. Helpers in `format-display.ts`: `gridElevationNote`
(hero line), `tidyLabel` (ALL-CAPS labels), `reflowProductText` and `discussionHeading` (AFD
text reflows on phones). Hub cards read "Wind up to 54 mph · next 48 hours" with a high / low
label.

Step 2 (source line and Sources for this page) is done. `SourceReceipt` in
`src/components/mountain-weather/kit.tsx` ends every panel; images use `ImageCaption`.
`src/lib/mountain-weather/page-sources.ts` builds the More tab's "Sources for this page". It
streams in with Suspense because it reads every tab's (cached) sources. More sources groups
are now exclusive and keyed by address; the duplicates came from overlapping group filters,
and `/REC/i` matched "forecast".

Step 1 (correctness) is done. Fixes 1–7, 9 and 10 are in. Fix 8 was not a bug. Two
extra changes went in with it: the off-season avalanche bar is hidden, and AirNow is now a link.
The hub panel labels wind and cold as **valley** whenever no summit station has reported in the
last hour; KMWN often reports only every few hours.

**The goal:** a novice gets the answer in five seconds. An expert can still check every number.
Jake can always see where each number comes from and whether that source is working. All of
this goes in one view for everyone. No admin-only layer.

---

## 1. Wrong or missing data (fix first)

| # | What you see | Why | Fix |
|---|---|---|---|
| 1 | **Mount Washington summit (KMWN) shows "No reading" for temperature, wind and gusts.** | We read `/observations/latest`. NWS strips any value that failed its quality check from that endpoint. The same report in `/observations?limit=` has temp 1 °C and wind 66 km/h. | Read the last ~6 reports. Take the newest value for each field and show its age ("wind 41 mph · 1 hr ago"). This probably also fixes MMNV1 (Mansfield), where every field except gust says "failed NWS quality check". |
| 2 | Mansfield's real summit temperature is shown as `DH0148: —` / `TAIRGZZ: 40.7`. | The RR2 panel prints raw SHEF codes. | Decode it to "Summit air temp 40.7°F · 8:48 PM". Use it in the Measured summit card. |
| 3 | Hub "Live across the Northeast": **highest wind 7 mph** at a valley airport. That same evening, Washington is forecast at 50–60 mph. | Summit stations have no readings (see #1), so only valley airports are left. | After #1, split the panel into **Summits** and **Valleys**. Never give a valley number a headline without saying it is a valley. |
| 4 | "Next days: Fri 36°/29° · **Fri** 38°/23°" | Tonight's low is paired with Friday's high, so Friday is listed twice. | Pair each day's high with the low that follows it. Label the days correctly. |
| 5 | Mansfield's nearest road station shows all dashes. Its last report is **Mar 24, 2026**. | There's no age limit on road stations. | Hide stations older than 6 h. If nothing is left, say "No road station reporting nearby". |
| 6 | Mansfield "All readings" shows `Wind gust: 67.248 km/h`. | No unit conversion on that path. | Convert to mph and round, the same as the tiles. |
| 7 | "Nearest measured snow": all four rows say "No report / missing" (Washington, Marcy, Mansfield, Katahdin). | Rows are shown even when nothing was reported. | Show only stations that reported. If none did, show one line: "No snow depth reports nearby in the last 24 h". |
| 8 | WPC snow: **six** cards that each say "Graphic unavailable". | **Not a bug for real visitors.** WPC returns 403 only to headless test browsers; desktop and phone browsers get the images (checked 2026-11-20). | No change. Screenshot runs will keep showing the notice. |
| 9 | Leftover raw text: `$$`, `&&`, `000 / FXUS61 KGYX`, `MEZ007>009-NHZ002>004-200900-`, `Matched header: …`, `3 Inch · &&`, and a broken "PERIOD / FIELDS" table on the REC. | Parsers pass NWS formatting through. | Strip these in the parsers and add tests with the existing fixtures. Raw text stays one tap away under "Original" (see section 3). |
| 10 | Sunrise shows as `06:46`, but times everywhere else look like `8:00 PM`. | Two different time formatters. | Use one 12-hour format everywhere. |

## 2. Too much of the same thing

The Washington Forecast tab is **6,300 px** on a phone and Mansfield's is **8,700 px**. Much of
that is repeated content:

- **"Now" appears four times:** in the hero, in "Forecast at a glance" (the next 3 hours), in
  "Right now (forecast)" (10 tiles), and as the first column of the 48-hour strip.
  → Keep the hero. Move the useful tiles (feels like, humidity, visibility, cloud cover) into a
  "More about this hour" expander in the hero. Remove "Forecast at a glance". Its next-days line
  is already in the 7-day, and its elevation note moves into the hero.
- **The GYX REC and "allLocations narrative" print the same text twice**, at both elevations.
  → Show one "Forecaster's mountain forecast" panel with an elevation switcher
  (Summits above 4,000 ft / 2,500–4,000 ft).
- **Marcy has four written forecasts** (Mountain forecast, Narrative, REC, Balloon).
  → Use the same single panel with a switcher. Move the balloon forecast to "Winds aloft" under
  Grid details.
- **The avalanche strip sits on every tab, even in the off-season**: "– No current forecast".
  → When no forecast is issued, show it only on the Snow tab. When a forecast is issued, show it
  on every tab.
- **More sources lists 40+ rows with duplicates:** MapClick, REC, AFD, ZFP, SFT, PFM and
  Recreation are each listed twice. "Sun & moon" is filed under Maps. AFD is tagged "Link only"
  even though it is shown in Bulletins. → Replace the list (see section 4).
- **Conditions page (9,400 px)** has one row per peak, but most rows are the same valley
  airport. WRSV1 appears for both Waterbury and Camel's Hump.
  → Group the rows by station, with "Used for: Camel's Hump, Bolton".

## 3. Titles that say what it is (nothing dumbed down)

Jake (2026-11-20): not dumbing it down. Each panel gets a **title that says what it is**, and
the official product name stays right under it as the subtitle. All the data, codes and tables
stay. The plain title tells a novice what they're looking at. The subtitle tells an expert
exactly which product it is.

| Title (new, big) | Subtitle (kept, small) |
|---|---|
| **Forecaster's mountain forecast** | Recreation Forecast (REC) · NWS Gray · summits above 4,000 ft |
| **Forecaster's mountain forecast** (merged with the above, no duplicate text) | allLocations narrative · NWS Gray |
| **Mountain forecast, hour by hour** | Mountain Point Forecast (enhanced) · NWS Burlington |
| **What the forecasters are thinking** | Area Forecast Discussion (AFD) · NWS Gray |
| **Avalanche weather, hour by hour** | Avalanche Weather Guidance (AVG) · NWS Gray. Codes such as BK and OV stay, with a legend |
| **Winds aloft** | Ridge / Hot Air Balloon Forecast · NWS Burlington |
| **Mansfield summit sensor** | RR2 (SHEF) · MMNV1 · NWS Burlington. The code `TAIRGZZ` stays next to the decoded "Air temp 40.7°F" |
| **Nearest road weather station** | NE Compass ESS / RWIS. Raw values stay, the developer notes (`clock-as-utc`, `$0 public XML`) move to the Sources page |
| **Chance of snow** | WPC Probabilistic Snowfall (PWPF) |
| **Snow cover maps (model)** | NOHRSC modeled depth / SWE / melt, NERFC composites |
| **Snow on the ground nearby** | NOHRSC / CoCoRaHS station depths |
| **Recent snowfall reports** | Local Storm Reports (LSR) via IEM |
| **Radar** / **Satellite** / **Lightning** | NWS RIDGE · KGYX WSR-88D / GOES-19 GeoColor / GOES-19 GLM |
| **Thunderstorm outlook: today** | SPC Day 1 Categorical Outlook (0100Z) |
| **This hour (forecast)** | NWS gridpoint at 5,650 ft · summit 6,288 ft, about 2° colder |

Other wording fixes:
- Times are shown in local time first, with the original UTC time beside it where the product
  issues one (radar frames, SPC).
- "Feels like 17°" is the headline. The wind chill, heat index and apparent temperature
  breakdown stays under it.
- Hub cards: "Wind up to 54 mph in the next 48 h · High 41° · Low 32°" replaces
  "54 mph sustained · Next 48 hours · 41°/32°".
- Only true developer notes are moved to the Sources page ("unavailable when checked for M10",
  the timestamp rule). No data is removed.

## 4. "Where is this from, and is it working?": one pattern everywhere

This is how the page stays trustworthy without becoming technical.

**a. One source line on every panel.** Today there are several versions, e.g.
`measured · measured · Issued … · Source`, `Image URL`, `Product JSON`, `Last-Modified`.
Every panel will end with the same line instead:

> ● NWS Gray · issued 7:40 PM (1 hr ago) · **Original ›**

The dot is green when fresh, yellow when older than expected (using `expectedEveryHours`, which
the registry already has), red when the fetch failed, and gray when the source is off-season.
"Original" opens the raw product. For text products it's an in-page toggle that shows the exact
NWS text.

**b. "Sources for this page"** replaces More sources on every place page. There's one row per
source, with no duplicates, grouped by what it feeds (Forecast, Measured, Snow, Maps). Each row
has a status dot, its age and a link. Links we don't display become a short "Other useful links"
group at the end.

**c. A public `/mountain-weather/sources` page.** It is built from `SOURCE_REGISTRY` and lists
every feed the site uses: who runs it, how often it updates, its status right now, its last error
and which places use it. It's linked from every place page's More tab. This is Jake's "what's
connected" view. It is public, so there's no separate admin layer to keep in your head. The dev
notes (Compass timestamp rule, AirNow key, ASRC feeds) live here in plain words.

## 5. Target layout per tab

- **Forecast:** hero (now, feels like, wind, elevation note, "More about this hour") → alerts
  (only when there are any) → next 48 hours → 7-day → Forecaster's mountain forecast (elevation
  switcher) → What the forecasters are thinking (collapsed) → Grid details and winds aloft
  (collapsed).
- **Measured:** a **Summit right now** card first, using the best summit source (KMWN, MMNV1 or
  RR2, the Whiteface cam). If there's no summit station, say so: "No summit station. Nearest is
  Saranac Lake airport, 3,700 ft lower." Then valley stations, then road weather (fresh only),
  then air quality (see question 2).
- **Snow:** avalanche (full panel in season, one line out of season) → snow on the ground nearby
  (reporting stations only) → recent snowfall reports → chance of snow → snow cover maps
  (collapsed) → avalanche weather hour by hour (collapsed, with legend).
- **Maps:** unchanged apart from the plain names and local times.
- **More:** sun and moon, place facts, land and access, Sources for this page.

Expected result: the Forecast tab drops from about 6,000–8,700 px to about 3,000 px on a phone,
with nothing an expert uses taken away.

## 6. Speed (note only)

On a cold load the hub took 9.7 s and a Forecast tab about 4.7 s. Once the layout is settled,
stream each panel in with its own loading state, so the hero shows first and a slow source
holds up only its own panel.

## Order of work

1. **Correctness** (section 1): small and safe, and each fix gets a test.
2. **Source line and Sources for this page** (sections 4a and 4b), plus removing the dev text.
3. **Clear titles, with the official names kept as subtitles** (section 3).
4. **Restructure tabs and remove duplicates** (sections 2 and 5), screenshotted before and after
   with `npm run shots`.
5. **`/mountain-weather/sources`** (section 4c).
6. **Hub, Conditions and speed** (section 2's Conditions item, the hub wording, section 6).

Each step is its own commit and can be previewed on Vercel on its own.
