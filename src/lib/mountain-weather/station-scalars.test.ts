import assert from 'node:assert/strict';
import test from 'node:test';
import type { NwsStationLatest } from '@/lib/mountain-weather/mansfield-types';
import { stationMeasuredScalars } from '@/lib/mountain-weather/station-scalars';

test('stationMeasuredScalars converts °C and km/h like KMWN-class obs', () => {
  const station: NwsStationLatest = {
    stationId: 'KMWN',
    stationName: 'Mount Washington',
    timestamp: '2026-11-14T18:00:00+00:00',
    fields: [
      { key: 'temperature', label: 'Temperature', value: -7, unit: '°C', qualityControl: null, qcFailed: false },
      { key: 'windSpeed', label: 'Wind speed', value: 31.68, unit: 'km/h', qualityControl: null, qcFailed: false },
      { key: 'windGust', label: 'Wind gust', value: null, unit: 'km/h', qualityControl: 'Z', qcFailed: true },
      { key: 'windChill', label: 'Wind chill', value: -15.6, unit: '°C', qualityControl: null, qcFailed: false },
    ],
  };
  const s = stationMeasuredScalars(station);
  assert.equal(s.tempF, 19);
  assert.equal(s.windMph, 20);
  assert.equal(s.gustMph, null);
  assert.equal(s.windChillF, 4);
});