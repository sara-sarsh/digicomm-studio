# DigiComm Studio 📡

> **Interactive Web-Based Digital Communications Simulation Lab**  
> Based on *Digital Communications* (5th Edition) by John G. Proakis & Masoud Salehi.

[![CI](https://github.com/example/digicomm-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/example/digicomm-studio/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-purple.svg)](https://vitejs.dev/)

---

## 🌟 Overview

**DigiComm Studio** is an open-source, zero-install, 60 FPS interactive digital communications laboratory running entirely in the browser. It replaces heavyweight, proprietary MATLAB scripts with an intuitive, real-time playground for electrical & computer engineering (ECE) students.

### ✨ Features
- **Constellation Studio:** Real-time I/Q plane visualization for **BPSK, QPSK, 16-QAM, and 64-QAM** with Gray coding and minimum Euclidean distance detection.
- **Dynamic AWGN Channel:** Live SNR ($E_b/N_0$) control with Gaussian noise generation via `xoshiro128+` and the Box-Muller transform.
- **Logarithmic BER Curve:** Live empirical Monte Carlo Bit Error Rate accumulation plotted directly against theoretical curves ($Q$-function and erfc approximations).
- **Statistical Validity:** Wilson 95% confidence intervals and an adaptive stopping rule (50 errors / 3-second cap).
- **Pulse Shaping Filters:** Raised Cosine (RC) and Root Raised Cosine (RRC) with adjustable roll-off ($\alpha$) and Nyquist zero-ISI verification.
- **One-Click Python Export:** Instantly generate clean, standalone, reproducible NumPy/SciPy/Matplotlib scripts matching the exact parameters configured in the UI.

---

## 🏗️ Architecture

```
src/
├── core/                  # Pure mathematical DSP routines (Proakis 5th Ed.)
│   ├── types.ts           # Shared interfaces and domain models
│   ├── prng.ts            # xoshiro128+ 128-bit PRNG
│   ├── modulation.ts      # BPSK, QPSK, 16-QAM, 64-QAM with Gray mapping
│   ├── channel.ts         # AWGN channel (Box-Muller)
│   ├── ber-math.ts        # Abramowitz & Stegun erfc and theoretical Q-function
│   └── pulse-shaping.ts   # RC and RRC FIR filters with Nyquist ISI checks
├── worker/                # High-throughput simulation thread
│   ├── triple-buffer.ts   # Triple-buffered state transfer
│   └── sim-worker.ts      # Monte Carlo Web Worker with adaptive stopping
├── rendering/             # Decoupled visualization layer
│   ├── renderer.interface.ts
│   └── canvas-renderer.ts # Batch Canvas 2D engine using modern OKLCH colors
├── hooks/                 # React integration
│   └── useWorkerSimulation.ts
├── export/                # Python code generator
│   └── python-exporter.ts
└── components/            # Clean UI with CSS custom properties
    ├── ControlPanel.tsx
    ├── BerChart.tsx
    ├── ConstellationDiagram.tsx
    └── App.tsx
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation
```bash
git clone https://github.com/your-username/digicomm-studio.git
cd digicomm-studio
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Test Suite
```bash
npm test
```
Runs 25 automated mathematical and statistical tests via Vitest:
- PRNG uniformity & Gaussian distribution moments
- Gray code Hamming distance verification
- Noise variance matching $\sigma^2 = N_0/2$
- Theoretical BER accuracy against Proakis tables (e.g. BPSK @ 4 dB $\approx 0.01267$)
- Filter energy and Nyquist zero-ISI orthogonality

### Production Build
```bash
npm run build
```
Generates optimized static assets in `dist/`, ready for instant deployment on GitHub Pages or Vercel.

---

## 📖 Theoretical References

- **Proakis, J. G., & Salehi, M.** (2008). *Digital Communications* (5th ed.). McGraw-Hill.
  - Chapter 2: Deterministic and Random Signal Analysis (Gram-Schmidt & Signal Space)
  - Chapter 3: Digital Modulation Schemes (PAM, QAM, Gray Coding)
  - Chapter 4: Optimum Receivers for AWGN Channels (Matched Filter & ML Detection)
  - Chapter 9: Digital Communication Through Band-Limited Channels (Nyquist Criterion & Raised Cosine)

---

## 📄 License

MIT License. Free for academic, educational, and commercial use.
