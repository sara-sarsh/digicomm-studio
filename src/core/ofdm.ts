// src/core/ofdm.ts

function bitReverse(n: number, bits: number): number {
  let rev = 0;
  for (let i = 0; i < bits; i++) {
    rev = (rev << 1) | (n & 1);
    n >>>= 1;
  }
  return rev;
}

/**
 * In-place radix-2 Decimation-In-Time (DIT) Fast Fourier Transform
 * N must be a power of 2.
 */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error('FFT length must be a power of 2');
  }

  const bits = Math.round(Math.log2(n));
  for (let i = 0; i < n; i++) {
    const j = bitReverse(i, bits);
    if (j > i) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wr = 1.0;
      let wi = 0.0;
      for (let j = 0; j < half; j++) {
        const uR = re[i + j];
        const uI = im[i + j];
        const vR = re[i + j + half] * wr - im[i + j + half] * wi;
        const vI = re[i + j + half] * wi + im[i + j + half] * wr;

        re[i + j] = uR + vR;
        im[i + j] = uI + vI;
        re[i + j + half] = uR - vR;
        im[i + j + half] = uI - vI;

        const nextWr = wr * wStepR - wi * wStepI;
        const nextWi = wr * wStepI + wi * wStepR;
        wr = nextWr;
        wi = nextWi;
      }
    }
  }
}

/**
 * In-place Inverse Fast Fourier Transform via conjugate trick
 */
export function ifft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 0; i < n; i++) {
    im[i] = -im[i];
  }
  fft(re, im);
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

/**
 * Modulate frequency-domain subcarrier symbols into an OFDM time-domain block with Cyclic Prefix
 * @param symbols Interleaved [I0, Q0, I1, Q1, ...] for N subcarriers (length 2*N)
 * @param N Number of subcarriers (power of 2)
 * @param Ncp Length of cyclic prefix in samples
 * @returns Time-domain interleaved I/Q signal of length 2*(N + Ncp)
 */
export function ofdmModulate(
  symbols: Float64Array,
  N: number,
  Ncp: number
): Float64Array {
  const re = new Float64Array(N);
  const im = new Float64Array(N);

  for (let k = 0; k < N; k++) {
    re[k] = symbols[k * 2];
    im[k] = symbols[k * 2 + 1];
  }

  ifft(re, im);

  const totalSamples = N + Ncp;
  const out = new Float64Array(totalSamples * 2);

  // 1. Prepend Cyclic Prefix (last Ncp samples of IFFT output)
  const cpStart = N - Ncp;
  for (let n = 0; n < Ncp; n++) {
    out[n * 2] = re[cpStart + n];
    out[n * 2 + 1] = im[cpStart + n];
  }

  // 2. Main OFDM symbol body (N samples)
  for (let n = 0; n < N; n++) {
    out[(Ncp + n) * 2] = re[n];
    out[(Ncp + n) * 2 + 1] = im[n];
  }

  return out;
}

/**
 * Demodulate time-domain OFDM signal into frequency-domain subcarrier symbols
 * @param signal Interleaved I/Q signal of length 2*(N + Ncp)
 * @param N Number of subcarriers
 * @param Ncp Length of cyclic prefix
 * @returns Demodulated subcarriers (length 2*N)
 */
export function ofdmDemodulate(
  signal: Float64Array,
  N: number,
  Ncp: number
): Float64Array {
  const re = new Float64Array(N);
  const im = new Float64Array(N);

  // Skip the first Ncp samples
  for (let n = 0; n < N; n++) {
    re[n] = signal[(Ncp + n) * 2];
    im[n] = signal[(Ncp + n) * 2 + 1];
  }

  fft(re, im);

  const out = new Float64Array(N * 2);
  for (let k = 0; k < N; k++) {
    out[k * 2] = re[k];
    out[k * 2 + 1] = im[k];
  }

  return out;
}

/**
 * Compute Peak-to-Average Power Ratio (PAPR) of time-domain signal
 * PAPR = max(|s|²) / mean(|s|²)
 */
export function computePapr(signal: Float64Array): number {
  const numSamples = signal.length / 2;
  if (numSamples === 0) return 1.0;

  let maxP = 0;
  let sumP = 0;

  for (let n = 0; n < numSamples; n++) {
    const I = signal[n * 2];
    const Q = signal[n * 2 + 1];
    const p = I * I + Q * Q;
    if (p > maxP) maxP = p;
    sumP += p;
  }

  const meanP = sumP / numSamples;
  if (meanP < 1e-15) return 1.0;

  return Math.max(1.0, maxP / meanP);
}

/**
 * Compute normalized power spectral density (PSD) of signal
 */
export function computeSpectrum(signal: Float64Array, N: number): Float64Array {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const copyLen = Math.min(N, signal.length / 2);

  for (let n = 0; n < copyLen; n++) {
    re[n] = signal[n * 2];
    im[n] = signal[n * 2 + 1];
  }

  fft(re, im);

  const psd = new Float64Array(N);
  let maxPsd = 0;

  for (let k = 0; k < N; k++) {
    const p = re[k] * re[k] + im[k] * im[k];
    psd[k] = p;
    if (p > maxPsd) maxPsd = p;
  }

  // Normalize by max power
  if (maxPsd > 0) {
    for (let k = 0; k < N; k++) {
      psd[k] /= maxPsd;
    }
  }

  return psd;
}
