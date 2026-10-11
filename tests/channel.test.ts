// tests/channel.test.ts
import { describe, it, expect } from 'vitest';
import { Xoshiro128Plus } from '../src/core/prng';
import { addAwgn } from '../src/core/channel';

describe('AWGN Channel', () => {
  it('output length equals input length', () => {
    const prng = new Xoshiro128Plus(42);
    const input = new Float64Array(100);
    const output = addAwgn(input, 10, 2, prng);
    expect(output.length).toBe(100);
    expect(output).not.toBe(input); // Does not mutate original reference
  });

  it('noise variance at snrDb=0, bitsPerSymbol=1 is within 3% of 0.5', () => {
    const prng = new Xoshiro128Plus(123456);
    const numSamples = 20000;
    const input = new Float64Array(numSamples); // All zeros, output is pure noise
    const output = addAwgn(input, 0, 1, prng);

    let sum = 0;
    for (let i = 0; i < numSamples; i++) {
      sum += output[i];
    }
    const mean = sum / numSamples;

    let varSum = 0;
    for (let i = 0; i < numSamples; i++) {
      varSum += (output[i] - mean) ** 2;
    }
    const measuredVar = varSum / (numSamples - 1);

    // Target = 0.5, 3% tolerance = [0.485, 0.515]
    expect(measuredVar).toBeGreaterThan(0.485);
    expect(measuredVar).toBeLessThan(0.515);
  });

  it('at very high SNR (100dB), output ≈ input (max diff < 1e-4)', () => {
    const prng = new Xoshiro128Plus(777);
    const input = new Float64Array([1.0, -1.0, 0.5, -0.5, 2.0, -2.0]);
    const output = addAwgn(input, 100, 2, prng);

    let maxDiff = 0;
    for (let i = 0; i < input.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(output[i] - input[i]));
    }
    expect(maxDiff).toBeLessThan(1e-4);
  });

  it('Box-Muller produces near-zero mean (|mean| < 0.05 for 10000 samples)', () => {
    const prng = new Xoshiro128Plus(999);
    const numSamples = 10000;
    const input = new Float64Array(numSamples);
    const output = addAwgn(input, 5, 2, prng);

    let sum = 0;
    for (let i = 0; i < numSamples; i++) {
      sum += output[i];
    }
    const mean = sum / numSamples;
    expect(Math.abs(mean)).toBeLessThan(0.05);
  });
});
