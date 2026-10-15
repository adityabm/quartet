import type { PlayerAction } from '../types/action.js';
import type { GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/ids.js';
import { applyAsk } from './ask.js';
import { resolveBluff } from './bluff.js';
import { applyPass } from './pass.js';
import { currentPlayerId } from './turn.js';

/**
 * Dispatch player action ke handler yang tepat dan validate actor.
 *
 * - Phase 'bluff_window' → hanya `bluff.call` dari accuser, accusedId harus
 *   cocok dengan window.
 * - Phase 'turn' → `ask` / `pass` dari currentPlayer. `bluff.call` invalid.
 * - Phase lain → throw.
 *
 * Return new state. Throw Error kalau invalid (FE akan dapat error event).
 *
 * CATATAN SIGNATURE: `actorId` ditambahkan (vs brief) karena PlayerAction
 * (tipe Lane A) tidak membawa identity pengirim — server WS layer punya
 * identity dari connection. `now` juga ditambahkan untuk timestamp event.
 */
export function applyAction(
  state: GameState,
  action: PlayerAction,
  actorId: PlayerId,
  rng: () => number,
  now: number,
): GameState {
  if (state.phase === 'bluff_window') {
    const window = state.bluffWindow;
    if (window === null) {
      throw new Error('applyAction: phase bluff_window tanpa window aktif');
    }
    if (action.type !== 'bluff.call') {
      throw new Error(
        `applyAction: hanya bluff.call yang valid selama bluff window, dapat: ${action.type}`,
      );
    }
    if (action.accusedId !== window.accusedId) {
      throw new Error('applyAction: accusedId tidak cocok dengan bluff window');
    }
    if (actorId !== window.accuserId) {
      throw new Error('applyAction: hanya accuser yang bisa menuduh bohong');
    }
    return resolveBluff(state, rng, now);
  }

  if (state.phase !== 'turn') {
    throw new Error(`applyAction: aksi tidak valid di phase ${state.phase}`);
  }
  if (currentPlayerId(state) !== actorId) {
    throw new Error('applyAction: bukan giliran pemain ini');
  }

  if (action.type === 'ask') {
    return applyAsk(state, action, actorId, now);
  }
  if (action.type === 'pass') {
    return applyPass(state, actorId, rng, now);
  }
  // bluff.call saat phase 'turn' → invalid (tidak ada window aktif)
  throw new Error('applyAction: bluff.call tidak valid saat phase turn');
}
