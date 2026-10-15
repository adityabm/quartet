import type {
  RedactedGameState,
  PlayerInGame,
  PlayerId,
  Room,
  BluffPenalty,
} from '../types/index.js';
import type { ErrorCode } from './errors.js';

/**
 * Event dari server → client via WS.
 * Semua payload sudah di-redact: tidak pernah mengirim hand player lain.
 */
export type ServerToClient =
  // Connection lifecycle
  | { readonly type: 'connected'; readonly playerId: PlayerId; readonly sessionId: string }
  | {
      readonly type: 'error';
      readonly code: ErrorCode;
      readonly message: string;
      readonly recoverable: boolean;
    }
  | { readonly type: 'disconnected'; readonly reason: 'kicked' | 'timeout' | 'room_closed' }

  // Room events
  | {
      readonly type: 'room.snapshot';
      readonly room: Room;
      readonly redacted: RedactedGameState | null;
    }
  | {
      readonly type: 'room.player.joined';
      readonly playerId: PlayerId;
      readonly name: string;
      readonly isBot: boolean;
      readonly seatIndex: number;
    }
  | {
      readonly type: 'room.player.left';
      readonly playerId: PlayerId;
      readonly reason: 'leave' | 'disconnect' | 'kick';
    }
  | { readonly type: 'room.kicked'; readonly byHostId: PlayerId }
  | { readonly type: 'room.started'; readonly gameId: string }

  // Game events
  | {
      readonly type: 'game.snapshot';
      readonly redacted: RedactedGameState;
      readonly yourHand: ReadonlyArray<PlayerInGame['hand'][number]>;
      readonly yourPlayerId: PlayerId;
    }
  | {
      readonly type: 'game.turn.changed';
      readonly playerId: PlayerId;
      readonly turnNumber: number;
      readonly deadlineMs: number | null;
    }
  | {
      readonly type: 'game.card.transferred';
      readonly fromId: PlayerId;
      readonly toId: PlayerId;
      readonly cardIds: ReadonlyArray<string>;
      readonly animationDelayMs: number;
    }
  | { readonly type: 'game.quartet.formed'; readonly playerId: PlayerId; readonly rank: string }
  | {
      readonly type: 'game.bluff.calling';
      readonly accuserId: PlayerId;
      readonly accusedId: PlayerId;
      readonly rank: string;
      readonly windowMs: number;
    }
  | {
      readonly type: 'game.bluff.resolved';
      readonly correct: boolean;
      readonly penalty: BluffPenalty;
    }
  | {
      readonly type: 'game.turn.passed';
      readonly playerId: PlayerId;
      readonly drewCardId: string | null;
    }
  | {
      readonly type: 'game.over';
      readonly winnerIds: ReadonlyArray<PlayerId>;
      readonly scores: ReadonlyArray<{
        readonly playerId: PlayerId;
        readonly quartetCount: number;
      }>;
      readonly rematchReady: ReadonlyArray<PlayerId>;
    }

  // Chat
  | {
      readonly type: 'chat.message';
      readonly fromId: PlayerId;
      readonly text: string;
      readonly at: number;
    }

  // Heartbeat / sync
  | { readonly type: 'pong'; readonly at: number };

export type ServerEventType = ServerToClient['type'];
