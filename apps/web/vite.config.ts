import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@buildplanner/units': path.resolve(__dirname, '../../packages/units/src'),
      '@buildplanner/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@buildplanner/building-model': path.resolve(__dirname, '../../packages/building-model/src'),
      '@buildplanner/geometry-engine': path.resolve(__dirname, '../../packages/geometry-engine/src'),
      '@buildplanner/constraint-engine': path.resolve(__dirname, '../../packages/constraint-engine/src'),
      '@buildplanner/rule-engine': path.resolve(__dirname, '../../packages/rule-engine/src'),
      '@buildplanner/planning-engine': path.resolve(__dirname, '../../packages/planning-engine/src'),
      '@buildplanner/ai-engine': path.resolve(__dirname, '../../packages/ai-engine/src'),
      '@buildplanner/drawing-engine': path.resolve(__dirname, '../../packages/drawing-engine/src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});
