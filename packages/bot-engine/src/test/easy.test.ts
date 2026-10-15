import { describe, expect, it } from 'vitest';
import { createSeededRng } from '@quartet/shared';
import type { BotAction } from '../easy/random.js';
import { decideEasyRandom } from '../easy/random.js';

describe('decideEasyRandom', () => {
  const validActions: BotAction[] = [
    { type: 'ask', targetId: 'alice', rank: '7' },
    { type: 'ask', targetId: 'budi', rank: 'A' },
    { type: 'pass' },
  ];

  it('returns pass when there are no valid actions', () => {
    expect(decideEasyRandom([], createSeededRng(1))).toEqual({ type: 'pass' });
  });

  it('is deterministic with a seeded rng', () => {
    const first = decideEasyRandom(validActions, createSeededRng(99));
    const second = decideEasyRandom(validActions, createSeededRng(99));
    expect(first).toEqual(second);
  });

  it('always returns one of the valid actions', () => {
    for (let seed = 0; seed < 50; seed++) {
      const action = decideEasyRandom(validActions, createSeededRng(seed));
      expect(validActions).toContainEqual(action);
    }
  });
});