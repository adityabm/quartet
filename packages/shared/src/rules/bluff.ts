import { SUITS } from '../constants.js';
import type { CardId } from '../constants.js';
import type { BluffPenalty, GameEvent, GameState } from '../types/game-state.js';
import { findPlayer } from './players.js';

/**
 * Terapkan `bluff.call` saat ada BluffWindow aktif (window diambil dari state,
 * bukan dari action — dispatcher yang memvalidasi accusedId cocok).
 *
 * Resolve:
 * - Kalau accused PUNYA rank tsb di tangannya → tuduhan BENAR.
 *   Penalty: 1 kartu random rank tsb dari tangan accused pindah ke accuser.
 * - Kalau accused TIDAK PUNYA → tuduhan SALAH.
 *   Penalty: accuser kehilangan 1 quartet (random). 4 kartunya dikembalikan ke
 *   tangan accuser (konservasi kartu: total kartu tetap 52).
 *   Kalau accuser tidak punya quartet → penalty = { kind: 'none' }.
 *
 * Append `bluff.resolved` (+ `card.transferred` kalau ada transfer).
 * Phase kembali ke 'turn'; currentPlayerIndex TIDAK berubah (accuser boleh
 * lanjut bertanya atau pass).
 *
 * Catatan signature: `now` ditambahkan (vs brief) karena event butuh timestamp
 * dan rules harus pure (tanpa Date.now()).
 */
export function resolveBluff(state: GameState, rng: () => number, now: number): GameState {
  const window = state.bluffWindow;
  if (window === null) {
    throw new Error('resolveBluff: tidak ada bluff window aktif');
  }

  const accuser = findPlayer(state, window.accuserId);
  const accused = findPlayer(state, window.accusedId);
  const accusedCards = accused.hand.filter((cardId) => cardId.startsWith(`${window.rank}-`));
  const correct = accusedCards.length > 0;

  const log: GameEvent[] = [...state.log];
  let players = state.players;
  let quartets = state.quartets;
  let penalty: BluffPenalty;

  if (correct) {
    const cardId = accusedCards[Math.floor(rng() * accusedCards.length)]!; // length > 0 di branch ini
    penalty = { kind: 'card_transferred', cardId };
    const accusedNewHand = accused.hand.filter((id) => id !== cardId);
    const accuserNewHand = [...accuser.hand, cardId];
    players = state.players.map((player) => {
      if (player.id === window.accusedId) {
        return { ...player, hand: accusedNewHand, handCount: accusedNewHand.length };
      }
      if (player.id === window.accuserId) {
        return { ...player, hand: accuserNewHand, handCount: accuserNewHand.length };
      }
      return player;
    });
    log.push({
      type: 'card.transferred',
      at: now,
      fromId: window.accusedId,
      toId: window.accuserId,
      cardIds: [cardId],
    });
  } else if (accuser.quartets.length > 0) {
    const lostRank = accuser.quartets[Math.floor(rng() * accuser.quartets.length)]!;
    const lostQuartetCards: CardId[] = SUITS.map((suit) => `${lostRank}-${suit}`);
    const accuserNewHand = [...accuser.hand, ...lostQuartetCards];
    const accuserNewQuartets = accuser.quartets.filter((rank) => rank !== lostRank);
    quartets = state.quartets.filter(
      (quartet) => !(quartet.rank === lostRank && quartet.ownerId === window.accuserId),
    );
    players = state.players.map((player) =>
      player.id === window.accuserId
        ? {
            ...player,
            hand: accuserNewHand,
            handCount: accuserNewHand.length,
            quartets: accuserNewQuartets,
          }
        : player,
    );
    penalty = { kind: 'quartet_lost', rank: lostRank };
  } else {
    penalty = { kind: 'none' };
  }

  log.push({
    type: 'bluff.resolved',
    at: now,
    accuserId: window.accuserId,
    accusedId: window.accusedId,
    correct,
    penalty,
  });

  return {
    ...state,
    phase: 'turn',
    bluffWindow: null,
    players,
    quartets,
    turnStartedAt: now,
    log,
    version: state.version + 1,
  };
}
