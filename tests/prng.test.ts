// tests/prng.test.ts
import { describe, it, expect } from 'vitest';
import { Xoshiro128Plus } from '../src/core/prng';

describe('Xoshiro128Plus PRNG', () => {
  it('next() returns values in [0, 1)', () => {
    const rng = new Xoshiro128Plus(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic with identical seeds', () => {
    const rng1 = new Xoshiro128Plus(0x12345678);
    const rng2 = new Xoshiro128Plus(0x12345678);
    for (let i = 0; i < 5; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('passes chi-squared uniformity test (1000 samples, 10 bins, p > 0.05)', () => {
    const rng = new Xoshiro128Plus(42);
    const bins = new Array(10).fill(0);
    const numSamples = 1000;

    for (let i = 0; i < numSamples; i++) {
      const val = rng.next();
      const binIndex = Math.min(9, Math.floor(val * 10));
      bins[binIndex]++;
    }

    const expected = numSamples / 10; // 100
    let chiSq = 0;
    for (let i = 0; i < 10; i++) {
      chiSq += ((bins[i] - expected) ** 2) / expected;
    }

    // Critical value for df = 9, alpha = 0.05 is 16.919
    expect(chiSq).toBeLessThan(16.919);
  });

  it('nextInt() returns non-negative integers', () => {
    const rng = new Xoshiro128Plus(999);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
