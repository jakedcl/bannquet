# UI bugs and follow-ups

Running list after the UI revamp (merged to `main` 2026-11-20). Add new items at the top of "Open". When one is fixed, move it to "Done" with the PR.

## Open

### To check on the Vercel preview (not testable without the database or a phone)
- [ ] Community: photos grid, pins and routes feed, members row, profile avatar button.
- [ ] Home: map card with newest pins and routes, recent photos row.
- [ ] Profile, members, posts, photos, pins, routes and chat pages with real data.
- [ ] Upload flow (post, route, pin, photo) and the summit prompts after a route.
- [ ] Admin page, invite links, pending-approval banner, sign-up with approval.
- [ ] Peak Finder on a phone: camera, gyro, line-up, offline areas (only button, text and panel styles changed).
- [ ] Dialogs (attach picker, post attachments, chat): they keep their own styling and were not redone to the new look.

### Known gaps
- [ ] Weather place tabs: `?tab=` links reload the page; check scroll position and speed on a phone.
- [ ] Back goes up one level, so a pin or route returns to Community, not to the map it was opened from. Confirm this feels right.
- [ ] Stocking and Guides under Fishing are redirects to Freshwater (Stocking opens its tab). Decide whether they should be real pages.
- [ ] Next.js 16.4.3 security notice on `npm run build` (parked with Dependabot #55, `docs/internal/parked.md`).
- [ ] `src/lib/mountain-weather/more-sources-links.test.ts` pings about 40 outside sites. It fails whenever the network blocks them (cloud agents), so it is not a reliable check.

### Phase 2 ideas (need new data or features; see the handoff on the `design-handoff-clean` branch)
Forecast for a peak and saved places on Home, peak page weather panel, snowfall by period, snow depth by elevation, summit and valley side by side, climate normals, alerts for saved places, map layers, fishing extras.

### New bugs
<!-- Add them here, newest first. -->

## Done
- [x] Back bar (beige strip under the top bar) thinner: 52px to 44px, 32px Back button.
- [x] Recreation forecast fields written as "Null" by NWS showed the word Null; now shown as a dash.
