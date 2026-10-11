// src/components/ControlPanel.tsx
import React from 'react';
import { ModulationType, SimConfig } from '../core/types';

interface ControlPanelProps {
  config: SimConfig;
  onChangeConfig: (newConfig: SimConfig) => void;
  onStart: () => void;
  onStop: () => void;
  onExportPython: () => void;
  isRunning: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChangeConfig,
  onStart,
  onStop,
  onExportPython,
  isRunning,
}) => {
  const handleModulationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({
      ...config,
      modulation: Number(e.target.value) as ModulationType,
    });
  };

  const handleSnrMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeConfig({
      ...config,
      snrMin: Number(e.target.value),
    });
  };

  const handleSnrMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeConfig({
      ...config,
      snrMax: Number(e.target.value),
    });
  };

  const handleSnrStepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeConfig({
      ...config,
      snrStep: Number(e.target.value),
    });
  };

  const handleSymbolCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({
      ...config,
      symbolCount: Number(e.target.value),
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: 'calc(var(--space-base) * 2.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(var(--space-base) * 2)',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: '1.25rem',
          color: 'var(--color-text)',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 'calc(var(--space-base) * 1)',
        }}
      >
        Simulation Parameters
      </h2>

      {/* Modulation Type */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor="mod-select"
          style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}
        >
          Modulation Scheme
        </label>
        <select
          id="mod-select"
          value={config.modulation}
          disabled={isRunning}
          onChange={handleModulationChange}
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.95rem',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          <option value={ModulationType.BPSK}>BPSK (1 bit/symbol)</option>
          <option value={ModulationType.QPSK}>QPSK (2 bits/symbol)</option>
          <option value={ModulationType.QAM16}>16-QAM (4 bits/symbol)</option>
          <option value={ModulationType.QAM64}>64-QAM (6 bits/symbol)</option>
        </select>
      </div>

      {/* SNR Range Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="snr-min"
            style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}
          >
            Min SNR (dB)
          </label>
          <input
            id="snr-min"
            type="number"
            step="1"
            value={config.snrMin}
            disabled={isRunning}
            onChange={handleSnrMinChange}
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '0.95rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="snr-max"
            style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}
          >
            Max SNR (dB)
          </label>
          <input
            id="snr-max"
            type="number"
            step="1"
            value={config.snrMax}
            disabled={isRunning}
            onChange={handleSnrMaxChange}
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '0.95rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="snr-step"
            style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}
          >
            Step (dB)
          </label>
          <input
            id="snr-step"
            type="number"
            step="0.5"
            min="0.5"
            value={config.snrStep}
            disabled={isRunning}
            onChange={handleSnrStepChange}
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '0.95rem',
            }}
          />
        </div>
      </div>

      {/* Symbol Count */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor="symbol-count"
          style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}
        >
          Symbols per SNR Point
        </label>
        <select
          id="symbol-count"
          value={config.symbolCount}
          disabled={isRunning}
          onChange={handleSymbolCountChange}
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.95rem',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          <option value={10000}>10,000 (Fast preview)</option>
          <option value={100000}>100,000 (Standard accuracy)</option>
          <option value={1000000}>1,000,000 (High statistical validity)</option>
        </select>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        {!isRunning ? (
          <button
            onClick={onStart}
            style={{
              flex: 1,
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            Run Simulation
          </button>
        ) : (
          <button
            onClick={onStop}
            style={{
              flex: 1,
              backgroundColor: 'oklch(60% 0.22 25)',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Stop Simulation
          </button>
        )}

        <button
          onClick={onExportPython}
          title="Export runnable Python NumPy script"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Export Python
        </button>
      </div>
    </div>
  );
};
