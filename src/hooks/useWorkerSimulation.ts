// src/hooks/useWorkerSimulation.ts
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  SimConfig,
  WorkerUpdate,
  SimResult,
  WorkerCommand
} from '../core/types';

export interface UseWorkerSimulationReturn {
  start: (config: SimConfig) => void;
  stop: () => void;
  progress: number;
  result: SimResult | null;
  isRunning: boolean;
  error: string | null;
}

export function useWorkerSimulation(): UseWorkerSimulationReturn {
  const workerRef = useRef<Worker | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Instantiate module web worker
    const worker = new Worker(
      new URL('../worker/sim-worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerUpdate>) => {
      const update = event.data;

      switch (update.type) {
        case 'PROGRESS':
          if (typeof update.progress === 'number') {
            setProgress(update.progress);
          }
          if (update.result) {
            setResult(update.result);
          }
          break;

        case 'COMPLETE':
          setProgress(1.0);
          setIsRunning(false);
          if (update.result) {
            setResult(update.result);
          }
          break;

        case 'ERROR':
          setIsRunning(false);
          setError(update.error || 'Unknown simulation worker error');
          break;
      }
    };

    worker.onerror = (err) => {
      setIsRunning(false);
      setError(err.message || 'Worker thread execution error');
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const start = useCallback((config: SimConfig) => {
    if (!workerRef.current) return;
    setError(null);
    setProgress(0);
    setIsRunning(true);

    const cmd: WorkerCommand = {
      type: 'START',
      config
    };
    workerRef.current.postMessage(cmd);
  }, []);

  const stop = useCallback(() => {
    if (!workerRef.current) return;
    setIsRunning(false);

    const cmd: WorkerCommand = {
      type: 'STOP'
    };
    workerRef.current.postMessage(cmd);
  }, []);

  return {
    start,
    stop,
    progress,
    result,
    isRunning,
    error
  };
}
