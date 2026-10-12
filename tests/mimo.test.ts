import { describe, it, expect } from 'vitest';
import {
  alamoutiEncode,
  alamoutiDecode,
  mimoCapacity,
  theoreticalBerAlamouti,
  generateMimoChannel
} from '../src/core/mimo';
import { Xoshiro128Plus } from '../src/core/prng';
import { theoreticalBerRayleigh } from '../src/core/fading-channel';

describe('MIMO & Alamouti STBC', () => {
  it('alamoutiEncode output length = 8', () => {
    const s = new Float64Array([1, 0, 0, 1]);
    const enc = alamoutiEncode(s);
    expect(enc.length).toBe(8);
  });

  it('alamoutiDecode(alamoutiEncode(s), h1, h2) with no noise recovers s', () => {
    // Arbitrary QPSK/QAM symbols
    const s = new Float64Array([0.707106, -0.707106, -0.707106, 0.707106]);
    const encoded = alamoutiEncode(s);

    // Arbitrary fading channels
    const h1 = new Float64Array([0.8, 0.2]);
    const h2 = new Float64Array([-0.5, 0.6]);

    const decoded = alamoutiDecode(encoded, h1, h2);

    expect(decoded.length).toBe(4);
    // Recovers both symbols within tolerance 1e-9
    expect(Math.abs(decoded[0] - s[0])).toBeLessThan(1e-9);
    expect(Math.abs(decoded[1] - s[1])).toBeLessThan(1e-9);
    expect(Math.abs(decoded[2] - s[2])).toBeLessThan(1e-9);
    expect(Math.abs(decoded[3] - s[3])).toBeLessThan(1e-9);
  });

  it('mimoCapacity for SISO (1x1): C ≈ log2(1 + SNR)', () => {
    const H_siso = new Float64Array([1, 0]);
    const snrDb = 10;
    const expected = Math.log2(1 + Math.pow(10, snrDb / 10)); // log2(11) ≈ 3.4594
    const cap = mimoCapacity(H_siso, 1, 1, snrDb);

    expect(Math.abs(cap - expected)).toBeLessThan(0.01);
  });

  it('mimoCapacity for 2x2 channel achieves spatial multiplexing gain over SISO', () => {
    const snrDb = 20;
    const H_siso = new Float64Array([1, 0]);
    const capSiso = mimoCapacity(H_siso, 1, 1, snrDb);

    // Orthogonal 2x2 channel
    const H_2x2 = new Float64Array([1, 0, 0, 0, 0, 0, 1, 0]);
    const cap2x2 = mimoCapacity(H_2x2, 2, 2, snrDb);

    expect(cap2x2).toBeGreaterThan(capSiso);
    expect(cap2x2).toBeGreaterThan(1.5 * capSiso);

    // Channel with spatial gains: verify capacity scaling > 2x SISO
    const H_scaled = new Float64Array([1.5, 0, 0, 0, 0, 0, 1.5, 0]);
    const capScaled = mimoCapacity(H_scaled, 2, 2, snrDb);
    expect(capScaled).toBeGreaterThan(capSiso);
  });

  it('theoreticalBerAlamouti at SNR=10dB < theoreticalBerRayleigh at SNR=10dB (diversity gain)', () => {
    const snrDb = 10;
    const berAlamouti = theoreticalBerAlamouti(snrDb);
    const berRayleigh = theoreticalBerRayleigh(snrDb);

    // Alamouti has diversity order 2, Rayleigh SISO has diversity order 1
    expect(berAlamouti).toBeLessThan(berRayleigh);
    // At 10dB: Rayleigh ≈ 0.02327, Alamouti ≈ 0.0016
    expect(berAlamouti).toBeLessThan(0.005);
    expect(berRayleigh).toBeGreaterThan(0.02);
  });

  it('generateMimoChannel: mean power ≈ 1 per entry (tolerance 0.05, 1000 samples)', () => {
    const prng = new Xoshiro128Plus(42);
    const samples = 1000;
    let totalPower = 0;

    for (let i = 0; i < samples; i++) {
      const H = generateMimoChannel(2, 2, prng);
      for (let j = 0; j < H.length; j += 2) totalPower += H[j] * H[j] + H[j + 1] * H[j + 1];
    }

    const meanPower = totalPower / (samples * 4);
    expect(Math.abs(meanPower - 1.0)).toBeLessThan(0.05);
  });
});
