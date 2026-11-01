import { defineConfig } from 'vitest/config';

import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@buildplanner/units': path.resolve(__dirname, 'packages/units/src'),
      '@buildplanner/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@buildplanner/building-model': path.resolve(__dirname, 'packages/building-model/src'),
      '@buildplanner/geometry-engine': path.resolve(__dirname, 'packages/geometry-engine/src'),
      '@buildplanner/constraint-engine': path.resolve(__dirname, 'packages/constraint-engine/src'),
      '@buildplanner/rule-engine': path.resolve(__dirname, 'packages/rule-engine/src'),
      '@buildplanner/planning-engine': path.resolve(__dirname, 'packages/planning-engine/src'),
      '@buildplanner/ai-engine': path.resolve(__dirname, 'packages/ai-engine/src'),
      '@buildplanner/drawing-engine': path.resolve(__dirname, 'packages/drawing-engine/src')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**']
  }
});
