import { describe, expect, it } from 'vitest';
import { asGameId, asPlayerId, createSeededRng, RANKS } from '@quartet/shared';
import type { GameState, PlayerId, PlayerInGame, Rank } from '@quartet/shared';
import { BotRunner } from '../bot/BotRunner.js';

const humanId = asPlayerId('human-1');
const botId = asPlayerId('bot-1');

function makePlayer(id: PlayerId, hand: string[], quartets: Rank[] = []): PlayerInGame {
  return { id, hand, handCount: hand.length, quartets };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base: GameState = {
    gameId: asGameId('test-game'),
    phase: 'turn',
    players: [makePlayer(humanId, []), makePlayer(botId, [])],
    currentPlayerIndex: 0,
    stock: [],
    stockCount: 0,
    quartets: [],
    bluffWindow: null,
    log: [{ type: 'game.created', at: 1, seed: 1 }],
    seed: 1,
    turnStartedAt: 1,
    version: 1,
  };
  return { ...base, ...overrides };
}

const runner = new BotRunner({
  now: () => 1000,
  createRng: (_state: GameState) => createSeededRng(42),
  isBot: (playerId) => playerId === botId,
});

describe('BotRunner.runIfBotTurn', () => {
  it('returns state unchanged when current player is not a bot', () => {
    const state = makeState({ currentPlayerIndex: 0 }); // human
    const result = runner.runIfBotTurn(state);
    expect(result).toBe(state);
  });

  it('plays at least one action when a bot is current and ends with a human turn', () => {
    // Human pegang 13 rank berbeda (semua rank), bot 1 kartu.
    // Bot akan terus bertanya sampai miss → bluff window bot → skip → giliran human.
    const state = makeState({
      currentPlayerIndex: 1,
      players: [
        makePlayer(humanId, [
          'A-spades',
          '2-hearts',
          '3-diamonds',
          '4-clubs',
          '5-spades',
          '6-hearts',
          '7-diamonds',
          '8-clubs',
          '9-spades',
          '10-hearts',
          'J-diamonds',
          'Q-clubs',
          'K-spades',
        ]),
        makePlayer(botId, ['A-hearts']),
      ],
    });

    const result = runner.runIfBotTurn(state);

    expect(result.phase).toBe('turn');
    expect(result.bluffWindow).toBeNull();
    // Loop harus berhenti di giliran human.
    const current = result.players[result.currentPlayerIndex];
    expect(current?.id).toBe(humanId);
    expect(result.version).toBeGreaterThan(state.version);
    const newEvents = result.log.slice(state.log.length);
    expect(newEvents.length).toBeGreaterThan(0);
  });

  it('auto-skips a bluff window where the bot is the accuser', () => {
    const state = makeState({
      phase: 'bluff_window',
      currentPlayerIndex: 1, // bot
      bluffWindow: {
        accuserId: botId,
        accusedId: humanId,
        rank: '7',
        openedAt: 1,
        expiresAt: 6001,
      },
    });

    const result = runner.runIfBotTurn(state);

    expect(result.phase).toBe('turn');
    expect(result.bluffWindow).toBeNull();
    const current = result.players[result.currentPlayerIndex];
    expect(current?.id).toBe(humanId);
    const lastEvents = result.log.slice(-2);
    expect(lastEvents[0]?.type).toBe('turn.passed');
    expect(lastEvents[1]?.type).toBe('turn.started');
  });

  it('leaves a bluff window untouched when the accuser is the human', () => {
    const state = makeState({
      phase: 'bluff_window',
      currentPlayerIndex: 1, // bot current, tapi accuser = human → tunggu
      bluffWindow: {
        accuserId: humanId,
        accusedId: botId,
        rank: '7',
        openedAt: 1,
        expiresAt: 6001,
      },
    });

    const result = runner.runIfBotTurn(state);
    expect(result).toBe(state);
  });

  it('returns state unchanged when the bot has no valid actions (game effectively over)', () => {
    const state = makeState({
      currentPlayerIndex: 1,
      players: [makePlayer(humanId, ['A-spades']), makePlayer(botId, ['K-clubs'], [...RANKS])],
    });

    const result = runner.runIfBotTurn(state);
    expect(result).toBe(state);
  });

  it('does not run when phase is game_over even if a bot is current', () => {
    const state = makeState({ phase: 'game_over', currentPlayerIndex: 1 });
    const result = runner.runIfBotTurn(state);
    expect(result).toBe(state);
  });
});
