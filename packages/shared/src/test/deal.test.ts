import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng.js';
import { dealCards } from '../rules/deal.js';
import { initGame } from '../rules/init.js';
import { asPlayerId } from '../types/ids.js';
import { makePlayer } from './helpers.js';

function startGame(seed: number, playerCount: number, now = 1000) {
  const players = Array.from({ length: playerCount }, (_, i) => makePlayer(`p${i}`));
  const state = initGame({ seed, players, now });
  return dealCards(state, createSeededRng(seed), now);
}

describe('dealCards', () => {
  it('membagikan total 52 kartu (hand + stock)', () => {
    const dealt = startGame(42, 4);
    const totalHand = dealt.players.reduce((sum, p) => sum + p.handCount, 0);
    expect(totalHand + dealt.stockCount).toBe(52);
  });

  it('4 pemain → masing-masing 13 kartu, stock kosong', () => {
    const dealt = startGame(42, 4);
    expect(dealt.stock).toHaveLength(0);
    expect(dealt.stockCount).toBe(0);
    for (const player of dealt.players) {
      expect(player.handCount).toBe(13);
    }
  });

  it('3 pemain → 17/17/17 kartu dan 1 sisa ke stock', () => {
    const dealt = startGame(42, 3);
    const counts = dealt.players.map((p) => p.handCount);
    expect(counts.sort()).toEqual([17, 17, 17]);
    expect(dealt.stockCount).toBe(1);
  });

  it('6 pemain → 8 kartu per pemain dan 4 sisa ke stock', () => {
    const dealt = startGame(42, 6);
    const counts = dealt.players.map((p) => p.handCount);
    expect(counts.every((c) => c === 8)).toBe(true);
    expect(dealt.stockCount).toBe(4);
  });

  it('tidak ada kartu duplikat di seluruh distribusi', () => {
    const dealt = startGame(7, 5);
    const all = dealt.players.flatMap((p) => [...p.hand]).concat([...dealt.stock]);
    expect(new Set(all).size).toBe(52);
  });

  it('deterministik: seed sama → distribusi & first player sama', () => {
    const first = startGame(1234, 4);
    const second = startGame(1234, 4);
    expect(first.players.map((p) => [...p.hand])).toEqual(second.players.map((p) => [...p.hand]));
    expect(first.stock).toEqual(second.stock);
    expect(first.currentPlayerIndex).toBe(second.currentPlayerIndex);
  });

  it('first player = pemegang A-spades (kartu tertinggi)', () => {
    const dealt = startGame(42, 4);
    const holderIndex = dealt.players.findIndex((p) => p.hand.includes('A-spades'));
    expect(holderIndex).toBeGreaterThanOrEqual(0);
    expect(dealt.currentPlayerIndex).toBe(holderIndex);
  });

  it('phase berubah ke turn dan append event game.dealt + turn.started pertama', () => {
    const dealt = startGame(42, 4);
    expect(dealt.phase).toBe('turn');
    const types = dealt.log.map((e) => e.type);
    expect(types).toContain('game.dealt');
    expect(types).toContain('turn.started');
    const turnStarted = dealt.log.find((e) => e.type === 'turn.started');
    expect(turnStarted?.type === 'turn.started' && turnStarted.turnNumber).toBe(1);
    const dealtEvent = dealt.log.find((e) => e.type === 'game.dealt');
    if (dealtEvent?.type === 'game.dealt') {
      expect(dealtEvent.handCounts).toHaveLength(4);
      expect(dealtEvent.handCounts.reduce((s, h) => s + h.count, 0)).toBe(52);
    } else {
      throw new Error('game.dealt event harus ada');
    }
  });

  it('bump version dan update turnStartedAt', () => {
    const dealt = startGame(42, 4, 999);
    expect(dealt.version).toBe(1);
    expect(dealt.turnStartedAt).toBe(999);
  });

  it('seed berbeda → distribusi hand berbeda', () => {
    const first = startGame(1, 4);
    const second = startGame(2, 4);
    expect(first.players.map((p) => [...p.hand])).not.toEqual(
      second.players.map((p) => [...p.hand]),
    );
  });

  it('currentPlayerId menunjuk first player', () => {
    const dealt = startGame(42, 4);
    const expected = asPlayerId(`p${dealt.currentPlayerIndex}`);
    expect(dealt.players[dealt.currentPlayerIndex]?.id).toBe(expected);
  });
});
