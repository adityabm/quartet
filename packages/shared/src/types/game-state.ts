import type { PlayerId, GameId } from './ids.js';
import type { Rank, CardId } from '../constants.js';
import type { GamePhase } from './phase.js';

/**
 * Game state lengkap yang dipegang server.
 * Klien hanya boleh akses via snapshot yang sudah di-redact (lihat RedactedGameState).
 */
export interface GameState {
  readonly gameId: GameId;
  readonly phase: GamePhase;
  readonly players: ReadonlyArray<PlayerInGame>; // urutan kursi
  readonly currentPlayerIndex: number; // idx di players yang sedang giliran
  readonly stock: ReadonlyArray<CardId>; // sisa kartu di tengah (face-down)
  readonly stockCount: number; // cache untuk publik (jangan kirim stock full)
  readonly quartets: ReadonlyArray<Quartet>; // quartet terbuka di tengah meja
  readonly bluffWindow: BluffWindow | null; // null kalau tidak ada window aktif
  readonly log: ReadonlyArray<GameEvent>; // event log untuk replay/UI
  readonly seed: number; // RNG seed (untuk determinism)
  readonly turnStartedAt: number; // epoch ms — untuk turn timeout
  readonly version: number; // monotonic, naik setiap applyAction
}

export interface PlayerInGame {
  readonly id: PlayerId;
  readonly hand: ReadonlyArray<CardId>; // PRIVATE — server-side only
  readonly handCount: number; // publik cache
  readonly quartets: ReadonlyArray<Rank>; // rank quartet yang sudah dimiliki
}

export interface Quartet {
  readonly id: string; // quartet-{rank}-{ownerId}
  readonly rank: Rank;
  readonly ownerId: PlayerId;
  readonly formedAtTurn: number; // turn number saat terbentuk
}

export interface BluffWindow {
  readonly accuserId: PlayerId;
  readonly accusedId: PlayerId;
  readonly rank: Rank; // rank yang ditanyakan saat ini
  readonly openedAt: number; // epoch ms
  readonly expiresAt: number; // epoch ms (openedAt + 5000)
}

/**
 * Game event untuk log (untuk replay & UI timeline).
 */
export type GameEvent =
  | { readonly type: 'game.created'; readonly at: number; readonly seed: number }
  | {
      readonly type: 'game.dealt';
      readonly at: number;
      readonly handCounts: ReadonlyArray<{ readonly playerId: PlayerId; readonly count: number }>;
    }
  | {
      readonly type: 'turn.started';
      readonly at: number;
      readonly playerId: PlayerId;
      readonly turnNumber: number;
    }
  | {
      readonly type: 'ask.made';
      readonly at: number;
      readonly fromId: PlayerId;
      readonly toId: PlayerId;
      readonly rank: Rank;
    }
  | {
      readonly type: 'card.transferred';
      readonly at: number;
      readonly fromId: PlayerId;
      readonly toId: PlayerId;
      readonly cardIds: ReadonlyArray<CardId>;
    }
  | {
      readonly type: 'quartet.formed';
      readonly at: number;
      readonly playerId: PlayerId;
      readonly rank: Rank;
    }
  | {
      readonly type: 'bluff.opened';
      readonly at: number;
      readonly accuserId: PlayerId;
      readonly accusedId: PlayerId;
      readonly expiresAt: number;
    }
  | {
      readonly type: 'bluff.resolved';
      readonly at: number;
      readonly accuserId: PlayerId;
      readonly accusedId: PlayerId;
      readonly correct: boolean;
      readonly penalty: BluffPenalty;
    }
  | {
      readonly type: 'turn.passed';
      readonly at: number;
      readonly playerId: PlayerId;
      readonly drewCardId: CardId | null;
    }
  | {
      readonly type: 'game.over';
      readonly at: number;
      readonly winnerIds: ReadonlyArray<PlayerId>;
      readonly scores: ReadonlyArray<{
        readonly playerId: PlayerId;
        readonly quartetCount: number;
      }>;
    };

export type BluffPenalty =
  | { readonly kind: 'card_transferred'; readonly cardId: CardId }
  | { readonly kind: 'quartet_lost'; readonly rank: Rank }
  | { readonly kind: 'none' };

/**
 * Game state yang boleh dikirim ke klien.
 * Hand player TIDAK ikut — hanya handCount + quartet publik.
 */
export interface RedactedGameState {
  readonly gameId: GameId;
  readonly phase: GamePhase;
  readonly players: ReadonlyArray<RedactedPlayerView>;
  readonly currentPlayerIndex: number;
  readonly stockCount: number;
  readonly quartets: ReadonlyArray<Quartet>;
  readonly bluffWindow: BluffWindow | null;
  readonly lastEvents: ReadonlyArray<GameEvent>; // last N events untuk UI animation
  readonly version: number;
}

export interface RedactedPlayerView {
  readonly id: PlayerId;
  readonly name: string;
  readonly handCount: number;
  readonly quartets: ReadonlyArray<Rank>;
  readonly isConnected: boolean;
  readonly isBot: boolean;
}
