import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/** Regression: MapLibre needs a non-zero h-full/w-full container (not absolute-only in flex). */
test('OfflineAreaPicker map shell uses flex-1 basis-0 and h-full map container', () => {
  const file = path.join(process.cwd(), 'src/components/peak-finder/OfflineAreaPicker.tsx');
  const src = readFileSync(file, 'utf8');
  assert.match(src, /flex-1 basis-0/);
  assert.match(src, /ref=\{containerRef\} className="h-full w-full"/);
  assert.doesNotMatch(src, /ref=\{containerRef\} className="absolute inset-0"/);
  assert.match(src, /requestAnimationFrame\(\(\) => {\s*\n\s*map\.resize\(\)/);
  assert.match(src, /overflow-hidden/);
  assert.doesNotMatch(src, /9999px/);
  assert.match(src, /scheduleFitWhenReady/);
  assert.match(src, /mountDimOverlayHost/);
  assert.match(src, /createPortal/);
  assert.match(src, /PeakFinderBackButton/);
});
