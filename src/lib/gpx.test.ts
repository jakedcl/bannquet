import assert from 'node:assert/strict';
import test from 'node:test';
import { formatFeetGain, formatMiles, lineWkt, packTrack, parseGpx, simplifyForStorage, simplifyTrack, trackStats, unpackTrack, type TrackPoint } from './gpx';

const SAMPLE = `<?xml version="1.0"?>
<gpx>
  <trk>
    <name>Avalanche Pass &amp; slides</name>
    <trkseg>
      <trkpt lat="44.1500" lon="-73.9500"><ele>500</ele></trkpt>
      <trkpt lat="44.1510" lon="-73.9500"><ele>520</ele></trkpt>
      <trkpt lat="44.1520" lon="-73.9500"><ele>515</ele></trkpt>
      <trkpt lat="44.1530" lon="-73.9500"><ele>545</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

test('a GPX track keeps the name and the points', () => {
  const parsed = parseGpx(SAMPLE);
  assert.equal(parsed.name, 'Avalanche Pass & slides');
  assert.equal(parsed.points.length, 4);
  assert.equal(parsed.points[0]?.lng, -73.95);
  assert.equal(parsed.points[3]?.ele, 545);
});

test('distance and elevation gain come from the points', () => {
  const { points } = parseGpx(SAMPLE);
  const stats = trackStats(points);
  assert.ok(stats.distanceM > 300 && stats.distanceM < 400, `distance ${stats.distanceM}`);
  assert.equal(stats.elevGainM, 50);
});

test('a short downhill bump is not counted as gain', () => {
  const stats = trackStats([
    { lat: 44, lng: -74, ele: 100 },
    { lat: 44.001, lng: -74, ele: 101 },
    { lat: 44.002, lng: -74, ele: 90 },
  ]);
  assert.equal(stats.elevGainM, 0);
});

test('long tracks are shortened without dropping the ends', () => {
  const points = Array.from({ length: 20 }, (_, index) => index);
  const simplified = simplifyTrack(points, 5);
  assert.equal(simplified.length <= 6, true);
  assert.equal(simplified[0], 0);
  assert.equal(simplified.at(-1), 19);
  const wkt = lineWkt([
    { lat: 44, lng: -74, ele: 1 },
    { lat: 44.1, lng: -74.1, ele: 2 },
  ]);
  assert.equal(wkt, 'SRID=4326;LINESTRING(-74 44,-74.1 44.1)');
});

test('a bulky GPX packs under the server action limit and keeps the full totals', () => {
  const noise = `<extensions>${'x'.repeat(900)}</extensions>`;
  const body = Array.from({ length: 1600 }, (_, index) => {
    const lat = (44 + index * 0.0001).toFixed(5);
    const ele = 100 + (index % 20);
    return `<trkpt lat="${lat}" lon="-73.9500"><ele>${ele}</ele>${noise}</trkpt>`;
  }).join('');
  const xml = `<gpx><trk><name>Big hike</name><trkseg>${body}</trkseg></trk></gpx>`;
  assert.ok(xml.length > 1_000_000, `xml length ${xml.length}`);
  const packed = packTrack(xml);
  assert.ok(packed);
  const json = JSON.stringify(packed);
  assert.ok(json.length < 200_000, `packed length ${json.length}`);
  assert.ok(packed.points.length >= 2 && packed.points.length <= 4000);
  assert.equal(packed.name, 'Big hike');
  assert.equal(packed.distanceM, trackStats(parseGpx(xml).points).distanceM);
  assert.equal(packed.elevGainM, trackStats(parseGpx(xml).points).elevGainM);
  const roundTrip = unpackTrack(json);
  assert.equal(roundTrip.error, null);
  assert.equal(roundTrip.track?.distanceM, packed.distanceM);
  assert.equal(roundTrip.track?.points.length, packed.points.length);
});

test('a spike that even spacing skips is kept for the map line', () => {
  const points: TrackPoint[] = [];
  for (let index = 0; index < 3000; index += 1) {
    points.push({ lat: 44, lng: -74 + index * 0.0001, ele: 100 });
  }
  const spike = points[1500];
  if (!spike) throw new Error('missing spike');
  points[1500] = { lat: 44.002, lng: spike.lng, ele: 100 };
  const even = simplifyTrack(points, 800);
  const shaped = simplifyForStorage(points);
  assert.equal(even.some((point) => point.lat > 44.001), false);
  assert.equal(shaped.some((point) => point.lat > 44.001), true);
  assert.ok(shaped.length < 4000);
});

test('a packed route with bad numbers is refused', () => {
  const bad = unpackTrack(JSON.stringify({
    name: 'Nope',
    points: [{ lat: 44, lng: -74, ele: 1 }, { lat: 44.1, lng: -74.1, ele: 2 }],
    distanceM: 9_000_000,
    elevGainM: 10,
  }));
  assert.equal(bad.track, null);
  assert.equal(bad.error, 'That route could not be read.');
});

test('miles and feet are the labels friends read', () => {
  assert.equal(formatMiles(1609.344), '1.0 mi');
  assert.equal(formatFeetGain(304.8), '1,000 ft up');
});
