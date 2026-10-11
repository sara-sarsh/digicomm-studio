// src/core/pulse-shaping.ts

/**
 * Raised Cosine (RC) FIR Filter
 * @param N Filter length (odd)
 * @param alpha Roll-off factor [0, 1]
 * @param T Symbol period in seconds
 * @param fs Sampling frequency in Hz
 */
export function raisedCosine(
  N: number,
  alpha: number,
  T: number,
  fs: number
): Float64Array {
  const h = new Float64Array(N);
  const mid = (N - 1) / 2;
  const dt = 1 / fs;

  for (let n = 0; n < N; n++) {
    const t = (n - mid) * dt;

    if (Math.abs(t) < 1e-12) {
      h[n] = 1.0;
    } else if (alpha > 0 && Math.abs(Math.abs(t) - T / (2 * alpha)) < 1e-10) {
      // Indeterminate point at |t| = T / (2α)
      h[n] = (alpha / 2) * Math.sin(Math.PI / (2 * alpha));
    } else {
      const sinc = Math.sin((Math.PI * t) / T) / ((Math.PI * t) / T);
      const cosTerm = Math.cos((Math.PI * alpha * t) / T);
      const denom = 1.0 - Math.pow((2 * alpha * t) / T, 2);
      h[n] = sinc * (cosTerm / denom);
    }
  }

  // Normalize filter energy such that sum(h[n]^2) ≈ 1/T
  let sumSq = 0;
  for (let i = 0; i < N; i++) {
    sumSq += h[i] * h[i];
  }
  const scale = Math.sqrt((1 / T) / sumSq);
  for (let i = 0; i < N; i++) {
    h[i] *= scale;
  }

  return h;
}

/**
 * Root Raised Cosine (RRC) FIR Filter
 * @param N Filter length (odd)
 * @param alpha Roll-off factor [0, 1]
 * @param T Symbol period in seconds
 * @param fs Sampling frequency in Hz
 */
export function rootRaisedCosine(
  N: number,
  alpha: number,
  T: number,
  fs: number
): Float64Array {
  const h = new Float64Array(N);
  const mid = (N - 1) / 2;
  const dt = 1 / fs;

  for (let n = 0; n < N; n++) {
    const t = (n - mid) * dt;

    if (Math.abs(t) < 1e-12) {
      h[n] = (1 - alpha + (4 * alpha) / Math.PI) / Math.sqrt(T);
    } else if (alpha > 0 && Math.abs(Math.abs(t) - T / (4 * alpha)) < 1e-10) {
      // Indeterminate point at |t| = T / (4α)
      h[n] =
        (alpha / Math.sqrt(2 * T)) *
        ((1 + 2 / Math.PI) * Math.sin(Math.PI / (4 * alpha)) +
          (1 - 2 / Math.PI) * Math.cos(Math.PI / (4 * alpha)));
    } else {
      const num =
        Math.sin((Math.PI * (t / T) * (1 - alpha))) +
        4 * alpha * (t / T) * Math.cos(Math.PI * (t / T) * (1 + alpha));
      const den =
        Math.PI * (t / T) * (1 - Math.pow(4 * alpha * (t / T), 2)) * Math.sqrt(T);
      h[n] = num / den;
    }
  }

  // Normalize RRC to unit energy: sum(h[n]^2) = 1
  let sumSq = 0;
  for (let i = 0; i < N; i++) {
    sumSq += h[i] * h[i];
  }
  const norm = Math.sqrt(sumSq);
  for (let i = 0; i < N; i++) {
    h[i] /= norm;
  }

  return h;
}

/**
 * Linear convolution of two 1D discrete signals
 */
export function applyFilter(
  signal: Float64Array,
  coeffs: Float64Array
): Float64Array {
  const outLen = signal.length + coeffs.length - 1;
  const out = new Float64Array(outLen);

  for (let i = 0; i < signal.length; i++) {
    const s = signal[i];
    for (let j = 0; j < coeffs.length; j++) {
      out[i + j] += s * coeffs[j];
    }
  }

  return out;
}
