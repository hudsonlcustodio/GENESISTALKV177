import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  test: { environment: 'node', include: ['docs/genesis/evidence/audit-2026-10-10/health-repro.repro.ts'], testTimeout: 30000, maxWorkers: 1 },
  resolve: { alias: { '@': process.cwd(), 'server-only': path.resolve('node_modules/next/dist/compiled/server-only/empty.js') } },
});
