// src/core/channel.ts
import { Xoshiro128Plus } from './prng';

export function addAwgn(
  signal: Float64Array,
  snrDb: number,
  bitsPerSymbol: number,
  prng: Xoshiro128Plus
): Float64Array {
  const len = signal.length;
  const out = new Float64Array(len);

  // Compute noise variance per dimension: σ² = 1 / (2 * bitsPerSymbol * 10^(snrDb/10))
  // where average symbol energy Es = 1, Eb = Es / bitsPerSymbol, N0 = Eb / 10^(snrDb/10), σ² = N0/2
  const snrLinear = Math.pow(10, snrDb / 10);
  const sigmaSq = 1 / (2 * bitsPerSymbol * snrLinear);
  const sigma = Math.sqrt(sigmaSq);

  const TWO_PI = 2 * Math.PI;

  for (let i = 0; i < len; i += 2) {
    const u1 = Math.max(1e-15, prng.next());
    const u2 = prng.next();
    const r = Math.sqrt(-2.0 * Math.log(u1)) * sigma;
    const theta = TWO_PI * u2;

    out[i] = signal[i] + r * Math.cos(theta);
    if (i + 1 < len) {
      out[i + 1] = signal[i + 1] + r * Math.sin(theta);
    }
  }

  return out;
}
