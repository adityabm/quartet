import { SUITS } from '../constants.js';
import type { CardId, Rank } from '../constants.js';
import type { GameState, PlayerInGame, Quartet } from '../types/game-state.js';
import { createCardId } from '../types/card.js';
import { asGameId, asPlayerId } from '../types/ids.js';
import type { Player } from '../types/player.js';

/** Buat Player minimal untuk initGame. */
export function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id: asPlayerId(id),
    name: `Pemain ${id}`,
    isBot: false,
    isConnected: true,
    joinedAt: 1_000_000,
    ...overrides,
  };
}

export function cardId(rank: Rank, suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'): CardId {
  return createCardId(rank, suit);
}

/** Semua 4 kartu dari satu rank. */
export function allCardsOfRank(rank: Rank): CardId[] {
  return SUITS.map((suit) => createCardId(rank, suit));
}

export function makeInGame(id: string, hand: CardId[] = [], quartets: Rank[] = []): PlayerInGame {
  return { id: asPlayerId(id), hand, handCount: hand.length, quartets };
}

export function makeQuartet(rank: Rank, ownerId: string, formedAtTurn = 1): Quartet {
  return { id: `quartet-${rank}-${ownerId}`, rank, ownerId: asPlayerId(ownerId), formedAtTurn };
}

/** State builder — default: phase 'turn', 0 player, log kosong (untuk crafted state). */
export function buildState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: asGameId('game-test-1'),
    phase: 'turn',
    players: [],
    currentPlayerIndex: 0,
    stock: [],
    stockCount: 0,
    quartets: [],
    bluffWindow: null,
    log: [],
    seed: 42,
    turnStartedAt: 0,
    version: 0,
    ...overrides,
  };
}

/** Ambil PlayerInGame dari state untuk assertion (throw kalau tidak ada). */
export function playerIn(state: GameState, id: string): PlayerInGame {
  const player = state.players.find((p) => p.id === asPlayerId(id));
  if (player === undefined) {
    throw new Error(`helper: player ${id} tidak ada di state`);
  }
  return player;
}
