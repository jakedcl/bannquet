# Mountain weather: what every page shows today, and where it goes

Inventory for UI revamp stage 4a. Taken from the code and the live pages
(Mount Washington, Mount Mansfield, Mount Marcy, Katahdin, and every hub
page) on 2026-11-19. Rule: nothing is dropped. Every item below has a
place in the new layout. Items marked **Ask** need Jake's call.

## Place page (`/mountain-weather/[state]/[section]/[place]`)

Today: 20 stacked sections on one page. New: a header, then five tabs
(`?tab=forecast|measured|snow|maps|more`). Each tab only loads its own
sources. A tab with no data for that place is hidden.

### Header (always shown, above the tabs)

| Today | New |
|---|---|
| Breadcrumb line, title, Summit/Base eyebrow | Back bar crumbs; green hero with eyebrow "Section · state · elevation", place name |
| Elevation line (NWS ft or catalog ft), office, lat/lon | Hero sub-line: elevation with its source, NWS office. Lat/lon moves to More |
| Now (from the NWS grid "Now" row): temp, sky, wind, gusts | Hero: big temperature, feels like, wind arrow and gusts, labeled "NWS forecast for this map point, not a measured reading" (as the boards do) |
| `WeatherHazardsHeader`: active NWS alerts | Alert cards under the hero on every tab (warning/watch/advisory tags, Instructions and Details) |
| `AvalancheStatus`: center status chip (MWAC, NYSAC) | Avalanche strip under the alerts on every tab, linking to the Snow tab |
| Sun & moon (only inside its section today) | Sunrise and sunset line under the tabs; full table stays in More |

### Forecast tab (default)

| Today | Source | New |
|---|---|---|
| Forecast at a glance: next 3 periods, next days, grid vs catalog elevation | NWS gridpoint | First panel, with the source and freshness line |
| Basic forecast "Now" block (feels like, wind chill, RH, visibility, dewpoint, sky cover, PoP, QPF) | NWS gridpoint | "Right now (forecast)" reading tiles |
| Hourly forecast (156 periods) | NWS hourly | Next 48 hours strip with temperature line and wind bars (boards). "All hours" opens the full table |
| 7-day periods (detailed text) | NWS | Period rows (Today, Tonight, ...) with the full text |
| Grid time series (QPF, snowfall, ice, ceiling, gusts, ...) | NWS gridpoint | Collapsed "Grid details" panel. Fix: ceiling prints 100.0000032 ft today; round it |
| Mountain forecast (enhanced hourly table, BTV places) | NWS BTV mountain point | Own panel, BTV places only |
| Elevation profile (Mansfield) | NWS BTV, derived | Own panel where it exists |
| Recreation forecast (REC), one or two elevation bands | NWS BTV, GYX | Panel per band, labeled with the band |
| allLocations narrative (summit and mid-elevation) | NWS GYX | Panel per location |
| Ridge / balloon wind forecast | NWS BTV | Panel |
| Freezing level (FZL / RADAT) | NWS (balloon, measured) | Panel here, labeled measured, since it is used for planning |
| Bulletins: AFD (all subsections), HWO, aviation, marine, watches | NWS office | Collapsed "Forecaster discussion and outlook" at the end of the tab |

### Measured tab

| Today | Source | New |
|---|---|---|
| Summit station (KMWN, MMNV1, ...) with distance, station elevation vs catalog, every element with QC flags | NWS observations | Reading tiles (temp, wind, gusts, humidity, visibility, pressure, dewpoint) labeled **Summit** or **Valley** by elevation; full element list with QC flags behind "All readings" |
| Valley / nearby stations | NWS observations | Same panel style, labeled Valley (Marcy's only station is a valley airport, labeled as such) |
| RR2 summit (SHEF) | NWS BTV | Panel |
| Station time series link (KMWN) | NWS | Link row in the panel |
| Whiteface summit timelapse | UAlbany ASRC | Panel, labeled Whiteface; also on Marcy, Algonquin and Colden as today |
| Nearest NE Compass road weather (ESS) | NE Compass | Panel |
| Air quality (nearest PM2.5 and ozone, or airnow.gov link without a key) | AirNow | Panel; link-only state stays labeled |

### Snow tab

| Today | Source | New |
|---|---|---|
| Avalanche center (MWAC, NYSAC): status, danger, problems | Avalanche centers | First panel with the danger scale and aspect rose (boards). "No issued forecast does not mean low danger" stays |
| Avalanche weather guidance (AVG), one or more points | NWS | Panel per point |
| Nearest measured snow (NOHRSC / CoCoRaHS table, summit vs valley rows) | NOHRSC, CoCoRaHS | Table panel; "no report" rows say so |
| Snowfall reports nearby (IEM local storm reports, 14 days) | IEM | Panel |
| Mansfield snow stake and snow depth climatology | NWS BTV HYD | Panels (Mansfield only) |
| Office storm bulletin (PNS) | NWS | Panel, labeled "may include distant places" |
| WPC probabilistic snowfall images | WPC | Image grid |
| NOHRSC modeled layers, NERFC composites | NOHRSC, NERFC | Image grids |

### Maps tab

| Today | Source | New |
|---|---|---|
| Radar: Northeast mosaic and nearest WSR-88D loop | NWS RIDGE | Map tiles with play controls (boards), frame time shown |
| Satellite: GOES-19 GeoColor, GLM lightning | NOAA STAR | Map tiles |

### More tab

| Today | Source | New |
|---|---|---|
| Sun & moon (all USNO fields, moon phase) | USNO | Table panel |
| Land & trail resources (forest alerts, MWOBS, 511, fire danger, drought links) | various | Link rows labeled link only |
| County drought | US Drought Monitor | Panel with the categories |
| More sources: NWS office products, guidance, land/access/research, each labeled In UI or Link only | various | Grouped link rows with the "Link only" tag (boards) |
| Coordinates, NWS office | config | Facts panel |
| Developer notes shown to everyone (USNO API details, "DEC pages block scripted access (403)", AirNow key, Compass camera feed) | n/a | **Ask:** rewrite in plain words in a collapsed "About these sources" panel at the end of More |

## Hub (`/mountain-weather`)

| Today | New |
|---|---|
| Title, "90 peaks and bases..." | Green hero with photo (boards) and the same line |
| Live across the Northeast (highest wind, highest temp, coldest feels-like) | Green live panel, "All ›" to Conditions |
| Find a mountain (search all places) | Search panel |
| State cards with each section's glance row (icon, hi/lo, phrase, precip, wind, alerts) | Same, restyled as boards' state panels |
| Links: Conditions, Snow, Maps | Shortcut rows |
| States list | **Ask:** it repeats the state cards; keep as is or drop |
| Mount Marcy and Mount Washington links | Shortcut chips |

## State (`/mountain-weather/[state]`) and section (`.../[section]`)

| Today | New |
|---|---|
| Title | Green hero |
| Bulletins (AFD with subsections, HWO) | Collapsed "Bulletins" panel (boards) |
| Places by section, each place's glance row | Grouped list (boards): section header rows, place rows with icon, hi/lo, phrase, precip and wind, "All N places in ..." |
| More sources | Same grouped link rows at the end |

## Conditions, Snow, Avalanche, Maps hubs

| Page | Today | New |
|---|---|---|
| Conditions | Live measured extremes, measured spots table, place forecast lines | Same three panels, restyled; tables in the new table style |
| Snow | WSSI and winter links, WPC, NOHRSC, NERFC images, Mansfield stake, link to Avalanche | Same panels; Avalanche as a shortcut row |
| Avalanche | MWAC, NYSAC, AVG points, example place links | Panels per center with the danger scale; AVG point rows |
| Avalanche point | Center guidance and AVG for that point | Same, restyled |
| Maps | Radar, satellite, alerts, SPC and CPC outlooks | Same, as map tiles and outlook panels |

## Shared pieces to build (from `Wx-Kit`)

Source and freshness line, reading tile, 48-hour strip with charts, period
row, alert card, avalanche danger scale and aspect rose, wind arrow,
link-only row, map tile with play controls, place glance row, live panel.

## Not built (Phase 2 ideas on the boards, need new data)

Snowfall by period, snow depth by elevation, summit and valley side by
side, last 24 hours at a station, climate normals and records, alerts for
saved places, Mansfield snow depth history.
