import { MAX_PLAYERS, MIN_PLAYERS } from '../constants.js';
import type { GameState, PlayerInGame } from '../types/game-state.js';
import { asGameId } from '../types/ids.js';
import type { GameId } from '../types/ids.js';
import type { Player } from '../types/player.js';

export interface InitGameParams {
  readonly gameId?: GameId; // optional — auto-generate (crypto.randomUUID) kalau absent
  readonly seed: number;
  readonly players: ReadonlyArray<Player>; // 2..6 player
  readonly now: number; // epoch ms
}

/**
 * Buat game state awal. TIDAK deal kartu (lihat dealCards).
 * Urutan kursi = urutan players. Phase awal 'lobby', hand kosong,
 * stock kosong, quartets kosong, log berisi event `game.created`.
 */
export function initGame(params: InitGameParams): GameState {
  const { gameId, seed, players, now } = params;
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `initGame: butuh ${MIN_PLAYERS}..${MAX_PLAYERS} pemain, dapat ${players.length}`,
    );
  }
  const id = gameId ?? asGameId(crypto.randomUUID());
  const inGamePlayers: PlayerInGame[] = players.map((player) => ({
    id: player.id,
    hand: [],
    handCount: 0,
    quartets: [],
  }));
  return {
    gameId: id,
    phase: 'lobby',
    players: inGamePlayers,
    currentPlayerIndex: 0,
    stock: [],
    stockCount: 0,
    quartets: [],
    bluffWindow: null,
    log: [{ type: 'game.created', at: now, seed }],
    seed,
    turnStartedAt: now,
    version: 0,
  };
}
