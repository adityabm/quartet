import { CARDS_PER_QUARTET } from '../constants.js';
import type { CardId, Rank } from '../constants.js';

/**
 * Ekstrak rank dari CardId ("<rank>-<suit>"). Untuk input malformed (tanpa
 * separator) treat seluruh id sebagai rank — seharusnya tidak terjadi karena
 * CardId sudah divalidasi di boundary, tapi helper ini tetap total function.
 */
export function rankOfCardId(cardId: CardId): Rank {
  const dashIdx = cardId.indexOf('-');
  if (dashIdx === -1) {
    return cardId as Rank;
  }
  return cardId.slice(0, dashIdx) as Rank;
}

/**
 * Pure helper: deteksi apakah hand mengandung quartet untuk rank tertentu.
 * Return kartu-kartu rank tsb kalau ya (length === CARDS_PER_QUARTET),
 * selain itu array kosong.
 */
export function findQuartetInHand(hand: ReadonlyArray<CardId>, rank: Rank): ReadonlyArray<CardId> {
  const matches = hand.filter((cardId) => cardId.startsWith(`${rank}-`));
  return matches.length === CARDS_PER_QUARTET ? matches : [];
}

export interface QuartetInHand {
  readonly rank: Rank;
  readonly cardIds: ReadonlyArray<CardId>;
}

/**
 * Pure helper: deteksi SEMUA quartet yang ada di hand (untuk state.sync).
 * Group by rank; hanya rank dengan count === CARDS_PER_QUARTET yang di-return.
 */
export function findAllQuartetsInHand(hand: ReadonlyArray<CardId>): ReadonlyArray<QuartetInHand> {
  const groups = new Map<Rank, CardId[]>();
  for (const cardId of hand) {
    const rank = rankOfCardId(cardId);
    const existing = groups.get(rank);
    if (existing === undefined) {
      groups.set(rank, [cardId]);
    } else {
      existing.push(cardId);
    }
  }
  const quartets: Array<{ rank: Rank; cardIds: CardId[] }> = [];
  for (const [rank, cardIds] of groups) {
    if (cardIds.length === CARDS_PER_QUARTET) {
      quartets.push({ rank, cardIds });
    }
  }
  return quartets;
}
