import type { Card } from '@quartet/shared';

export type BotAction =
  | { type: 'ask'; targetId: string; rank: Card['rank'] }
  | { type: 'pass' };

/**
 * Bot Easy tier: pilih aksi legal secara uniform random.
 * Deterministik jika `rng` deterministic (lihat createSeededRng).
 */
export function decideEasyRandom(
  validActions: ReadonlyArray<BotAction>,
  rng: () => number,
): BotAction {
  if (validActions.length === 0) return { type: 'pass' };
  const idx = Math.floor(rng() * validActions.length);
  const action = validActions[idx];
  return action ?? { type: 'pass' };
}