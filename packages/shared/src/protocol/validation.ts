import { RANKS, MAX_NAME_LENGTH, MIN_NAME_LENGTH, ROOM_CODE_LENGTH } from '../constants.js';
import type { Rank, CardId } from '../constants.js';

export function isValidRank(s: string): s is Rank {
  return (RANKS as readonly string[]).includes(s);
}

export function isValidCardId(s: string): s is CardId {
  // format: "<rank>-<suit>" — basic structural check
  const parts = s.split('-');
  if (parts.length !== 2) return false;
  const rank = parts[0];
  const suit = parts[1];
  if (rank === undefined || suit === undefined) return false;
  if (!(RANKS as readonly string[]).includes(rank)) return false;
  if (!['spades', 'hearts', 'diamonds', 'clubs'].includes(suit)) return false;
  return true;
}

export function isValidPlayerName(s: string): boolean {
  if (typeof s !== 'string') return false;
  const trimmed = s.trim();
  if (trimmed.length < MIN_NAME_LENGTH || trimmed.length > MAX_NAME_LENGTH) return false;
  // blocklist minimal — full filter server-side
  const blocked = ['admin', 'system', 'bot', 'quartet'];
  return !blocked.includes(trimmed.toLowerCase());
}

export function isValidRoomCode(s: string): boolean {
  if (typeof s !== 'string') return false;
  if (s.length !== ROOM_CODE_LENGTH) return false;
  return /^[A-Z0-9]+$/.test(s);
}
