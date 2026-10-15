import { describe, expect, it } from 'vitest';
import type { Rank } from '../constants.js';
import { DEFAULT_BLUFF_WINDOW_MS } from '../constants.js';
import { applyAsk } from '../rules/ask.js';
import { asPlayerId } from '../types/ids.js';
import type { PlayerId } from '../types/ids.js';
import { buildState, cardId, makeInGame } from './helpers.js';

const TURN_STARTED_LOG = [
  { type: 'turn.started' as const, at: 0, playerId: 'p0' as PlayerId, turnNumber: 1 },
];

function askState(
  currentIndex = 0,
  players = [makeInGame('p0'), makeInGame('p1')],
  log: Array<{
    type: 'turn.started';
    at: number;
    playerId: PlayerId;
    turnNumber: number;
  }> = TURN_STARTED_LOG,
) {
  return buildState({ players, currentPlayerIndex: currentIndex, log });
}

function ask(targetId: PlayerId, rank: Rank) {
  return { type: 'ask' as const, targetId, rank };
}

describe('applyAsk', () => {
  it('transfer semua kartu rank dari target ke asker', () => {
    const state = askState(0, [
      makeInGame('p0'),
      makeInGame('p1', [cardId('A', 'spades'), cardId('A', 'hearts'), cardId('K', 'clubs')]),
    ]);
    const next = applyAsk(state, ask(asPlayerId('p1'), 'A'), asPlayerId('p0'), 500);
    expect(next.players[0]?.hand).toEqual([cardId('A', 'spades'), cardId('A', 'hearts')]);
    expect(next.players[0]?.handCount).toBe(2);
    expect(next.players[1]?.hand).toEqual([cardId('K', 'clubs')]);
    expect(next.players[1]?.handCount).toBe(1);
  });

  it('append event ask.made dan card.transferred', () => {
    const state = askState(0, [makeInGame('p0'), makeInGame('p1', [cardId('A', 'spades')])]);
    const next = applyAsk(state, ask(asPlayerId('p1'), 'A'), asPlayerId('p0'), 777);
    const types = next.log.map((e) => e.type);
    expect(types).toContain('ask.made');
    expect(types).toContain('card.transferred');
    const transferred = next.log.find((e) => e.type === 'card.transferred');
    if (transferred?.type === 'card.transferred') {
      expect(transferred.cardIds).toEqual([cardId('A', 'spades')]);
      expect(transferred.fromId).toBe(asPlayerId('p1'));
      expect(transferred.toId).toBe(asPlayerId('p0'));
      expect(transferred.at).toBe(777);
    }
  });

  it('target tidak punya rank → phase bluff_window + BluffWindow aktif', () => {
    const state = askState(0, [makeInGame('p0'), makeInGame('p1', [cardId('K', 'clubs')])]);
    const next = applyAsk(state, ask(asPlayerId('p1'), 'A'), asPlayerId('p0'), 1000);
    expect(next.phase).toBe('bluff_window');
    expect(next.bluffWindow).not.toBeNull();
    expect(next.bluffWindow?.accuserId).toBe(asPlayerId('p0'));
    expect(next.bluffWindow?.accusedId).toBe(asPlayerId('p1'));
    expect(next.bluffWindow?.rank).toBe('A');
    expect(next.bluffWindow?.openedAt).toBe(1000);
    expect(next.bluffWindow?.expiresAt).toBe(1000 + DEFAULT_BLUFF_WINDOW_MS);
    const types = next.log.map((e) => e.type);
    expect(types).toContain('ask.made');
    expect(types).not.toContain('card.transferred');
  });

  it('target tidak punya → transfer count 0 (hand tidak berubah)', () => {
    const state = askState(0, [
      makeInGame('p0', [cardId('Q', 'spades')]),
      makeInGame('p1', [cardId('K', 'clubs')]),
    ]);
    const next = applyAsk(state, ask(asPlayerId('p1'), 'A'), asPlayerId('p0'), 1000);
    expect(next.players[0]?.hand).toEqual([cardId('Q', 'spades')]);
    expect(next.players[1]?.hand).toEqual([cardId('K', 'clubs')]);
  });

  it('target = self → throw', () => {
    const state = askState(0);
    const action = ask(asPlayerId('p0'), 'A');
    expect(() => applyAsk(state, action, asPlayerId('p0'), 500)).toThrow(/diri sendiri/);
  });

  it('rank bukan rank valid → throw', () => {
    const state = askState(0);
    const action = {
      type: 'ask' as const,
      targetId: asPlayerId('p1'),
      rank: 'NOT-A-RANK' as unknown as Rank,
    };
    expect(() => applyAsk(state, action, asPlayerId('p0'), 500)).toThrow(/rank tidak valid/);
  });

  it('bukan giliran pemain ini → throw', () => {
    const state = askState(
      1,
      [makeInGame('p0'), makeInGame('p1'), makeInGame('p2')],
      [
        ...TURN_STARTED_LOG,
        { type: 'turn.started' as const, at: 1, playerId: 'p1' as PlayerId, turnNumber: 2 },
      ],
    );
    const action = ask(asPlayerId('p2'), 'A');
    expect(() => applyAsk(state, action, asPlayerId('p0'), 500)).toThrow(/bukan giliran/);
  });

  it('phase bukan turn → throw', () => {
    const state = buildState({ players: [makeInGame('p0'), makeInGame('p1')], phase: 'lobby' });
    expect(() => applyAsk(state, ask(asPlayerId('p1'), 'A'), asPlayerId('p0'), 500)).toThrow(
      /phase harus 'turn'/,
    );
  });

  it('target tidak ada di game → throw', () => {
    const state = askState(0);
    expect(() => applyAsk(state, ask(asPlayerId('ghost'), 'A'), asPlayerId('p0'), 500)).toThrow(
      /tidak ditemukan/,
    );
  });

  it('quartet formed setelah transfer (3 + 1 = 4)', () => {
    const state = askState(0, [
      makeInGame('p0', [cardId('A', 'spades'), cardId('A', 'hearts'), cardId('A', 'diamonds')]),
      makeInGame('p1', [cardId('A', 'clubs')]),
    ]);
    const next = applyAsk(state, ask(asPlayerId('p1'), 'A'), asPlayerId('p0'), 500);
    const p0 = next.players[0]!;
    expect(p0.hand).toHaveLength(0);
    expect(p0.quartets).toEqual(['A']);
    expect(next.quartets).toHaveLength(1);
    expect(next.quartets[0]).toMatchObject({
      rank: 'A',
      ownerId: asPlayerId('p0'),
      id: 'quartet-A-p0',
      formedAtTurn: 1,
    });
    const types = next.log.map((e) => e.type);
    expect(types).toContain('quartet.formed');
  });

  it('transfer 2 kartu + 2 kartu milik asker → quartet formed dan hand kosong', () => {
    const state = askState(0, [
      makeInGame('p0', [cardId('K', 'spades'), cardId('K', 'hearts')]),
      makeInGame('p1', [cardId('K', 'diamonds'), cardId('K', 'clubs')]),
    ]);
    const next = applyAsk(state, ask(asPlayerId('p1'), 'K'), asPlayerId('p0'), 500);
    expect(next.players[0]?.quartets).toEqual(['K']);
    expect(next.players[0]?.hand).toHaveLength(0);
    expect(next.quartets).toHaveLength(1);
  });

  it('asker boleh lanjut bertanya: turn TIDAK pindah saat transfer sukses', () => {
    const state = askState(0, [makeInGame('p0'), makeInGame('p1', [cardId('A', 'spades')])]);
    const next = applyAsk(state, ask(asPlayerId('p1'), 'A'), asPlayerId('p0'), 500);
    expect(next.phase).toBe('turn');
    expect(next.currentPlayerIndex).toBe(0);
    // jumlah turn.started/passed tidak bertambah (asker lanjut di turn yang sama)
    const turnStartedCount = next.log.filter((e) => e.type === 'turn.started').length;
    const passedCount = next.log.filter((e) => e.type === 'turn.passed').length;
    expect(turnStartedCount).toBe(1); // hanya dari TURN_STARTED_LOG awal
    expect(passedCount).toBe(0);
  });

  it('bump version di setiap aksi', () => {
    const state = askState(0, [makeInGame('p0'), makeInGame('p1', [cardId('A', 'spades')])]);
    const next = applyAsk(state, ask(asPlayerId('p1'), 'A'), asPlayerId('p0'), 500);
    expect(next.version).toBe(state.version + 1);
  });

  it('transfer banyak kartu sekaligus kalau target punya > 1 kartu rank tsb', () => {
    const state = askState(0, [
      makeInGame('p0'),
      makeInGame('p1', [
        cardId('Q', 'spades'),
        cardId('Q', 'hearts'),
        cardId('Q', 'diamonds'),
        cardId('2', 'clubs'),
      ]),
    ]);
    const next = applyAsk(state, ask(asPlayerId('p1'), 'Q'), asPlayerId('p0'), 500);
    expect(next.players[0]?.hand).toHaveLength(3);
    expect(next.players[1]?.hand).toEqual([cardId('2', 'clubs')]);
  });
});
