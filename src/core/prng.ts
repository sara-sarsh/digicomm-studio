// src/core/prng.ts

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

export class Xoshiro128Plus {
  private s: Uint32Array;

  constructor(seed: number = 0xDEADBEEF) {
    this.s = new Uint32Array(4);
    this.seed(seed);
  }

  seed(value: number): void {
    // SplitMix32 to initialize 4 state words from a single integer seed
    let z = (value >>> 0);
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) >>> 0;
      let y = z ^ (z >>> 16);
      y = Math.imul(y, 0x85ebca6b) >>> 0;
      y = y ^ (y >>> 13);
      y = Math.imul(y, 0xc2b2ae35) >>> 0;
      this.s[i] = (y ^ (y >>> 16)) >>> 0;
    }

    // Ensure non-zero state
    if (this.s[0] === 0 && this.s[1] === 0 && this.s[2] === 0 && this.s[3] === 0) {
      this.s[0] = 1;
    }
  }

  nextInt(): number {
    const s = this.s;
    const result = ((rotl((s[0] + s[3]) >>> 0, 7) + s[0]) >>> 0);

    const t = (s[1] << 9) >>> 0;

    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];

    s[2] ^= t;
    s[3] = rotl(s[3], 11);

    return result;
  }

  next(): number {
    // Return float in [0, 1) using 24 or 32 bits
    return (this.nextInt() >>> 0) / 4294967296;
  }
}
