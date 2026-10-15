import type { GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/ids.js';

/**
 * Nomor turn saat ini = jumlah event `turn.started` di log.
 * dealCards selalu meng-append turn.started pertama (turn 1) sehingga
 * penomoran konsisten: turn saat ini = count, turn berikutnya = count + 1.
 */
export function currentTurnNumber(state: GameState): number {
  return state.log.filter((event) => event.type === 'turn.started').length;
}

/**
 * Ambil ID player yang sedang giliran. Helper yang aman untuk null checks
 * (null kalau state kosong / index di luar bounds).
 */
export function currentPlayerId(state: GameState): PlayerId | null {
  const player = state.players[state.currentPlayerIndex];
  return player === undefined ? null : player.id;
}

/**
 * Index pemain berikutnya (searah jarum jam), modulo players.length.
 * Catatan: PlayerInGame (tipe Lane A) belum membawa isConnected, jadi skip
 * disconnected belum bisa diimplementasikan di fase ini — murni rotasi.
 */
export function nextPlayerIndex(state: GameState): number {
  return (state.currentPlayerIndex + 1) % state.players.length;
}

/**
 * Rotasi turn ke player berikutnya. Append event `turn.started` dengan
 * turnNumber = jumlah turn.started yang sudah ada + 1. Update turnStartedAt
 * (untuk turn timeout) dan bump version.
 */
export function nextTurn(state: GameState, now: number): GameState {
  const nextIndex = nextPlayerIndex(state);
  const currentPlayer = state.players[nextIndex]!; // selalu < length (modulo)
  return {
    ...state,
    phase: 'turn',
    currentPlayerIndex: nextIndex,
    turnStartedAt: now,
    version: state.version + 1,
    log: [
      ...state.log,
      {
        type: 'turn.started',
        at: now,
        playerId: currentPlayer.id,
        turnNumber: currentTurnNumber(state) + 1,
      },
    ],
  };
}
