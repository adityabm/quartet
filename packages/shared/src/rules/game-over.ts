import { RANKS } from '../constants.js';
import type { Rank } from '../constants.js';
import type { GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/ids.js';
import { rankOfCardId } from './complete-quartet.js';

/**
 * Jumlah player yang "masih aktif": pegang kartu ATAU sudah punya quartet.
 * (PlayerInGame belum membawa isConnected — lihat laporan Lane B.)
 */
function numActivePlayers(state: GameState): number {
  return state.players.filter((player) => player.handCount > 0 || player.quartets.length > 0)
    .length;
}

/**
 * Apakah masih ada transfer yang mungkin: ada asker A dan target B (A ≠ B)
 * di mana B memegang rank R yang belum jadi quartet milik A. Kalau iya,
 * A bisa bertanya dan menambah kartu → game belum berakhir.
 */
function hasAnyPossibleTransfer(state: GameState): boolean {
  for (const asker of state.players) {
    for (const target of state.players) {
      if (target.id === asker.id) {
        continue;
      }
      if (target.handCount === 0) {
        continue;
      }
      const targetRanks = new Set<Rank>();
      for (const cardId of target.hand) {
        targetRanks.add(rankOfCardId(cardId));
      }
      for (const rank of targetRanks) {
        if (!asker.quartets.includes(rank)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Game over conditions (pure — tidak modify state):
 * - Hanya 1 player aktif tersisa → OR
 * - Stock habis DAN tidak ada transfer yang mungkin → OR
 * - Semua 13 rank sudah jadi quartet (total quartets = RANKS.length).
 */
export function isGameOver(state: GameState): boolean {
  if (numActivePlayers(state) <= 1) {
    return true;
  }
  if (state.stock.length === 0 && !hasAnyPossibleTransfer(state)) {
    return true;
  }
  if (state.quartets.length >= RANKS.length) {
    return true;
  }
  return false;
}

/**
 * Winner = player dengan quartet terbanyak. Tie → semua yang punya count max.
 */
export function determineWinners(state: GameState): ReadonlyArray<PlayerId> {
  let max = -1;
  const winners: PlayerId[] = [];
  for (const player of state.players) {
    if (player.quartets.length > max) {
      max = player.quartets.length;
      winners.length = 0;
      winners.push(player.id);
    } else if (player.quartets.length === max) {
      winners.push(player.id);
    }
  }
  return winners;
}

/**
 * Wrap state jadi phase 'game_over' + append event `game.over`
 * (winnerIds + scores). Bump version.
 */
export function finalizeGame(state: GameState, now: number): GameState {
  const winnerIds = determineWinners(state);
  const scores = state.players.map((player) => ({
    playerId: player.id,
    quartetCount: player.quartets.length,
  }));
  return {
    ...state,
    phase: 'game_over',
    log: [...state.log, { type: 'game.over', at: now, winnerIds, scores }],
    version: state.version + 1,
  };
}
