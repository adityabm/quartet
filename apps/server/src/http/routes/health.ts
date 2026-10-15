import type { FastifyInstance } from 'fastify';

/** Bumped manual; jaga tetap sinkron dengan version di package.json. */
export const SERVICE_VERSION = '0.1.0';

export interface HealthPayload {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
}

/**
 * Daftarkan route health check.
 * Payload selalu include version + timestamp supaya mudah di-debug.
 */
export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', async (): Promise<HealthPayload> => {
    return {
      status: 'ok',
      service: 'quartet-server',
      version: SERVICE_VERSION,
      timestamp: new Date().toISOString(),
    };
  });
}