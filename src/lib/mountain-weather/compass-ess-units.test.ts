import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeCompassEssFields } from '@/lib/mountain-weather/parse/compass-ess-units';

test('decodeCompassEssFields documents TMDD tenths', () => {
  const fields = decodeCompassEssFields({ airTemp: -10, visibility: 20000, barometricPressure: 9987 });
  assert.match(fields.airTemp.display ?? '', /30\.2°F/);
  assert.match(fields.visibility.display ?? '', /12\.4 mi/);
  assert.match(fields.barometricPressure.display ?? '', /998\.7 hPa/);
});