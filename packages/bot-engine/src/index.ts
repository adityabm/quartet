// Barrel export — semua public API bot-engine di-re-export dari sini.
export * from './tiers/index.js';
export * from './easy/random.js';

export const BOT_ENGINE_VERSION = '0.1.0';
export type { BotTier } from './tiers/index.js';