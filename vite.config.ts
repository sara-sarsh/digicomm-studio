/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

declare const process: { cwd: () => string };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  /**
   * تشخیص بستر استقرار:
   * - Cloudflare Pages: CF_PAGES=1  → base = '/'
   * - GitHub Pages: VITE_BASE تنظیم شده → مقدار آن
   * - محلی / پیش‌فرض: '/'
   */
  const base = env.CF_PAGES === '1'
    ? '/'
    : (env.VITE_BASE ?? (mode === 'production' ? '/digicomm-studio/' : '/'));

  return {
    plugins: [react()],
    base,

    worker: {
      format: 'es',
    },

    test: {
      globals: true,
      environment: 'jsdom',
    },

    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          },
        },
      },
    },

    server: {
      port: 5173,
      strictPort: false,
    },
  };
});
