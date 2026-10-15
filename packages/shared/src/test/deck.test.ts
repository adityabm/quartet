import { describe, expect, it } from 'vitest';
import { RANKS, SUITS } from '../constants.js';
import { createSeededRng } from '../rng.js';
import { createShuffledDeck, sortHand } from '../rules/deck.js';
import type { Card } from '../types/card.js';

describe('createShuffledDeck', () => {
  it('returns 52 cards', () => {
    const deck = createShuffledDeck(createSeededRng(42));
    expect(deck).toHaveLength(52);
  });

  it('contains all 13 ranks × 4 suits', () => {
    const deck = createShuffledDeck(createSeededRng(7));
    const ids = new Set(deck.map((card) => card.id));
    expect(ids.size).toBe(52);
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        expect(ids.has(`${rank}-${suit}`)).toBe(true);
      }
    }
  });

  it('is deterministic with the same seeded rng', () => {
    const first = createShuffledDeck(createSeededRng(1234));
    const second = createShuffledDeck(createSeededRng(1234));
    expect(first.map((card) => card.id)).toEqual(second.map((card) => card.id));
  });
});

describe('sortHand', () => {
  it('sorts by rank then suit without mutating the input', () => {
    const hand: Card[] = [
      { id: 'K-hearts', rank: 'K', suit: 'hearts' },
      { id: '2-spades', rank: '2', suit: 'spades' },
      { id: 'A-diamonds', rank: 'A', suit: 'diamonds' },
      { id: '10-clubs', rank: '10', suit: 'clubs' },
      { id: 'K-spades', rank: 'K', suit: 'spades' },
    ];
    const originalIds = hand.map((card) => card.id);

    const sorted = sortHand(hand);

    expect(hand.map((card) => card.id)).toEqual(originalIds);
    expect(sorted.map((card) => card.id)).toEqual([
      'A-diamonds',
      '2-spades',
      '10-clubs',
      'K-spades',
      'K-hearts',
    ]);
  });

  it('sorts an already-sorted hand into a new array', () => {
    const hand: Card[] = [
      { id: 'A-spades', rank: 'A', suit: 'spades' },
      { id: 'K-clubs', rank: 'K', suit: 'clubs' },
    ];
    const sorted = sortHand(hand);
    expect(sorted.map((card) => card.id)).toEqual(['A-spades', 'K-clubs']);
    expect(sorted).not.toBe(hand);
  });
});