import assert from 'node:assert/strict';
import test from 'node:test';
import { gridElevationFt } from '@/lib/grid-series';

test('gridElevationFt converts wmoUnit:m via unitCode', () => {
  const ft = gridElevationFt({ value: 1722, unitCode: 'wmoUnit:m' });
  assert.equal(ft, 5650);
});

test('gridElevationFt converts wmoUnit:ft', () => {
  assert.equal(gridElevationFt({ value: 6288, unitCode: 'wmoUnit:ft' }), 6288);
});