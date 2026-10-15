import type { PlayerAction } from '@quartet/shared';

/**
 * Easy bot — pilih aksi legal secara uniform random.
 * Deterministik jika `rng` deterministic (lihat createSeededRng).
 *
 * Berbeda dari `packages/bot-engine/src/easy/random.ts` (`decideEasyRandom`):
 * versi server ini menerima `PlayerAction` dari shared (bukan `BotAction`
 * lokal bot-engine) supaya hasil `getValidActions` bisa langsung dipakai
 * tanpa mapping, dan melempar Error kalau tidak ada aksi legal (caller
 * diharapkan memanggil hanya saat ada aksi valid).
 */
export function decideEasy(
  validActions: ReadonlyArray<PlayerAction>,
  rng: () => number,
): PlayerAction {
  if (validActions.length === 0) {
    throw new Error('decideEasy: no valid actions');
  }
  const idx = Math.floor(rng() * validActions.length);
  const action = validActions[idx];
  if (action === undefined) {
    throw new Error('decideEasy: undefined action (should not happen)');
  }
  return action;
}
