import { Xoshiro128Plus } from './prng';
import { generateRayleighFading } from './fading-channel';

/**
 * Alamouti 2x1 Space-Time Block Coding (STBC) encoder.
 * Maps 2 input complex symbols into a 2x2 space-time codeword across 2 time slots and 2 transmit antennas.
 *
 * Matrix format (row-major, 4 complex symbols = 8 floats):
 * Time slot 1: [Tx1: s1,       Tx2: s2]
 * Time slot 2: [Tx1: -s2*,     Tx2: s1*]
 *
 * @param symbols Float64Array of 2 complex symbols: [s1_re, s1_im, s2_re, s2_im]
 * @returns Float64Array of 8 floats
 */
export function alamoutiEncode(symbols: Float64Array): Float64Array {
  const s1_re = symbols[0];
  const s1_im = symbols[1];
  const s2_re = symbols[2];
  const s2_im = symbols[3];

  const encoded = new Float64Array(8);

  // Time slot 1: Tx1 = s1, Tx2 = s2
  encoded[0] = s1_re;
  encoded[1] = s1_im;
  encoded[2] = s2_re;
  encoded[3] = s2_im;

  // Time slot 2: Tx1 = -s2*, Tx2 = s1*
  // -s2* = -s2_re + j * s2_im
  // s1* = s1_re - j * s1_im
  encoded[4] = -s2_re;
  encoded[5] = s2_im;
  encoded[6] = s1_re;
  encoded[7] = -s1_im;

  return encoded;
}

/**
 * Alamouti 2x1 STBC decoder and maximal ratio combiner (MRC).
 * Supports both raw received signal vector [r1, r2] (4 floats) or
 * noiseless transmitted matrix from alamoutiEncode (8 floats).
 *
 * Combiner equations:
 * ŝ1 = (h1* r1 + h2  r2*) / (|h1|² + |h2|²)
 * ŝ2 = (h2* r1 - h1  r2*) / (|h1|² + |h2|²)
 *
 * @param received 4 floats [r1_re, r1_im, r2_re, r2_im] or 8 floats from alamoutiEncode
 * @param h1 Flat fading channel from Tx1 to Rx: [h1_re, h1_im]
 * @param h2 Flat fading channel from Tx2 to Rx: [h2_re, h2_im]
 * @returns Float64Array of 4 floats: decision variables [s1_re, s1_im, s2_re, s2_im]
 */
export function alamoutiDecode(
  received: Float64Array,
  h1: Float64Array,
  h2: Float64Array
): Float64Array {
  const h1_re = h1[0];
  const h1_im = h1[1];
  const h2_re = h2[0];
  const h2_im = h2[1];

  let r1_re: number;
  let r1_im: number;
  let r2_re: number;
  let r2_im: number;

  if (received.length >= 8) {
    // Input is encoded matrix: pass through channels h1, h2
    const tx1_1_re = received[0];
    const tx1_1_im = received[1];
    const tx2_1_re = received[2];
    const tx2_1_im = received[3];

    const tx1_2_re = received[4];
    const tx1_2_im = received[5];
    const tx2_2_re = received[6];
    const tx2_2_im = received[7];

    // r1 = h1 * tx1_1 + h2 * tx2_1
    r1_re = (h1_re * tx1_1_re - h1_im * tx1_1_im) + (h2_re * tx2_1_re - h2_im * tx2_1_im);
    r1_im = (h1_re * tx1_1_im + h1_im * tx1_1_re) + (h2_re * tx2_1_im + h2_im * tx2_1_re);

    // r2 = h1 * tx1_2 + h2 * tx2_2
    r2_re = (h1_re * tx1_2_re - h1_im * tx1_2_im) + (h2_re * tx2_2_re - h2_im * tx2_2_im);
    r2_im = (h1_re * tx1_2_im + h1_im * tx1_2_re) + (h2_re * tx2_2_im + h2_im * tx2_2_re);
  } else {
    r1_re = received[0];
    r1_im = received[1];
    r2_re = received[2];
    r2_im = received[3];
  }

  // r2* = [r2_re, -r2_im]
  const r2_conj_re = r2_re;
  const r2_conj_im = -r2_im;

  // h1* = [h1_re, -h1_im]
  // term1 = h1* * r1
  const term1_re = h1_re * r1_re - (-h1_im) * r1_im;
  const term1_im = h1_re * r1_im + (-h1_im) * r1_re;

  // term2 = h2 * r2*
  const term2_re = h2_re * r2_conj_re - h2_im * r2_conj_im;
  const term2_im = h2_re * r2_conj_im + h2_im * r2_conj_re;

  // ŝ1 numerator = term1 + term2
  let s1_hat_re = term1_re + term2_re;
  let s1_hat_im = term1_im + term2_im;

  // h2* = [h2_re, -h2_im]
  // term3 = h2* * r1
  const term3_re = h2_re * r1_re - (-h2_im) * r1_im;
  const term3_im = h2_re * r1_im + (-h2_im) * r1_re;

  // term4 = h1 * r2*
  const term4_re = h1_re * r2_conj_re - h1_im * r2_conj_im;
  const term4_im = h1_re * r2_conj_im + h1_im * r2_conj_re;

  // ŝ2 numerator = term3 - term4
  let s2_hat_re = term3_re - term4_re;
  let s2_hat_im = term3_im - term4_im;

  // Normalization by channel power (|h1|² + |h2|²)
  const norm = (h1_re * h1_re + h1_im * h1_im) + (h2_re * h2_re + h2_im * h2_im);
  if (norm > 1e-12) {
    s1_hat_re /= norm;
    s1_hat_im /= norm;
    s2_hat_re /= norm;
    s2_hat_im /= norm;
  }

  return new Float64Array([s1_hat_re, s1_hat_im, s2_hat_re, s2_hat_im]);
}

/**
 * Calculates ergodic MIMO Shannon capacity in bits/s/Hz using Telatar/Foschini formula:
 * C = log2(det(I_Nr + (ρ / Nt) * H * H^H))
 *
 * @param H Nr x Nt channel matrix, row-major, interleaved I/Q (length = 2 * Nr * Nt)
 * @param Nr Number of receive antennas
 * @param Nt Number of transmit antennas
 * @param snrDb Signal-to-Noise Ratio (SNR) in dB (ρ = 10^(snrDb / 10))
 * @returns Capacity in bits/s/Hz
 */
export function mimoCapacity(
  H: Float64Array,
  Nr: number,
  Nt: number,
  snrDb: number
): number {
  const rho = Math.pow(10, snrDb / 10);
  const scale = rho / Nt;

  // Compute W = I_Nr + scale * H * H^H (size Nr x Nr complex matrix)
  const W_re = new Float64Array(Nr * Nr);
  const W_im = new Float64Array(Nr * Nr);

  for (let i = 0; i < Nr; i++) {
    for (let j = 0; j < Nr; j++) {
      let sum_re = 0;
      let sum_im = 0;
      for (let k = 0; k < Nt; k++) {
        const idx_ik = (i * Nt + k) * 2;
        const h_ik_re = H[idx_ik];
        const h_ik_im = H[idx_ik + 1];

        const idx_jk = (j * Nt + k) * 2;
        const h_jk_re = H[idx_jk];
        const h_jk_im = -H[idx_jk + 1]; // complex conjugate H_jk*

        // Multiply (h_ik) * (h_jk*)
        sum_re += h_ik_re * h_jk_re - h_ik_im * h_jk_im;
        sum_im += h_ik_re * h_jk_im + h_ik_im * h_jk_re;
      }
      const w_idx = i * Nr + j;
      W_re[w_idx] = scale * sum_re + (i === j ? 1.0 : 0.0);
      W_im[w_idx] = scale * sum_im;
    }
  }

  // Compute det(W) via complex LU decomposition with partial pivoting
  let det_re = 1.0;
  let det_im = 0.0;

  const A_re = new Float64Array(W_re);
  const A_im = new Float64Array(W_im);

  for (let col = 0; col < Nr; col++) {
    // Pivot search
    let maxVal = 0;
    let pivotRow = col;
    for (let row = col; row < Nr; row++) {
      const idx = row * Nr + col;
      const mag = A_re[idx] * A_re[idx] + A_im[idx] * A_im[idx];
      if (mag > maxVal) {
        maxVal = mag;
        pivotRow = row;
      }
    }
    if (maxVal < 1e-24) return 0;

    if (pivotRow !== col) {
      // Row swap
      for (let c = 0; c < Nr; c++) {
        const idx1 = col * Nr + c;
        const idx2 = pivotRow * Nr + c;
        const tmp_r = A_re[idx1];
        const tmp_i = A_im[idx1];
        A_re[idx1] = A_re[idx2];
        A_im[idx1] = A_im[idx2];
        A_re[idx2] = tmp_r;
        A_im[idx2] = tmp_i;
      }
      det_re = -det_re;
      det_im = -det_im;
    }

    const p_idx = col * Nr + col;
    const p_re = A_re[p_idx];
    const p_im = A_im[p_idx];
    const p_norm = p_re * p_re + p_im * p_im;

    // det *= pivot
    const new_det_re = det_re * p_re - det_im * p_im;
    const new_det_im = det_re * p_im + det_im * p_re;
    det_re = new_det_re;
    det_im = new_det_im;

    for (let row = col + 1; row < Nr; row++) {
      const r_idx = row * Nr + col;
      // factor = A[row, col] / pivot
      const f_re = (A_re[r_idx] * p_re + A_im[r_idx] * p_im) / p_norm;
      const f_im = (A_im[r_idx] * p_re - A_re[r_idx] * p_im) / p_norm;

      for (let c = col + 1; c < Nr; c++) {
        const target = row * Nr + c;
        const src = col * Nr + c;
        const prod_r = f_re * A_re[src] - f_im * A_im[src];
        const prod_i = f_re * A_im[src] + f_im * A_re[src];
        A_re[target] -= prod_r;
        A_im[target] -= prod_i;
      }
    }
  }

  const detMag = Math.sqrt(det_re * det_re + det_im * det_im);
  return Math.log2(Math.max(1.0, detMag));
}

/**
 * Theoretical BER for BPSK + Alamouti 2x1 STBC over i.i.d. Rayleigh fading.
 * Closed-form solution for diversity order L = 2 (Proakis & Salehi Ch. 14):
 * Pb ≈ (1/4) * (1 - μ)² * (2 + μ)
 * where μ = √(γ / (1 + γ)) and γ = 10^(snrDbPerBit / 10).
 *
 * @param snrDbPerBit Eb/N0 in dB
 * @returns Theoretical bit error rate
 */
export function theoreticalBerAlamouti(snrDbPerBit: number): number {
  const gamma = Math.pow(10, snrDbPerBit / 10);
  const mu = Math.sqrt(gamma / (1.0 + gamma));
  return 0.25 * Math.pow(1.0 - mu, 2) * (2.0 + mu);
}

/**
 * Generates an Nr x Nt MIMO channel matrix with i.i.d. CN(0, 1) entries.
 *
 * @param Nr Number of receive antennas
 * @param Nt Number of transmit antennas
 * @param prng Seeded pseudo-random number generator
 * @returns Float64Array of length 2 * Nr * Nt with interleaved real and imaginary parts
 */
export function generateMimoChannel(
  Nr: number,
  Nt: number,
  prng: Xoshiro128Plus
): Float64Array {
  return generateRayleighFading(Nr * Nt, prng);
}
