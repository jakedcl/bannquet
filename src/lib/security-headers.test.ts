import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PEAK_FINDER_PERMISSIONS_POLICY,
  SITE_PERMISSIONS_POLICY,
  permissionsPolicyFor,
  securityHeaderRules,
} from './security-headers';

test('other pages still block the camera', () => {
  assert.equal(permissionsPolicyFor('/'), SITE_PERMISSIONS_POLICY);
  assert.equal(permissionsPolicyFor('/map'), SITE_PERMISSIONS_POLICY);
  assert.equal(permissionsPolicyFor('/peaks'), SITE_PERMISSIONS_POLICY);
  assert.match(SITE_PERMISSIONS_POLICY, /camera=\(\)/);
  assert.doesNotMatch(SITE_PERMISSIONS_POLICY, /camera=\(self\)/);
  const rules = securityHeaderRules();
  const site = rules.filter((rule) => rule.source !== '/peak-finder');
  assert.ok(site.length >= 1);
  for (const rule of site) {
    const policy = rule.headers.find((header) => header.key === 'Permissions-Policy')?.value ?? '';
    assert.match(policy, /camera=\(\)/);
    assert.doesNotMatch(policy, /camera=\(self\)/);
    assert.match(policy, /microphone=\(\)/);
  }
});

test('only /peak-finder allows the camera and motion sensors', () => {
  assert.equal(permissionsPolicyFor('/peak-finder'), PEAK_FINDER_PERMISSIONS_POLICY);
  assert.match(PEAK_FINDER_PERMISSIONS_POLICY, /camera=\(self\)/);
  assert.match(PEAK_FINDER_PERMISSIONS_POLICY, /geolocation=\(self\)/);
  assert.match(PEAK_FINDER_PERMISSIONS_POLICY, /accelerometer=\(self\)/);
  assert.match(PEAK_FINDER_PERMISSIONS_POLICY, /gyroscope=\(self\)/);
  assert.match(PEAK_FINDER_PERMISSIONS_POLICY, /magnetometer=\(self\)/);
  assert.match(PEAK_FINDER_PERMISSIONS_POLICY, /microphone=\(\)/);
  assert.doesNotMatch(PEAK_FINDER_PERMISSIONS_POLICY, /camera=\(\)/);
  const peak = securityHeaderRules().find((rule) => rule.source === '/peak-finder');
  assert.ok(peak);
  assert.equal(
    peak?.headers.find((header) => header.key === 'Permissions-Policy')?.value,
    PEAK_FINDER_PERMISSIONS_POLICY,
  );
});
