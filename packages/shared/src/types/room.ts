import type { PlayerId, RoomCode, GameId } from './ids.js';

export type RoomStatus = 'waiting' | 'in_game' | 'closed';

export interface Room {
  readonly code: RoomCode;
  readonly hostId: PlayerId;
  readonly status: RoomStatus;
  readonly playerIds: ReadonlyArray<PlayerId>; // urutan duduk (host selalu idx 0?)
  readonly currentGameId: GameId | null;
  readonly createdAt: number;
  readonly lastActivityAt: number;
  readonly expiresAt: number; // epoch ms (createdAt + 30min default)
}
