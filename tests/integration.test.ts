// tests/integration.test.ts
import { describe, it, expect } from 'vitest';
import { ModulationType } from '../src/core/types';
import { addAwgn } from '../src/core/channel';
import { ofdmModulate, ofdmDemodulate } from '../src/core/ofdm';
import { hammingEncode74, hammingDecode74 } from '../src/core/channel-coding';
import {
  generateRayleighFading,
  applyFlatFading,
  perfectCsiEqualize,
  theoreticalBerRayleigh,
} from '../src/core/fading-channel';
import {
  alamoutiEncode,
  alamoutiDecode,
  theoreticalBerAlamouti,
} from '../src/core/mimo';
import { theoreticalBer } from '../src/core/ber-math';
import { Xoshiro128Plus } from '../src/core/prng';

describe('End-to-End Integration Pipeline Tests', () => {
  it('1. AWGN pipeline: generate BPSK symbols → add noise at 10dB → hard decide → BER < 0.001 (100000 symbols)', () => {
    const prng = new Xoshiro128Plus(12345);
    const N = 100000;
    const txSymbols = new Float64Array(N * 2);
    const bits = new Uint8Array(N);

    for (let i = 0; i < N; i++) {
      bits[i] = (prng.nextInt() & 1);
      txSymbols[i * 2] = bits[i] === 0 ? 1.0 : -1.0;
      txSymbols[i * 2 + 1] = 0.0;
    }

    const snrDb = 10;
    const k = 1; // 1 bit/symbol
    const rxSymbols = addAwgn(txSymbols, snrDb, k, prng);

    let errors = 0;
    for (let i = 0; i < N; i++) {
      const detected = rxSymbols[i * 2] < 0 ? 1 : 0;
      if (detected !== bits[i]) errors++;
    }

    const ber = errors / N;
    // Theoretical AWGN BPSK BER at 10dB is ~3.87e-5
    expect(ber).toBeLessThan(0.001);
  });

  it('2. OFDM round-trip: modulate N=64 subcarriers → demodulate → symbol error < 1e-9 (no channel, no noise)', () => {
    const N = 64;
    const Ncp = 16;
    const symbols = new Float64Array(N * 2);

    for (let k = 0; k < N; k++) {
      symbols[k * 2] = Math.cos((2 * Math.PI * k) / N);
      symbols[k * 2 + 1] = Math.sin((2 * Math.PI * k) / N);
    }

    const timeSignal = ofdmModulate(symbols, N, Ncp);
    const rxSymbols = ofdmDemodulate(timeSignal, N, Ncp);

    expect(rxSymbols.length).toBe(N * 2);
    let maxDiff = 0;
    for (let i = 0; i < N * 2; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(rxSymbols[i] - symbols[i]));
    }
    expect(maxDiff).toBeLessThan(1e-9);
  });

  it('3. Hamming coding gain: Simulate 50000 bits at SNR=2dB with and without Hamming(7,4) → Coded BER < Uncoded BER', () => {
    const prng = new Xoshiro128Plus(9999);
    const snrDb = 2;
    const snrLin = Math.pow(10, snrDb / 10);
    const sigma = Math.sqrt(1 / (2 * snrLin));

    const totalInfoBits = 50000;
    const numBlocks = Math.floor(totalInfoBits / 4);
    const infoBits = new Uint8Array(numBlocks * 4);

    for (let i = 0; i < infoBits.length; i++) {
      infoBits[i] = (prng.nextInt() & 1);
    }

    // Uncoded transmission
    let uncodedErrors = 0;
    for (let i = 0; i < infoBits.length; i++) {
      const tx = infoBits[i] === 0 ? 1.0 : -1.0;
      const u1 = Math.max(1e-15, prng.next()), u2 = prng.next();
      const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
      const rx = tx + noise;
      const det = rx < 0 ? 1 : 0;
      if (det !== infoBits[i]) uncodedErrors++;
    }
    const uncodedBer = uncodedErrors / infoBits.length;

    // Coded transmission: Systematic Hamming(7,4)
    const codedBits = hammingEncode74(infoBits);
    const rxCoded = new Uint8Array(codedBits.length);
    for (let i = 0; i < codedBits.length; i++) {
      const tx = codedBits[i] === 0 ? 1.0 : -1.0;
      const u1 = Math.max(1e-15, prng.next()), u2 = prng.next();
      const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
      const rx = tx + noise;
      rxCoded[i] = rx < 0 ? 1 : 0;
    }

    const decodedInfo = hammingDecode74(rxCoded);
    let codedErrors = 0;
    for (let i = 0; i < infoBits.length; i++) {
      if (decodedInfo[i] !== infoBits[i]) codedErrors++;
    }
    const codedBer = codedErrors / infoBits.length;

    // Strict inequality: Coded BER < Uncoded BER
    expect(codedBer).toBeLessThan(uncodedBer);
  });

  it('4. Rayleigh vs AWGN at SNR=10dB: Rayleigh BER > AWGN BER (fading degrades performance severely)', () => {
    const snrDb = 10;
    const rayleighBerTheory = theoreticalBerRayleigh(snrDb);
    const awgnBerTheory = theoreticalBer(snrDb, ModulationType.BPSK);

    // Rayleigh BER ≈ 0.02327 (> 0.01), AWGN BER ≈ 3.87e-5 (< 0.0001)
    expect(rayleighBerTheory).toBeGreaterThan(awgnBerTheory);
    expect(rayleighBerTheory).toBeGreaterThan(0.01);
    expect(awgnBerTheory).toBeLessThan(0.0001);

    // Monte Carlo check over 10000 symbols
    const prng = new Xoshiro128Plus(42);
    const N = 10000;
    const tx = new Float64Array(N * 2);
    const bits = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      bits[i] = (prng.nextInt() & 1);
      tx[i * 2] = bits[i] === 0 ? 1.0 : -1.0;
    }

    const h = generateRayleighFading(N, prng);
    const rxFaded = applyFlatFading(tx, h, snrDb, 1, prng);
    const rxEq = perfectCsiEqualize(rxFaded, h);

    let rayleighErrors = 0;
    for (let i = 0; i < N; i++) {
      const det = rxEq[i * 2] < 0 ? 1 : 0;
      if (det !== bits[i]) rayleighErrors++;
    }
    const rayleighSimBer = rayleighErrors / N;

    expect(rayleighSimBer).toBeGreaterThan(awgnBerTheory);
    expect(rayleighSimBer).toBeGreaterThan(0.01);
  });

  it('5. Alamouti at SNR=10dB vs SISO Rayleigh: Alamouti BER < SISO Rayleigh BER (diversity gain)', () => {
    const snrDb = 10;
    const alamoutiTheory = theoreticalBerAlamouti(snrDb);
    const sisoRayleighTheory = theoreticalBerRayleigh(snrDb);

    expect(alamoutiTheory).toBeLessThan(sisoRayleighTheory);
    // At 10dB: Alamouti ≈ 0.0016, SISO Rayleigh ≈ 0.023
    expect(alamoutiTheory).toBeLessThan(0.005);
    expect(sisoRayleighTheory).toBeGreaterThan(0.02);

    // Monte Carlo simulation with 10000 symbol pairs
    const prng = new Xoshiro128Plus(777);
    const numPairs = 10000;
    const sigma = Math.sqrt(Math.pow(10, -snrDb / 10) / 2);
    const invSqrt2 = 1 / Math.SQRT2;

    let alamoutiErrors = 0;
    for (let p = 0; p < numPairs; p++) {
      const b1 = prng.nextInt() & 1;
      const b2 = prng.nextInt() & 1;
      const s1_re = b1 === 0 ? 1.0 : -1.0;
      const s2_re = b2 === 0 ? 1.0 : -1.0;

      const enc = alamoutiEncode(new Float64Array([s1_re, 0, s2_re, 0]));

      // Channels
      const u1 = Math.max(1e-15, prng.next()), u2 = prng.next();
      const r1 = Math.sqrt(-2 * Math.log(u1)) * invSqrt2;
      const h1_re = r1 * Math.cos(2 * Math.PI * u2), h1_im = r1 * Math.sin(2 * Math.PI * u2);

      const u3 = Math.max(1e-15, prng.next()), u4 = prng.next();
      const r2 = Math.sqrt(-2 * Math.log(u3)) * invSqrt2;
      const h2_re = r2 * Math.cos(2 * Math.PI * u4), h2_im = r2 * Math.sin(2 * Math.PI * u4);

      // Transmission
      const rx1_re = (h1_re * enc[0] - h1_im * enc[1]) + (h2_re * enc[2] - h2_im * enc[3]);
      const rx1_im = (h1_re * enc[1] + h1_im * enc[0]) + (h2_re * enc[3] + h2_im * enc[2]);

      const rx2_re = (h1_re * enc[4] - h1_im * enc[5]) + (h2_re * enc[6] - h2_im * enc[7]);
      const rx2_im = (h1_re * enc[5] + h1_im * enc[4]) + (h2_re * enc[7] + h2_im * enc[6]);

      // Noise
      const un1 = Math.max(1e-15, prng.next()), un2 = prng.next();
      const n1_r = Math.sqrt(-2 * Math.log(un1)) * sigma * Math.cos(2 * Math.PI * un2);
      const n1_i = Math.sqrt(-2 * Math.log(un1)) * sigma * Math.sin(2 * Math.PI * un2);

      const un3 = Math.max(1e-15, prng.next()), un4 = prng.next();
      const n2_r = Math.sqrt(-2 * Math.log(un3)) * sigma * Math.cos(2 * Math.PI * un4);
      const n2_i = Math.sqrt(-2 * Math.log(un3)) * sigma * Math.sin(2 * Math.PI * un4);

      const rec = new Float64Array([rx1_re + n1_r, rx1_im + n1_i, rx2_re + n2_r, rx2_im + n2_i]);
      const dec = alamoutiDecode(rec, new Float64Array([h1_re, h1_im]), new Float64Array([h2_re, h2_im]));

      if ((dec[0] < 0 ? 1 : 0) !== b1) alamoutiErrors++;
      if ((dec[2] < 0 ? 1 : 0) !== b2) alamoutiErrors++;
    }

    const simBer = alamoutiErrors / (numPairs * 2);
    expect(simBer).toBeLessThan(sisoRayleighTheory);
  });
});
