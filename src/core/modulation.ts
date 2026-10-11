// src/core/modulation.ts
import { ModulationType } from './types';
import { Xoshiro128Plus } from './prng';

export function bitsPerSymbol(mod: ModulationType): number {
  switch (mod) {
    case ModulationType.BPSK:
      return 1;
    case ModulationType.QPSK:
      return 2;
    case ModulationType.QAM16:
      return 4;
    case ModulationType.QAM64:
      return 6;
  }
}

export function binaryToGray(b: number): number {
  return (b >>> 1) ^ b;
}

export function grayToBinary(g: number): number {
  let b = g;
  while ((g >>>= 1) > 0) {
    b ^= g;
  }
  return b;
}

// BPSK points: 0 -> -1, 1 -> +1
const BPSK_POINTS: [number, number][] = [
  [-1, 0],
  [1, 0],
];

// QPSK: 2 bits (1 bit for I, 1 bit for Q), normalized by 1/√2
const SQRT2_INV = 1 / Math.SQRT2;
const PAM2_LEVELS = [-SQRT2_INV, SQRT2_INV];

// 16-QAM: 4 bits (2 bits for I, 2 bits for Q), normalized by 1/√10
const SQRT10_INV = 1 / Math.sqrt(10);
const PAM4_LEVELS = [-3 * SQRT10_INV, -1 * SQRT10_INV, 1 * SQRT10_INV, 3 * SQRT10_INV];

// 64-QAM: 6 bits (3 bits for I, 3 bits for Q), normalized by 1/√42
const SQRT42_INV = 1 / Math.sqrt(42);
const PAM8_LEVELS = [
  -7 * SQRT42_INV, -5 * SQRT42_INV, -3 * SQRT42_INV, -1 * SQRT42_INV,
  1 * SQRT42_INV, 3 * SQRT42_INV, 5 * SQRT42_INV, 7 * SQRT42_INV
];

export function getConstellationPoints(mod: ModulationType): Float64Array {
  const m = 1 << bitsPerSymbol(mod);
  const out = new Float64Array(m * 2);

  switch (mod) {
    case ModulationType.BPSK:
      for (let s = 0; s < 2; s++) {
        out[s * 2] = BPSK_POINTS[s][0];
        out[s * 2 + 1] = BPSK_POINTS[s][1];
      }
      break;

    case ModulationType.QPSK:
      for (let s = 0; s < 4; s++) {
        const sI = (s >>> 1) & 1;
        const sQ = s & 1;
        const r = grayToBinary(sI);
        const c = grayToBinary(sQ);
        out[s * 2] = PAM2_LEVELS[r];
        out[s * 2 + 1] = PAM2_LEVELS[c];
      }
      break;

    case ModulationType.QAM16:
      for (let s = 0; s < 16; s++) {
        const sI = (s >>> 2) & 3;
        const sQ = s & 3;
        const r = grayToBinary(sI);
        const c = grayToBinary(sQ);
        out[s * 2] = PAM4_LEVELS[r];
        out[s * 2 + 1] = PAM4_LEVELS[c];
      }
      break;

    case ModulationType.QAM64:
      for (let s = 0; s < 64; s++) {
        const sI = (s >>> 3) & 7;
        const sQ = s & 7;
        const r = grayToBinary(sI);
        const c = grayToBinary(sQ);
        out[s * 2] = PAM8_LEVELS[r];
        out[s * 2 + 1] = PAM8_LEVELS[c];
      }
      break;
  }
  return out;
}

export function getSymbolForGridPosition(
  row: number,
  col: number,
  mod: ModulationType
): number {
  switch (mod) {
    case ModulationType.QPSK:
      return (binaryToGray(row) << 1) | binaryToGray(col);
    case ModulationType.QAM16:
      return (binaryToGray(row) << 2) | binaryToGray(col);
    case ModulationType.QAM64:
      return (binaryToGray(row) << 3) | binaryToGray(col);
    default:
      return row;
  }
}

export function generateSymbols(
  count: number,
  mod: ModulationType,
  prng: Xoshiro128Plus
): Float64Array {
  const result = new Float64Array(count * 2);
  const constellation = getConstellationPoints(mod);
  const M = 1 << bitsPerSymbol(mod);

  for (let i = 0; i < count; i++) {
    const symbolIndex = (prng.nextInt() >>> 0) % M;
    result[i * 2] = constellation[symbolIndex * 2];
    result[i * 2 + 1] = constellation[symbolIndex * 2 + 1];
  }

  return result;
}
