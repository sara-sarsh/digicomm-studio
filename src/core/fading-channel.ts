// src/core/fading-channel.ts
import { Xoshiro128Plus } from './prng';

/**
 * Generate flat Rayleigh fading coefficients h ~ CN(0, 1)
 * Real and imaginary parts each distributed as N(0, 1/2), so E[|h|²] = 1.0.
 * @returns Interleaved [h_re, h_im, ...] of length 2 * count
 */
export function generateRayleighFading(
  count: number,
  prng: Xoshiro128Plus
): Float64Array {
  const out = new Float64Array(count * 2);
  const sigmaPerDim = 1 / Math.SQRT2; // variance = 0.5 per dimension

  for (let i = 0; i < count; i++) {
    const u1 = Math.max(1e-15, prng.next());
    const u2 = prng.next();
    const r = Math.sqrt(-2.0 * Math.log(u1)) * sigmaPerDim;
    const theta = 2 * Math.PI * u2;

    out[i * 2] = r * Math.cos(theta);
    out[i * 2 + 1] = r * Math.sin(theta);
  }

  return out;
}

/**
 * Generate flat Rician fading coefficients with K-factor
 * LOS component magnitude = sqrt(K / (K + 1))
 * Scatter component magnitude = sqrt(1 / (K + 1)) * CN(0, 1)
 * E[|h|²] = 1.0.
 * @returns Interleaved [h_re, h_im, ...] of length 2 * count
 */
export function generateRicianFading(
  count: number,
  kFactor: number,
  prng: Xoshiro128Plus
): Float64Array {
  const out = new Float64Array(count * 2);
  const safeK = Math.max(0, kFactor);

  const losMag = Math.sqrt(safeK / (safeK + 1));
  const scatterScale = Math.sqrt(1 / (safeK + 1)) / Math.SQRT2;

  for (let i = 0; i < count; i++) {
    const u1 = Math.max(1e-15, prng.next());
    const u2 = prng.next();
    const r = Math.sqrt(-2.0 * Math.log(u1)) * scatterScale;
    const theta = 2 * Math.PI * u2;

    // Real part has LOS + scatter, imaginary part has scatter
    out[i * 2] = losMag + r * Math.cos(theta);
    out[i * 2 + 1] = r * Math.sin(theta);
  }

  return out;
}

/**
 * Apply flat fading and AWGN: y = h * s + n
 * @param signal Interleaved I/Q symbols
 * @param fading Interleaved channel coefficients h
 * @param snrDb Signal-to-noise ratio in dB
 * @param bitsPerSymbol Modulation bits per symbol
 * @param prng Random number generator
 */
export function applyFlatFading(
  signal: Float64Array,
  fading: Float64Array,
  snrDb: number,
  bitsPerSymbol: number,
  prng: Xoshiro128Plus
): Float64Array {
  const count = signal.length / 2;
  const out = new Float64Array(signal.length);

  const snrLinear = Math.pow(10, snrDb / 10);
  const sigmaNoise = Math.sqrt(1 / (2 * bitsPerSymbol * snrLinear));

  for (let i = 0; i < count; i++) {
    const sRe = signal[i * 2];
    const sIm = signal[i * 2 + 1];
    const hRe = fading[i * 2];
    const hIm = fading[i * 2 + 1];

    // Complex multiplication: (hRe + j*hIm) * (sRe + j*sIm)
    const hsRe = hRe * sRe - hIm * sIm;
    const hsIm = hRe * sIm + hIm * sRe;

    // Complex AWGN noise
    const u1 = Math.max(1e-15, prng.next());
    const u2 = prng.next();
    const r = Math.sqrt(-2.0 * Math.log(u1)) * sigmaNoise;
    const theta = 2 * Math.PI * u2;

    out[i * 2] = hsRe + r * Math.cos(theta);
    out[i * 2 + 1] = hsIm + r * Math.sin(theta);
  }

  return out;
}

/**
 * Perfect Channel State Information (CSI) Equalization
 * y_eq = y / h = (y * conj(h)) / |h|²
 */
export function perfectCsiEqualize(
  received: Float64Array,
  fading: Float64Array
): Float64Array {
  const count = received.length / 2;
  const out = new Float64Array(received.length);

  for (let i = 0; i < count; i++) {
    const yRe = received[i * 2];
    const yIm = received[i * 2 + 1];
    const hRe = fading[i * 2];
    const hIm = fading[i * 2 + 1];

    const hMagSq = hRe * hRe + hIm * hIm;
    if (hMagSq < 1e-12) {
      out[i * 2] = 0;
      out[i * 2 + 1] = 0;
    } else {
      // (yRe + j*yIm) * (hRe - j*hIm) / hMagSq
      out[i * 2] = (yRe * hRe + yIm * hIm) / hMagSq;
      out[i * 2 + 1] = (yIm * hRe - yRe * hIm) / hMagSq;
    }
  }

  return out;
}

/**
 * Theoretical BER for BPSK over flat Rayleigh fading channel
 * Reference: Proakis & Salehi, 5th Ed., Eq. 13.1-23
 * Pb = 0.5 * (1 - sqrt(γ / (1 + γ)))
 */
export function theoreticalBerRayleigh(snrDbPerBit: number): number {
  const gamma = Math.pow(10, snrDbPerBit / 10);
  return 0.5 * (1 - Math.sqrt(gamma / (1 + gamma)));
}

/**
 * Theoretical BER for BPSK over flat Rician fading channel
 * Evaluated via Craig's integral formulation
 */
export function theoreticalBerRician(
  snrDbPerBit: number,
  kFactor: number
): number {
  const gamma = Math.pow(10, snrDbPerBit / 10);
  if (kFactor <= 1e-6) {
    return theoreticalBerRayleigh(snrDbPerBit);
  }

  // Numerical integration over [0, π/2] using Simpson's rule
  const nSteps = 100;
  const h = (Math.PI / 2) / nSteps;
  let sum = 0;

  for (let i = 0; i <= nSteps; i++) {
    const theta = i * h;
    if (theta === 0) continue;
    const sinSq = Math.sin(theta) ** 2;
    const denom = (1 + kFactor) * sinSq + gamma;
    const integrand =
      (((1 + kFactor) * sinSq) / denom) * Math.exp((-kFactor * gamma) / denom);
    const weight = i === 0 || i === nSteps ? 1 : i % 2 === 1 ? 4 : 2;
    sum += weight * integrand;
  }

  return (h / 3) * sum * (1 / Math.PI);
}
