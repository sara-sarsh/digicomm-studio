// src/rendering/canvas-renderer.ts
import { BerPoint, ConstellationPoint, DiagramRenderer } from '../core/types';

export class CanvasRenderer implements DiagramRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private cachedBerPoints: BerPoint[] = [];
  private cachedConstellation: ConstellationPoint[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to obtain 2D canvas context');
    }
    this.ctx = context;
    this.width = canvas.width || 600;
    this.height = canvas.height || 400;
  }

  clear(): void {
    this.ctx.fillStyle = 'oklch(15% 0 0)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.clear();
    if (this.cachedConstellation.length > 0) {
      this.drawConstellation(this.cachedConstellation);
    } else if (this.cachedBerPoints.length > 0) {
      this.drawBerCurve(this.cachedBerPoints);
    }
  }

  drawConstellation(points: ConstellationPoint[]): void {
    this.cachedConstellation = points;
    this.clear();

    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const scale = Math.min(this.width, this.height) / 4.2;

    // Grid lines and axes
    ctx.strokeStyle = 'oklch(25% 0 0)';
    ctx.lineWidth = 1;

    // Cross axes
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(this.width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, this.height);
    ctx.stroke();

    // Unit circle (reference)
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, 2 * Math.PI);
    ctx.stroke();

    // Grid circles
    ctx.beginPath();
    ctx.arc(cx, cy, scale * Math.SQRT2, 0, 2 * Math.PI);
    ctx.stroke();

    // Separate correct and error symbols for batch path drawing
    ctx.fillStyle = 'oklch(70% 0.15 145)'; // Correct symbols
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.correct) {
        const x = cx + p.iComponent * scale;
        const y = cy - p.qComponent * scale;
        ctx.moveTo(x + 3, y);
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
      }
    }
    ctx.fill();

    ctx.fillStyle = 'oklch(70% 0.2 20)'; // Error symbols
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p.correct) {
        const x = cx + p.iComponent * scale;
        const y = cy - p.qComponent * scale;
        ctx.moveTo(x + 4, y);
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
      }
    }
    ctx.fill();

    // Labels
    ctx.fillStyle = 'oklch(80% 0 0)';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('In-phase (I)', this.width - 15, cy - 8);
    ctx.textAlign = 'left';
    ctx.fillText('Quadrature (Q)', cx + 8, 20);
  }

  drawBerCurve(points: BerPoint[]): void {
    this.cachedBerPoints = points;
    this.clear();

    const ctx = this.ctx;
    const margin = { top: 30, right: 30, bottom: 45, left: 65 };
    const plotW = this.width - margin.left - margin.right;
    const plotH = this.height - margin.top - margin.bottom;

    if (plotW <= 0 || plotH <= 0) return;

    // Determine SNR range
    let minSnr = 0;
    let maxSnr = 12;
    if (points.length > 0) {
      minSnr = points[0].snrDb;
      maxSnr = points[points.length - 1].snrDb;
      if (minSnr === maxSnr) {
        maxSnr = minSnr + 5;
      }
    }

    const logMin = -6; // 1e-6
    const logMax = 0;  // 1e0 = 1

    const toX = (snr: number) =>
      margin.left + ((snr - minSnr) / (maxSnr - minSnr)) * plotW;

    const toY = (ber: number) => {
      const safeBer = Math.max(1e-6, Math.min(1, ber));
      const logBer = Math.log10(safeBer);
      return margin.top + ((logMax - logBer) / (logMax - logMin)) * plotH;
    };

    // Draw grid lines
    ctx.strokeStyle = 'oklch(25% 0 0)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'oklch(80% 0 0)';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'right';

    // Horizontal decade lines (1e0 to 1e-6)
    for (let exp = 0; exp >= -6; exp--) {
      const y = margin.top + ((logMax - exp) / (logMax - logMin)) * plotH;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotW, y);
      ctx.stroke();

      ctx.fillText(`10^${exp}`, margin.left - 8, y + 4);
    }

    // Vertical SNR lines
    ctx.textAlign = 'center';
    const snrStep = Math.max(1, Math.round((maxSnr - minSnr) / 6));
    for (let s = minSnr; s <= maxSnr; s += snrStep) {
      const x = toX(s);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotH);
      ctx.stroke();

      ctx.fillText(`${s} dB`, x, margin.top + plotH + 20);
    }

    // Axes labels
    ctx.fillStyle = 'oklch(80% 0 0)';
    ctx.fillText('SNR (Eb/N0)', margin.left + plotW / 2, this.height - 8);

    if (points.length < 2) return;

    // 1. Draw Theoretical BER (dashed line, oklch(75% 0.18 30))
    ctx.strokeStyle = 'oklch(75% 0.18 30)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = toX(points[i].snrDb);
      const y = toY(points[i].berTheoretical);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 2. Draw Simulated BER (solid line with points, oklch(75% 0.18 250))
    ctx.strokeStyle = 'oklch(75% 0.18 250)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = toX(points[i].snrDb);
      const y = toY(points[i].berSimulated);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw dots on simulated points
    ctx.fillStyle = 'oklch(75% 0.18 250)';
    for (let i = 0; i < points.length; i++) {
      const x = toX(points[i].snrDb);
      const y = toY(points[i].berSimulated);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Legend
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';

    // Simulated legend
    ctx.fillStyle = 'oklch(75% 0.18 250)';
    ctx.fillRect(margin.left + 15, margin.top + 15, 14, 3);
    ctx.fillStyle = 'oklch(80% 0 0)';
    ctx.fillText('Simulated BER', margin.left + 35, margin.top + 20);

    // Theoretical legend
    ctx.strokeStyle = 'oklch(75% 0.18 30)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(margin.left + 15, margin.top + 35);
    ctx.lineTo(margin.left + 29, margin.top + 35);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('Theoretical (Proakis)', margin.left + 35, margin.top + 39);
  }
}
