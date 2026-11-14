import assert from 'node:assert/strict';
import test from 'node:test';
import elevationCheck from '../../../config/mountain-weather/place-elevation-check.json';

type Row = {
  catalogElevationFt?: number;
  sampledElevationFt?: number;
  deltaFt?: number;
  withinTolerance?: boolean;
  skipped?: boolean;
  error?: string;
};

const file = elevationCheck as {
  toleranceFt: number;
  places: Record<string, Row>;
};

test('catalog elevationFt matches terrain sample at GNIS coords within tolerance', () => {
  const failures: string[] = [];
  for (const [id, row] of Object.entries(file.places)) {
    if (row.skipped || row.error || row.withinTolerance == null) continue;
    if (row.withinTolerance === false) {
      failures.push(
        `${id}: catalog=${row.catalogElevationFt} sampled=${row.sampledElevationFt} delta=${row.deltaFt}`,
      );
    }
  }
  assert.deepEqual(
    failures,
    [],
    `Re-run: node scripts/mountain-weather/check-place-elevations.mjs (tolerance ${file.toleranceFt} ft)`,
  );
});