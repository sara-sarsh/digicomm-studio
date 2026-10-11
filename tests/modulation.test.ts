// tests/modulation.test.ts
import { describe, it, expect } from 'vitest';
import { ModulationType } from '../src/core/types';
import { Xoshiro128Plus } from '../src/core/prng';
import {
  generateSymbols,
  bitsPerSymbol,
  getConstellationPoints,
  getSymbolForGridPosition
} from '../src/core/modulation';

function countBitsDifferent(a: number, b: number): number {
  let diff = a ^ b;
  let count = 0;
  while (diff > 0) {
    count += diff & 1;
    diff >>>= 1;
  }
  return count;
}

describe('Modulation Schemes', () => {
  it('BPSK symbols have I in {-1, +1} and Q = 0', () => {
    const prng = new Xoshiro128Plus(42);
    const symbols = generateSymbols(200, ModulationType.BPSK, prng);

    expect(symbols.length).toBe(400);
    for (let i = 0; i < 200; i++) {
      const I = symbols[i * 2];
      const Q = symbols[i * 2 + 1];
      expect(Math.abs(Math.abs(I) - 1)).toBeLessThan(1e-10);
      expect(Q).toBe(0);
    }
  });

  it('16-QAM constellation has average power ≈ 1.0', () => {
    const points = getConstellationPoints(ModulationType.QAM16);
    let totalPower = 0;
    const numPoints = points.length / 2; // 16

    for (let i = 0; i < numPoints; i++) {
      const I = points[i * 2];
      const Q = points[i * 2 + 1];
      totalPower += I * I + Q * Q;
    }
    const avgPower = totalPower / numPoints;
    expect(Math.abs(avgPower - 1.0)).toBeLessThan(0.01);
  });

  it('64-QAM constellation has average power ≈ 1.0', () => {
    const points = getConstellationPoints(ModulationType.QAM64);
    let totalPower = 0;
    const numPoints = points.length / 2; // 64

    for (let i = 0; i < numPoints; i++) {
      const I = points[i * 2];
      const Q = points[i * 2 + 1];
      totalPower += I * I + Q * Q;
    }
    const avgPower = totalPower / numPoints;
    expect(Math.abs(avgPower - 1.0)).toBeLessThan(0.01);
  });

  it('generateSymbols returns Float64Array of length 2*count', () => {
    const prng = new Xoshiro128Plus(100);
    const symbols = generateSymbols(50, ModulationType.QPSK, prng);
    expect(symbols instanceof Float64Array).toBe(true);
    expect(symbols.length).toBe(100);
  });

  it('verifies bitsPerSymbol mapping', () => {
    expect(bitsPerSymbol(ModulationType.BPSK)).toBe(1);
    expect(bitsPerSymbol(ModulationType.QPSK)).toBe(2);
    expect(bitsPerSymbol(ModulationType.QAM16)).toBe(4);
    expect(bitsPerSymbol(ModulationType.QAM64)).toBe(6);
  });

  it('preserves Gray coding property: adjacent lattice symbols differ by 1 bit', () => {
    // Check 16-QAM 4x4 grid: adjacent lattice points differ by exactly 1 bit
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const sym = getSymbolForGridPosition(row, col, ModulationType.QAM16);

        // Check horizontal neighbor
        if (col < 3) {
          const rightSym = getSymbolForGridPosition(row, col + 1, ModulationType.QAM16);
          expect(countBitsDifferent(sym, rightSym)).toBe(1);
        }

        // Check vertical neighbor
        if (row < 3) {
          const bottomSym = getSymbolForGridPosition(row + 1, col, ModulationType.QAM16);
          expect(countBitsDifferent(sym, bottomSym)).toBe(1);
        }
      }
    }

    // Check 64-QAM 8x8 grid as well
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sym = getSymbolForGridPosition(row, col, ModulationType.QAM64);
        if (col < 7) {
          const rightSym = getSymbolForGridPosition(row, col + 1, ModulationType.QAM64);
          expect(countBitsDifferent(sym, rightSym)).toBe(1);
        }
        if (row < 7) {
          const bottomSym = getSymbolForGridPosition(row + 1, col, ModulationType.QAM64);
          expect(countBitsDifferent(sym, bottomSym)).toBe(1);
        }
      }
    }
  });
});
