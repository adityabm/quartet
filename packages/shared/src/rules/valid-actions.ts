import { RANKS } from '../constants.js';
import type { PlayerAction } from '../types/action.js';
import type { GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/ids.js';
import { findPlayer } from './players.js';
import { currentPlayerId } from './turn.js';

/**
 * Return semua aksi yang valid untuk player tertentu di state saat ini.
 * Dipakai oleh FE untuk highlight tombol + dipakai bot untuk decide.
 *
 * - Phase 'bluff_window' & player = accuser → [{ type: 'bluff.call' }].
 * - Phase 'turn' & player = currentPlayer → semua kombinasi (targetId, rank)
 *   valid (target ≠ self, rank belum punya quartet lengkap) + `pass` kalau
 *   player baru saja resolve bluff (log tail = 'bluff.resolved') — dia boleh
 *   lanjut bertanya atau skip giliran.
 * - Lainnya → [].
 */
export function getValidActions(state: GameState, playerId: PlayerId): ReadonlyArray<PlayerAction> {
  if (state.phase === 'bluff_window' && state.bluffWindow !== null) {
    if (state.bluffWindow.accuserId === playerId) {
      return [{ type: 'bluff.call', accusedId: state.bluffWindow.accusedId }];
    }
    return [];
  }

  if (state.phase !== 'turn') {
    return [];
  }
  if (currentPlayerId(state) !== playerId) {
    return [];
  }

  const currentPlayer = findPlayer(state, playerId);
  const actions: PlayerAction[] = [];
  for (const target of state.players) {
    if (target.id === playerId) {
      continue;
    }
    for (const rank of RANKS) {
      if (currentPlayer.quartets.includes(rank)) {
        continue;
      }
      actions.push({ type: 'ask', targetId: target.id, rank });
    }
  }

  // Setelah bluff resolve, currentPlayer boleh memilih pass (skip giliran).
  const lastEvent = state.log[state.log.length - 1];
  if (lastEvent !== undefined && lastEvent.type === 'bluff.resolved') {
    actions.push({ type: 'pass' });
  }

  return actions;
}
