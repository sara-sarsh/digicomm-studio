// src/core/ber-math.ts
import { ModulationType } from './types';

/**
 * Complementary error function using Abramowitz & Stegun approximation 7.1.26
 * Maximum error < 1.5e-7
 */
export function erfc(x: number): number {
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  const result = poly * Math.exp(-absX * absX);

  return x >= 0 ? result : 2.0 - result;
}

/**
 * Standard Gaussian Q-function: Q(x) = (1/2) * erfc(x / √2)
 */
export function qFunction(x: number): number {
  return 0.5 * erfc(x / Math.SQRT2);
}

/**
 * Theoretical Bit Error Rate (BER) for standard constellations in AWGN
 * Reference: Proakis & Salehi, Digital Communications 5th Ed., Chapter 4
 */
export function theoreticalBer(snrDb: number, mod: ModulationType): number {
  const snrLinear = Math.pow(10, snrDb / 10);

  switch (mod) {
    case ModulationType.BPSK:
    case ModulationType.QPSK:
      return qFunction(Math.sqrt(2 * snrLinear));

    case ModulationType.QAM16:
      // (3/4) * erfc(√(snrLinear * 2/5))
      return (3 / 4) * erfc(Math.sqrt(snrLinear * (2 / 5)));

    case ModulationType.QAM64:
      // (7/12) * erfc(√(snrLinear * 1/21))
      return (7 / 12) * erfc(Math.sqrt(snrLinear * (1 / 21)));
  }
}
