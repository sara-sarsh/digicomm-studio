// tests/channel-coding.test.ts
import { describe, it, expect } from 'vitest';
import {
  hammingEncode74,
  hammingDecode74,
  convEncode,
  viterbiDecode,
  codingRate,
} from '../src/core/channel-coding';
import { Xoshiro128Plus } from '../src/core/prng';

describe('Channel Coding Module', () => {
  it('hammingEncode74: encode [1,0,1,1] = [1,0,1,1,0,1,0]', () => {
    const input = new Uint8Array([1, 0, 1, 1]);
    const encoded = hammingEncode74(input);
    expect(Array.from(encoded)).toEqual([1, 0, 1, 1, 0, 1, 0]);
  });

  it('hammingDecode74: corrects all single-bit error positions', () => {
    const orig = new Uint8Array([1, 0, 1, 1]);
    const cw = [1, 0, 1, 1, 0, 1, 0];

    for (let errPos = 0; errPos < 7; errPos++) {
      const corrupted = [...cw];
      corrupted[errPos] ^= 1; // Flip exactly 1 bit
      const decoded = hammingDecode74(new Uint8Array(corrupted));
      expect(Array.from(decoded)).toEqual(Array.from(orig));
    }
  });

  it('hammingDecode74: 0 errors -> original bits unchanged', () => {
    const input = new Uint8Array([0, 1, 1, 0]);
    const encoded = hammingEncode74(input);
    const decoded = hammingDecode74(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(input));
  });

  it('convEncode: [1,0,1] produces [1,1, 1,0, 0,0] as first 6 output bits', () => {
    const input = new Uint8Array([1, 0, 1]);
    const encoded = convEncode(input);
    const first6 = Array.from(encoded.slice(0, 6));
    expect(first6).toEqual([1, 1, 1, 0, 0, 0]);
  });

  it('viterbiDecode: encode then decode at high SNR (>15dB) -> BER = 0', () => {
    const orig = new Uint8Array([1, 0, 1, 1, 0, 1, 0, 0, 1, 1]);
    const encoded = convEncode(orig);

    // Map bits to BPSK soft symbols (0 -> +1.0, 1 -> -1.0) with small noise (high SNR)
    const softBits = new Float64Array(encoded.length);
    for (let i = 0; i < encoded.length; i++) {
      const nominal = encoded[i] === 0 ? 1.0 : -1.0;
      softBits[i] = nominal + 0.05 * (i % 2 === 0 ? 1 : -1);
    }

    const decoded = viterbiDecode(softBits, orig.length);
    expect(Array.from(decoded)).toEqual(Array.from(orig));
  });

  it('Hamming coding gain: Hamming BER at SNR=4dB < uncoded BER at SNR=4dB', () => {
    const prng = new Xoshiro128Plus(42);
    const numBits = 10000;
    const infoBits = new Uint8Array(numBits);
    for (let i = 0; i < numBits; i++) {
      infoBits[i] = (prng.nextInt() >>> 0) % 2;
    }

    // AWGN channel transition probability at 4dB:
    // snrLinear = 10^0.4 ≈ 2.512.
    // Uncoded BPSK has p ≈ Q(sqrt(2 * snrLinear)) ≈ 0.0125
    const snrLinear = Math.pow(10, 4 / 10);
    const sigma = Math.sqrt(1 / (2 * snrLinear));

    // 1. Uncoded simulation
    let uncodedErrors = 0;
    for (let i = 0; i < numBits; i++) {
      const tx = infoBits[i] === 0 ? 1.0 : -1.0;
      const u1 = Math.max(1e-15, prng.next());
      const u2 = prng.next();
      const n = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
      const rx = tx + n;
      const detected = rx >= 0 ? 0 : 1;
      if (detected !== infoBits[i]) uncodedErrors++;
    }
    const uncodedBer = uncodedErrors / numBits;

    // 2. Coded simulation with Hamming(7,4)
    const encodedBits = hammingEncode74(infoBits);
    const rxCoded = new Uint8Array(encodedBits.length);

    for (let i = 0; i < encodedBits.length; i++) {
      const tx = encodedBits[i] === 0 ? 1.0 : -1.0;
      const u1 = Math.max(1e-15, prng.next());
      const u2 = prng.next();
      const n = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
      const rx = tx + n;
      rxCoded[i] = rx >= 0 ? 0 : 1;
    }

    const decodedBits = hammingDecode74(rxCoded);
    let codedErrors = 0;
    for (let i = 0; i < numBits; i++) {
      if (decodedBits[i] !== infoBits[i]) codedErrors++;
    }
    const codedBer = codedErrors / numBits;

    expect(codedBer).toBeLessThan(uncodedBer);
  });

  it('verifies coding rates', () => {
    expect(codingRate('hamming74')).toBeCloseTo(4 / 7, 5);
    expect(codingRate('conv12k3')).toBe(0.5);
  });
});
