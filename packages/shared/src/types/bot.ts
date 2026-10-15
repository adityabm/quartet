/**
 * Tier bot — dipakai shared antara server (bot-engine) dan tipe Player.
 * Lane B (bot-engine) akan import dari sini untuk konsistensi satu sumber.
 */
export const BOT_TIERS = ['easy', 'normal', 'hard'] as const;
export type BotTier = (typeof BOT_TIERS)[number];
