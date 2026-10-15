import { describe, expect, it } from 'vitest';
import { applyPass } from '../rules/pass.js';
import { asPlayerId } from '../types/ids.js';
import { buildState, cardId, makeInGame } from './helpers.js';

function passState(
  stock: string[] = [],
  players = [makeInGame('p0'), makeInGame('p1')],
  currentPlayerIndex = 0,
) {
  return buildState({ players, currentPlayerIndex, stock, stockCount: stock.length });
}

describe('applyPass', () => {
  it('draw 1 kartu dari stok (top = elemen terakhir)', () => {
    const state = passState([cardId('K', 'clubs'), cardId('9', 'hearts')]);
    const next = applyPass(state, asPlayerId('p0'), () => 0, 500);
    expect(next.players[0]?.hand).toEqual([cardId('9', 'hearts')]);
    expect(next.players[0]?.handCount).toBe(1);
    expect(next.stock).toEqual([cardId('K', 'clubs')]);
    expect(next.stockCount).toBe(1);
    const passed = next.log.find((e) => e.type === 'turn.passed');
    if (passed?.type === 'turn.passed') {
      expect(passed.drewCardId).toBe(cardId('9', 'hearts'));
      expect(passed.playerId).toBe(asPlayerId('p0'));
    }
  });

  it('stock kosong → tidak draw (drewCardId null)', () => {
    const state = passState([], [makeInGame('p0', [cardId('2', 'spades')]), makeInGame('p1')]);
    const next = applyPass(state, asPlayerId('p0'), () => 0, 500);
    expect(next.players[0]?.hand).toEqual([cardId('2', 'spades')]);
    expect(next.stockCount).toBe(0);
    const passed = next.log.find((e) => e.type === 'turn.passed');
    if (passed?.type === 'turn.passed') {
      expect(passed.drewCardId).toBeNull();
    }
  });

  it('turn pindah ke next + append turn.passed dan turn.started', () => {
    const state = passState([cardId('3', 'clubs')], [makeInGame('p0'), makeInGame('p1')], 0);
    const next = applyPass(state, asPlayerId('p0'), () => 0, 777);
    expect(next.currentPlayerIndex).toBe(1);
    const types = next.log.map((e) => e.type);
    expect(types).toContain('turn.passed');
    expect(types).toContain('turn.started');
    const started = next.log[next.log.length - 1];
    if (started?.type === 'turn.started') {
      expect(started.playerId).toBe(asPlayerId('p1'));
      expect(started.at).toBe(777);
    }
  });

  it('phase bukan turn → throw', () => {
    const state = buildState({ phase: 'lobby', players: [makeInGame('p0'), makeInGame('p1')] });
    expect(() => applyPass(state, asPlayerId('p0'), () => 0, 500)).toThrow(/phase harus 'turn'/);
  });

  it('bukan giliran pemain ini → throw', () => {
    const state = passState([], [makeInGame('p0'), makeInGame('p1')], 0);
    expect(() => applyPass(state, asPlayerId('p1'), () => 0, 500)).toThrow(/bukan giliran/);
  });

  it('bump version dan update turnStartedAt', () => {
    const state = passState([cardId('2', 'clubs')], [makeInGame('p0'), makeInGame('p1')], 0);
    const next = applyPass(state, asPlayerId('p0'), () => 0, 123);
    expect(next.version).toBe(state.version + 1);
    expect(next.turnStartedAt).toBe(123);
  });
});
