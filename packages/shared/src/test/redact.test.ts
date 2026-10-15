import { describe, expect, it } from 'vitest';
import { buildPrivateSnapshot, redactGameState } from '../rules/redact.js';
import { asGameId, asPlayerId } from '../types/ids.js';
import type { GameEvent } from '../types/game-state.js';
import { buildState, cardId, makeInGame, makeQuartet } from './helpers.js';

const events15: GameEvent[] = Array.from({ length: 15 }, (_, i) => ({
  type: 'ask.made',
  at: i,
  fromId: asPlayerId('p0'),
  toId: asPlayerId('p1'),
  rank: 'A',
}));

describe('redactGameState', () => {
  it('stock TIDAK ikut di-redacted — hanya stockCount', () => {
    const state = buildState({
      players: [makeInGame('p0'), makeInGame('p1')],
      stock: [cardId('2', 'clubs'), cardId('3', 'diamonds')],
      stockCount: 2,
    });
    const redacted = redactGameState(state);
    expect('stock' in redacted).toBe(false);
    expect(redacted.stockCount).toBe(2);
  });

  it('hand player TIDAK ikut di-redacted — hanya handCount', () => {
    const state = buildState({
      players: [makeInGame('p0', [cardId('A', 'spades'), cardId('K', 'hearts')]), makeInGame('p1')],
    });
    const redacted = redactGameState(state);
    for (const view of redacted.players) {
      expect('hand' in view).toBe(false);
    }
    expect(redacted.players[0]?.handCount).toBe(2);
    expect(redacted.players[1]?.handCount).toBe(0);
  });

  it('quartets visible ke semua (publik)', () => {
    const quartets = [makeQuartet('A', 'p0'), makeQuartet('K', 'p1')];
    const state = buildState({
      players: [makeInGame('p0', [], ['A']), makeInGame('p1', [], ['K'])],
      quartets,
    });
    const redacted = redactGameState(state);
    expect(redacted.quartets).toEqual(quartets);
    expect(redacted.players[0]?.quartets).toEqual(['A']);
  });

  it('lastEvents = N event terakhir sesuai param lastEventCount', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')], log: events15 });
    const redacted = redactGameState(state, 5);
    expect(redacted.lastEvents).toHaveLength(5);
    expect(redacted.lastEvents[0]).toEqual(events15[10]);
  });

  it('lastEvents default = 10 event terakhir', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')], log: events15 });
    const redacted = redactGameState(state);
    expect(redacted.lastEvents).toHaveLength(10);
  });

  it('mempertahankan identity fields & metadata placeholder', () => {
    const state = buildState({
      gameId: asGameId('game-x'),
      players: [makeInGame('p0', [], ['A'])],
      currentPlayerIndex: 0,
      version: 3,
      bluffWindow: null,
      phase: 'turn',
    });
    const redacted = redactGameState(state);
    expect(redacted.gameId).toBe(asGameId('game-x'));
    expect(redacted.phase).toBe('turn');
    expect(redacted.currentPlayerIndex).toBe(0);
    expect(redacted.version).toBe(3);
    // PlayerInGame tidak membawa metadata → placeholder sampai server merge (Phase 4)
    expect(redacted.players[0]).toMatchObject({ name: '', isConnected: true, isBot: false });
  });
});

describe('buildPrivateSnapshot', () => {
  it('private snapshot menyertakan hand player sendiri', () => {
    const state = buildState({
      players: [makeInGame('p0', [cardId('A', 'spades'), cardId('2', 'clubs')]), makeInGame('p1')],
    });
    const snapshot = buildPrivateSnapshot(state, asPlayerId('p0'));
    expect(snapshot.yourHand).toEqual([cardId('A', 'spades'), cardId('2', 'clubs')]);
    expect(snapshot.redacted.players.find((p) => p.id === asPlayerId('p0'))?.handCount).toBe(2);
  });

  it('throw kalau playerId tidak ditemukan di game', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')] });
    expect(() => buildPrivateSnapshot(state, asPlayerId('ghost'))).toThrow(/tidak ditemukan/);
  });
});
