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
  const simType = config.simType || 'awgn';

  const handleSimTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({
      ...config,
      simType: e.target.value as SimConfig['simType'],
    });
  };

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

      {/* Simulation Type / Channel Mode */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor="simtype-select"
          style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}
        >
          Communication Scheme
        </label>
        <select
          id="simtype-select"
          value={simType}
          disabled={isRunning}
          onChange={handleSimTypeChange}
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
          <option value="awgn">AWGN Channel (Proakis Ch. 5)</option>
          <option value="rayleigh">Rayleigh Fading (NLOS - Ch. 13)</option>
          <option value="rician">Rician Fading (LOS + NLOS - Ch. 13)</option>
          <option value="ofdm">OFDM Multicarrier (IFFT/FFT + CP - Ch. 11)</option>
          <option value="coded">Channel Coding (Hamming / Conv - Ch. 7)</option>
          <option value="mimo">MIMO 2×1 Alamouti STBC (Ch. 14)</option>
        </select>
      </div>

      {/* Conditional Parameters */}
      {simType === 'ofdm' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Subcarriers (N)</label>
            <select
              value={config.ofdmSubcarriers || 64}
              disabled={isRunning}
              onChange={(e) => onChangeConfig({ ...config, ofdmSubcarriers: Number(e.target.value) })}
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              <option value="32">32</option>
              <option value="64">64 (Standard)</option>
              <option value="128">128</option>
              <option value="256">256</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>CP Length (Ncp)</label>
            <select
              value={config.ofdmCpLength || 16}
              disabled={isRunning}
              onChange={(e) => onChangeConfig({ ...config, ofdmCpLength: Number(e.target.value) })}
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              <option value="8">8 (1/8 N)</option>
              <option value="16">16 (1/4 N)</option>
              <option value="32">32 (1/2 N)</option>
            </select>
          </div>
        </div>
      )}

      {simType === 'rician' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Rician K-Factor (Linear Ratio)</label>
          <input
            type="number"
            min="0"
            max="50"
            step="0.5"
            value={config.ricianKFactor ?? 1}
            disabled={isRunning}
            onChange={(e) => onChangeConfig({ ...config, ricianKFactor: Number(e.target.value) })}
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              padding: '6px',
              borderRadius: '6px',
            }}
          />
        </div>
      )}

      {simType === 'coded' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>FEC Code Scheme</label>
          <select
            value={config.codingType || 'hamming74'}
            disabled={isRunning}
            onChange={(e) => onChangeConfig({ ...config, codingType: e.target.value as any })}
            style={{
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <option value="hamming74">Hamming(7,4) Systematic Block Code (R=4/7)</option>
            <option value="conv12k3">Convolutional Code (R=1/2, K=3) + Soft Viterbi</option>
          </select>
        </div>
      )}

      {/* Modulation Type (disabled for coded since BPSK is used as baseline) */}
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
          disabled={isRunning || simType === 'coded'}
          onChange={handleModulationChange}
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.95rem',
            cursor: isRunning || simType === 'coded' ? 'not-allowed' : 'pointer',
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
          <option value="10000">10,000 (Fast Preview)</option>
          <option value="50000">50,000 (Balanced)</option>
          <option value="100000">100,000 (Standard Monte Carlo)</option>
          <option value="500000">500,000 (High Accuracy)</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: 'calc(var(--space-base) * 1.5)',
          marginTop: 'calc(var(--space-base) * 1)',
        }}
      >
        {!isRunning ? (
          <button
            onClick={onStart}
            style={{
              flex: 1,
              backgroundColor: 'var(--color-accent)',
              color: '#000',
              fontWeight: 600,
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>▶</span> Run Simulation
          </button>
        ) : (
          <button
            onClick={onStop}
            style={{
              flex: 1,
              backgroundColor: '#ef4444',
              color: '#fff',
              fontWeight: 600,
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>⏹</span> Stop Engine
          </button>
        )}

        <button
          onClick={onExportPython}
          disabled={isRunning}
          title="Generate and download standalone Python/NumPy simulation script"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '0.95rem',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🐍</span> Export Python
        </button>
      </div>
    </div>
  );
};
