import { describe, expect, it } from 'vitest';
import { RANKS } from '../constants.js';
import { getValidActions } from '../rules/valid-actions.js';
import { asPlayerId } from '../types/ids.js';
import { buildState, cardId, makeInGame } from './helpers.js';

const p0 = asPlayerId('p0');
const p1 = asPlayerId('p1');

describe('getValidActions', () => {
  it('helper: p0 butuh pemain lain sebagai target', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')] });
    const actions = getValidActions(state, p0);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((a) => a.type === 'ask' && a.targetId === p1)).toBe(true);
  });

  it('empty kalau bukan giliran player', () => {
    const state = buildState({
      players: [makeInGame('p0'), makeInGame('p1')],
      currentPlayerIndex: 1,
    });
    expect(getValidActions(state, p0)).toEqual([]);
  });

  it('empty kalau phase bukan turn/bluff_window', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')], phase: 'lobby' });
    expect(getValidActions(state, p0)).toEqual([]);
  });

  it('semua kombinasi (targetId, rank) valid dikembalikan untuk current player', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')] });
    const actions = getValidActions(state, p0);
    expect(actions).toHaveLength(RANKS.length);
    expect(actions.filter((a) => a.type === 'ask')).toHaveLength(RANKS.length);
  });

  it('exclude target = self (dengan 3 pemain)', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1'), makeInGame('p2')] });
    const actions = getValidActions(state, p0);
    const asks = actions.filter((a) => a.type === 'ask');
    expect(asks).toHaveLength(RANKS.length * 2);
    expect(asks.every((a) => a.targetId !== p0)).toBe(true);
  });

  it('exclude rank yang sudah jadi quartet lengkap', () => {
    const state = buildState({ players: [makeInGame('p0', [], ['A', 'K']), makeInGame('p1')] });
    const actions = getValidActions(state, p0);
    const ranksAsked = new Set(
      actions.filter((a) => a.type === 'ask').map((a) => (a.type === 'ask' ? a.rank : null)),
    );
    expect(ranksAsked.has('A')).toBe(false);
    expect(ranksAsked.has('K')).toBe(false);
    expect(ranksAsked.has('Q')).toBe(true);
  });

  it('bluff.call saat window aktif dan player = accuser', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [makeInGame('p0'), makeInGame('p1')],
      bluffWindow: { accuserId: p0, accusedId: p1, rank: 'A', openedAt: 1, expiresAt: 5001 },
    });
    expect(getValidActions(state, p0)).toEqual([{ type: 'bluff.call', accusedId: p1 }]);
  });

  it('empty untuk non-accuser saat bluff window aktif', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [makeInGame('p0'), makeInGame('p1')],
      bluffWindow: { accuserId: p0, accusedId: p1, rank: 'A', openedAt: 1, expiresAt: 5001 },
    });
    expect(getValidActions(state, p1)).toEqual([]);
  });

  it('pass tersedia setelah bluff.resolved (player boleh lanjut atau pass)', () => {
    const resolvedEvent = {
      type: 'bluff.resolved' as const,
      at: 100,
      accuserId: p0,
      accusedId: p1,
      correct: false,
      penalty: { kind: 'none' as const },
    };
    const state = buildState({
      players: [makeInGame('p0'), makeInGame('p1')],
      log: [resolvedEvent],
    });
    const actions = getValidActions(state, p0);
    expect(actions.some((a) => a.type === 'pass')).toBe(true);
  });

  it('pass TIDAK tersedia setelah transfer sukses (log tail card.transferred)', () => {
    const transferredEvent = {
      type: 'card.transferred' as const,
      at: 100,
      fromId: p1,
      toId: p0,
      cardIds: [cardId('A', 'spades')],
    };
    const state = buildState({
      players: [makeInGame('p0'), makeInGame('p1')],
      log: [transferredEvent],
    });
    expect(getValidActions(state, p0).some((a) => a.type === 'pass')).toBe(false);
  });

  it('pass TIDAK tersedia kalau log kosong (first turn)', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')], log: [] });
    expect(getValidActions(state, p0).some((a) => a.type === 'pass')).toBe(false);
  });

  it('empty kalau state phase bluff_window tapi window null (defensif)', () => {
    const state = buildState({
      phase: 'bluff_window',
      players: [makeInGame('p0'), makeInGame('p1')],
      bluffWindow: null,
    });
    expect(getValidActions(state, p0)).toEqual([]);
  });
});
