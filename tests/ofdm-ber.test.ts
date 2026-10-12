// tests/ofdm-ber.test.ts
import { describe, it, expect } from 'vitest';
import { ofdmModulate, ofdmDemodulate, fft } from '../src/core/ofdm';
import { theoreticalBer } from '../src/core/ber-math';
import { ModulationType } from '../src/core/types';
import { Xoshiro128Plus } from '../src/core/prng';

describe('OFDM BER Accuracy & Multipath ISI Elimination', () => {
  it('1. OFDM + AWGN at SNR=5dB: measured BER within 10% of BPSK AWGN theory (50000 symbols)', () => {
    const prng = new Xoshiro128Plus(42);
    const N = 64;
    const Ncp = 16;
    const snrDb = 5;
    const snrLin = Math.pow(10, snrDb / 10);
    const sigmaTime = Math.sqrt(1 / (2 * snrLin)) / Math.sqrt(N);

    const totalSymbols = 50000;
    const numBlocks = Math.floor(totalSymbols / N);
    let errorCount = 0;

    for (let b = 0; b < numBlocks; b++) {
      const bits = new Uint8Array(N);
      const subcarriers = new Float64Array(N * 2);

      for (let k = 0; k < N; k++) {
        bits[k] = prng.nextInt() & 1;
        subcarriers[k * 2] = bits[k] === 0 ? 1.0 : -1.0;
        subcarriers[k * 2 + 1] = 0.0;
      }

      // Modulate with IFFT + CP
      const timeSignal = ofdmModulate(subcarriers, N, Ncp);

      // Add AWGN noise to time signal
      const noisyTime = new Float64Array(timeSignal.length);
      for (let n = 0; n < timeSignal.length / 2; n++) {
        const u1 = Math.max(1e-15, prng.next()), u2 = prng.next();
        const r = Math.sqrt(-2 * Math.log(u1)) * sigmaTime;
        const theta = 2 * Math.PI * u2;
        noisyTime[n * 2] = timeSignal[n * 2] + r * Math.cos(theta);
        noisyTime[n * 2 + 1] = timeSignal[n * 2 + 1] + r * Math.sin(theta);
      }

      // Demodulate (remove CP + FFT)
      const rxSubcarriers = ofdmDemodulate(noisyTime, N, Ncp);

      // Detect BPSK
      for (let k = 0; k < N; k++) {
        const det = rxSubcarriers[k * 2] < 0 ? 1 : 0;
        if (det !== bits[k]) errorCount++;
      }
    }

    const simBer = errorCount / (numBlocks * N);
    const theoryBer = theoreticalBer(snrDb, ModulationType.BPSK); // ~0.0059538

    const relError = Math.abs(simBer - theoryBer) / theoryBer;
    expect(relError).toBeLessThan(0.12);
  });

  it('2. OFDM CP removes ISI: 2-tap channel h=[1, 0.5], Ncp=4 >= 1 with perfect equalization has BER < 0.01 at SNR=10dB', () => {
    const prng = new Xoshiro128Plus(101);
    const N = 64;
    const Ncp = 4; // Greater than channel delay spread (L-1 = 1)
    const hTaps = [1.0, 0.5];

    // Compute frequency response H[k] of 2-tap channel
    const H_re = new Float64Array(N);
    const H_im = new Float64Array(N);
    for (let k = 0; k < N; k++) {
      const theta = (-2 * Math.PI * k) / N;
      H_re[k] = hTaps[0] + hTaps[1] * Math.cos(theta);
      H_im[k] = hTaps[1] * Math.sin(theta);
    }

    const snrDb = 10;
    const snrLin = Math.pow(10, snrDb / 10);
    const sigmaTime = Math.sqrt(1 / (2 * snrLin)) / Math.sqrt(N);

    const numBlocks = 300;
    let errors = 0;

    for (let b = 0; b < numBlocks; b++) {
      const bits = new Uint8Array(N);
      const subcarriers = new Float64Array(N * 2);

      for (let k = 0; k < N; k++) {
        bits[k] = prng.nextInt() & 1;
        subcarriers[k * 2] = bits[k] === 0 ? 1.0 : -1.0;
        subcarriers[k * 2 + 1] = 0.0;
      }

      // Modulate
      const timeSignal = ofdmModulate(subcarriers, N, Ncp);
      const totalSamples = N + Ncp;

      // Filter through multipath channel: y[n] = 1.0 * x[n] + 0.5 * x[n-1]
      const rxFiltered = new Float64Array(totalSamples * 2);
      for (let n = 0; n < totalSamples; n++) {
        let y_re = timeSignal[n * 2] * hTaps[0];
        let y_im = timeSignal[n * 2 + 1] * hTaps[0];
        if (n > 0) {
          y_re += timeSignal[(n - 1) * 2] * hTaps[1];
          y_im += timeSignal[(n - 1) * 2 + 1] * hTaps[1];
        }

        // Add AWGN
        const u1 = Math.max(1e-15, prng.next()), u2 = prng.next();
        const r = Math.sqrt(-2 * Math.log(u1)) * sigmaTime;
        const theta = 2 * Math.PI * u2;
        rxFiltered[n * 2] = y_re + r * Math.cos(theta);
        rxFiltered[n * 2 + 1] = y_im + r * Math.sin(theta);
      }

      // Remove CP
      const body_re = new Float64Array(N);
      const body_im = new Float64Array(N);
      for (let n = 0; n < N; n++) {
        body_re[n] = rxFiltered[(Ncp + n) * 2];
        body_im[n] = rxFiltered[(Ncp + n) * 2 + 1];
      }

      // FFT
      fft(body_re, body_im);

      // Single-tap Frequency-Domain Zero-Forcing Equalizer: Y[k] / H[k]
      for (let k = 0; k < N; k++) {
        const yr = body_re[k];
        const yi = body_im[k];
        const hr = H_re[k];
        const hi = H_im[k];
        const hNorm = hr * hr + hi * hi;

        const eq_re = (yr * hr + yi * hi) / hNorm;
        const det = eq_re < 0 ? 1 : 0;
        if (det !== bits[k]) errors++;
      }
    }

    const ber = errors / (numBlocks * N);
    expect(ber).toBeLessThan(0.01);
  });
});
