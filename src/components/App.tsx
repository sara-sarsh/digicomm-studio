// src/components/App.tsx
import React, { useState } from 'react';
import { ModulationType, SimConfig } from '../core/types';
import { useWorkerSimulation } from '../hooks/useWorkerSimulation';
import { generatePythonCode } from '../export/python-exporter';
import { ControlPanel } from './ControlPanel';
import { TheoryPanel } from './TheoryPanel';
import { BerChart } from './BerChart';
import { ConstellationDiagram } from './ConstellationDiagram';

export const App: React.FC = () => {
  const [config, setConfig] = useState<SimConfig>({
    simType: 'awgn',
    modulation: ModulationType.QPSK,
    snrMin: 0,
    snrMax: 10,
    snrStep: 1,
    symbolCount: 50000,
    ofdmSubcarriers: 64,
    ofdmCpLength: 16,
    ricianKFactor: 1,
    codingType: 'hamming74',
    mimoConfig: '2x1-alamouti',
  });

  const [notification, setNotification] = useState<string | null>(null);

  const { start, stop, progress, result, isRunning, error } =
    useWorkerSimulation();

  const handleStart = () => {
    start(config);
  };

  const handleExportPython = () => {
    const code = generatePythonCode(config);
    // Trigger download as digicomm_simulation.py
    try {
      const blob = new Blob([code], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'digicomm_simulation.py';
      a.click();
      URL.revokeObjectURL(url);
      setNotification('Downloaded standalone script: digicomm_simulation.py');
      setTimeout(() => setNotification(null), 3500);
    } catch {
      navigator.clipboard.writeText(code).then(() => {
        setNotification('Python script copied to clipboard!');
        setTimeout(() => setNotification(null), 3500);
      });
    }
  };

  return (
    <div
      style={
        {
          '--color-bg': 'oklch(12% 0 0)',
          '--color-surface': 'oklch(18% 0 0)',
          '--color-border': 'oklch(28% 0 0)',
          '--color-text': 'oklch(88% 0 0)',
          '--color-muted': 'oklch(55% 0 0)',
          '--color-accent': 'oklch(70% 0.18 250)',
          '--space-base': '8px',
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-text)',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: 'calc(var(--space-base) * 3)',
          boxSizing: 'border-box',
        } as React.CSSProperties
      }
    >
      {/* Top Header */}
      <header
        style={{
          maxWidth: '1280px',
          margin: '0 auto calc(var(--space-base) * 3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 'calc(var(--space-base) * 2)',
        }}
      >
        <div>
          <h1
            style={{
              margin: '0 0 6px 0',
              fontSize: '1.75rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            DigiComm Studio
          </h1>
          <p
            style={{
              margin: 0,
              color: 'var(--color-muted)',
              fontSize: '0.95rem',
            }}
          >
            Interactive Digital Communications Laboratory • Proakis &amp; Salehi (5th Edition)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isRunning ? '#22c55e' : '#64748b',
            }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            {isRunning ? 'Worker Running (60 FPS)' : 'Engine Idle'}
          </span>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto 16px',
            backgroundColor: 'oklch(30% 0.15 145)',
            border: '1px solid oklch(50% 0.15 145)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '0.9rem',
          }}
        >
          {notification}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto 16px',
            backgroundColor: 'oklch(30% 0.2 25)',
            border: '1px solid oklch(50% 0.2 25)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 420px) 1fr',
          gap: 'calc(var(--space-base) * 3)',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Control Panel & Theory Panel */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'calc(var(--space-base) * 2.5)',
          }}
        >
          <ControlPanel
            config={config}
            onChangeConfig={setConfig}
            onStart={handleStart}
            onStop={stop}
            onExportPython={handleExportPython}
            isRunning={isRunning}
          />
          <TheoryPanel simType={config.simType} />
        </section>

        {/* Right Column: Graphs & Diagnostics */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'calc(var(--space-base) * 2.5)',
          }}
        >
          <BerChart result={result} progress={progress} />
          <ConstellationDiagram result={result} />
        </section>
      </main>
    </div>
  );
};

export default App;
