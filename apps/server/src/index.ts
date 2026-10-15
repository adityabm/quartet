import { pathToFileURL } from 'node:url';

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

import { getServerConfig, type LogLevel, type ServerConfig } from './config.js';
import { registerHealthRoutes } from './http/routes/health.js';
import { registerSinglePlayerRoutes } from './http/routes/single-player.js';

export interface BuildAppOptions {
  /** Override config (default: baca dari process.env). */
  config?: ServerConfig;
  /** Override Fastify logger (default: `{ level: config.logLevel }`). */
  logger?: boolean | { level: LogLevel };
}

/**
 * Factory untuk membangun Fastify app — tanpa bind port.
 * Dipakai oleh `start()` (runtime) DAN oleh test via `app.inject()`.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? getServerConfig();

  const app = Fastify({
    logger: options.logger ?? { level: config.logLevel },
  });

  // CORS: reflect origin saat development. Locked allowed-origin list menyusul di Phase 1+.
  await app.register(cors, { origin: config.nodeEnv !== 'production' });

  registerHealthRoutes(app);
  registerSinglePlayerRoutes(app);

  return app;
}

/**
 * Bootstrap entry: bind port + graceful shutdown.
 * Terpisah dari `buildApp()` supaya test tidak perlu bind port.
 */
export async function start(): Promise<void> {
  const config = getServerConfig();
  const app = await buildApp({ config });

  await app.listen({ port: config.port, host: '0.0.0.0' });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, 'shutting down gracefully');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

// Auto-boot HANYA saat file dijalankan langsung (pnpm dev / node dist/index.js).
// Saat di-import oleh test (vitest), cukup pakai buildApp() → tidak ada port terbuka.
const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  void start();
}
