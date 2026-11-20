# UI revamp plan

Whole-site restyle and restructure from the design handoff. The handoff (`HANDOFF.md`, 69 board screenshots and their source HTML) lives on the `design-handoff-clean` branch under `docs/design-handoff/`.

## How to use the handoff

- **The look is copied.** Colors, radii, bevels, gradients, title bars, tags, buttons, type and motion come from the boards' inline styles (exact values, tallied across all 69 boards).
- **The structure is a strong suggestion.** Page layouts, grouping and new patterns (place-page tabs, source and freshness lines, empty and error states) guide the rebuild, weather above all. Today's weather pages stack every source on one page. They get reorganized, not just recolored.
- **The repo wins on facts.** The boards were made without full knowledge of the code or the weather sources. Routes, data, sources and behavior come from the repo.
- **No data is cut silently.** Everything the site shows today keeps a place. More is better than less. Before a page group is rebuilt, inventory every source and section it shows and map each one to its new home. Anything that looks low-value is flagged to Jake, not dropped.
- **No new features or data in Phase 1.** Phase 2 ideas in the handoff wait for Jake's approval, one item at a time.

## Decisions (Jake, 2026-11-19)

1. **Type floor:** keep the 13px floor for small text and 16px body on phones. 12px only for bold uppercase tags and eyebrows. The boards' 11–12px text is mapped up.
2. **Home:** becomes the scrolling page from the board, with a **static map preview** that opens `/map` (no second MapLibre instance). "Forecast for a peak" is Phase 2.
3. **Navigation:** hamburger menu everywhere, including desktop. Remove the bottom tab bar and the desktop bar links and dropdowns.
4. **Place page tabs:** Forecast, Measured, Snow, Maps, More, driven by `?tab=` so each tab only fetches its own sources. A place only shows tabs that have data.
5. **Challenges:** challenge cards show on anyone's profile (that person's own progress). The "See what others have done" button stays and links to Members.
6. **Peak page panel** (weather and facts, routes on this peak, summit photos): check what data already exists, report, then build only what exists.
7. **Dark mode:** out of scope.
8. **Branches and PRs:** one PR per stage, branches named `ui-revamp/stage-N-<what>`, each based on the previous stage.

## Rules carried over

AGENTS.md applies (commits, DB, redirects, route privacy, images). No database, auth or API changes. No competition between members (handoff "No competition" list). Units stay mi, ft, °F. Every page has a menu entry or hub parent, a back button one level up, and is within three taps of Home (`Pg-RouteMap`). Tap targets 40px (small 32px). Missing data says so.

## Stages

Each stage is one PR with `lint`, `typecheck`, `test`, `build` and a screenshot comparison.

### Stage 0: setup (no visual change)
- Split `globals.css` into `src/app/styles/` (tokens, base, retro, peak-finder, motion, hub). Compiled CSS has the same rules.
- `npm run shots`: Playwright screenshots of key routes at 390px and 1280px into `.ui-shots/<label>/`.
- `npm run check:ui`: counts styling that bypasses tokens (raw hex, `retro-*`, arbitrary colors, raw grays). Report-only until Stage 5.
- This plan.

### Stage 1: tokens
One semantic token set in `styles/tokens.css`, replacing the legacy `@theme` colors and the `--ui-*` layer (old names kept as aliases until Stage 5):
- Color: page `#ece6d8`, surfaces white / cream `#faf6ee` / gray `#e8e6e1` `#e0dac8`, hairline `#d6d0c2`, text `#1a1a1a` `#555` `#777`, greens `#4a7c2a` `#2d5016` `#1a3009`, yellow `#ffd700`→`#ffb300` (edge `#cc9900`), brown `#8b5a2b`→`#5c3a1e`, danger, warn.
- Radius 6 / 14 / 18 / 24, hero bottom 36, with `corner-shape: squircle` (plain radius where unsupported).
- Borders: 3px outset panels, 2px outset/inset controls. Shadows: panel, button bevel, bar, focus ring.
- Gradients: green title bar with wood lines, yellow, brown, page stripe. Type scale and letter spacing. Motion durations 120–260ms.

### Stage 2: primitives
Restyle and consolidate `src/components/hub/*` and `src/components/ui/*` against `Kit-Components`, `Kit-Controls` and `Wx-Kit`:
- One `Button` (kinds yellow, green, brown, gray, plain, danger; sizes 32/40/44/full) replacing `HubButton`, tone `Button`, `chipClass`, `smallButtonClass`.
- `Chip`, segmented `Switcher`, `Tag` (outline, arrow, alert levels), `Card` (title bar, action, cream, collapsible), `Notice` (empty, error, not in forecast), `ListRow`, `PageHero`, `BackBar`, `SearchBar`, form fields, `Sheet`, dialog, toast, upload and progress, avatar and badge.
- Weather kit: reading tiles, source and freshness line, 48-hour strip with charts, period row, avalanche scale and rose, wind arrow, link-only rows, map tile.
- Build only controls the repo uses.

### Stage 3: shell and navigation
Remove `TabBar` and every `--tab-h` use. Restyle `TopBar` and the menu (`Pg-Menu`), hamburger at every width. Menu entries for every page; fix links to `/routes` and `/pins`, which only redirect. One route-parent table drives every back bar. Route and load motion in CSS, off under reduced motion.

### Stage 4: pages, in groups (one PR each)
1. Mountain weather: inventory every source first, then hub, state, section, place (tabs), conditions, snow, avalanche, maps.
2. Community, posts, photos, pins and routes, chat, members, profile.
3. Peaks: list and detail; remove the Friends column and others' visit counts.
4. Fishing: all routes and the map.
5. Sign-in, sign-up, invite, password pages, waiting, settings, account, admin, upload flow.
6. Map and Peak Finder: chrome only; camera, gyro, line-up and offline logic untouched.
7. Home.

### Stage 5: cleanup
Delete the retro CSS, token aliases and dead classes. `check:ui --strict` in the checks. 320px stress pass (`Wx-Stress`), accessibility pass, final screenshots. Update AGENTS.md (Framer Motion is no longer a dependency; `/trips` redirects to `/posts`).

## Local screenshots in cloud agents

The `bannquet` cloud environment allows the weather, map and water hosts. Start the server with `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npx next start -p 3000`. Signed-in pages need the preview DB and the `bqtester` cookie (`SHOTS_COOKIE`), or check them on the Vercel preview.
