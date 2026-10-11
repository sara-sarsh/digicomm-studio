// src/components/ConstellationDiagram.tsx
import React, { useRef, useEffect } from 'react';
import { SimResult } from '../core/types';
import { CanvasRenderer } from '../rendering/canvas-renderer';

interface ConstellationDiagramProps {
  result: SimResult | null;
}

export const ConstellationDiagram: React.FC<ConstellationDiagramProps> = ({
  result,
}) => {
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
    if (rendererRef.current && result && result.constellation) {
      rendererRef.current.drawConstellation(result.constellation);
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
          Received Constellation (I/Q Plane)
        </h3>
        {result && result.constellation && (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Showing {result.constellation.length} symbols
          </span>
        )}
      </div>

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
