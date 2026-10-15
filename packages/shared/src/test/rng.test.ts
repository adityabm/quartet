import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng.js';

const SEQUENCE_LENGTH = 100;

function take(seed: number, count: number): number[] {
  const rng = createSeededRng(seed);
  return Array.from({ length: count }, () => rng());
}

describe('createSeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(take(42, SEQUENCE_LENGTH)).toEqual(take(42, SEQUENCE_LENGTH));
  });

  it('produces a different sequence for a different seed', () => {
    expect(take(42, SEQUENCE_LENGTH)).not.toEqual(take(43, SEQUENCE_LENGTH));
  });

  it('only outputs values in [0, 1)', () => {
    const values = take(2026, 1000);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});