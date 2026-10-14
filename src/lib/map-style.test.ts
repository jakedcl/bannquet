import assert from 'node:assert/strict';
import test from 'node:test';
import { BASEMAP_ATTRIBUTION, TERRAIN_ATTRIBUTION } from './map';
import { styleForBasemap } from './map-style';

const STYLE = {
  version: 8,
  sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'background', type: 'background' },
    { id: 'water', type: 'fill', source: 'openmaptiles' },
    { id: 'place', type: 'symbol', source: 'openmaptiles' },
  ],
};

test('standard keeps OpenFreeMap and the other layers use free rasters', () => {
  const standard = styleForBasemap(STYLE, 'standard');
  assert.equal(standard.layers?.some((layer) => layer.id === 'water'), true);
  assert.equal(BASEMAP_ATTRIBUTION.standard.includes('OpenFreeMap'), true);

  const topo = styleForBasemap(STYLE, 'topo');
  assert.deepEqual(topo.layers?.map((layer) => layer.id), ['bannquet-raster']);
  assert.equal(JSON.stringify(topo.sources).includes('USGSTopo'), true);
  assert.equal(BASEMAP_ATTRIBUTION.topo.includes('USGS'), true);

  const satellite = styleForBasemap(STYLE, 'satellite');
  assert.deepEqual(satellite.layers?.map((layer) => layer.type), ['raster']);
  assert.equal(JSON.stringify(satellite.sources).includes('USGSImageryOnly'), true);

  const hybrid = styleForBasemap(STYLE, 'hybrid');
  assert.deepEqual(hybrid.layers?.map((layer) => layer.id), ['bannquet-raster', 'place']);
  assert.equal(BASEMAP_ATTRIBUTION.hybrid.includes('OpenStreetMap'), true);
  assert.equal(TERRAIN_ATTRIBUTION.includes('Terrarium'), true);
  assert.equal(STYLE.layers.length, 3);
});
