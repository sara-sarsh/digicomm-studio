// tests/pulse-shaping.test.ts
import { describe, it, expect } from 'vitest';
import { raisedCosine, rootRaisedCosine, applyFilter } from '../src/core/pulse-shaping';

describe('Pulse Shaping Filters', () => {
  it('RC filter: sum of squared coefficients ≈ 1/T (energy check, 5% tolerance)', () => {
    const T = 1;
    const fs = 8;
    const N = 31;
    const h = raisedCosine(N, 0.35, T, fs);

    let sumSq = 0;
    for (let i = 0; i < N; i++) {
      sumSq += h[i] * h[i];
    }

    const expectedEnergy = 1 / T;
    expect(Math.abs(sumSq - expectedEnergy) / expectedEnergy).toBeLessThan(0.05);
  });

  it('RRC * RRC convolution approximates ideal band-limited pulse (ISI check: sample at T spacing should be ≈ 1 at center, ≈ 0 elsewhere, tolerance 0.015)', () => {
    const alpha = 0.35;
    const N = 31;
    const T = 1;
    const fs = 8;

    const rrc = rootRaisedCosine(N, alpha, T, fs);
    const pulse = applyFilter(rrc, rrc);

    const mid = pulse.length >> 1;
    // Center sample ≈ 1.0
    expect(pulse[mid]).toBeCloseTo(1.0, 2);

    // At symbol spacing T (8 samples), ISI ≈ 0
    expect(Math.abs(pulse[mid - 8])).toBeLessThan(0.015);
    expect(Math.abs(pulse[mid + 8])).toBeLessThan(0.015);
  });

  it('RRC filter length equals N', () => {
    const N = 45;
    const rrc = rootRaisedCosine(N, 0.25, 1, 8);
    expect(rrc.length).toBe(N);
  });

  it('applyFilter output length = signal.length + coeffs.length - 1', () => {
    const signal = new Float64Array(100);
    const coeffs = new Float64Array(31);
    const out = applyFilter(signal, coeffs);
    expect(out.length).toBe(100 + 31 - 1);
  });
});
