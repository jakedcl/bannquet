#!/usr/bin/env node
/** Download recent REC products (~7 days) for BTV/ALY/GYX/CAR into fixtures. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'src/lib/mountain-weather/fixtures/rec-history');
const OFFICES = ['BTV', 'ALY', 'GYX', 'CAR'];
const UA = 'Bannquet-Weather-App (admin@bannquet.com)';

async function fetchOffice(office) {
  const listUrl = `https://api.weather.gov/products/types/REC/locations/${office}`;
  const listRes = await fetch(listUrl, { headers: { 'User-Agent': UA, Accept: 'application/ld+json' } });
  if (!listRes.ok) throw new Error(`${office} list HTTP ${listRes.status}`);
  const list = await listRes.json();
  const graph = list['@graph'] ?? [];
  const manifest = [];
  const dir = path.join(OUT, office);
  fs.mkdirSync(dir, { recursive: true });

  for (const meta of graph) {
    const productUrl = `https://api.weather.gov/products/${meta.id}`;
    const productRes = await fetch(productUrl, { headers: { 'User-Agent': UA, Accept: 'application/ld+json' } });
    if (!productRes.ok) continue;
    const product = await productRes.json();
    const text = product.productText ?? '';
    if (!text.trim()) continue;
    const issuanceTime = product.issuanceTime ?? meta.issuanceTime ?? null;
    const safe = (issuanceTime ?? meta.id).replace(/[:+]/g, '-');
    const fileName = `${safe}.txt`;
    fs.writeFileSync(path.join(dir, fileName), text);
    manifest.push({ fileName, issuanceTime, productId: meta.id, sourceUrl: productUrl });
  }

  fs.writeFileSync(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`${office}: ${manifest.length} products`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const office of OFFICES) {
    await fetchOffice(office);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});