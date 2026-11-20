# UI system: where to change what

Built in the 2026 UI revamp (plan: `ui-revamp-plan.md`, weather sources: `weather-inventory.md`). One rule: **pages use components, components use tokens, tokens live in one file.**

## Change it once, it changes everywhere

| I want to change... | Edit |
|---|---|
| A color (page, text, green, yellow, brown, danger, avalanche, chart) | `src/app/styles/tokens.css` `@theme` |
| Corner radius, bevel width, shadows, gradients, title-bar texture | `tokens.css` (`--radius-*`, `--border-*`, `--shadow-*`, `--gradient-*`) |
| Text sizes, letter spacing (13px floor, 12px only for caps tags) | `tokens.css` (`--text-*`, `--tracking-*`) |
| Animation speeds | `tokens.css` (`--duration-*`, `--ease-soft`); motion rules in `motion.css` |
| How buttons, chips, tags, panels, fields, switches, hero look | `src/app/styles/components.css` |
| Top bar and the menu | `src/components/hub/TopBar.tsx`; menu contents `MENU_SECTIONS` in `src/lib/sections.ts` |
| Back button and breadcrumbs | `BackBar.tsx`, `.back-bar` in `shell.css`, parents in `pageTrail` (`sections.ts`) |
| Weather pieces (tiles, hourly strip, danger scale, freshness line) | `src/components/mountain-weather/kit.tsx` |

## Components (src/components/hub)

`Button`/`buttonClass(kind, size)` (kinds: yellow, green, brown, gray, danger, plain, admin; sizes: sm, md, lg, full, icon), `chipClass`, `Tag`, `Card` (green title bar, `tone="cream"`), `Notice` (empty, error, warn), `PageHero` (`photo` for Home and weather), `HubPage`, `ListRow`, `Switcher`, `Avatar`, `Sheet`.

## Rules

- No raw hex, `retro-*`, arbitrary color classes or raw Tailwind grays in `.tsx`. `npm run check:ui` fails on them. Files that must draw with literal colors (canvas, MapLibre paint, the theme-color meta tag) are listed in `ALLOW` in `scripts/check-ui-tokens.mjs`.
- Rounded boxes use a token radius plus `squircle`. Sunken edges use `bevel-inset` (solid two-tone), not CSS `inset`, which loses its light edge on rounded corners.
- Missing data says so with a `Notice`. Never leave a gap.
- Tap targets 40px (small buttons 32px). Text that cannot break gets `[overflow-wrap:anywhere]`.

## Checking a change

`npm run build && npm run start`, then `npm run shots <label>` writes phone and desktop screenshots to `.ui-shots/<label>/` to compare. In cloud agents start the server with `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` or weather sources show as errors.
