import assert from 'node:assert/strict';
import test from 'node:test';
import { communitySection, HOME_ACTIONS, linkOn, matchSection, pageTrail, settingsHref, visibleLinks, settingsLinks } from './sections';

const nobody = null;

test('a peak crumb is Community / Peaks / name and backs up to the list', () => {
  const trail = pageTrail('/peaks/adk46_algonquin_peak', '', nobody, 'Algonquin Peak');
  assert.equal(trail.parentHref, '/peaks');
  assert.deepEqual(trail.crumbs?.map((crumb) => crumb.label), ['Community', 'Peaks', 'Algonquin Peak']);
});

test('a member crumb is Community / Members / handle', () => {
  const trail = pageTrail('/user/jkiddf', '', nobody);
  assert.equal(trail.parentHref, '/members');
  assert.deepEqual(trail.crumbs?.map((crumb) => crumb.label), ['Community', 'Members', 'jkiddf']);
});

test('a profile list adds the section and backs up to the profile', () => {
  const trail = pageTrail('/user/jkiddf/pins', '', nobody);
  assert.equal(trail.parentHref, '/user/jkiddf');
  assert.deepEqual(trail.crumbs?.map((crumb) => crumb.label), ['Community', 'Members', 'jkiddf', 'Pins']);
});

test('every section page has a breadcrumb, including the parent', () => {
  assert.deepEqual(pageTrail('/community', '', nobody).crumbs?.map((crumb) => crumb.label), ['Community']);
  assert.equal(pageTrail('/community', '', nobody).parentHref, '/');
  assert.deepEqual(pageTrail('/trips', '', nobody).crumbs?.map((crumb) => crumb.label), ['Community', 'Trips']);
  assert.equal(pageTrail('/trips', '', nobody).parentHref, '/community');
  assert.deepEqual(pageTrail('/peaks', '', nobody).crumbs?.map((crumb) => crumb.label), ['Community', 'Peaks']);
  assert.deepEqual(pageTrail('/chat', '', nobody).crumbs?.map((crumb) => crumb.label), ['Community', 'Chat']);
  assert.deepEqual(pageTrail('/gear', '', nobody).crumbs?.map((crumb) => crumb.label), ['Community', 'Gear']);
  assert.deepEqual(pageTrail('/members', '', nobody).crumbs?.map((crumb) => crumb.label), ['Community', 'Members']);
  assert.deepEqual(pageTrail('/map', '', nobody).crumbs?.map((crumb) => crumb.label), ['Map']);
  assert.deepEqual(pageTrail('/upload', '', nobody).crumbs?.map((crumb) => crumb.label), ['Upload']);
  assert.deepEqual(pageTrail('/mountain-weather', '', nobody).crumbs?.map((crumb) => crumb.label), ['Mountain Weather']);
  assert.equal(pageTrail('/mountain-weather', '', nobody).parentHref, '/');
  assert.deepEqual(pageTrail('/mountain-weather', 'state=vt', nobody).crumbs?.map((crumb) => crumb.label), ['Mountain Weather', 'Vermont']);
  assert.equal(pageTrail('/mountain-weather', 'state=ny', nobody).parentHref, '/mountain-weather');
  assert.deepEqual(pageTrail('/fishing', '', nobody).crumbs?.map((crumb) => crumb.label), ['Fishing']);
  assert.equal(pageTrail('/fishing', '', nobody).parentHref, '/');
  assert.equal(pageTrail('/', '', nobody).crumbs, null);
});

test('member pages stay in Community, except your own profile', () => {
  const jake = { handle: 'jake', role: 'admin' as const };
  assert.equal(communitySection('/user/jkiddf', jake), true);
  assert.equal(communitySection('/user/jake', jake), false);
  assert.equal(communitySection('/user/jake/pins', jake), false);
  assert.equal(communitySection('/peaks/adk46_algonquin_peak', null), true);
  assert.equal(linkOn('/user/jkiddf', '', '/members'), true);
  assert.equal(linkOn('/mountain-weather', '', '/mountain-weather?state=ny'), false);
  assert.equal(linkOn('/mountain-weather', 'state=ny', '/mountain-weather?state=ny'), true);
  assert.equal(linkOn('/mountain-weather', '', '/mountain-weather?state=vt'), false);
  assert.equal(linkOn('/mountain-weather', 'state=vt', '/mountain-weather?state=vt'), true);
  assert.equal(linkOn('/mountain-weather', 'state=nh', '/mountain-weather?state=ny'), false);
});

test('settings opens the profile, and the owner also gets Admin', () => {
  const member = { handle: 'jkiddf', role: 'member' as const };
  const owner = { handle: 'jake', role: 'admin' as const };
  assert.equal(settingsHref(member), '/user/jkiddf');
  assert.deepEqual(visibleLinks(settingsLinks(member)).map((link) => link.label), ['Profile']);
  assert.deepEqual(visibleLinks(settingsLinks(owner)).map((link) => link.label), ['Profile', 'Admin']);
  assert.equal(matchSection('/user/jake', '', owner), null);
  assert.equal(matchSection('/user/jkiddf', '', owner)?.id, 'community');
  assert.equal(matchSection('/community', '', owner)?.landing, false);
  assert.equal(matchSection('/account', '', owner), null);
  assert.equal(matchSection('/admin', '', owner), null);
});

test('an upload form sits under Upload', () => {
  const trail = pageTrail('/upload', 'kind=pin', nobody);
  assert.equal(trail.parentHref, '/upload');
  assert.deepEqual(trail.crumbs?.map((crumb) => crumb.label), ['Upload', 'Pin']);
});

test('a trip, pin, route, photo, and gear item name the record', () => {
  assert.equal(pageTrail('/trips/abc', '', nobody, 'Weekend').crumbs?.at(-1)?.label, 'Weekend');
  assert.equal(pageTrail('/pins/abc', '', nobody, 'Lookout').parentHref, '/map');
  assert.equal(pageTrail('/routes/abc', '', nobody, 'Ridge').crumbs?.at(-1)?.label, 'Ridge');
  assert.equal(pageTrail('/photos/abc', '', nobody).crumbs?.at(-1)?.label, 'Photo');
  assert.deepEqual(pageTrail('/photos/abc', '', nobody).crumbs?.map((crumb) => crumb.label), ['Community', 'Photos', 'Photo']);
  assert.deepEqual(pageTrail('/photos', '', nobody).crumbs?.map((crumb) => crumb.label), ['Community', 'Photos']);
  assert.equal(pageTrail('/gear/abc', '', nobody, 'Stove').parentHref, '/gear');
  assert.equal(pageTrail('/trips/new', '', nobody).crumbs?.at(-1)?.label, 'New trip');
});

test('the home hero opens fishing the same way as the other parent sections', () => {
  const fishing = HOME_ACTIONS.find((action) => action.id === 'fishing');
  assert.deepEqual(fishing && visibleLinks(fishing.links).map((link) => [link.href, link.label]), [
    ['/fishing/saltwater', 'Saltwater'],
    ['/fishing/freshwater', 'Freshwater'],
  ]);
  assert.deepEqual(
    HOME_ACTIONS.filter((action) => action.links.length > 0).map((action) => action.label),
    ['Mountain Weather', 'Fishing', 'Community'],
  );
  assert.deepEqual(HOME_ACTIONS.find((action) => action.id === 'map')?.links, []);
});

test('fishing is its own section, outside community', () => {
  assert.equal(communitySection('/fishing'), false);
  assert.equal(communitySection('/fishing/stocking'), false);

  const main = matchSection('/fishing', '', nobody);
  assert.equal(main?.id, 'fishing');
  assert.equal(main?.label, 'Fishing');
  assert.equal(main?.landing, false);
  assert.equal(main?.links.some((link) => link.href === '/fishing/saltwater'), true);
  assert.equal(main?.links.some((link) => link.href === '/fishing/freshwater'), true);
  assert.equal(linkOn('/fishing', '', '/fishing/saltwater'), false);
  assert.equal(linkOn('/fishing/saltwater', '', '/fishing/saltwater'), true);
  assert.equal(linkOn('/fishing/saltwater', '', '/fishing/freshwater'), false);
  assert.equal(linkOn('/fishing/stocking', '', '/fishing/stocking'), true);

  const stocking = pageTrail('/fishing/stocking', '', nobody);
  assert.equal(stocking.parentHref, '/fishing');
  assert.deepEqual(stocking.crumbs?.map((crumb) => crumb.label), ['Fishing', 'Stocking']);

  const guides = pageTrail('/fishing/guides', '', nobody);
  assert.deepEqual(guides.crumbs?.map((crumb) => crumb.label), ['Fishing', 'Guides']);

  const salt = pageTrail('/fishing/saltwater', '', nobody);
  assert.deepEqual(salt.crumbs?.map((crumb) => crumb.label), ['Fishing', 'Saltwater']);
  assert.equal(linkOn('/fishing/saltwater/great-kills', '', '/fishing/saltwater'), true);
  assert.deepEqual(pageTrail('/fishing/saltwater/great-kills', '', nobody, 'Great Kills').crumbs?.map((crumb) => crumb.label), ['Fishing', 'Saltwater', 'Great Kills']);

  assert.equal(linkOn('/fishing/01362500', '', '/fishing/freshwater'), true);
  assert.equal(linkOn('/fishing/01362500', '', '/fishing/saltwater'), false);
  const spot = pageTrail('/fishing/01362500', '', nobody, 'Esopus Creek');
  assert.equal(spot.parentHref, '/fishing/freshwater');
  assert.deepEqual(spot.crumbs?.map((crumb) => crumb.label), ['Fishing', 'Freshwater', 'Esopus Creek']);
  assert.deepEqual(pageTrail('/fishing/01362500', '', nobody).crumbs?.map((crumb) => crumb.label), ['Fishing', 'Freshwater', 'Gauge']);
});
