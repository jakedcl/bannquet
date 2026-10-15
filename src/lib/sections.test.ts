import assert from 'node:assert/strict';
import test from 'node:test';
import { communitySection, linkOn, matchSection, pageTrail, settingsHref, visibleLinks, settingsLinks } from './sections';

const nobody = null;

test('a peak crumb is Peaks / name and backs up to the list', () => {
  const trail = pageTrail('/peaks/adk46_algonquin_peak', '', nobody, 'Algonquin Peak');
  assert.equal(trail.parentHref, '/peaks');
  assert.deepEqual(trail.crumbs?.map((crumb) => crumb.label), ['Peaks', 'Algonquin Peak']);
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

test('section pages back up to home and show no breadcrumb', () => {
  for (const path of ['/community', '/peaks', '/members', '/chat', '/trips', '/gear', '/map', '/mountain-weather', '/upload']) {
    const trail = pageTrail(path, '', nobody);
    assert.equal(trail.parentHref, '/', path);
    assert.equal(trail.crumbs, null, path);
  }
});

test('member pages stay in Community, except your own profile', () => {
  const jake = { handle: 'jake', role: 'admin' as const };
  assert.equal(communitySection('/user/jkiddf', jake), true);
  assert.equal(communitySection('/user/jake', jake), false);
  assert.equal(communitySection('/user/jake/pins', jake), false);
  assert.equal(communitySection('/peaks/adk46_algonquin_peak', null), true);
  assert.equal(linkOn('/user/jkiddf', '', '/members'), true);
  assert.equal(linkOn('/mountain-weather', '', '/mountain-weather?state=ny'), true);
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
  assert.equal(pageTrail('/gear/abc', '', nobody, 'Stove').parentHref, '/gear');
  assert.equal(pageTrail('/trips/new', '', nobody).crumbs?.at(-1)?.label, 'New trip');
});
