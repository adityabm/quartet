import { RANKS, SUITS } from '../constants.js';
import type { CardId, Rank, Suit } from '../constants.js';
import type { GameEvent, GameState, PlayerInGame } from '../types/game-state.js';
import { createShuffledDeck } from './deck.js';
import { currentTurnNumber } from './turn.js';

/**
 * Nilai kartu untuk menentukan "kartu tertua": A-spades tertinggi (51),
 * K-clubs terendah (0). Injektif per CardId sehingga selalu ada tepat 1
 * pemain dengan kartu tertinggi → first player deterministik tanpa tiebreak.
 */
function cardValue(cardId: CardId): number {
  const dashIdx = cardId.indexOf('-');
  const rankPart = cardId.slice(0, dashIdx); // "A".."K"
  const suitPart = cardId.slice(dashIdx + 1); // suit setelah "-"
  const rankWeight = RANKS.length - 1 - RANKS.indexOf(rankPart as Rank);
  const suitWeight = SUITS.length - 1 - SUITS.indexOf(suitPart as Suit);
  return rankWeight * SUITS.length + suitWeight;
}

/**
 * Shuffle deck (via injected rng) dan distribute ke semua player secara rata
 * (round-robin). Sisa kartu (kalau tidak habis dibagi rata) ditaruh di stock.
 *
 * Pure: pakai injected rng untuk shuffle. Return new state dengan phase='turn',
 * currentPlayerIndex di-set ke player dengan kartu tertua, plus event
 * `game.dealt` dan `turn.started` pertama (turn 1) supaya penomoran turn
 * konsisten dari awal.
 */
export function dealCards(state: GameState, rng: () => number, now: number): GameState {
  const deck = createShuffledDeck(rng);
  const playerCount = state.players.length;
  const dealtCount = playerCount * Math.floor(deck.length / playerCount);
  // Round-robin hanya untuk putaran penuh; sisa kartu ditaruh di stock.
  const hands: CardId[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < dealtCount; i++) {
    const card = deck[i]!; // i < dealtCount <= 52
    hands[i % playerCount]!.push(card.id);
  }
  const stock = deck.slice(dealtCount).map((card) => card.id);

  const players: PlayerInGame[] = state.players.map((player, index) => {
    const hand = hands[index]!;
    return { ...player, hand, handCount: hand.length };
  });

  // First player = pemegang kartu tertinggi (A-spades pasti tertinggi).
  let firstIndex = 0;
  let bestValue = -1;
  for (let i = 0; i < players.length; i++) {
    for (const cardId of players[i]!.hand) {
      const value = cardValue(cardId);
      if (value > bestValue) {
        bestValue = value;
        firstIndex = i;
      }
    }
  }

  const log: GameEvent[] = [
    ...state.log,
    {
      type: 'game.dealt',
      at: now,
      handCounts: players.map((player) => ({ playerId: player.id, count: player.handCount })),
    },
    {
      type: 'turn.started',
      at: now,
      playerId: players[firstIndex]!.id,
      turnNumber: currentTurnNumber(state) + 1,
    },
  ];

  return {
    ...state,
    phase: 'turn',
    players,
    currentPlayerIndex: firstIndex,
    stock,
    stockCount: stock.length,
    turnStartedAt: now,
    version: state.version + 1,
    log,
  };
}
