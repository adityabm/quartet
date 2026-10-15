import { describe, expect, it } from 'vitest';
import { currentPlayerId, currentTurnNumber, nextPlayerIndex, nextTurn } from '../rules/turn.js';
import { buildState, makeInGame } from './helpers.js';

const p0 = makeInGame('a');
const p1 = makeInGame('b');
const p2 = makeInGame('c');

describe('nextTurn', () => {
  it('maju satu index (cyclic)', () => {
    const state = buildState({ players: [p0, p1, p2], currentPlayerIndex: 1, log: [] });
    const next = nextTurn(state, 500);
    expect(next.currentPlayerIndex).toBe(2);
    expect(currentPlayerId(next)).toBe(p2.id);
  });

  it('wrap balik ke 0 setelah index terakhir', () => {
    const state = buildState({ players: [p0, p1, p2], currentPlayerIndex: 2, log: [] });
    const next = nextTurn(state, 500);
    expect(next.currentPlayerIndex).toBe(0);
    expect(currentPlayerId(next)).toBe(p0.id);
  });

  it('nextPlayerIndex = modulo', () => {
    const state = buildState({ players: [p0, p1, p2], currentPlayerIndex: 0 });
    expect(nextPlayerIndex(state)).toBe(1);
    const last = buildState({ players: [p0, p1, p2], currentPlayerIndex: 2 });
    expect(nextPlayerIndex(last)).toBe(0);
  });

  it('append turn.started dengan turnNumber increment', () => {
    const state = buildState({
      players: [p0, p1, p2],
      currentPlayerIndex: 0,
      log: [{ type: 'turn.started', at: 1, playerId: p0.id, turnNumber: 1 }],
    });
    const next = nextTurn(state, 500);
    const lastEvent = next.log[next.log.length - 1];
    expect(lastEvent?.type).toBe('turn.started');
    if (lastEvent?.type === 'turn.started') {
      expect(lastEvent.turnNumber).toBe(2);
      expect(lastEvent.playerId).toBe(p1.id);
      expect(lastEvent.at).toBe(500);
    }
    expect(currentTurnNumber(next)).toBe(2);
  });

  it('bump version dan update turnStartedAt', () => {
    const state = buildState({
      players: [p0, p1],
      currentPlayerIndex: 0,
      version: 3,
      turnStartedAt: 10,
    });
    const next = nextTurn(state, 999);
    expect(next.version).toBe(4);
    expect(next.turnStartedAt).toBe(999);
  });

  it('phase di-set ke turn', () => {
    const state = buildState({ players: [p0, p1], currentPlayerIndex: 1, phase: 'lobby' });
    expect(nextTurn(state, 0).phase).toBe('turn');
  });
});

describe('currentPlayerId', () => {
  it('return id player yang sedang giliran', () => {
    const state = buildState({ players: [p0, p1], currentPlayerIndex: 1 });
    expect(currentPlayerId(state)).toBe(p1.id);
  });

  it('return null kalau index di luar bounds', () => {
    const state = buildState({ players: [], currentPlayerIndex: 0 });
    expect(currentPlayerId(state)).toBeNull();
  });
});
