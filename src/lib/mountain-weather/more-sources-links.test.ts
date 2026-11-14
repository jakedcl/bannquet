import assert from 'node:assert/strict';
import test from 'node:test';
import { allOutboundMoreSourceLinks } from '@/lib/mountain-weather/more-sources';

const SKIP_LINK_CHECK = new Set<string>();
const SKIP_LINK_PREFIXES = [
  'https://forecast.weather.gov/product.php',
  'https://api.weather.gov/products/types/',
  'https://data.cocorahs.org/',
  'https://mesonet.agron.iastate.edu/',
];

test('outbound more-sources links return non-4xx/5xx', { timeout: 120_000 }, async () => {
  const links = allOutboundMoreSourceLinks();
  assert.ok(links.length > 20);
  const failures: string[] = [];
  const UA = 'Bannquet-Mountain-Weather-Link-Check';
  const concurrency = 6;
  let i = 0;
  async function worker() {
    while (i < links.length) {
      const idx = i++;
      const href = links[idx];
      if (SKIP_LINK_CHECK.has(href) || SKIP_LINK_PREFIXES.some((p) => href.startsWith(p))) continue;
      try {
        const res = await fetch(href, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': UA, Accept: '*/*' },
        });
        if (res.status >= 400) {
          const get = await fetch(href, {
            redirect: 'follow',
            headers: { 'User-Agent': UA, Accept: '*/*' },
          });
          if (get.status >= 400) failures.push(`${get.status} ${href}`);
        }
      } catch (err) {
        failures.push(`${href}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  assert.equal(failures.length, 0, failures.join('\n'));
});