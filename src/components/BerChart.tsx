// src/components/BerChart.tsx
import React, { useRef, useEffect } from 'react';
import { SimResult } from '../core/types';
import { CanvasRenderer } from '../rendering/canvas-renderer';

interface BerChartProps {
  result: SimResult | null;
  progress: number;
}

export const BerChart: React.FC<BerChartProps> = ({ result, progress }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;
    renderer.clear();

    const handleResize = () => {
      if (canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        renderer.resize(rect.width, 360);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current && result && result.berCurve) {
      rendererRef.current.drawBerCurve(result.berCurve);
    }
  }, [result]);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: 'calc(var(--space-base) * 2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(var(--space-base) * 1.5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '1.1rem',
            color: 'var(--color-text)',
          }}
        >
          BER Performance Curve (Log Scale)
        </h3>
        {result && (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Elapsed: {Math.round(result.elapsedMs)} ms
          </span>
        )}
      </div>

      {progress > 0 && progress < 1 && (
        <div
          style={{
            width: '100%',
            height: '4px',
            backgroundColor: 'var(--color-border)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              backgroundColor: 'var(--color-accent)',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      )}

      <div style={{ width: '100%', height: '360px', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
};
