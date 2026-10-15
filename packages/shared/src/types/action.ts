import type { PlayerId } from './ids.js';
import type { Rank } from '../constants.js';

/**
 * Aksi yang dikirim player ke server via WS.
 * Server validate setiap aksi; invalid → ditolak dengan error event.
 */
export type PlayerAction =
  | { readonly type: 'ask'; readonly targetId: PlayerId; readonly rank: Rank }
  | { readonly type: 'bluff.call'; readonly accusedId: PlayerId } // tuduh bohong dalam 5 detik window
  | { readonly type: 'pass' }; // skip giliran (setelah jawab "tidak punya")

export type ActionType = PlayerAction['type'];
export type ActionByType<T extends ActionType> = Extract<PlayerAction, { type: T }>;
