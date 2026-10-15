import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng.js';
import {
  applyAction,
  dealCards,
  finalizeGame,
  getValidActions,
  initGame,
  isGameOver,
} from '../rules/index.js';
import { asPlayerId } from '../types/ids.js';
import type { GameState } from '../types/game-state.js';
import type { Player } from '../types/player.js';
import { buildState, cardId, makeInGame, makePlayer } from './helpers.js';

/** Driver bot-sederhana: main sampai game over / move cap habis. Deterministik per seed. */
function playGame(seed: number, playerCount: number, now: number): GameState {
  const players: Player[] = Array.from({ length: playerCount }, (_, i) => makePlayer(`p${i}`));
  const rng = createSeededRng(seed);
  let state = initGame({ seed, players, now });
  state = dealCards(state, rng, now);
  let moves = 0;
  const maxMoves = 300;
  while (!isGameOver(state) && moves < maxMoves) {
    const current = state.players[state.currentPlayerIndex]!;
    const actions = getValidActions(state, current.id);
    const action = actions[0];
    if (action === undefined) {
      break;
    }
    state = applyAction(state, action, current.id, rng, now + moves);
    moves++;
  }
  return state;
}

describe('integration: full game flow', () => {
  it('4 pemain: deal → beberapa ask → quartet → bluff → finalize game over', () => {
    const players: Player[] = [
      makePlayer('p0'),
      makePlayer('p1'),
      makePlayer('p2'),
      makePlayer('p3'),
    ];
    const rng = createSeededRng(42);
    let state = initGame({ seed: 42, players, now: 1000 });
    state = dealCards(state, rng, 1000);
    expect(state.phase).toBe('turn');
    expect(state.players.every((p) => p.handCount === 13)).toBe(true);

    let moved = 0;
    const currentAfterDeal = state.currentPlayerIndex;
    while (!isGameOver(state) && moved < 40) {
      const current = state.players[state.currentPlayerIndex]!;
      const actions = getValidActions(state, current.id);
      const action = actions[0];
      if (action === undefined) break;
      state = applyAction(state, action, current.id, rng, 1000 + moved);
      moved++;
    }
    expect(moved).toBeGreaterThan(0);
    // total kartu selalu konservatif: hand + 4×quartet + stock = 52
    const inHands = state.players.reduce((s, p) => s + p.handCount, 0);
    expect(inHands + state.quartets.length * 4 + state.stockCount).toBe(52);

    const finished = finalizeGame(state, 5000);
    expect(finished.phase).toBe('game_over');
    const lastEvent = finished.log[finished.log.length - 1];
    expect(lastEvent?.type).toBe('game.over');
    expect(finished.players.length).toBe(4);
    expect(currentAfterDeal).toBeGreaterThanOrEqual(0);
  });

  it('determinisme: seed sama → log event identik', () => {
    const first = playGame(2026, 4, 0);
    const second = playGame(2026, 4, 0);
    expect(first.log.map((e) => e.type)).toEqual(second.log.map((e) => e.type));
    expect(JSON.stringify(first.log)).toBe(JSON.stringify(second.log));
    expect(JSON.stringify(first.players.map((p) => [...p.hand]))).toBe(
      JSON.stringify(second.players.map((p) => [...p.hand])),
    );
  });

  it('multi-quartet formation dalam 1 turn (dua ask beruntun)', () => {
    const state = buildState({
      players: [
        makeInGame('p0', [
          cardId('A', 'spades'),
          cardId('A', 'hearts'),
          cardId('A', 'diamonds'),
          cardId('K', 'spades'),
          cardId('K', 'hearts'),
          cardId('K', 'diamonds'),
        ]),
        makeInGame('p1', [cardId('A', 'clubs')]),
        makeInGame('p2', [cardId('K', 'clubs')]),
      ],
      currentPlayerIndex: 0,
    });
    const rng = createSeededRng(1);
    const afterA = applyAction(
      state,
      { type: 'ask', targetId: asPlayerId('p1'), rank: 'A' },
      asPlayerId('p0'),
      rng,
      100,
    );
    expect(afterA.phase).toBe('turn');
    expect(afterA.quartets.map((q) => q.rank)).toEqual(['A']);
    expect(afterA.currentPlayerIndex).toBe(0);
    const afterK = applyAction(
      afterA,
      { type: 'ask', targetId: asPlayerId('p2'), rank: 'K' },
      asPlayerId('p0'),
      rng,
      200,
    );
    expect(afterK.quartets.map((q) => q.rank)).toEqual(['A', 'K']);
    expect(afterK.currentPlayerIndex).toBe(0); // turn tetap di asker
    expect(afterK.players[0]?.handCount).toBe(0);
    expect(afterK.players[0]?.quartets).toEqual(['A', 'K']);
  });

  it('bluff flow dalam 1 turn: ask gagal → window → bluff.call → accuser boleh pass → turn pindah', () => {
    let state = buildState({
      players: [makeInGame('p0'), makeInGame('p1', [cardId('2', 'clubs')])],
      currentPlayerIndex: 0,
    });
    const rng = createSeededRng(5);
    state = applyAction(
      state,
      { type: 'ask', targetId: asPlayerId('p1'), rank: 'A' },
      asPlayerId('p0'),
      rng,
      100,
    );
    expect(state.phase).toBe('bluff_window');
    expect(getValidActions(state, asPlayerId('p0'))).toEqual([
      { type: 'bluff.call', accusedId: asPlayerId('p1') },
    ]);

    state = applyAction(
      state,
      { type: 'bluff.call', accusedId: asPlayerId('p1') },
      asPlayerId('p0'),
      rng,
      200,
    );
    expect(state.phase).toBe('turn');
    expect(state.currentPlayerIndex).toBe(0); // giliran kembali ke accuser
    expect(state.bluffWindow).toBeNull();

    // accuser boleh pass karena log tail bluff.resolved
    const actions = getValidActions(state, asPlayerId('p0'));
    expect(actions.some((a) => a.type === 'pass')).toBe(true);
    state = applyAction(state, { type: 'pass' }, asPlayerId('p0'), rng, 300);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('rematch flow: game over → initGame baru dengan pemain yang sama', () => {
    const players: Player[] = [
      makePlayer('p0'),
      makePlayer('p1'),
      makePlayer('p2'),
      makePlayer('p3'),
    ];
    const first = playGame(11, 4, 0);
    const finished = finalizeGame(first, 999);
    expect(finished.phase).toBe('game_over');

    const rematch = initGame({ seed: 55, players, now: 2000 });
    expect(rematch.phase).toBe('lobby');
    expect(rematch.players.map((p) => p.id)).toEqual(players.map((p) => p.id));
    expect(rematch.players.every((p) => p.handCount === 0)).toBe(true);
    const redealt = dealCards(rematch, createSeededRng(55), 2000);
    expect(redealt.phase).toBe('turn');
    expect(redealt.players.every((p) => p.handCount === 13)).toBe(true);
  });
});
