import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { RedactedGameState } from '@quartet/shared';
import { registerSinglePlayerRoutes } from '../http/routes/single-player.js';
import { gameRegistry } from '../game/GameRegistry.js';

interface CreateResponse {
  gameId: string;
  state: RedactedGameState;
  yourHand: string[];
  yourPlayerId: string;
}

function botIdOf(state: RedactedGameState): string {
  const bot = state.players.find((p) => p.isBot);
  if (bot === undefined) throw new Error('bot missing from response state');
  return bot.id;
}

/**
 * Seed RNG gameRegistry dikontrol via Math.random stub supaya tiap game punya
 * deal deterministik (seed = 999). Seed 999 → human mulai duluan, game belum
 * over saat create, dan selesai dalam 3 pass (verifikasi via probe).
 */
const FIXED_SEED = 999;
const SEED_MOCK = FIXED_SEED / 2147483647;

describe('single-player REST routes', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    gameRegistry.clear();
    vi.spyOn(Math, 'random').mockReturnValue(SEED_MOCK);
    app = Fastify();
    registerSinglePlayerRoutes(app);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('creates a game with valid input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer', difficulty: 'easy' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as CreateResponse;
    expect(body.gameId).toBeDefined();
    expect(body.yourPlayerId).toBeDefined();
    expect(body.state.phase).toBe('turn');
    expect(body.state.players).toHaveLength(2);
    expect(body.state.players.filter((p) => p.isBot)).toHaveLength(1);
    expect(body.yourHand).toHaveLength(26);
    expect(body.state.players.find((p) => p.id === body.yourPlayerId)?.isBot).toBe(false);
  });

  it('rejects a name that is too short', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'X' },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe('name_invalid');
  });

  it('rejects a blocked name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'admin' },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe('name_invalid');
  });

  it('rejects an unsupported difficulty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer', difficulty: 'impossible' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns a snapshot for an existing game', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer' },
    });
    const { gameId } = create.json() as CreateResponse;

    const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as CreateResponse;
    expect(body.yourHand).toHaveLength(26);
    expect(body.yourPlayerId).toBeDefined();
  });

  it('returns 404 for a non-existent game', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/games/does-not-exist' });
    expect(res.statusCode).toBe(404);
  });

  it('applies an ask action and advances the game version', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer' },
    });
    const body = create.json() as CreateResponse;
    const botId = botIdOf(body.state);
    const rank = body.yourHand[0]!.split('-')[0]!;

    const res = await app.inject({
      method: 'POST',
      url: `/api/games/${body.gameId}/action`,
      payload: { type: 'ask', targetId: botId, rank },
    });

    expect(res.statusCode).toBe(200);
    const after = res.json() as CreateResponse;
    expect(after.state.version).toBeGreaterThan(body.state.version);
  });

  it('rejects an action with an unknown type', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer' },
    });
    const { gameId } = create.json() as CreateResponse;

    const res = await app.inject({
      method: 'POST',
      url: `/api/games/${gameId}/action`,
      payload: { type: 'teleport' },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe('invalid_action');
  });

  it('rejects an ask action without a valid rank', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer' },
    });
    const { gameId } = create.json() as CreateResponse;

    const res = await app.inject({
      method: 'POST',
      url: `/api/games/${gameId}/action`,
      payload: { type: 'ask', targetId: 'somebody', rank: 'X' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects bluff.call when there is no active window', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer' },
    });
    const body = create.json() as CreateResponse;

    const res = await app.inject({
      method: 'POST',
      url: `/api/games/${body.gameId}/action`,
      payload: { type: 'bluff.call', accusedId: botIdOf(body.state) },
    });

    expect(res.statusCode).toBe(400);
  });

  it('applies a pass action and returns to a human turn', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer' },
    });
    const body = create.json() as CreateResponse;

    const res = await app.inject({
      method: 'POST',
      url: `/api/games/${body.gameId}/action`,
      payload: { type: 'pass' },
    });

    expect(res.statusCode).toBe(200);
    const after = res.json() as CreateResponse;
    expect(after.state.version).toBeGreaterThan(body.state.version);
    // Bot loop sudah jalan → player saat ini = human.
    const current = after.state.players[after.state.currentPlayerIndex];
    expect(current?.id).toBe(after.yourPlayerId);
  });

  it('returns 404 when acting on a non-existent game', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/games/nope/action',
      payload: { type: 'pass' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('deletes a game then returns 404 on subsequent reads', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer' },
    });
    const { gameId } = create.json() as CreateResponse;

    const del = await app.inject({ method: 'DELETE', url: `/api/games/${gameId}` });
    expect(del.statusCode).toBe(204);

    const get = await app.inject({ method: 'GET', url: `/api/games/${gameId}` });
    expect(get.statusCode).toBe(404);
  });

  it('plays a full game to completion via REST and then rejects actions', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/games/single',
      payload: { name: 'TestPlayer' },
    });
    const body = create.json() as CreateResponse;
    const url = `/api/games/${body.gameId}/action`;

    let state = body.state;
    let iterations = 0;
    while (state.phase !== 'game_over' && iterations < 500) {
      const res = await app.inject({
        method: 'POST',
        url,
        payload: { type: 'pass' },
      });
      expect(res.statusCode).toBe(200);
      state = (res.json() as CreateResponse).state;
      iterations++;
    }

    expect(state.phase).toBe('game_over');
    expect(iterations).toBeGreaterThan(0);
    expect(state.lastEvents.some((e) => e.type === 'game.over')).toBe(true);

    const blocked = await app.inject({ method: 'POST', url, payload: { type: 'pass' } });
    expect(blocked.statusCode).toBe(400);
    expect((blocked.json() as { error: string }).error).toBe('invalid_action');
  });
});
