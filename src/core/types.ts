// src/core/types.ts

export enum ModulationType {
  BPSK = 0,
  QPSK = 1,
  QAM16 = 2,
  QAM64 = 3
}

export interface SimConfig {
  modulation: ModulationType;
  snrMin: number;      // dB
  snrMax: number;      // dB
  snrStep: number;     // dB
  symbolCount: number; // per SNR point
}

export interface BerPoint {
  snrDb: number;
  berSimulated: number;
  berTheoretical: number;
  confidence95: [number, number]; // Wilson interval [lower, upper]
}

export interface ConstellationPoint {
  iComponent: number;
  qComponent: number;
  correct: boolean;
}

export interface SimResult {
  berCurve: BerPoint[];
  constellation: ConstellationPoint[];
  elapsedMs: number;
}

// Triple-buffer transfer types
export interface WorkerCommand {
  type: 'START' | 'STOP';
  config?: SimConfig;
}

export interface WorkerUpdate {
  type: 'PROGRESS' | 'COMPLETE' | 'ERROR';
  progress?: number;    // 0-1
  result?: SimResult;
  error?: string;
}

// Rendering abstraction
export interface DiagramRenderer {
  clear(): void;
  drawBerCurve(points: BerPoint[]): void;
  drawConstellation(points: ConstellationPoint[]): void;
  resize(width: number, height: number): void;
}
