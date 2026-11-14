import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import bindingsJson from '../../../config/mountain-weather/source-bindings.json';
import { parseRecBulletin, pickRecSectionFromMatches } from '@/lib/mountain-weather/parse/rec';
import type { RecPlaceBinding } from '@/lib/mountain-weather/source-bindings';

const FIX = path.resolve(process.cwd(), 'src/lib/mountain-weather/fixtures/rec-history');
const OFFICES = ['BTV', 'ALY', 'GYX', 'CAR'] as const;

type BindingsFile = { places: Record<string, { rec?: RecPlaceBinding | RecPlaceBinding[] }> };

function asRecList(raw: RecPlaceBinding | RecPlaceBinding[] | undefined): RecPlaceBinding[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function needles(binding: RecPlaceBinding): string[] {
  return binding.sectionMatches?.length ? binding.sectionMatches : [binding.sectionMatch];
}

function resolveInBulletin(
  bulletin: ReturnType<typeof parseRecBulletin>,
  binding: RecPlaceBinding,
): 'matched' | 'not-in-issuance' {
  return pickRecSectionFromMatches(bulletin, needles(binding)) ? 'matched' : 'not-in-issuance';
}

function loadFixtures(office: (typeof OFFICES)[number]) {
  const dir = path.join(FIX, office);
  const manifestPath = path.join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { fileName: string; issuanceTime: string | null }[];
  return manifest.map((row) => {
    const text = readFileSync(path.join(dir, row.fileName), 'utf8');
    const bulletin = parseRecBulletin(text, row.issuanceTime, row.fileName);
    return { ...row, bulletin };
  });
}

test('every bound place resolves per REC fixture or is explicitly not-in-issuance', () => {
  const bindings = bindingsJson as BindingsFile;
  const failures: string[] = [];

  for (const office of OFFICES) {
    const fixtures = loadFixtures(office);
    assert.ok(fixtures.length > 0, `expected REC fixtures under ${office}`);

    for (const [placeId, row] of Object.entries(bindings.places)) {
      for (const binding of asRecList(row.rec)) {
        if (binding.office !== office) continue;
        for (const fixture of fixtures) {
          const outcome = resolveInBulletin(fixture.bulletin, binding);
          if (outcome !== 'matched' && outcome !== 'not-in-issuance') {
            failures.push(`${placeId} ${office} ${fixture.fileName}: ${outcome}`);
          }
        }
      }
    }
  }

  assert.equal(failures.length, 0, failures.slice(0, 20).join('\n'));
});

test('mount-marcy BTV binding matches combined Higher Summits header', () => {
  const bindings = bindingsJson as BindingsFile;
  const binding = asRecList(bindings.places['mount-marcy']?.rec).find((b) => b.office === 'BTV');
  assert.ok(binding);
  const btvDir = path.join(FIX, 'BTV');
  const files = readdirSync(btvDir).filter((f) => f.endsWith('.txt'));
  let sawCombined = false;
  for (const fileName of files) {
    const text = readFileSync(path.join(btvDir, fileName), 'utf8');
    if (!/Vermont and Northern New York/i.test(text)) continue;
    sawCombined = true;
    const bulletin = parseRecBulletin(text, null, fileName);
    const hit = pickRecSectionFromMatches(bulletin, needles(binding));
    assert.ok(hit, `expected Marcy needles to match combined bulletin ${fileName}`);
    break;
  }
  assert.ok(sawCombined, 'expected at least one combined BTV bulletin in fixtures');
});