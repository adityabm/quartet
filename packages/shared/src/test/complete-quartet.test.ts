import { describe, expect, it } from 'vitest';
import { CARDS_PER_QUARTET, RANKS } from '../constants.js';
import {
  findAllQuartetsInHand,
  findQuartetInHand,
  rankOfCardId,
} from '../rules/complete-quartet.js';
import { cardId } from './helpers.js';

const A_CARDS = [
  cardId('A', 'spades'),
  cardId('A', 'hearts'),
  cardId('A', 'diamonds'),
  cardId('A', 'clubs'),
];

describe('findQuartetInHand', () => {
  it('detect 4 kartu rank sama', () => {
    const result = findQuartetInHand(A_CARDS, 'A');
    expect(result).toHaveLength(CARDS_PER_QUARTET);
    expect(result).toEqual(A_CARDS);
  });

  it('3 kartu rank sama → bukan quartet (return [])', () => {
    const result = findQuartetInHand(A_CARDS.slice(0, 3), 'A');
    expect(result).toEqual([]);
  });

  it('hand kosong → []', () => {
    expect(findQuartetInHand([], 'A')).toEqual([]);
  });

  it('4 kartu tapi tidak penuh suit → bukan quartet', () => {
    const hand = [
      cardId('A', 'spades'),
      cardId('A', 'hearts'),
      cardId('A', 'diamonds'),
      cardId('K', 'clubs'),
    ];
    expect(findQuartetInHand(hand, 'A')).toEqual([]);
  });
});

describe('findAllQuartetsInHand', () => {
  it('detect satu quartet', () => {
    const result = findAllQuartetsInHand(A_CARDS);
    expect(result).toHaveLength(1);
    expect(result[0]?.rank).toBe('A');
    expect(result[0]?.cardIds).toHaveLength(4);
  });

  it('detect banyak quartet sekaligus (A + K)', () => {
    const hand = [
      ...A_CARDS,
      cardId('K', 'spades'),
      cardId('K', 'hearts'),
      cardId('K', 'diamonds'),
      cardId('K', 'clubs'),
    ];
    const result = findAllQuartetsInHand(hand);
    expect(result).toHaveLength(2);
    expect(result.map((q) => q.rank).sort()).toEqual(['A', 'K']);
  });

  it('3 kartu rank sama tidak dianggap quartet', () => {
    const result = findAllQuartetsInHand(A_CARDS.slice(0, 3));
    expect(result).toHaveLength(0);
  });

  it('campuran: satu quartet penuh + rank tidak lengkap', () => {
    const hand = [
      ...A_CARDS,
      cardId('K', 'spades'),
      cardId('K', 'hearts'),
      cardId('K', 'diamonds'),
    ];
    const result = findAllQuartetsInHand(hand);
    expect(result).toHaveLength(1);
    expect(result[0]?.rank).toBe('A');
  });

  it('hand kosong → []', () => {
    expect(findAllQuartetsInHand([])).toEqual([]);
  });
});

describe('rankOfCardId', () => {
  it('parse rank dari card id biasa', () => {
    expect(rankOfCardId(cardId('A', 'spades'))).toBe('A');
    expect(rankOfCardId(cardId('10', 'clubs'))).toBe('10');
    expect(rankOfCardId(cardId('K', 'hearts'))).toBe('K');
  });

  it('fallback malformed id (tanpa separator) → treat seluruh id sebagai rank', () => {
    expect(rankOfCardId('BADID')).toBe('BADID');
  });

  it('semua rank di deck bisa diparse', () => {
    for (const rank of RANKS) {
      expect(rankOfCardId(cardId(rank, 'spades'))).toBe(rank);
    }
  });
});
