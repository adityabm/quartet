import { describe, expect, it } from 'vitest';
import { asPlayerId, createSeededRng } from '@quartet/shared';
import type { PlayerAction } from '@quartet/shared';
import { decideEasy } from '../bot/tiers/easy.js';

describe('decideEasy', () => {
  const aliceId = asPlayerId('alice');
  const budiId = asPlayerId('budi');

  const validActions: PlayerAction[] = [
    { type: 'ask', targetId: aliceId, rank: '7' },
    { type: 'ask', targetId: budiId, rank: 'A' },
    { type: 'pass' },
  ];

  it('always returns one of the valid actions', () => {
    for (let seed = 0; seed < 50; seed++) {
      const action = decideEasy(validActions, createSeededRng(seed));
      expect(validActions).toContainEqual(action);
    }
  });

  it('is deterministic with a seeded rng', () => {
    const first = decideEasy(validActions, createSeededRng(99));
    const second = decideEasy(validActions, createSeededRng(99));
    expect(first).toEqual(second);
  });

  it('throws when there are no valid actions', () => {
    expect(() => decideEasy([], createSeededRng(1))).toThrow('decideEasy: no valid actions');
  });
});
