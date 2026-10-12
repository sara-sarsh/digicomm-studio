// src/core/channel-coding.ts

/**
 * Hamming(7,4) Systematic Encoder
 * Generator matrix:
 * G = [[1,0,0,0,1,1,0],
 *      [0,1,0,0,1,0,1],
 *      [0,0,1,0,0,1,1],
 *      [0,0,0,1,1,1,1]]
 * @param bits Input message bits (length multiple of 4, padded with zeros if necessary)
 * @returns 7-bit codewords
 */
export function hammingEncode74(bits: Uint8Array): Uint8Array {
  const numBlocks = Math.ceil(bits.length / 4);
  const out = new Uint8Array(numBlocks * 7);

  for (let b = 0; b < numBlocks; b++) {
    const m0 = bits[b * 4] || 0;
    const m1 = bits[b * 4 + 1] || 0;
    const m2 = bits[b * 4 + 2] || 0;
    const m3 = bits[b * 4 + 3] || 0;

    out[b * 7 + 0] = m0;
    out[b * 7 + 1] = m1;
    out[b * 7 + 2] = m2;
    out[b * 7 + 3] = m3;
    out[b * 7 + 4] = m0 ^ m1 ^ m3;
    out[b * 7 + 5] = m0 ^ m2 ^ m3;
    out[b * 7 + 6] = m1 ^ m2 ^ m3;
  }

  return out;
}

/**
 * Hamming(7,4) Syndrome Decoder (Hard-Decision)
 * Corrects all single-bit transmission errors per 7-bit block.
 * @param bits Received 7-bit codeword blocks
 * @returns Decoded 4-bit message blocks
 */
export function hammingDecode74(bits: Uint8Array): Uint8Array {
  const numBlocks = Math.floor(bits.length / 7);
  const out = new Uint8Array(numBlocks * 4);

  // Syndrome lookup to error position (0 to 6)
  // s0 = r0 ^ r1 ^ r3 ^ r4
  // s1 = r0 ^ r2 ^ r3 ^ r5
  // s2 = r1 ^ r2 ^ r3 ^ r6
  // s = (s0 << 2) | (s1 << 1) | s2
  const errorMap: Record<number, number> = {
    0: -1, // no error
    6: 0,
    5: 1,
    3: 2,
    7: 3,
    4: 4,
    2: 5,
    1: 6,
  };

  for (let b = 0; b < numBlocks; b++) {
    const r = new Uint8Array(7);
    for (let j = 0; j < 7; j++) {
      r[j] = bits[b * 7 + j];
    }

    const s0 = r[0] ^ r[1] ^ r[3] ^ r[4];
    const s1 = r[0] ^ r[2] ^ r[3] ^ r[5];
    const s2 = r[1] ^ r[2] ^ r[3] ^ r[6];
    const s = (s0 << 2) | (s1 << 1) | s2;

    const errPos = errorMap[s];
    if (errPos !== undefined && errPos >= 0) {
      r[errPos] ^= 1; // Correct single-bit error
    }

    out[b * 4 + 0] = r[0];
    out[b * 4 + 1] = r[1];
    out[b * 4 + 2] = r[2];
    out[b * 4 + 3] = r[3];
  }

  return out;
}

/**
 * Rate 1/2, Constraint Length K=3 Convolutional Encoder
 * Generator polynomials: g1 = 7 (octal: 0b111), g2 = 5 (octal: 0b101)
 * @param bits Input bitstream
 * @returns Output bitstream with tail bits (length 2 * (bits.length + K - 1))
 */
export function convEncode(bits: Uint8Array): Uint8Array {
  const K = 3;
  const numBits = bits.length;
  const totalSteps = numBits + K - 1; // terminated with K-1=2 zero bits
  const out = new Uint8Array(totalSteps * 2);

  let state = 0; // 2-bit state: (m_{t-1} << 1) | m_{t-2}

  for (let t = 0; t < totalSteps; t++) {
    const b = t < numBits ? bits[t] : 0;
    const m1 = (state >> 1) & 1;
    const m2 = state & 1;

    // g1 = 1 + D + D^2
    const out1 = b ^ m1 ^ m2;
    // g2 = 1 + D^2
    const out2 = b ^ m2;

    out[t * 2] = out1;
    out[t * 2 + 1] = out2;

    // Update shift register: push b in, shift m1 into m2
    state = ((b << 1) | m1) & 3;
  }

  return out;
}

/**
 * Soft-Decision Viterbi Decoder for K=3, Rate 1/2
 * @param softBits Received soft values (positive corresponds to bit 0, negative to bit 1)
 * @param originalLength Number of information bits to recover
 */
export function viterbiDecode(
  softBits: Float64Array,
  originalLength: number
): Uint8Array {
  const numSteps = softBits.length / 2;
  const numStates = 4;

  let pathMetrics = new Float64Array([0, Infinity, Infinity, Infinity]);
  const history: { prevStates: Int32Array; transBits: Int32Array }[] = [];

  for (let t = 0; t < numSteps; t++) {
    const y0 = softBits[t * 2];
    const y1 = softBits[t * 2 + 1];

    const nextMetrics = new Float64Array(numStates).fill(Infinity);
    const prevStates = new Int32Array(numStates);
    const transBits = new Int32Array(numStates);

    for (let s = 0; s < numStates; s++) {
      if (!isFinite(pathMetrics[s])) continue;
      const m1 = (s >> 1) & 1;
      const m2 = s & 1;

      for (let b = 0; b <= 1; b++) {
        const nextState = ((b << 1) | m1) & 3;
        const c0 = b ^ m1 ^ m2;
        const c1 = b ^ m2;

        const x0 = c0 === 0 ? 1 : -1;
        const x1 = c1 === 0 ? 1 : -1;

        const branchMetric = (y0 - x0) ** 2 + (y1 - x1) ** 2;
        const total = pathMetrics[s] + branchMetric;

        if (total < nextMetrics[nextState]) {
          nextMetrics[nextState] = total;
          prevStates[nextState] = s;
          transBits[nextState] = b;
        }
      }
    }

    pathMetrics = nextMetrics;
    history.push({ prevStates, transBits });
  }

  // Traceback from state 0 (tail ends in state 0)
  const decoded = new Uint8Array(originalLength);
  let curState = 0;

  for (let t = numSteps - 1; t >= 0; t--) {
    const { prevStates, transBits } = history[t];
    const b = transBits[curState];
    if (t < originalLength) {
      decoded[t] = b;
    }
    curState = prevStates[curState];
  }

  return decoded;
}

/**
 * Return code rate as a fraction
 */
export function codingRate(type: 'hamming74' | 'conv12k3'): number {
  switch (type) {
    case 'hamming74':
      return 4 / 7;
    case 'conv12k3':
      return 1 / 2;
  }
}
