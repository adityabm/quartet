import { describe, expect, it } from 'vitest';
import { RANKS } from '../constants.js';
import { determineWinners, finalizeGame, isGameOver } from '../rules/game-over.js';
import { asPlayerId } from '../types/ids.js';
import { buildState, cardId, makeInGame, makeQuartet } from './helpers.js';

describe('isGameOver', () => {
  it('stock habis + tidak ada transfer mungkin → game over', () => {
    const state = buildState({
      players: [
        makeInGame('p0', [cardId('K', 'spades')], ['A']),
        makeInGame('p1', [cardId('A', 'spades')], ['K']),
      ],
      stock: [],
    });
    expect(isGameOver(state)).toBe(true);
  });

  it('stock habis tapi transfer masih mungkin → belum game over', () => {
    const state = buildState({
      players: [
        makeInGame('p0', [cardId('K', 'spades')], ['A']),
        makeInGame('p1', [cardId('A', 'spades')]),
      ],
      stock: [],
    });
    expect(isGameOver(state)).toBe(false);
  });

  it('target dengan hand kosong dilewati saat cek transfer (masih ada transfer lain)', () => {
    const state = buildState({
      players: [
        makeInGame('p0', [cardId('A', 'spades')]),
        makeInGame('p1'),
        makeInGame('p2', [cardId('K', 'spades')]),
      ],
      stock: [],
    });
    expect(isGameOver(state)).toBe(false);
  });

  it('hanya 1 player aktif → game over', () => {
    const state = buildState({
      players: [makeInGame('p0', [cardId('K', 'spades'), cardId('K', 'hearts')]), makeInGame('p1')],
    });
    expect(isGameOver(state)).toBe(true);
  });

  it('player yang hanya punya quartet (tanpa kartu) tetap aktif', () => {
    const state = buildState({
      players: [makeInGame('p0', [cardId('K', 'spades')], ['A']), makeInGame('p1', [], ['Q'])],
      stock: [cardId('2', 'clubs')],
    });
    expect(isGameOver(state)).toBe(false);
  });

  it('semua 13 rank jadi quartet → game over (walau stock masih ada)', () => {
    // 2 player tetap aktif (masing-masing pegang kartu + quartet) sehingga
    // kondisi "1 player aktif" tidak men-trigger duluan.
    const sevenOfP0 = RANKS.slice(0, 7);
    const sixOfP1 = RANKS.slice(7);
    const state = buildState({
      players: [
        makeInGame('p0', [cardId('2', 'spades')], sevenOfP0),
        makeInGame('p1', [cardId('3', 'clubs')], sixOfP1),
      ],
      quartets: [...sevenOfP0, ...sixOfP1].map((rank) =>
        makeQuartet(rank, sevenOfP0.includes(rank) ? 'p0' : 'p1'),
      ),
      stock: [cardId('4', 'diamonds')],
    });
    expect(isGameOver(state)).toBe(true);
  });

  it('stock masih ada → bukan game over walau tidak ada transfer langsung', () => {
    const state = buildState({
      players: [
        makeInGame('p0', [cardId('K', 'spades')], ['A']),
        makeInGame('p1', [cardId('A', 'spades')], ['K']),
      ],
      stock: [cardId('2', 'clubs')],
    });
    expect(isGameOver(state)).toBe(false);
  });
});

describe('determineWinners', () => {
  it('winner unik = pemain dengan quartet terbanyak', () => {
    const state = buildState({
      players: [
        makeInGame('p0', [], ['A', 'K', 'Q']),
        makeInGame('p1', [], ['J']),
        makeInGame('p2'),
      ],
    });
    expect(determineWinners(state)).toEqual([asPlayerId('p0')]);
  });

  it('tie → semua pemain dengan count max dikembalikan', () => {
    const state = buildState({
      players: [
        makeInGame('p0', [], ['A', 'K']),
        makeInGame('p1', [], ['Q', 'J']),
        makeInGame('p2', [], ['10']),
      ],
    });
    const winners = determineWinners(state);
    expect(winners).toHaveLength(2);
    expect(winners).toEqual(expect.arrayContaining([asPlayerId('p0'), asPlayerId('p1')]));
  });
});

describe('finalizeGame', () => {
  it('wrap phase jadi game_over + append event game.over', () => {
    const state = buildState({
      players: [makeInGame('p0', [], ['A', 'K']), makeInGame('p1', [], ['Q'])],
      quartets: [makeQuartet('A', 'p0'), makeQuartet('K', 'p0'), makeQuartet('Q', 'p1')],
      version: 5,
    });
    const next = finalizeGame(state, 9000);
    expect(next.phase).toBe('game_over');
    expect(next.version).toBe(6);
    const lastEvent = next.log[next.log.length - 1];
    expect(lastEvent?.type).toBe('game.over');
    if (lastEvent?.type === 'game.over') {
      expect(lastEvent.at).toBe(9000);
      expect(lastEvent.winnerIds).toEqual([asPlayerId('p0')]);
      expect(lastEvent.scores).toEqual([
        { playerId: asPlayerId('p0'), quartetCount: 2 },
        { playerId: asPlayerId('p1'), quartetCount: 1 },
      ]);
    }
  });
});
