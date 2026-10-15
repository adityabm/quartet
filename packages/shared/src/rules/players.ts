import type { GameState, PlayerInGame } from '../types/game-state.js';
import type { PlayerId } from '../types/ids.js';

/**
 * Cari player by ID di dalam state. Pure helper — throw kalau tidak ada
 * (signal error programming/server bug; diharapkan selalu ketemu karena ID
 * berasal dari state atau aksi yang sudah divalidasi upstream).
 */
export function findPlayer(state: GameState, playerId: PlayerId): PlayerInGame {
  const player = state.players.find((p) => p.id === playerId);
  if (player === undefined) {
    throw new Error(`Player tidak ditemukan: ${playerId}`);
  }
  return player;
}
