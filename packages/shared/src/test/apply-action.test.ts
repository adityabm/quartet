import { describe, expect, it } from 'vitest';
import { applyAction, dealCards, initGame } from '../rules/index.js';
import { asPlayerId } from '../types/ids.js';
import { createSeededRng } from '../rng.js';
import { buildState, cardId, makeInGame, makePlayer } from './helpers.js';

const p0 = asPlayerId('p0');
const p1 = asPlayerId('p1');

describe('applyAction', () => {
  it('dispatch ask → state berubah (transfer kartu)', () => {
    const state = buildState({
      players: [makeInGame('p0'), makeInGame('p1', [cardId('A', 'spades')])],
    });
    const next = applyAction(state, { type: 'ask', targetId: p1, rank: 'A' }, p0, () => 0, 100);
    expect(next.players[0]?.hand).toEqual([cardId('A', 'spades')]);
    expect(next.players[1]?.hand).toEqual([]);
    expect(next.phase).toBe('turn');
  });

  it('dispatch pass → giliran pindah ke next', () => {
    const state = buildState({
      players: [makeInGame('p0'), makeInGame('p1')],
      stock: [cardId('2', 'clubs')],
      stockCount: 1,
    });
    const next = applyAction(state, { type: 'pass' }, p0, () => 0, 100);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.players[0]?.handCount).toBe(1);
  });

  it('dispatch bluff.call saat window aktif → resolve ke turn', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [makeInGame('p0'), makeInGame('p1', [cardId('A', 'spades')])],
      bluffWindow: { accuserId: p0, accusedId: p1, rank: 'A', openedAt: 100, expiresAt: 5100 },
    });
    const next = applyAction(state, { type: 'bluff.call', accusedId: p1 }, p0, () => 0, 200);
    expect(next.phase).toBe('turn');
    expect(next.bluffWindow).toBeNull();
    expect(next.players[0]?.hand).toContain(cardId('A', 'spades'));
  });

  it('invalid action (bukan current player) → throw', () => {
    const state = buildState({
      players: [makeInGame('p0'), makeInGame('p1')],
      currentPlayerIndex: 1,
    });
    expect(() =>
      applyAction(state, { type: 'ask', targetId: p1, rank: 'A' }, p0, () => 0, 100),
    ).toThrow(/bukan giliran/);
  });

  it('invalid action di phase lobby → throw', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')], phase: 'lobby' });
    expect(() => applyAction(state, { type: 'pass' }, p0, () => 0, 100)).toThrow(
      /tidak valid di phase lobby/,
    );
  });

  it('bluff.call saat phase turn → throw', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')] });
    expect(() =>
      applyAction(state, { type: 'bluff.call', accusedId: p1 }, p0, () => 0, 100),
    ).toThrow(/bluff\.call tidak valid saat phase turn/);
  });

  it('bluff window aktif tapi accusedId tidak cocok → throw', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [makeInGame('p0'), makeInGame('p1'), makeInGame('p2')],
      bluffWindow: { accuserId: p0, accusedId: p1, rank: 'A', openedAt: 100, expiresAt: 5100 },
    });
    expect(() =>
      applyAction(state, { type: 'bluff.call', accusedId: asPlayerId('p2') }, p0, () => 0, 200),
    ).toThrow(/accusedId tidak cocok/);
  });

  it('bluff window aktif tapi actor bukan accuser → throw', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [makeInGame('p0'), makeInGame('p1'), makeInGame('p2')],
      bluffWindow: { accuserId: p0, accusedId: p1, rank: 'A', openedAt: 100, expiresAt: 5100 },
    });
    expect(() =>
      applyAction(state, { type: 'bluff.call', accusedId: p1 }, asPlayerId('p2'), () => 0, 200),
    ).toThrow(/hanya accuser/);
  });

  it('phase bluff_window tanpa window → throw', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [makeInGame('p0'), makeInGame('p1')],
      bluffWindow: null,
    });
    expect(() =>
      applyAction(state, { type: 'bluff.call', accusedId: p1 }, p0, () => 0, 200),
    ).toThrow(/tanpa window aktif/);
  });

  it('aksi ask saat bluff window → throw (hanya bluff.call)', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [makeInGame('p0'), makeInGame('p1')],
      bluffWindow: { accuserId: p0, accusedId: p1, rank: 'A', openedAt: 100, expiresAt: 5100 },
    });
    expect(() =>
      applyAction(state, { type: 'ask', targetId: p1, rank: 'K' }, p0, () => 0, 200),
    ).toThrow(/hanya bluff\.call/);
  });

  it('barrel export: initGame + dealCards + applyAction jalan dari rules/index.js', () => {
    const players = [makePlayer('p0'), makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
    const rng = createSeededRng(99);
    const init = initGame({ seed: 99, players, now: 0 });
    const dealt = dealCards(init, rng, 0);
    const next = applyAction(
      dealt,
      { type: 'pass' },
      dealt.players[dealt.currentPlayerIndex]!.id,
      rng,
      0,
    );
    expect(next.phase).toBe('turn');
    expect(next.log.map((e) => e.type)).toContain('turn.passed');
  });
});
