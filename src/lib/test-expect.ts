import assert from 'node:assert/strict';

/** A small `expect` for tests ported from vitest, on top of node:assert. */
export function expect(actual: unknown) {
  const n = actual as number;
  return {
    toBe: (expected: unknown) => assert.strictEqual(actual, expected),
    toEqual: (expected: unknown) => assert.deepStrictEqual(actual, expected),
    toBeNull: () => assert.strictEqual(actual, null),
    toBeCloseTo: (expected: number, digits = 2) =>
      assert.ok(Math.abs(n - expected) < 10 ** -digits / 2, `${n} is not close to ${expected}`),
    toBeGreaterThan: (other: number) => assert.ok(n > other, `${n} is not > ${other}`),
    toBeGreaterThanOrEqual: (other: number) => assert.ok(n >= other, `${n} is not >= ${other}`),
    toBeLessThan: (other: number) => assert.ok(n < other, `${n} is not < ${other}`),
    toBeLessThanOrEqual: (other: number) => assert.ok(n <= other, `${n} is not <= ${other}`),
  };
}
