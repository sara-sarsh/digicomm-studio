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
import { theoreticalBer } from '../core/ber-math';

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

async function runSimulation(config: SimConfig) {
  isAborted = false;
  const startTime = performance.now();
  const prng = new Xoshiro128Plus(0xcafebabe);

  const k = bitsPerSymbol(config.modulation);
  const M = 1 << k;
  const constellation = getConstellationPoints(config.modulation);

  const berCurve: BerPoint[] = [];
  let latestConstellation: ConstellationPoint[] = [];

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

    const txSymbols = new Float64Array(chunkSize * 2);
    const sentIndices = new Uint32Array(chunkSize);

    while (totalBits < targetSymbols * k && !isAborted) {
      // 1. Generate symbols
      for (let i = 0; i < chunkSize; i++) {
        const s = (prng.nextInt() >>> 0) % M;
        sentIndices[i] = s;
        txSymbols[i * 2] = constellation[s * 2];
        txSymbols[i * 2 + 1] = constellation[s * 2 + 1];
      }

      // 2. Add AWGN noise
      const rxSymbols = addAwgn(txSymbols, snrDb, k, prng);

      // 3. Detect symbols (nearest neighbor hard decision)
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

        // Keep constellation sample points
        if (currentConstellationSample.length < 800) {
          currentConstellationSample.push({
            iComponent: rI,
            qComponent: rQ,
            correct: sent === detected
          });
        }
      }

      // 4. Adaptive stopping rule: 50 errors collected OR 3 seconds elapsed
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
              berTheoretical: theoreticalBer(snrDb, config.modulation),
              confidence95: wilsonInterval(errorCount, totalBits)
            }
          ],
          constellation: currentConstellationSample,
          elapsedMs: now - startTime
        };

        const updateMsg: WorkerUpdate = {
          type: 'PROGRESS',
          progress: sIdx / snrSteps.length,
          result: partialResult
        };
        self.postMessage(updateMsg);

        // Yield execution to allow message processing
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const berSimulated = totalBits > 0 ? errorCount / totalBits : 0;
    const berTheoretical = theoreticalBer(snrDb, config.modulation);
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
    elapsedMs: performance.now() - startTime
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
