import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng.js';
import { resolveBluff } from '../rules/bluff.js';
import { asPlayerId } from '../types/ids.js';
import type { Rank } from '../constants.js';
import { buildState, cardId, makeInGame, makeQuartet } from './helpers.js';
import type { BluffWindow } from '../types/game-state.js';

function bluffState(opts: {
  accuserId: string;
  accusedId: string;
  rank: Rank;
  accuserHand?: ReturnType<typeof cardId>[];
  accusedHand?: ReturnType<typeof cardId>[];
  accuserQuartets?: Rank[];
  quartets?: ReturnType<typeof makeQuartet>[];
  currentPlayerIndex?: number;
}) {
  const players = [
    makeInGame(opts.accuserId, opts.accuserHand ?? [], opts.accuserQuartets ?? []),
    makeInGame(opts.accusedId, opts.accusedHand ?? []),
  ];
  const window: BluffWindow = {
    accuserId: asPlayerId(opts.accuserId),
    accusedId: asPlayerId(opts.accusedId),
    rank: opts.rank,
    openedAt: 1000,
    expiresAt: 6000,
  };
  return buildState({
    phase: 'bluff_window',
    players,
    bluffWindow: window,
    quartets: opts.quartets ?? [],
    currentPlayerIndex: opts.currentPlayerIndex ?? 0,
    log: [
      {
        type: 'bluff.opened' as const,
        at: 1000,
        accuserId: asPlayerId(opts.accuserId),
        accusedId: asPlayerId(opts.accusedId),
        expiresAt: 6000,
      },
    ],
  });
}

describe('resolveBluff', () => {
  it('tuduhan benar: 1 kartu random rank tsb pindah dari accused ke accuser', () => {
    const state = bluffState({
      accuserId: 'p0',
      accusedId: 'p1',
      rank: 'A',
      accuserHand: [cardId('K', 'spades')],
      accusedHand: [cardId('A', 'spades'), cardId('A', 'hearts'), cardId('2', 'clubs')],
    });
    const next = resolveBluff(state, () => 0, 2000);
    expect(next.players[0]?.hand).toEqual([cardId('K', 'spades'), cardId('A', 'spades')]);
    expect(next.players[1]?.hand).toEqual([cardId('A', 'hearts'), cardId('2', 'clubs')]);
  });

  it('rng nentuin kartu mana yang pindah (0.99 → kartu terakhir)', () => {
    const state = bluffState({
      accuserId: 'p0',
      accusedId: 'p1',
      rank: 'A',
      accusedHand: [cardId('A', 'spades'), cardId('A', 'hearts')],
    });
    const next = resolveBluff(state, () => 0.99, 2000);
    expect(next.players[1]?.hand).toEqual([cardId('A', 'spades')]);
  });

  it('deterministik: seed rng sama → kartu yang pindah sama', () => {
    const mk = () =>
      bluffState({
        accuserId: 'p0',
        accusedId: 'p1',
        rank: 'A',
        accusedHand: [cardId('A', 'spades'), cardId('A', 'hearts'), cardId('A', 'diamonds')],
      });
    const first = resolveBluff(mk(), createSeededRng(7), 2000);
    const second = resolveBluff(mk(), createSeededRng(7), 2000);
    expect(first.players[0]?.hand).toEqual(second.players[0]?.hand);
    expect(first.players[1]?.hand).toEqual(second.players[1]?.hand);
  });

  it('tuduhan salah: accuser kehilangan 1 quartet (kartu kembali ke tangan)', () => {
    const date = 2000;
    const state = bluffState({
      accuserId: 'p0',
      accusedId: 'p1',
      rank: 'A',
      accuserQuartets: ['A', 'K'],
      accuserHand: [cardId('3', 'spades')],
      accusedHand: [cardId('2', 'clubs')],
      quartets: [makeQuartet('A', 'p0'), makeQuartet('K', 'p0')],
    });
    const next = resolveBluff(state, () => 0, date);
    // rng 0 → index 0 → quartet 'A' yang hilang
    expect(next.players[0]?.quartets).toEqual(['K']);
    expect(next.players[0]?.handCount).toBe(1 + 4);
    expect(next.players[0]?.hand).toContain(cardId('A', 'spades'));
    expect(next.players[0]?.hand).toContain(cardId('A', 'clubs'));
    expect(next.quartets).toHaveLength(1);
    expect(next.quartets[0]?.rank).toBe('K');
  });

  it('tuduhan salah, rng 0.99 → quartet terakhir yang hilang', () => {
    const state = bluffState({
      accuserId: 'p0',
      accusedId: 'p1',
      rank: 'A',
      accuserQuartets: ['A', 'K', 'Q'],
      accusedHand: [cardId('2', 'clubs')],
      quartets: [makeQuartet('A', 'p0'), makeQuartet('K', 'p0'), makeQuartet('Q', 'p0')],
    });
    const next = resolveBluff(state, () => 0.99, 2000);
    expect(next.players[0]?.quartets).toEqual(['A', 'K']);
    expect(next.quartets?.[2]).toBeUndefined();
  });

  it('tuduhan salah tapi accuser tidak punya quartet → penalty none', () => {
    const state = bluffState({
      accuserId: 'p0',
      accusedId: 'p1',
      rank: 'A',
      accuserHand: [cardId('3', 'spades')],
      accusedHand: [cardId('2', 'clubs')],
    });
    const next = resolveBluff(state, () => 0, 2000);
    expect(next.players[0]?.hand).toEqual([cardId('3', 'spades')]);
    expect(next.players[1]?.hand).toEqual([cardId('2', 'clubs')]);
    const resolved = next.log[next.log.length - 1];
    expect(resolved?.type).toBe('bluff.resolved');
    if (resolved?.type === 'bluff.resolved') {
      expect(resolved.correct).toBe(false);
      expect(resolved.penalty).toEqual({ kind: 'none' });
    }
  });

  it('bluffWindow null → throw', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [makeInGame('p0'), makeInGame('p1')],
      bluffWindow: null,
    });
    expect(() => resolveBluff(state, () => 0, 1000)).toThrow(/tidak ada bluff window/);
  });

  it('phase kembali ke turn, bluffWindow null, currentPlayerIndex tidak berubah', () => {
    const state = bluffState({
      accuserId: 'p0',
      accusedId: 'p1',
      rank: 'A',
      currentPlayerIndex: 1,
    });
    const next = resolveBluff(state, () => 0, 2000);
    expect(next.phase).toBe('turn');
    expect(next.bluffWindow).toBeNull();
    expect(next.currentPlayerIndex).toBe(1);
  });

  it('append bluff.resolved (correct=true) + card.transferred untuk penalty transfer', () => {
    const state = bluffState({
      accuserId: 'p0',
      accusedId: 'p1',
      rank: 'A',
      accusedHand: [cardId('A', 'spades')],
    });
    const next = resolveBluff(state, () => 0, 2000);
    const types = next.log.map((e) => e.type);
    expect(types).toContain('card.transferred');
    const resolved = next.log[next.log.length - 1];
    if (resolved?.type === 'bluff.resolved') {
      expect(resolved.correct).toBe(true);
      expect(resolved.penalty).toEqual({ kind: 'card_transferred', cardId: cardId('A', 'spades') });
      expect(resolved.accuserId).toBe(asPlayerId('p0'));
      expect(resolved.accusedId).toBe(asPlayerId('p1'));
      expect(resolved.at).toBe(2000);
    }
  });

  it('tuduhan benar dengan player ketiga (bystander) — hanya accused & accuser yang berubah', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [
        makeInGame('p0', [cardId('K', 'spades')]),
        makeInGame('p1', [cardId('A', 'spades'), cardId('A', 'hearts')]),
        makeInGame('p2', [cardId('2', 'clubs'), cardId('3', 'clubs')]),
      ],
      bluffWindow: {
        accuserId: asPlayerId('p0'),
        accusedId: asPlayerId('p1'),
        rank: 'A',
        openedAt: 1000,
        expiresAt: 6000,
      },
      currentPlayerIndex: 0,
    });
    const next = resolveBluff(state, () => 0, 2000);
    expect(next.players[0]?.hand).toEqual([cardId('K', 'spades'), cardId('A', 'spades')]);
    expect(next.players[1]?.hand).toEqual([cardId('A', 'hearts')]);
    expect(next.players[2]?.hand).toEqual([cardId('2', 'clubs'), cardId('3', 'clubs')]);
  });

  it('bump version', () => {
    const state = bluffState({
      accuserId: 'p0',
      accusedId: 'p1',
      rank: 'A',
      accusedHand: [cardId('A', 'spades')],
    });
    const next = resolveBluff(state, () => 0, 2000);
    expect(next.version).toBe(state.version + 1);
  });
});
