import type { GameId } from '@quartet/shared';
import { asGameId } from '@quartet/shared';
import { GameSession, type CreateGameParams } from './GameSession.js';

/**
 * In-memory registry gameId → GameSession.
 * Phase 4 akan extend dengan persistence / eviction policy.
 * Hanya menyimpan sesi aktif; game selesai bisa di-delete via DELETE route.
 */
export class GameRegistry {
  private sessions = new Map<GameId, GameSession>();

  create(params: CreateGameParams): { session: GameSession; gameId: GameId; seed: number } {
    const gameId = asGameId(crypto.randomUUID());
    const seed = Math.floor(Math.random() * 0x7fffffff);
    const session = new GameSession(params, gameId, seed);
    this.sessions.set(gameId, session);
    return { session, gameId, seed };
  }

  get(gameId: GameId): GameSession | undefined {
    return this.sessions.get(gameId);
  }

  delete(gameId: GameId): boolean {
    return this.sessions.delete(gameId);
  }

  /**
   * Hapus semua sesi — dipakai test (reset antar test) & cleanup.
   */
  clear(): void {
    this.sessions.clear();
  }
}

// Singleton instance untuk seluruh proses server.
export const gameRegistry = new GameRegistry();
