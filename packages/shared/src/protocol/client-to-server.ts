import type { PlayerId, RoomCode } from '../types/index.js';
import type { Rank } from '../constants.js';

/**
 * Event dari client → server via WS.
 * Semua event divalidasi ulang di server (klien dianggap untrusted).
 */
export type ClientToServer =
  | { readonly type: 'room.create'; readonly hostName: string }
  | { readonly type: 'room.join'; readonly code: RoomCode; readonly name: string }
  | { readonly type: 'room.leave' }
  | { readonly type: 'room.start' } // host only
  | { readonly type: 'room.kick'; readonly targetId: PlayerId } // host only
  | { readonly type: 'game.ask'; readonly targetId: PlayerId; readonly rank: Rank }
  | { readonly type: 'game.bluff.call' }
  | { readonly type: 'game.pass' }
  | { readonly type: 'game.rematch' } // request main ulang
  | { readonly type: 'chat.text'; readonly text: string }; // rate-limited, sanitized

export type ClientEventType = ClientToServer['type'];
