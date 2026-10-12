// tests/ofdm.test.ts
import { describe, it, expect } from 'vitest';
import {
  fft,
  ifft,
  ofdmModulate,
  ofdmDemodulate,
  computePapr,
} from '../src/core/ofdm';
import { Xoshiro128Plus } from '../src/core/prng';

describe('OFDM Core Module', () => {
  it('IFFT then FFT recovers original signal (tolerance 1e-9 per sample)', () => {
    const N = 64;
    const re = new Float64Array(N);
    const im = new Float64Array(N);

    // Initialize with some test data
    for (let k = 0; k < N; k++) {
      re[k] = Math.cos((2 * Math.PI * k * 3) / N) + (k % 4) - 2;
      im[k] = Math.sin((2 * Math.PI * k * 5) / N) + ((k * 2) % 3) - 1;
    }

    const origRe = new Float64Array(re);
    const origIm = new Float64Array(im);

    ifft(re, im);
    fft(re, im);

    for (let k = 0; k < N; k++) {
      expect(Math.abs(re[k] - origRe[k])).toBeLessThan(1e-9);
      expect(Math.abs(im[k] - origIm[k])).toBeLessThan(1e-9);
    }
  });

  it('CP is correctly prepended (first Ncp samples equal last Ncp samples of IFFT output)', () => {
    const N = 32;
    const Ncp = 8;
    const symbols = new Float64Array(N * 2);

    for (let k = 0; k < N; k++) {
      symbols[k * 2] = (k % 2 === 0 ? 1 : -1) / Math.SQRT2;
      symbols[k * 2 + 1] = (k % 4 < 2 ? 1 : -1) / Math.SQRT2;
    }

    const txSignal = ofdmModulate(symbols, N, Ncp);
    expect(txSignal.length).toBe(2 * (N + Ncp));

    // Check CP: samples 0 .. Ncp-1 must match samples N .. N + Ncp - 1
    for (let n = 0; n < Ncp; n++) {
      const cpI = txSignal[n * 2];
      const cpQ = txSignal[n * 2 + 1];
      const endI = txSignal[(N + n) * 2];
      const endQ = txSignal[(N + n) * 2 + 1];

      expect(Math.abs(cpI - endI)).toBeLessThan(1e-12);
      expect(Math.abs(cpQ - endQ)).toBeLessThan(1e-12);
    }
  });

  it('computePapr returns value >= 1.0 always', () => {
    const signal = new Float64Array([1, 0, 1, 0, 1, 0, 1, 0]);
    expect(computePapr(signal)).toBeGreaterThanOrEqual(1.0);

    const multicarrierSignal = new Float64Array(128);
    for (let i = 0; i < 128; i++) {
      multicarrierSignal[i] = Math.sin(i * 0.4) + Math.cos(i * 1.2);
    }
    expect(computePapr(multicarrierSignal)).toBeGreaterThanOrEqual(1.0);
  });

  it('OFDM with AWGN at 20dB SNR: demodulated symbols within 0.1 of originals', () => {
    const N = 8;
    const Ncp = 2;
    const prng = new Xoshiro128Plus(16);

    const symbols = new Float64Array(N * 2);
    for (let k = 0; k < N; k++) {
      symbols[k * 2] = (k % 2 === 0 ? 1 : -1) / Math.SQRT2;
      symbols[k * 2 + 1] = (k % 4 < 2 ? 1 : -1) / Math.SQRT2;
    }

    const txSignal = ofdmModulate(symbols, N, Ncp);

    // In OFDM, time-domain noise variance is σ² / N because FFT has gain N in power
    const snrLinear = Math.pow(10, 20 / 10);
    const sigmaTime = Math.sqrt(1 / (2 * 2 * snrLinear * N));

    const rxSignal = new Float64Array(txSignal.length);
    for (let i = 0; i < txSignal.length; i += 2) {
      const u1 = Math.max(1e-15, prng.next());
      const u2 = prng.next();
      const r = Math.sqrt(-2.0 * Math.log(u1)) * sigmaTime;
      const theta = 2 * Math.PI * u2;
      rxSignal[i] = txSignal[i] + r * Math.cos(theta);
      rxSignal[i + 1] = txSignal[i + 1] + r * Math.sin(theta);
    }

    const rxSymbols = ofdmDemodulate(rxSignal, N, Ncp);

    let sumSqDiff = 0;
    for (let k = 0; k < N * 2; k++) {
      const diff = rxSymbols[k] - symbols[k];
      sumSqDiff += diff * diff;
    }
    const rmsDiff = Math.sqrt(sumSqDiff / (N * 2));

    expect(rmsDiff).toBeLessThan(0.1);
  });

  it('fft of pure tone at k0 has peak at bin k0 (within 1e-6)', () => {
    const N = 64;
    const k0 = 7;
    const re = new Float64Array(N);
    const im = new Float64Array(N);

    // Discrete complex exponential e^(j 2π k0 n / N)
    for (let n = 0; n < N; n++) {
      re[n] = Math.cos((2 * Math.PI * k0 * n) / N);
      im[n] = Math.sin((2 * Math.PI * k0 * n) / N);
    }

    fft(re, im);

    // Bin k0 should have magnitude N, all other bins should be ~0
    for (let k = 0; k < N; k++) {
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      if (k === k0) {
        expect(Math.abs(mag - N)).toBeLessThan(1e-6);
      } else {
        expect(mag).toBeLessThan(1e-6);
      }
    }
  });

  it('Parseval theorem: sum(|time|²) ≈ sum(|freq|²)/N (energy conservation, 1% tolerance)', () => {
    const N = 32;
    const re = new Float64Array(N);
    const im = new Float64Array(N);

    for (let n = 0; n < N; n++) {
      re[n] = Math.sin(n * 0.7) + 0.5;
      im[n] = Math.cos(n * 0.4) - 0.2;
    }

    let timeEnergy = 0;
    for (let n = 0; n < N; n++) {
      timeEnergy += re[n] * re[n] + im[n] * im[n];
    }

    fft(re, im);

    let freqEnergy = 0;
    for (let k = 0; k < N; k++) {
      freqEnergy += re[k] * re[k] + im[k] * im[k];
    }
    const scaledFreqEnergy = freqEnergy / N;

    expect(Math.abs(timeEnergy - scaledFreqEnergy) / timeEnergy).toBeLessThan(0.01);
  });
});
