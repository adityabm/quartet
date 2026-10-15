import type { PlayerId } from './ids.js';
import type { Rank, CardId } from '../constants.js';
import type { BotTier } from './bot.js';

export interface Player {
  readonly id: PlayerId;
  readonly name: string; // 2-20 char, sanitized client-side; server treats as untrusted
  readonly isBot: boolean;
  readonly botTier?: BotTier; // present iff isBot
  readonly isConnected: boolean; // false = disconnected (kicked/disconnect timeout)
  readonly joinedAt: number; // epoch ms
}

/**
 * State player yang visible ke player LAIN (bukan dirinya sendiri).
 * TIDAK termasuk isi hand — hanya metadata publik.
 */
export interface PublicPlayerView {
  readonly id: PlayerId;
  readonly name: string;
  readonly handCount: number;
  readonly quartets: ReadonlyArray<Rank>; // rank-rank quartet yang sudah dimiliki
  readonly isConnected: boolean;
  readonly isBot: boolean;
}

/**
 * State player yang visible HANYA untuk player itu sendiri.
 * Termasuk isi hand (full cards).
 */
export interface PrivatePlayerView extends PublicPlayerView {
  readonly hand: ReadonlyArray<CardId>;
}
