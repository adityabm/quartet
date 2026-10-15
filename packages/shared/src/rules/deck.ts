import { RANKS, SUITS } from '../constants.js';
import type { Card } from '../types/card.js';
import { createCardId } from '../types/card.js';

/**
 * Buat satu deck 52 kartu (13 rank × 4 suit) lalu shuffle dengan Fisher–Yates
 * memakai `rng`. Deterministik jika `rng` deterministic (lihat createSeededRng).
 */
export function createShuffledDeck(rng: () => number): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const card: Card = { id: createCardId(rank, suit), rank, suit };
      deck.push(card);
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const cardAtI = deck[i]!; // i ∈ [1, 51] → selalu ada
    const cardAtJ = deck[j]!; // j ∈ [0, i] → selalu ada
    deck[i] = cardAtJ;
    deck[j] = cardAtI;
  }

  return deck;
}

/**
 * Sort hand secara immutable: by rank (order sesuai RANKS: A, 2, ..., K)
 * lalu by suit (order sesuai SUITS: spades, hearts, diamonds, clubs).
 * Tidak memutasikan array input.
 */
export function sortHand(hand: ReadonlyArray<Card>): Card[] {
  return [...hand].sort((a, b) => {
    const rankDiff = RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank);
    if (rankDiff !== 0) return rankDiff;
    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  });
}
