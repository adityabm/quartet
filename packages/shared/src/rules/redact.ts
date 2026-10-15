import type { CardId } from '../constants.js';
import type { GameState, RedactedGameState, RedactedPlayerView } from '../types/game-state.js';
import type { PlayerId } from '../types/ids.js';
import { findPlayer } from './players.js';

const DEFAULT_LAST_EVENTS = 10;

/**
 * Buat snapshot publik dari GameState. TIDAK termasuk hand player manapun
 * (hanya handCount + quartets) dan TIDAK termasuk stock (hanya stockCount).
 * `lastEvents` = N event terakhir dari log untuk animasi UI.
 *
 * CATATAN: PlayerInGame tidak membawa metadata nama/isConnected/isBot —
 * redacted view memakai placeholder dan server layer (Phase 4) wajib merge
 * metadata dari Room sebelum broadcast final.
 */
export function redactGameState(state: GameState, lastEventCount?: number): RedactedGameState {
  const perPlayer = lastEventCount === undefined ? DEFAULT_LAST_EVENTS : lastEventCount;
  const players: RedactedPlayerView[] = state.players.map((player) => ({
    id: player.id,
    name: '',
    handCount: player.handCount,
    quartets: player.quartets,
    isConnected: true,
    isBot: false,
  }));
  return {
    gameId: state.gameId,
    phase: state.phase,
    players,
    currentPlayerIndex: state.currentPlayerIndex,
    stockCount: state.stockCount,
    quartets: state.quartets,
    bluffWindow: state.bluffWindow,
    lastEvents: state.log.slice(-perPlayer),
    version: state.version,
  };
}

/**
 * Buat private view untuk player tertentu — termasuk hand mereka sendiri.
 * Throw kalau playerId tidak ada di game (findPlayer).
 */
export function buildPrivateSnapshot(
  state: GameState,
  yourPlayerId: PlayerId,
): {
  readonly redacted: RedactedGameState;
  readonly yourHand: ReadonlyArray<CardId>;
} {
  const player = findPlayer(state, yourPlayerId);
  return {
    redacted: redactGameState(state),
    yourHand: player.hand,
  };
}
