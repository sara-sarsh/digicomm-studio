// src/components/TheoryPanel.tsx
import React from 'react';
import { SimConfig } from '../core/types';

interface TheoryPanelProps {
  simType?: SimConfig['simType'];
}

export const TheoryPanel: React.FC<TheoryPanelProps> = ({ simType = 'awgn' }) => {
  const getTheoryContent = () => {
    switch (simType) {
      case 'ofdm':
        return {
          title: 'OFDM — Multicarrier Modulation',
          formulas: [
            'x[n] = (1/√N) ∑_{k=0}^{N-1} X[k] e^{j 2π k n / N}',
            'Cyclic Prefix: T_{CP} ≥ τ_{max} (ISI Elimination)',
            'PAPR = max(|x[n]|²) / E[|x[n]|²]'
          ],
          description:
            'Orthogonal Frequency Division Multiplexing converts a frequency-selective multipath channel into N parallel flat-fading subchannels. The cyclic prefix absorbs channel delay spread, turning linear channel convolution into circular convolution for single-tap frequency-domain equalization (Proakis Ch. 11).'
        };

      case 'rayleigh':
        return {
          title: 'Rayleigh Fading Channel',
          formulas: [
            'p(r) = (r / σ²) exp(-r² / (2σ²)),  r ≥ 0',
            'P_b(BPSK) = ½ (1 - √(γ / (1 + γ)))',
            'Asymptotic BER: P_b ≈ 1 / (4 γ)  (Slope: -10 dB/decade)'
          ],
          description:
            'Models non-line-of-sight (NLOS) multipath scattering where received signal envelop follows a Rayleigh distribution. Deep fading events severely degrade performance compared to AWGN: at 10 dB SNR, BER is ~2.3% in Rayleigh versus ~0.0039% in AWGN (Proakis Ch. 13).'
        };

      case 'rician':
        return {
          title: 'Rician Fading Channel (LOS + Scatter)',
          formulas: [
            'K = s² / (2σ²)  (LOS to multipath power ratio)',
            'P_b ≈ ½ (1 - √((K+1)γ / (1 + (K+1)γ)))',
            'K = 0 → Rayleigh;  K → ∞ → AWGN'
          ],
          description:
            'Models environments with a dominant direct line-of-sight (LOS) specular component alongside diffuse multipath scatterers. As the Rician K-factor increases, fading depth diminishes and performance approaches the ideal AWGN channel bound (Proakis Ch. 13).'
        };

      case 'coded':
        return {
          title: 'Channel Coding — Hamming(7,4) & Convolutional',
          formulas: [
            'Hamming(7,4): Rate R = 4/7, d_{min} = 3, t = 1 error corrected',
            'Conv(1/2, K=3): Generators g₁=[1,1,1]₂, g₂=[1,0,1]₂, d_{free}=5',
            'Coding Gain: G_c = 10 log₁₀(R · d_{min})'
          ],
          description:
            'Forward Error Correction (FEC) introduces structured redundancy to detect and correct transmission errors without retransmission. Systematic Hamming(7,4) corrects any single-bit pattern per 7-bit codeword, providing coding gain at medium-to-high SNR (Proakis Ch. 7).'
        };

      case 'mimo':
        return {
          title: 'Alamouti STBC — 2×1 Transmit Diversity',
          formulas: [
            'S = [ s₁   s₂ ;  -s₂*  s₁* ]  (Orthogonal Space-Time Matrix)',
            'ŝ₁ = h₁* r₁ + h₂ r₂*,   ŝ₂ = h₂* r₁ - h₁ r₂*',
            'P_b ≈ ¼ (1 - μ)² (2 + μ),  μ = √(γ / (1 + γ))  (Diversity Order L = 2)'
          ],
          description:
            'The Alamouti space-time block code delivers full 2nd-order diversity with two transmit antennas and one receive antenna without requiring Channel State Information (CSI) at the transmitter. Linear orthogonal combining at the receiver decouples symbols without noise amplification (Proakis Ch. 14).'
        };

      case 'awgn':
      default:
        return {
          title: 'AWGN Channel — BER Theory',
          formulas: [
            'P_b(BPSK) = Q(√(2 E_b / N₀))',
            'Q(x) = ½ erfc(x / √2) = (1/√(2π)) ∫_x^∞ exp(-u²/2) du',
            'P_b(QPSK) = Q(√(2 E_b / N₀)),   P_s(16-QAM) ≈ 3 Q(√(4/5 E_b/N₀))'
          ],
          description:
            'The Additive White Gaussian Noise (AWGN) channel represents ideal thermal noise with constant power spectral density N₀/2 across all frequencies. It serves as the baseline benchmark for digital modulation efficiency in additive noise (Proakis Ch. 5).'
        };
    }
  };

  const content = getTheoryContent();

  return (
    <div
      role="region"
      aria-label={content.title}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-accent)',
        borderRadius: '8px',
        padding: 'calc(var(--space-base) * 2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(var(--space-base) * 1.5)',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '1.05rem',
          color: 'var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ color: 'var(--color-accent)', fontSize: '1.1rem' }}>📐</span>
        {content.title}
      </h3>

      {/* Monospace Formula Box */}
      <div
        style={{
          backgroundColor: 'oklch(14% 0 0)',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {content.formulas.map((formula, idx) => (
          <div
            key={idx}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.84rem',
              color: 'var(--color-accent)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {formula}
          </div>
        ))}
      </div>

      <p
        style={{
          margin: 0,
          fontSize: '0.85rem',
          lineHeight: '1.5',
          color: 'var(--color-muted)',
        }}
      >
        {content.description}
      </p>
    </div>
  );
};
