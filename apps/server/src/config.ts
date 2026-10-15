/**
 * Server configuration — dibaca dari env variables dengan defaults untuk Phase 0.
 *
 * Parsing manual (tanpa zod) supaya dependency tetap minimal; semua nilai
 * divalidasi dan melempar Error kalau input env invalid.
 *
 * Secret (DATABASE_URL, REDIS_URL, dll.) HARUS lewat env — jangan hardcode.
 */

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const NODE_ENVS = ['development', 'production', 'test'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export interface ServerConfig {
  /** Port HTTP server listen. */
  port: number;
  /** Node environment: development | production | test. */
  nodeEnv: NodeEnv;
  /** Pino log level. */
  logLevel: LogLevel;
  /** Postgres connection string — dipakai mulai Phase 1+ (persistence). */
  databaseUrl: string | undefined;
  /** Redis connection string — dipakai mulai Phase 1+ (presence, hot cache). */
  redisUrl: string | undefined;
  /** Umur room tanpa aktivitas sebelum di-expire (menit). */
  roomExpiryMinutes: number;
  /** Jendela (ms) untuk menuduh bohong setelah jawaban "tidak punya". */
  bluffWindowMs: number;
  /** Maksimal pemain per room. */
  maxPlayers: number;
}

const DEFAULTS: Omit<ServerConfig, 'databaseUrl' | 'redisUrl'> = {
  port: 3000,
  nodeEnv: 'development',
  logLevel: 'info',
  roomExpiryMinutes: 30,
  bluffWindowMs: 5_000,
  maxPlayers: 6,
};

/** Parse integer dalam rentang [min, max]; kosong/absent → fallback. */
function parseIntInRange(value: string | undefined, name: string, fallback: number, min: number, max: number): number {
  const raw = value?.trim();
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid config "${name}": expected an integer between ${min} and ${max}, received "${raw}"`);
  }
  return parsed;
}

/** Parse enum dari daftar allowed; kosong/absent → fallback. */
function parseEnum<T extends string>(value: string | undefined, name: string, allowed: readonly T[], fallback: T): T {
  const raw = value?.trim();
  if (raw === undefined || raw === '') return fallback;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  throw new Error(`Invalid config "${name}": expected one of ${allowed.join(', ')}, received "${raw}"`);
}

/** Secret opsional: trim; string kosong diperlakukan sebagai undefined. */
function parseOptionalSecret(value: string | undefined): string | undefined {
  const raw = value?.trim();
  return raw === undefined || raw === '' ? undefined : raw;
}

/**
 * Baca & validasi config dari env.
 * @param env injeksi env map — default `process.env`; diparameterisasi supaya unit-testable.
 */
export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: parseIntInRange(env.PORT, 'PORT', DEFAULTS.port, 1, 65_535),
    nodeEnv: parseEnum(env.NODE_ENV, 'NODE_ENV', NODE_ENVS, DEFAULTS.nodeEnv),
    logLevel: parseEnum(env.LOG_LEVEL, 'LOG_LEVEL', LOG_LEVELS, DEFAULTS.logLevel),
    databaseUrl: parseOptionalSecret(env.DATABASE_URL),
    redisUrl: parseOptionalSecret(env.REDIS_URL),
    roomExpiryMinutes: parseIntInRange(env.ROOM_EXPIRY_MINUTES, 'ROOM_EXPIRY_MINUTES', DEFAULTS.roomExpiryMinutes, 1, 24 * 60),
    bluffWindowMs: parseIntInRange(env.BLUFF_WINDOW_MS, 'BLUFF_WINDOW_MS', DEFAULTS.bluffWindowMs, 100, 60_000),
    maxPlayers: parseIntInRange(env.MAX_PLAYERS, 'MAX_PLAYERS', DEFAULTS.maxPlayers, 2, 12),
  };
}