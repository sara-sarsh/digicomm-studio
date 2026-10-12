// src/worker/sim-worker.ts
import {
  WorkerCommand,
  WorkerUpdate,
  BerPoint,
  ConstellationPoint,
  SimConfig,
  SimResult
} from '../core/types';
import { Xoshiro128Plus } from '../core/prng';
import { bitsPerSymbol, getConstellationPoints } from '../core/modulation';
import { addAwgn } from '../core/channel';
import { theoreticalBer, qFunction } from '../core/ber-math';
import {
  generateRayleighFading,
  generateRicianFading,
  applyFlatFading,
  perfectCsiEqualize,
  theoreticalBerRayleigh,
  theoreticalBerRician
} from '../core/fading-channel';
import {
  ofdmModulate,
  ofdmDemodulate,
  computePapr
} from '../core/ofdm';
import {
  hammingEncode74,
  hammingDecode74,
  convEncode,
  viterbiDecode
} from '../core/channel-coding';
import {
  alamoutiEncode,
  alamoutiDecode,
  theoreticalBerAlamouti
} from '../core/mimo';

let isAborted = false;

function popcount(n: number): number {
  let count = 0;
  while (n > 0) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}

function wilsonInterval(k: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96; // 95% confidence
  const pHat = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (pHat + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((pHat * (1 - pHat)) / n + z2 / (4 * n * n))) / denom;

  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

function getTheoreticalBerForSim(snrDb: number, config: SimConfig): number {
  const simType = config.simType || 'awgn';
  switch (simType) {
    case 'rayleigh':
      return theoreticalBerRayleigh(snrDb);

    case 'rician':
      return theoreticalBerRician(snrDb, config.ricianKFactor ?? 1);

    case 'ofdm':
      return theoreticalBer(snrDb, config.modulation);

    case 'mimo':
      return theoreticalBerAlamouti(snrDb);

    case 'coded': {
      const coding = config.codingType || 'hamming74';
      if (coding === 'hamming74') {
        const r = 4 / 7;
        const snrLin = Math.pow(10, snrDb / 10);
        const p = qFunction(Math.sqrt(2 * r * snrLin));
        const pCoded = 9 * p * p;
        return Math.min(0.5, Math.max(1e-8, pCoded));
      } else if (coding === 'conv12k3') {
        const snrLin = Math.pow(10, snrDb / 10);
        const p = qFunction(Math.sqrt(5 * snrLin));
        return Math.min(0.5, Math.max(1e-8, p));
      }
      return theoreticalBer(snrDb, config.modulation);
    }

    case 'awgn':
    default:
      return theoreticalBer(snrDb, config.modulation);
  }
}

async function runSimulation(config: SimConfig) {
  isAborted = false;
  const startTime = performance.now();
  const prng = new Xoshiro128Plus(0xcafebabe);

  const simType = config.simType || 'awgn';
  const k = bitsPerSymbol(config.modulation);
  const M = 1 << k;
  const constellation = getConstellationPoints(config.modulation);

  const berCurve: BerPoint[] = [];
  let latestConstellation: ConstellationPoint[] = [];
  let calculatedPapr: number | undefined;

  const snrSteps: number[] = [];
  for (let snr = config.snrMin; snr <= config.snrMax + 1e-9; snr += config.snrStep) {
    snrSteps.push(Number(snr.toFixed(2)));
  }

  let lastProgressTime = performance.now();

  for (let sIdx = 0; sIdx < snrSteps.length; sIdx++) {
    if (isAborted) return;

    const snrDb = snrSteps[sIdx];
    const snrStartTime = performance.now();

    let totalBits = 0;
    let errorCount = 0;
    const currentConstellationSample: ConstellationPoint[] = [];
    const targetSymbols = config.symbolCount || 100000;
    const chunkSize = Math.min(10000, targetSymbols);

    while (totalBits < targetSymbols * k && !isAborted) {
      if (simType === 'coded') {
        // --- CODED SIMULATION ---
        const coding = config.codingType || 'hamming74';
        if (coding === 'hamming74') {
          const numBlocks = Math.max(1, Math.floor(chunkSize / 7));
          const numInfoBits = numBlocks * 4;
          const infoBits = new Uint8Array(numInfoBits);
          for (let i = 0; i < numInfoBits; i++) {
            infoBits[i] = (prng.nextInt() & 1);
          }

          const codedBits = hammingEncode74(infoBits);
          const rate = 4 / 7;
          const snrLinEs = Math.pow(10, snrDb / 10) * rate;
          const sigma = Math.sqrt(1 / (2 * snrLinEs));

          const rxBits = new Uint8Array(codedBits.length);
          for (let i = 0; i < codedBits.length; i++) {
            // BPSK mapping: bit 0 -> +1, bit 1 -> -1
            const txVal = codedBits[i] === 0 ? 1.0 : -1.0;
            const u1 = Math.max(1e-15, prng.next());
            const u2 = prng.next();
            const noise = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
            const rxVal = txVal + noise;
            rxBits[i] = rxVal < 0 ? 1 : 0;

            if (currentConstellationSample.length < 800) {
              currentConstellationSample.push({
                iComponent: rxVal,
                qComponent: 0,
                correct: rxBits[i] === codedBits[i]
              });
            }
          }

          const decodedBits = hammingDecode74(rxBits);
          for (let i = 0; i < numInfoBits; i++) {
            if (decodedBits[i] !== infoBits[i]) errorCount++;
          }
          totalBits += numInfoBits;
        } else {
          // Convolutional (1/2, K=3) with Soft-Decision Viterbi
          const numInfoBits = Math.max(200, Math.floor(chunkSize / 2));
          const infoBits = new Uint8Array(numInfoBits);
          for (let i = 0; i < numInfoBits; i++) {
            infoBits[i] = (prng.nextInt() & 1);
          }

          const codedBits = convEncode(infoBits);
          const rate = 0.5;
          const snrLinEs = Math.pow(10, snrDb / 10) * rate;
          const sigma = Math.sqrt(1 / (2 * snrLinEs));

          const rxSoft = new Float64Array(codedBits.length);
          for (let i = 0; i < codedBits.length; i++) {
            const txVal = codedBits[i] === 0 ? 1.0 : -1.0;
            const u1 = Math.max(1e-15, prng.next());
            const u2 = prng.next();
            const noise = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma;
            const rxVal = txVal + noise;
            rxSoft[i] = rxVal;

            if (currentConstellationSample.length < 800) {
              currentConstellationSample.push({
                iComponent: rxVal,
                qComponent: 0,
                correct: (rxVal < 0 ? 1 : 0) === codedBits[i]
              });
            }
          }

          const decodedBits = viterbiDecode(rxSoft, numInfoBits);
          for (let i = 0; i < numInfoBits; i++) {
            if (decodedBits[i] !== infoBits[i]) errorCount++;
          }
          totalBits += numInfoBits;
        }
      } else if (simType === 'ofdm') {
        // --- OFDM SIMULATION ---
        const N = config.ofdmSubcarriers || 64;
        const Ncp = config.ofdmCpLength || 16;
        const numBlocks = Math.max(1, Math.floor(chunkSize / N));
        const subcarrierCount = numBlocks * N;

        const txSubcarriers = new Float64Array(subcarrierCount * 2);
        const sentIndices = new Uint32Array(subcarrierCount);

        for (let i = 0; i < subcarrierCount; i++) {
          const s = (prng.nextInt() >>> 0) % M;
          sentIndices[i] = s;
          txSubcarriers[i * 2] = constellation[s * 2];
          txSubcarriers[i * 2 + 1] = constellation[s * 2 + 1];
        }

        // Noise variance scaling for time domain
        const snrLin = Math.pow(10, snrDb / 10);
        const sigmaFreq = Math.sqrt(1 / (2 * k * snrLin));
        const sigmaTime = sigmaFreq / Math.sqrt(N);

        for (let b = 0; b < numBlocks; b++) {
          const blockSyms = txSubcarriers.subarray(b * N * 2, (b + 1) * N * 2);
          const timeSignal = ofdmModulate(blockSyms, N, Ncp);
          calculatedPapr = computePapr(timeSignal);

          // Add AWGN noise to time signal
          const totalSamples = N + Ncp;
          const noisyTime = new Float64Array(totalSamples * 2);
          for (let n = 0; n < totalSamples; n++) {
            const u1 = Math.max(1e-15, prng.next());
            const u2 = prng.next();
            const r = Math.sqrt(-2.0 * Math.log(u1)) * sigmaTime;
            const theta = 2 * Math.PI * u2;
            noisyTime[n * 2] = timeSignal[n * 2] + r * Math.cos(theta);
            noisyTime[n * 2 + 1] = timeSignal[n * 2 + 1] + r * Math.sin(theta);
          }

          const rxSubcarriers = ofdmDemodulate(noisyTime, N, Ncp);

          // Detect symbols
          for (let i = 0; i < N; i++) {
            const rI = rxSubcarriers[i * 2];
            const rQ = rxSubcarriers[i * 2 + 1];
            let minDist = Infinity;
            let detected = 0;

            for (let m = 0; m < M; m++) {
              const dI = rI - constellation[m * 2];
              const dQ = rQ - constellation[m * 2 + 1];
              const dist = dI * dI + dQ * dQ;
              if (dist < minDist) {
                minDist = dist;
                detected = m;
              }
            }

            const sent = sentIndices[b * N + i];
            errorCount += popcount(sent ^ detected);
            totalBits += k;

            if (currentConstellationSample.length < 800) {
              currentConstellationSample.push({
                iComponent: rI,
                qComponent: rQ,
                correct: sent === detected
              });
            }
          }
        }
      } else if (simType === 'mimo') {
        // --- 2x1 ALAMOUTI MIMO SIMULATION ---
        const numPairs = Math.floor(chunkSize / 2);
        const sigma = Math.sqrt(Math.pow(10, -snrDb / 10) / (2 * k));
        const invSqrt2 = 1 / Math.SQRT2;

        for (let p = 0; p < numPairs; p++) {
          const s1Idx = (prng.nextInt() >>> 0) % M;
          const s2Idx = (prng.nextInt() >>> 0) % M;
          const s1_re = constellation[s1Idx * 2];
          const s1_im = constellation[s1Idx * 2 + 1];
          const s2_re = constellation[s2Idx * 2];
          const s2_im = constellation[s2Idx * 2 + 1];

          // Use alamoutiEncode
          const pair = new Float64Array([s1_re, s1_im, s2_re, s2_im]);
          const enc = alamoutiEncode(pair);

          // Generate channels h1, h2 ~ CN(0,1)
          const u1 = Math.max(1e-15, prng.next());
          const u2 = prng.next();
          const r1 = Math.sqrt(-2.0 * Math.log(u1)) * invSqrt2;
          const h1_re = r1 * Math.cos(2 * Math.PI * u2);
          const h1_im = r1 * Math.sin(2 * Math.PI * u2);

          const u3 = Math.max(1e-15, prng.next());
          const u4 = prng.next();
          const r2 = Math.sqrt(-2.0 * Math.log(u3)) * invSqrt2;
          const h2_re = r2 * Math.cos(2 * Math.PI * u4);
          const h2_im = r2 * Math.sin(2 * Math.PI * u4);

          // Transmission:
          // Slot 1: Tx1 = enc[0..1], Tx2 = enc[2..3]
          // Slot 2: Tx1 = enc[4..5], Tx2 = enc[6..7]
          const tx1_1_re = enc[0], tx1_1_im = enc[1];
          const tx2_1_re = enc[2], tx2_1_im = enc[3];
          const tx1_2_re = enc[4], tx1_2_im = enc[5];
          const tx2_2_re = enc[6], tx2_2_im = enc[7];

          const rx1_re = (h1_re * tx1_1_re - h1_im * tx1_1_im) + (h2_re * tx2_1_re - h2_im * tx2_1_im);
          const rx1_im = (h1_re * tx1_1_im + h1_im * tx1_1_re) + (h2_re * tx2_1_im + h2_im * tx2_1_re);

          const rx2_re = (h1_re * tx1_2_re - h1_im * tx1_2_im) + (h2_re * tx2_2_re - h2_im * tx2_2_im);
          const rx2_im = (h1_re * tx1_2_im + h1_im * tx1_2_re) + (h2_re * tx2_2_im + h2_im * tx2_2_re);

          // Add noise n1, n2
          const un1 = Math.max(1e-15, prng.next()), un2 = prng.next();
          const rn1 = Math.sqrt(-2.0 * Math.log(un1)) * sigma;
          const n1_re = rn1 * Math.cos(2 * Math.PI * un2);
          const n1_im = rn1 * Math.sin(2 * Math.PI * un2);

          const un3 = Math.max(1e-15, prng.next()), un4 = prng.next();
          const rn2 = Math.sqrt(-2.0 * Math.log(un3)) * sigma;
          const n2_re = rn2 * Math.cos(2 * Math.PI * un4);
          const n2_im = rn2 * Math.sin(2 * Math.PI * un4);

          const rec = new Float64Array([
            rx1_re + n1_re, rx1_im + n1_im,
            rx2_re + n2_re, rx2_im + n2_im
          ]);

          const h1 = new Float64Array([h1_re, h1_im]);
          const h2 = new Float64Array([h2_re, h2_im]);
          const decoded = alamoutiDecode(rec, h1, h2);

          // Detect s1
          let minDist1 = Infinity, det1 = 0;
          for (let m = 0; m < M; m++) {
            const d = (decoded[0] - constellation[m * 2]) ** 2 + (decoded[1] - constellation[m * 2 + 1]) ** 2;
            if (d < minDist1) { minDist1 = d; det1 = m; }
          }
          errorCount += popcount(s1Idx ^ det1);

          // Detect s2
          let minDist2 = Infinity, det2 = 0;
          for (let m = 0; m < M; m++) {
            const d = (decoded[2] - constellation[m * 2]) ** 2 + (decoded[3] - constellation[m * 2 + 1]) ** 2;
            if (d < minDist2) { minDist2 = d; det2 = m; }
          }
          errorCount += popcount(s2Idx ^ det2);
          totalBits += 2 * k;

          if (currentConstellationSample.length < 800) {
            currentConstellationSample.push({
              iComponent: decoded[0],
              qComponent: decoded[1],
              correct: s1Idx === det1
            });
            currentConstellationSample.push({
              iComponent: decoded[2],
              qComponent: decoded[3],
              correct: s2Idx === det2
            });
          }
        }
      } else {
        // --- AWGN / RAYLEIGH / RICIAN SIMULATION ---
        const txSymbols = new Float64Array(chunkSize * 2);
        const sentIndices = new Uint32Array(chunkSize);

        for (let i = 0; i < chunkSize; i++) {
          const s = (prng.nextInt() >>> 0) % M;
          sentIndices[i] = s;
          txSymbols[i * 2] = constellation[s * 2];
          txSymbols[i * 2 + 1] = constellation[s * 2 + 1];
        }

        let rxSymbols: Float64Array;
        if (simType === 'rayleigh') {
          const h = generateRayleighFading(chunkSize, prng);
          const noisy = applyFlatFading(txSymbols, h, snrDb, k, prng);
          rxSymbols = perfectCsiEqualize(noisy, h);
        } else if (simType === 'rician') {
          const h = generateRicianFading(chunkSize, config.ricianKFactor ?? 1, prng);
          const noisy = applyFlatFading(txSymbols, h, snrDb, k, prng);
          rxSymbols = perfectCsiEqualize(noisy, h);
        } else {
          // Pure AWGN
          rxSymbols = addAwgn(txSymbols, snrDb, k, prng);
        }

        // Detect symbols (nearest neighbor hard decision)
        for (let i = 0; i < chunkSize; i++) {
          const rI = rxSymbols[i * 2];
          const rQ = rxSymbols[i * 2 + 1];

          let minDist = Infinity;
          let detected = 0;

          for (let m = 0; m < M; m++) {
            const dI = rI - constellation[m * 2];
            const dQ = rQ - constellation[m * 2 + 1];
            const dist = dI * dI + dQ * dQ;
            if (dist < minDist) {
              minDist = dist;
              detected = m;
            }
          }

          const sent = sentIndices[i];
          const bitDiff = popcount(sent ^ detected);
          errorCount += bitDiff;
          totalBits += k;

          if (currentConstellationSample.length < 800) {
            currentConstellationSample.push({
              iComponent: rI,
              qComponent: rQ,
              correct: sent === detected
            });
          }
        }
      }

      // Adaptive stopping rule: 50 errors collected OR 3 seconds elapsed
      const elapsedForPoint = performance.now() - snrStartTime;
      if (errorCount >= 50 || elapsedForPoint >= 3000) {
        break;
      }

      // Periodic progress update every ~200ms
      const now = performance.now();
      if (now - lastProgressTime > 200) {
        lastProgressTime = now;
        const currentSimBer = totalBits > 0 ? errorCount / totalBits : 0;
        const partialResult: SimResult = {
          berCurve: [
            ...berCurve,
            {
              snrDb,
              berSimulated: Math.max(1e-7, currentSimBer),
              berTheoretical: getTheoreticalBerForSim(snrDb, config),
              confidence95: wilsonInterval(errorCount, totalBits)
            }
          ],
          constellation: currentConstellationSample,
          elapsedMs: now - startTime,
          paprDb: calculatedPapr,
          diversityOrder: simType === 'mimo' ? 2 : (simType === 'rayleigh' ? 1 : undefined),
          codingGainDb: simType === 'coded' ? 0.5 : undefined
        };

        const updateMsg: WorkerUpdate = {
          type: 'PROGRESS',
          progress: sIdx / snrSteps.length,
          result: partialResult
        };
        self.postMessage(updateMsg);

        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const berSimulated = totalBits > 0 ? errorCount / totalBits : 0;
    const berTheoretical = getTheoreticalBerForSim(snrDb, config);
    const confidence95 = wilsonInterval(errorCount, totalBits);

    berCurve.push({
      snrDb,
      berSimulated: Math.max(1e-7, berSimulated),
      berTheoretical,
      confidence95
    });

    latestConstellation = currentConstellationSample;
  }

  if (isAborted) return;

  const finalResult: SimResult = {
    berCurve,
    constellation: latestConstellation,
    elapsedMs: performance.now() - startTime,
    paprDb: calculatedPapr,
    diversityOrder: simType === 'mimo' ? 2 : (simType === 'rayleigh' ? 1 : undefined),
    codingGainDb: simType === 'coded' ? 0.5 : undefined
  };

  const completeMsg: WorkerUpdate = {
    type: 'COMPLETE',
    progress: 1.0,
    result: finalResult
  };
  self.postMessage(completeMsg);
}

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const { type, config } = event.data;

  switch (type) {
    case 'START':
      if (config) {
        runSimulation(config).catch((err) => {
          const errMsg: WorkerUpdate = {
            type: 'ERROR',
            error: String(err)
          };
          self.postMessage(errMsg);
        });
      }
      break;

    case 'STOP':
      isAborted = true;
      break;
  }
};
