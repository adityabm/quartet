import type { FastifyInstance } from 'fastify';
import type { PlayerAction } from '@quartet/shared';
import { asGameId, asPlayerId, isValidPlayerName, isValidRank } from '@quartet/shared';
import { gameRegistry } from '../../game/GameRegistry.js';

const SUPPORTED_DIFFICULTIES = ['easy'] as const;
type SupportedDifficulty = (typeof SUPPORTED_DIFFICULTIES)[number];

interface CreateGameBody {
  name?: string;
  difficulty?: string;
}

interface ActionRequestBody {
  type?: string;
  targetId?: string;
  rank?: string;
  accusedId?: string;
}

/**
 * REST endpoints single-player (Phase 2).
 * Semua response error mengikuti bentuk ErrorCode shared:
 * `{ error: ErrorCode, message: string }`.
 */
export function registerSinglePlayerRoutes(app: FastifyInstance): void {
  /**
   * POST /api/games/single
   * Body: { name: string, difficulty?: 'easy' }
   * Response 200: { gameId, state, yourHand, yourPlayerId }
   */
  app.post('/api/games/single', async (req, reply) => {
    const body = req.body as CreateGameBody | undefined;

    if (typeof body?.name !== 'string' || !isValidPlayerName(body.name)) {
      return reply.code(400).send({
        error: 'name_invalid',
        message: 'Nama harus 2-20 karakter',
      });
    }

    const difficulty = body.difficulty ?? 'easy';
    if (!(SUPPORTED_DIFFICULTIES as readonly string[]).includes(difficulty)) {
      return reply.code(400).send({
        error: 'invalid_action',
        message: `Difficulty belum didukung. Available: ${SUPPORTED_DIFFICULTIES.join(', ')}`,
      });
    }

    const { session, gameId } = gameRegistry.create({
      humanPlayerName: body.name,
      botDifficulty: difficulty as SupportedDifficulty,
    });

    const snapshot = session.snapshot();
    return reply.code(200).send({
      gameId,
      state: snapshot.state,
      yourHand: snapshot.yourHand,
      yourPlayerId: session.humanPlayerId,
    });
  });

  /**
   * GET /api/games/:gameId
   * Response 200: { state, yourHand, yourPlayerId }
   */
  app.get<{ Params: { gameId: string } }>('/api/games/:gameId', async (req, reply) => {
    const session = gameRegistry.get(asGameId(req.params.gameId));

    if (session === undefined) {
      return reply.code(404).send({
        error: 'room_not_found',
        message: 'Game tidak ditemukan',
      });
    }

    const snapshot = session.snapshot();
    return reply.code(200).send({
      state: snapshot.state,
      yourHand: snapshot.yourHand,
      yourPlayerId: session.humanPlayerId,
    });
  });

  /**
   * POST /api/games/:gameId/action
   * Body: PlayerAction
   *   - { type: 'ask', targetId, rank }
   *   - { type: 'bluff.call', accusedId }
   *   - { type: 'pass' }
   * Response 200: { state, yourHand, yourPlayerId }
   * Response 400: invalid action / not your turn / game over.
   */
  app.post<{ Params: { gameId: string } }>('/api/games/:gameId/action', async (req, reply) => {
    const session = gameRegistry.get(asGameId(req.params.gameId));

    if (session === undefined) {
      return reply.code(404).send({
        error: 'room_not_found',
        message: 'Game tidak ditemukan',
      });
    }

    const body = req.body as ActionRequestBody | undefined;

    // Build PlayerAction dari body — semua field divalidasi di boundary.
    let action: PlayerAction;
    if (body?.type === 'ask') {
      if (
        typeof body.targetId !== 'string' ||
        typeof body.rank !== 'string' ||
        !isValidRank(body.rank)
      ) {
        return reply.code(400).send({
          error: 'invalid_action',
          message: 'Action ask butuh targetId dan rank valid',
        });
      }
      action = { type: 'ask', targetId: asPlayerId(body.targetId), rank: body.rank };
    } else if (body?.type === 'bluff.call') {
      if (typeof body.accusedId !== 'string') {
        return reply.code(400).send({
          error: 'invalid_action',
          message: 'Action bluff.call butuh accusedId valid',
        });
      }
      action = { type: 'bluff.call', accusedId: asPlayerId(body.accusedId) };
    } else if (body?.type === 'pass') {
      action = { type: 'pass' };
    } else {
      return reply.code(400).send({
        error: 'invalid_action',
        message: 'Type action tidak valid',
      });
    }

    try {
      const snapshot = await session.applyHumanAction(action);
      return reply.code(200).send({
        state: snapshot.state,
        yourHand: snapshot.yourHand,
        yourPlayerId: session.humanPlayerId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.code(400).send({
        error: 'invalid_action',
        message,
      });
    }
  });

  /**
   * DELETE /api/games/:gameId (leave)
   * Response 204
   */
  app.delete<{ Params: { gameId: string } }>('/api/games/:gameId', async (req, reply) => {
    gameRegistry.delete(asGameId(req.params.gameId));
    return reply.code(204).send();
  });
}
