// src/components/App.tsx
import React, { useState, useEffect } from 'react';
import '../styles/brand.css';
import { ModulationType, SimConfig } from '../core/types';
import { useWorkerSimulation } from '../hooks/useWorkerSimulation';
import { generatePythonCode } from '../export/python-exporter';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import { ControlPanel } from './ControlPanel';
import { TheoryPanel } from './TheoryPanel';
import { BerChart } from './BerChart';
import { ConstellationDiagram } from './ConstellationDiagram';

const APP_VERSION = '0.1.0';

const DEFAULT_CONFIG: SimConfig = {
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
};

// ── localStorage persistence ──────────────────────────────────────────────────
const STORAGE_KEY = 'digicomm-last-config';

/** بارگذاری آخرین پیکربندی ذخیره‌شده؛ اگر خراب بود خاموش نادیده می‌گیرد */
function loadPersistedConfig(): Partial<SimConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // اعتبارسنجی سطحی: فقط اگر آبجکت ساده بود
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

/** ذخیره پیکربندی فعلی — در onChange صدا زده می‌شود */
function persistConfig(config: SimConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // QuotaExceededError یا private browsing: بی‌صدا رد می‌شود
  }
}

export const App: React.FC = () => {
  const [config, setConfig] = useState<SimConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...loadPersistedConfig(),
  }));

  const [notification, setNotification] = useState<string | null>(null);

  const { start, stop, progress, result, isRunning, error } =
    useWorkerSimulation();

  useEffect(() => {
    persistConfig(config);
  }, [config]);

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppHeader version={APP_VERSION} />

      <main
        style={{
          flex: 1,
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: 'var(--sp-6) var(--sp-4)',
          boxSizing: 'border-box',
        }}
      >
        {/* Status bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--sp-4)',
            padding: 'var(--sp-2) var(--sp-3)',
            backgroundColor: 'var(--clr-surface)',
            border: '1px solid var(--clr-border)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--clr-muted)' }}>
            Digital Communications Laboratory • Proakis &amp; Salehi (5th Edition)
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isRunning ? '#22c55e' : '#64748b',
              }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--clr-muted)' }}>
              {isRunning ? 'Worker Running (60 FPS)' : 'Engine Idle'}
            </span>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            style={{
              marginBottom: '16px',
              backgroundColor: 'oklch(30% 0.15 145)',
              border: '1px solid oklch(50% 0.15 145)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: 'var(--r-md)',
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
              marginBottom: '16px',
              backgroundColor: 'oklch(30% 0.2 25)',
              border: '1px solid oklch(50% 0.2 25)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: 'var(--r-md)',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Main Two-Column Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 420px) 1fr',
            gap: 'var(--sp-6)',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Control Panel & Theory Panel */}
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-5)',
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
              gap: 'var(--sp-5)',
            }}
          >
            <BerChart result={result} progress={progress} />
            <ConstellationDiagram result={result} />
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default App;
