import { describe, expect, it } from 'vitest';
import { CARDS_PER_QUARTET, RANKS, SUITS } from '../constants.js';

describe('constants', () => {
  it('has 4 suits', () => {
    expect(SUITS).toHaveLength(4);
  });

  it('has 13 ranks', () => {
    expect(RANKS).toHaveLength(13);
  });

  it('defines 4 cards per quartet', () => {
    expect(CARDS_PER_QUARTET).toBe(4);
  });
});