// tests/ber-math.test.ts
import { describe, it, expect } from 'vitest';
import { ModulationType } from '../src/core/types';
import { erfc, qFunction, theoreticalBer } from '../src/core/ber-math';

describe('BER Mathematics', () => {
  it('erfc(0) ≈ 1.0 (tolerance 1e-6)', () => {
    expect(Math.abs(erfc(0) - 1.0)).toBeLessThan(1e-6);
  });

  it('erfc(1) ≈ 0.1573 (tolerance 0.0001)', () => {
    expect(Math.abs(erfc(1) - 0.1573)).toBeLessThan(0.0001);
  });

  it('erfc(-1) ≈ 1.8427 (symmetry check)', () => {
    expect(Math.abs(erfc(-1) - 1.8427)).toBeLessThan(0.0001);
  });

  it('qFunction(0) ≈ 0.5', () => {
    expect(Math.abs(qFunction(0) - 0.5)).toBeLessThan(1e-6);
  });

  it('BPSK BER at SNR=4dB: theoreticalBer(4, BPSK) ≈ 0.01267', () => {
    const ber = theoreticalBer(4, ModulationType.BPSK);
    expect(Math.abs(ber - 0.01267)).toBeLessThan(0.0004);
  });

  it('BER is monotonically decreasing as SNR increases (test 5 points)', () => {
    const snrPoints = [0, 2, 4, 6, 8];
    const schemes = [
      ModulationType.BPSK,
      ModulationType.QPSK,
      ModulationType.QAM16,
      ModulationType.QAM64,
    ];

    for (const mod of schemes) {
      let prevBer = 1.0;
      for (const snr of snrPoints) {
        const curBer = theoreticalBer(snr, mod);
        expect(curBer).toBeLessThan(prevBer);
        prevBer = curBer;
      }
    }
  });
});
