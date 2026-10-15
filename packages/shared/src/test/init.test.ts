import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS, MIN_PLAYERS } from '../constants.js';
import { initGame } from '../rules/init.js';
import { asGameId, asPlayerId } from '../types/ids.js';
import { makePlayer } from './helpers.js';

describe('initGame', () => {
  it('membuat state dengan 4 pemain yang valid', () => {
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3'), makePlayer('p4')];
    const state = initGame({ seed: 42, players, now: 1000 });
    expect(state.players).toHaveLength(4);
    expect(state.players.map((p) => p.id)).toEqual(players.map((p) => p.id));
    expect(state.gameId).toBeTruthy();
    expect(state.seed).toBe(42);
    expect(state.version).toBe(0);
  });

  it('menerima 2 pemain (MIN_PLAYERS) dan 6 pemain (MAX_PLAYERS)', () => {
    const two = initGame({ seed: 1, players: [makePlayer('a'), makePlayer('b')], now: 0 });
    expect(two.players).toHaveLength(MIN_PLAYERS);
    const six = initGame({
      seed: 1,
      players: Array.from({ length: 6 }, (_, i) => makePlayer(`p${i}`)),
      now: 0,
    });
    expect(six.players).toHaveLength(MAX_PLAYERS);
  });

  it('throw kalau player < MIN_PLAYERS', () => {
    expect(() => initGame({ seed: 1, players: [makePlayer('a')], now: 0 })).toThrow(/2\.\.6/);
  });

  it('throw kalau player > MAX_PLAYERS', () => {
    const players = Array.from({ length: 7 }, (_, i) => makePlayer(`p${i}`));
    expect(() => initGame({ seed: 1, players, now: 0 })).toThrow(/2\.\.6/);
  });

  it('phase awal lobby dengan hand & quartets kosong, stock kosong', () => {
    const state = initGame({ seed: 42, players: [makePlayer('a'), makePlayer('b')], now: 1000 });
    expect(state.phase).toBe('lobby');
    expect(state.stock).toHaveLength(0);
    expect(state.stockCount).toBe(0);
    expect(state.quartets).toHaveLength(0);
    expect(state.bluffWindow).toBeNull();
    expect(state.currentPlayerIndex).toBe(0);
    for (const player of state.players) {
      expect(player.hand).toHaveLength(0);
      expect(player.handCount).toBe(0);
      expect(player.quartets).toHaveLength(0);
    }
  });

  it('append event game.created dengan seed dan timestamp', () => {
    const state = initGame({ seed: 7, players: [makePlayer('a'), makePlayer('b')], now: 1234 });
    expect(state.log).toHaveLength(1);
    expect(state.log[0]).toEqual({ type: 'game.created', at: 1234, seed: 7 });
    expect(state.turnStartedAt).toBe(1234);
  });

  it('gameId di-generate otomatis kalau absent (format UUID)', () => {
    const state = initGame({ seed: 1, players: [makePlayer('a'), makePlayer('b')], now: 0 });
    expect(state.gameId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // dua panggilan beda instance → beda id (unik)
    const other = initGame({ seed: 1, players: [makePlayer('a'), makePlayer('b')], now: 0 });
    expect(other.gameId).not.toBe(state.gameId);
  });

  it('pakai gameId yang diberikan kalau ada', () => {
    const gameId = asGameId('game-eksplisit-1');
    const state = initGame({
      seed: 1,
      players: [makePlayer('a'), makePlayer('b')],
      now: 0,
      gameId,
    });
    expect(state.gameId).toBe(gameId);
  });

  it('menjaga urutan kursi = urutan players array', () => {
    const players = [makePlayer('z', {}), makePlayer('a', {}), makePlayer('m', {})];
    const state = initGame({ seed: 1, players, now: 0 });
    expect(state.players.map((p) => p.id)).toEqual([
      asPlayerId('z'),
      asPlayerId('a'),
      asPlayerId('m'),
    ]);
  });
});
