# Bannquet UI redesign: handoff for Claude Code

Design canvas: https://claude.ai/artifact/CK3oghrtb1jC72JqmMZ8F4 (Jake can export boards if you cannot open it). Everything needed is summarized in this file, and board names are given so Jake can point you to them.

## How to read this

A `screenshots/` folder next to this file has a PNG of every Design board, named after the board (for example `Pg-Community.png`). The three "Design" tabs show the look to build. The nine "Context only (old look)" tabs show content and ideas in the old style and are not a styling reference.

The boards are mockups for styling. They show roughly how each page should look. They are not a spec for new systems.

- Phase 1 is to redo the UI of what the repo already does. Take each existing page and give it the new look using the components below.
- Phase 2 is the "new ideas" lists at the end of this file. These are things Jake liked but that need new data, new features or back end work. Do not start any of them without Jake's approval for that item. You can say which look easy.
- These notes are advice. You know the code better than the mockups do. If a mockup disagrees with what the repo actually does, trust the repo and keep the new look.
- Do not redesign and rebuild features at the same time. Do not add new services, API keys or sign-in methods because a mockup shows something.
- Anything the repo already shows must still be built, even if no mockup includes it.
- All text in brackets on the boards, like [member name], is sample text that live data replaces.

## Rules that apply everywhere

- **AGENTS.md still applies.** Follow it for commits (no `Co-authored-by` trailers), database and auth work (read `docs/environments.md`, never run `db:migrate` on production), the redirects in `next.config.ts`, route privacy (`routeCutSql`/`shownLineSql`), and the image rules (no Vercel Image Optimization). This redesign should not touch the database, auth or API logic.

- **No competition.** No leaderboards, rankings, or counts that compare people. Peaks and challenges show your own progress. Lists of who has been somewhere are plain names. Specific places in the repo to change (UI only):
  - The "most popular peaks by number of friends" ranking: `src/app/community/page.tsx` and `popularPeaksByFriends` in `src/lib/summits.ts`. Remove it from the page.
  - The Friends column in `src/components/peaks/PeaksTable.tsx` (the `visitors` field). Remove the column and the default sort by it.
  - The "x N" visit counts per person in "Who has been here" (`src/app/peaks/[slug]/page.tsx`). Show plain names. A viewer's own count (`PeakCheck.tsx`, the "You" column) may stay.
  - `src/lib/leaderboard.ts` is only imported by its own test. Leave it alone or delete it.
  - Do not remove `src/lib/challenges.ts`. It is the peak data source used across the app. Only change UI that shows challenge progress for other people. The profile Challenges card shows your own progress, and `src/components/stats/ChallengeBadge.tsx` stays for your own completed challenges.
- **No bottom tab bar.** Remove the `TabBar` mount in `src/app/layout.tsx` and the `pb-[var(--tab-h)]` padding on `main`. Set `--tab-h` to 0 (or remove its uses) in `globals.css`, `PageWrapper.tsx`, `error.tsx`, `not-found.tsx`, `map/page.tsx` and `peak-finder/page.tsx`, so no empty 68px gap is left. Keep `nav.ts`, since `TopBar.tsx` uses it (it also mentions a `/trips` route that does not exist in `src/app`; do not build it). Audit `Menu.tsx` so every page in the route list below has an entry.
- **Plain copy.** Short descriptive sentences. No slogans or punchy fragments.
- **Units** stay miles, feet and Fahrenheit.
- **Do not rely on community data to fill pages.** About five people use the site. Real-source data (weather, snow, tides, gauges) is the core.
- **Sign-up stays.** The repo has a `/sign-up` route ("Make an account") and an invite route. Jake confirmed both are needed. Restyle both and leave their logic as it is. New accounts wait for approval before they can post.

## Usability rules

- Every page has an entry in the hamburger menu, and Home panels are only shortcuts to pages that also have a menu entry.
- Every page has a back button that goes up one level. No dead ends.
- Every page is within three taps of Home. Search covers the long lists (the 90 weather places, 90+ peaks).
- Tap targets are at least 40px tall (small buttons 32px). Button labels longer than about 26 characters wrap and center instead of overflowing.
- A panel that shows data links to the page with the full version.
- Missing data says so. A station or source with no reading shows a plain line, not an empty space.
- Text that cannot break (long names, ids) wraps with `overflow-wrap: anywhere`. The 320px stress board shows the cases.
- See the route map board (`Pg-RouteMap`) for each repo route, where it is reached from and where back goes.

## Style tokens

Direction: the "iOS curve" board. His retro look, rounded and cleaner.

| Token | Value |
|---|---|
| Brand greens | #2d5016, #4a7c2a, #1a3009 (existing `--color-brand-green*`) |
| Yellow | gradient #ffd700 to #ffb300 |
| Brown | gradient #8b5a2b to #5c3a1e |
| Page background | #ece6d8 beige |
| Gray surfaces | #e8e6e1, hairlines #d6d0c2 |
| Fonts | Verdana body, Trebuchet MS headings, uppercase headings |
| Borders | `3px outset` on panels and buttons (the repo uses 2px in places) |
| Shadow | `4px 4px 8px rgba(0,0,0,0.2)` |
| Radii | 18px (R), 14px (small), 24px (large), with `corner-shape: squircle`. Fall back to a plain `border-radius` where squircle is unsupported |
| Hero | green-filtered mountain photo, bottom radius 36px, faint scan-line overlay |
| Title bars | green gradient (#4a7c2a to #2d5016) with a faint horizontal wood texture, white text |
| Arrow tags | brown gradient with yellow text and an arrow-shaped right end (`clip-path`) |
| Outline tags | green outline, green text |
| Yellow is used for | eyebrow labels on green, big numbers, yellow buttons, text on brown arrow tags |
| Buttons | 40px tall (small 32, large 44), 13px bold uppercase, bevel kept. Kinds: yellow (primary), green, brown, gray |
| Chips | 36px tall, yellow when selected, gray otherwise |

Title text on green bars is always white. Yellow title text on green was rejected.

## Components and where they live in the repo

| Component on the boards | Likely repo file |
|---|---|
| Top bar and hamburger menu | `src/components/hub/TopBar.tsx`, `Menu.tsx`, `nav.ts` |
| Back bar | `src/components/ui/BackBar.tsx` |
| Panel with green title bar | `src/components/hub/Card.tsx`, `SectionHeader.tsx`, `ui/SectionChrome.tsx` |
| List rows with chevron | `src/components/hub/ListRow.tsx` |
| Buttons | `src/components/hub/Button.tsx`, `ui/SubmitButton.tsx`, `ui/NavButton.tsx` |
| Chips and filter pills | `src/components/ui/FilterPills.tsx` |
| Search field | `src/components/ui/SearchBar.tsx` |
| Bottom sheet | `src/components/hub/Sheet.tsx` |
| Forecast strip | `src/components/ui/ForecastStrip.tsx` |
| Live conditions ticker | `src/components/ui/WeatherTicker.tsx` |
| Weather glance rows | `src/components/weather/WeatherGlanceList.tsx` |
| Tables | `src/components/ui/DataTable.tsx`, `BrowseTable.tsx` |
| Loading | `src/components/ui/LoadingLines.tsx`, `LoadEntrance.tsx`, `RouteMotion.tsx` |
| Fishing | `src/components/fishing/*` |
| Pages | `src/app/*` (see the route map board) |

Foundation first: update tokens and shared components (`globals.css`, `hub/*`, `ui/*`), then roll the new look out page by page.

## Section map (weather)

Hub, then State (NY 41 places in 6 sections, VT 24 in 5, NH 14 in 4, ME 11 in 4), then Section, then Place. A place page uses five groups, shown as tabs: Forecast, Measured, Snow, Maps, More. Sources are labeled by where they come from. Link-only sources stay labeled as link-only. Hub also links to Conditions, Snow (avalanche centers MWAC and NYSAC, NWS avalanche weather guidance points) and Maps.

Notes from the place boards:
- A mountain only shows the groups that have data for it.
- Mount Marcy's timelapse comes from Whiteface and is labeled Whiteface. Algonquin Peak and Mount Colden use it too.
- Marcy's only station is a valley airport station far below the summit. Label it as valley, not summit.
- Mansfield has its own snow stake and climatology readers.

## Motion

Details are on the "Motion catalog" board. Summary:
- CSS keyframes, no animation library.
- Number counters use `@property`. Chart lines draw with `stroke-dashoffset`. Sections open by animating `grid-template-rows` from `0fr` to `1fr`.
- `prefers-reduced-motion` turns all of it off.
- The controls board has a motion line under each control (fields, selects, sheets, dialogs, progress).

## Boards by area

- NEW: Direction: components, controls and overlays, and Home, Mountain weather, Community and Menu examples.
- NEW: Weather pages: kit, all weather routes, the motion catalog, the Marcy variant, a 320px stress test, desktop layouts (the desktop two-column layout is only a proposal, the repo is a single column).
- NEW: Other pages: Community, Home, Peaks, Fishing, Profile, Sign-in and upload, Map and Peak Finder, detail pages and the route map.
- "Context only (old look)" tabs: the full set of options for each area, with numbered modules. **These use the old look, not the new UI. Do not copy their styling.** They are only there for content and ideas: what each page could show and what the new ideas are. Use the three Design tabs for the look. Jake's choices are summarized in the decisions below.

## Decisions by page (Phase 1: restyle what exists)

**Community.** Photos first (a big gallery), then Posts (a general blog-style feed, not only trip reports), a small Chat preview, a mixed Pins and routes feed with the type tag aligned right, Peaks we have been to, then a small Members row. An avatar button at the top opens Profile (settings, edit profile, log out). Dropped: Plans, On this day, Rides, Gear, Thanks on posts, Pinned note, Trail conditions.

**Sign-in and upload.** Keep: sign in, invite (including used, expired and missing states), forgot password, new password, waiting for approval, upload menu, post, route (GPX), pin, photo, summit prompts after a route. The public sign-up page (Make an account) is board `Pg-SignUp`. Not in the mockups: email sign-in link, who invited you, who can see this.

**Profile.** Keep all current profile, account and admin pages. Peaks stay. Challenges show your own progress only. Add recent additions on the profile. Change password and email (check whether it already exists). Dropped: notification settings, display units, visibility settings, routes by month, emergency contact, invite actions, where I go.

**Peaks.** Peak table, search and state filter, been and not yet filter, peak header, route upload prompt. Drop the Friends column. "Who has been here" is a plain list of names. The current peak page only has the "Who has been here" card. The mockup also shows one grouped panel for weather and facts (weather only for peaks that map to a weather place, with a button to the full weather page), routes on this peak and photos from the summit. These are new, so treat them as Phase 2 unless the peak-to-weather-place mapping and the route and photo queries already exist.

**Fishing.** Keep everything on the fishing pages now. The freshwater map is the existing `FishingMap`, restyled.

**Home.** The map is the main part. Keep hero, two main buttons, summit conditions and the map with the recent sheet. Crew activity becomes one "latest activity" row linking to Community. The live conditions panel, alerts, sunrise and sunset, state picker, section links, forecast strip, fishing panel and a recent photos row are shown as a longer page. Use only what the site already has data for.

**Map and Peak Finder.** Keep everything on both pages. For Peak Finder, restyle only the buttons, text and panels. Do not change how the camera, gyro, line up or offline areas work.

**Mountain weather and Conditions and snow.** Keep everything that exists.

## Phase 2: new ideas, all optional

Jake liked these and wants them handed over as context. Most need new data or features, and some would take weeks. They are on the Pick tabs with mockups.

- **Mountain weather and Conditions and snow:** the extra weather modules (Pick tabs "Mountain weather" 21 to 33 and "Conditions and snow" 14 to 24): snowfall by period, snow depth by elevation, summit and valley side by side, last 24 hours at a station, climate normals and records, data freshness, alerts and thunderstorm outlook for saved places, Mansfield snow depth history.
- **Map and Peak Finder:** radar layer, weather alerts on the map, trailheads and lean-tos layer, pin type filter, hazard pins by date (a stored history of hazards), elevation profile for a route, forecast at a point, offline areas on the map, peak details sheet, peaks in view list, sun and moon on the skyline, save the view as an image.
- **Peaks:** trailheads, trail notes, lean-tos, peak map, nearby peaks, visit dates, map of all peaks.
- **Fishing:** tides for a spot, season calendar, recently stocked, flow for the last 7 days, hourly wind for a spot, trip conditions card, pressure trend, recent rain, lake pages, source and freshness on every reading.
- **Home:** saved places.
- **Profile:** download my data, member role and removal (admin).
- **Sign-in and upload:** password requirements as you type, stay signed in, draft saved on this phone, route preview, elevation profile, nearby pins while placing a pin, photo details from the file, upload when signal returns, conditions on a post.

## All routes to restyle

Every page route in `src/app` gets the new look, including ones with no board: `/`, `/account`, `/admin`, `/chat`, `/community`, `/fishing` (and `freshwater`, `guides`, `saltwater`, `stocking`, `[site]`, `saltwater/[slug]`), `/forgot-password`, `/invite/[code]`, `/map`, `/members`, `/mountain-weather` (and `[state]`, `[state]/[section]`, `[state]/[section]/[place]`, `conditions`, `maps`, `snow`, `snow/avalanche`, `snow/avalanche/[slug]`), `/peak-finder`, `/peaks`, `/peaks/[slug]`, `/photos`, `/photos/[id]`, `/pins/[id]`, `/posts`, `/posts/[id]`, `/reset-password`, `/routes/[id]`, `/settings`, `/sign-in`, `/sign-up`, `/upload`, `/user/[username]`, `/user/[username]/[section]`. `/api/*` and `/auth/continue` are not pages.

## Open items

- Competition-adjacent code in the repo (see the first rule). Jake said own visit counts ("x N") may stay, with others shown as plain names.
- The MWAC sample "Moderate" color in the mockups uses the standard #FFF200. The live MWAC data uses #f89406. Use the real data.
- The desktop two-column layouts are a proposal.
