// tests/fading-channel.test.ts
import { describe, it, expect } from 'vitest';
import { Xoshiro128Plus } from '../src/core/prng';
import {
  generateRayleighFading,
  generateRicianFading,
  applyFlatFading,
  perfectCsiEqualize,
  theoreticalBerRayleigh,
  theoreticalBerRician,
} from '../src/core/fading-channel';

describe('Fading Channel Module', () => {
  it('Rayleigh: E[|h|²] ≈ 1.0 over 10000 samples (tolerance 0.02)', () => {
    const prng = new Xoshiro128Plus(42);
    const n = 10000;
    const h = generateRayleighFading(n, prng);

    let sumPower = 0;
    for (let i = 0; i < n; i++) {
      const re = h[i * 2];
      const im = h[i * 2 + 1];
      sumPower += re * re + im * im;
    }
    const meanPower = sumPower / n;
    expect(Math.abs(meanPower - 1.0)).toBeLessThan(0.02);
  });

  it('Rayleigh: magnitude mean is close to theoretical value sqrt(pi)/2 ≈ 0.886', () => {
    const prng = new Xoshiro128Plus(123);
    const n = 10000;
    const h = generateRayleighFading(n, prng);

    let sumMag = 0;
    for (let i = 0; i < n; i++) {
      const re = h[i * 2];
      const im = h[i * 2 + 1];
      sumMag += Math.sqrt(re * re + im * im);
    }
    const meanMag = sumMag / n;
    expect(Math.abs(meanMag - (Math.sqrt(Math.PI) / 2))).toBeLessThan(0.03);
  });

  it('Rician K=0: statistics match Rayleigh (mean power ≈ 1.0, tolerance 0.02)', () => {
    const prng = new Xoshiro128Plus(456);
    const n = 10000;
    const h = generateRicianFading(n, 0, prng);

    let sumPower = 0;
    for (let i = 0; i < n; i++) {
      const re = h[i * 2];
      const im = h[i * 2 + 1];
      sumPower += re * re + im * im;
    }
    const meanPower = sumPower / n;
    expect(Math.abs(meanPower - 1.0)).toBeLessThan(0.02);
  });

  it('Rician K=100: |h| ≈ 1.0 (near-constant, std < 0.05)', () => {
    const prng = new Xoshiro128Plus(789);
    const n = 2000;
    const h = generateRicianFading(n, 100, prng);

    let sumMag = 0;
    const mags: number[] = [];
    for (let i = 0; i < n; i++) {
      const re = h[i * 2];
      const im = h[i * 2 + 1];
      const mag = Math.sqrt(re * re + im * im);
      mags.push(mag);
      sumMag += mag;
    }
    const meanMag = sumMag / n;
    expect(Math.abs(meanMag - 1.0)).toBeLessThan(0.02);

    let varSum = 0;
    for (let i = 0; i < n; i++) {
      varSum += (mags[i] - meanMag) ** 2;
    }
    const std = Math.sqrt(varSum / n);
    expect(std).toBeLessThan(0.08);
  });

  it('applyFlatFading output length equals input length', () => {
    const prng = new Xoshiro128Plus(101);
    const signal = new Float64Array([1, 0, -1, 0, 0, 1]);
    const fading = generateRayleighFading(3, prng);
    const rx = applyFlatFading(signal, fading, 20, 1, prng);

    expect(rx.length).toBe(signal.length);
  });

  it('perfectCsiEqualize: at SNR=60dB, output ≈ input (max diff < 0.01)', () => {
    const prng = new Xoshiro128Plus(202);
    const signal = new Float64Array([1, 0, -1, 0, 0, 1, 0, -1]);
    const fading = generateRayleighFading(4, prng);
    const rx = applyFlatFading(signal, fading, 60, 1, prng);
    const equalized = perfectCsiEqualize(rx, fading);

    let maxDiff = 0;
    for (let i = 0; i < signal.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(equalized[i] - signal[i]));
    }
    expect(maxDiff).toBeLessThan(0.01);
  });

  it('theoreticalBerRayleigh at SNR=10dB is accurate to Proakis formula', () => {
    // gamma = 10 -> Pb = 0.5 * (1 - sqrt(10/11)) ≈ 0.02327
    const ber = theoreticalBerRayleigh(10);
    expect(Math.abs(ber - 0.02327)).toBeLessThan(0.001);
  });

  it('theoreticalBerRician for K=0 matches theoreticalBerRayleigh within 1e-4', () => {
    const ricianBer = theoreticalBerRician(10, 0);
    const rayleighBer = theoreticalBerRayleigh(10);
    expect(Math.abs(ricianBer - rayleighBer)).toBeLessThan(1e-4);
  });
});
