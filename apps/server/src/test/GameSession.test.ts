import { describe, expect, it } from 'vitest';
import { RANKS, SUITS, asGameId } from '@quartet/shared';
import type { PlayerAction, PlayerId, Rank } from '@quartet/shared';
import { GameSession } from '../game/GameSession.js';

const NOW = () => 1_000_000;

function makeSession(name: string, seed: number, gameId: string): GameSession {
  return new GameSession(
    { humanPlayerName: name, botDifficulty: 'easy', now: NOW },
    asGameId(gameId),
    seed,
  );
}

function botIdOf(session: GameSession): PlayerId {
  const bot = session.snapshot().state.players.find((p) => p.isBot);
  if (bot === undefined) throw new Error('bot player missing from snapshot');
  return bot.id as PlayerId;
}

/** Deck 52 kartu — digunakan untuk menghitung hand bot (2-player: deck - hand human). */
function fullDeck(): string[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}-${suit}`));
}

function botHand(yourHand: readonly string[]): string[] {
  return fullDeck().filter((card) => !yourHand.includes(card));
}

function rankOf(cardId: string): string {
  return cardId.split('-')[0]!;
}

describe('GameSession', () => {
  it('initializes with a full deal (2 players, 26 cards each)', () => {
    const session = makeSession('Test', 999, 'game-1');
    const snapshot = session.snapshot();

    expect(snapshot.state.phase).toBe('turn');
    expect(snapshot.state.players).toHaveLength(2);
    expect(snapshot.yourHand).toHaveLength(26);
    expect(snapshot.state.stockCount).toBe(0); // 52 kartu habis dibagi 2 pemain
  });

  it('rests on the human turn (or game over) after construction', () => {
    for (const seed of [1, 2, 3, 4, 5, 12345, 54321, 99999]) {
      const session = makeSession('Test', seed, `game-seed-${seed}`);
      const snapshot = session.snapshot();
      if (snapshot.state.phase === 'game_over') {
        // Bot bisa langsung menghabiskan game di sesi pertama (jarang,
        // seed-dependent) → sesi finalisasi, bukan deadlock.
        continue;
      }
      const current = snapshot.state.players[snapshot.state.currentPlayerIndex];
      expect(current?.id).toBe(session.humanPlayerId);
    }
  });

  it('exposes player metadata (name/isBot) in the snapshot', () => {
    const session = makeSession('Andi', 12345, 'game-meta');
    const snapshot = session.snapshot();

    const human = snapshot.state.players.find((p) => p.id === session.humanPlayerId);
    const bot = snapshot.state.players.find((p) => p.id !== session.humanPlayerId);

    expect(human).toMatchObject({ name: 'Andi', isBot: false });
    expect(bot).toMatchObject({ name: 'Bot Cerdik', isBot: true });
  });

  it('is deterministic for the same seed and name', () => {
    const a = makeSession('Test', 4242, 'game-a').snapshot();
    const b = makeSession('Test', 4242, 'game-b').snapshot();
    expect([...a.yourHand].sort()).toEqual([...b.yourHand].sort());
  });

  it('deals differently for a different seed', () => {
    const a = makeSession('Test', 1, 'game-a').snapshot();
    const b = makeSession('Test', 2, 'game-b').snapshot();
    expect([...a.yourHand].sort()).not.toEqual([...b.yourHand].sort());
  });

  it('advances the game after a pass action (bot plays its turn)', async () => {
    // Seed 999: human mulai duluan, dan setelah 1 pass game belum selesai.
    const session = makeSession('Test', 999, 'game-pass');
    const before = session.snapshot();

    const after = await session.applyHumanAction({ type: 'pass' });

    expect(after.state.phase).toBe('turn');
    expect(after.state.version).toBeGreaterThan(before.state.version);
    // Bot loop sudah jalan → giliran kembali ke human.
    const current = after.state.players[after.state.currentPlayerIndex];
    expect(current?.id).toBe(session.humanPlayerId);
  });

  it('applies an ask action and keeps the game progressing', async () => {
    const session = makeSession('Test', 999, 'game-ask');
    const before = session.snapshot();
    const botId = botIdOf(session);
    const firstCard = before.yourHand[0];
    if (firstCard === undefined) throw new Error('hand kosong (should not happen)');
    const rank = rankOf(firstCard) as Rank;

    const after = await session.applyHumanAction({
      type: 'ask',
      targetId: botId,
      rank,
    });

    expect(after.state.version).toBeGreaterThan(before.state.version);
    // Ask selalu mengubah versi; kalau bot tidak punya rank tsb →
    // window terbuka dengan accuser = human (bukan deadlock).
    if (after.state.phase === 'bluff_window' && after.state.bluffWindow !== null) {
      expect(after.state.bluffWindow.accuserId).toBe(session.humanPlayerId);
    }
  });

  it('runs a full bluff window cycle: ask-miss → window → bluff.call → resolve', async () => {
    // Cari seed deterministik di mana human pegang '7', bot TIDAK punya '7',
    // dan game belum selesai saat create (human masih dapat bermain).
    let seedFor = -1;
    for (let seed = 1; seed < 500; seed++) {
      const session = makeSession('Test', seed, `probe-${seed}`);
      const probe = session.snapshot();
      if (probe.state.phase !== 'turn') continue;
      const humanHasSeven = probe.yourHand.some((card) => rankOf(card) === '7');
      const botHasSeven = botHand(probe.yourHand).some((card) => rankOf(card) === '7');
      if (humanHasSeven && !botHasSeven) {
        seedFor = seed;
        break;
      }
    }
    expect(seedFor).toBeGreaterThan(0);

    const session = makeSession('Test', seedFor, 'game-window');
    const botId = botIdOf(session);

    const afterAsk = await session.applyHumanAction({
      type: 'ask',
      targetId: botId,
      rank: '7',
    });
    expect(afterAsk.state.phase).toBe('bluff_window');
    expect(afterAsk.state.bluffWindow?.accuserId).toBe(session.humanPlayerId);
    expect(afterAsk.state.bluffWindow?.accusedId).toBe(botId);

    // Human menuduh → resolve (tuduhan salah karena bot memang tidak punya).
    const afterCall = await session.applyHumanAction({
      type: 'bluff.call',
      accusedId: botId,
    });
    expect(afterCall.state.phase).toBe('turn');
    expect(afterCall.state.bluffWindow).toBeNull();
    expect(afterCall.state.version).toBeGreaterThan(afterAsk.state.version);
    const resolved = afterCall.state.lastEvents.find((e) => e.type === 'bluff.resolved');
    expect(resolved?.correct).toBe(false);
  });

  it('rejects bluff.call when there is no active window', async () => {
    const session = makeSession('Test', 111, 'game-bluff-none');
    const action: PlayerAction = { type: 'bluff.call', accusedId: botIdOf(session) };
    await expect(session.applyHumanAction(action)).rejects.toThrow(/bluff\.call/);
  });

  it('rejects an ask with an invalid rank', async () => {
    const session = makeSession('Test', 222, 'game-bad-rank');
    const action = {
      type: 'ask',
      targetId: botIdOf(session),
      rank: 'X',
    } as unknown as PlayerAction;
    await expect(session.applyHumanAction(action)).rejects.toThrow(/rank tidak valid/);
  });

  it('finishes the game and then rejects further actions', async () => {
    const session = makeSession('Test', 1, 'game-full');
    let snapshot = session.snapshot();
    let iterations = 0;

    // Human selalu pass → giliran bot → bot mengumpulkan kartu sampai game over.
    while (snapshot.state.phase !== 'game_over' && iterations < 500) {
      snapshot = await session.applyHumanAction({ type: 'pass' });
      iterations++;
    }

    expect(snapshot.state.phase).toBe('game_over');
    expect(iterations).toBeGreaterThan(0);
    expect(iterations).toBeLessThan(500);
    expect(snapshot.state.lastEvents.some((e) => e.type === 'game.over')).toBe(true);

    await expect(session.applyHumanAction({ type: 'pass' })).rejects.toThrow('Game sudah selesai');
  });
});
