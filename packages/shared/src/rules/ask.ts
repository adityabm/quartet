import { CARDS_PER_QUARTET, DEFAULT_BLUFF_WINDOW_MS } from '../constants.js';
import { isValidRank } from '../protocol/validation.js';
import type { PlayerAction } from '../types/action.js';
import type { GameEvent, GameState, Quartet } from '../types/game-state.js';
import type { PlayerId } from '../types/ids.js';
import { findPlayer } from './players.js';
import { currentPlayerId, currentTurnNumber } from './turn.js';

type AskAction = Extract<PlayerAction, { type: 'ask' }>;

/**
 * Terapkan aksi `ask` ke state.
 *
 * Alur:
 * 1. Validasi: aksi dari currentPlayer (actorId), target ≠ self, rank valid.
 * 2. Cari kartu rank tsb di tangan target.
 * 3. Kalau ada → transfer SEMUA kartu rank tsb dari target ke asker.
 *    Append `ask.made` + `card.transferred`.
 *    Detect quartet: kalau setelah transfer asker punya >= CARDS_PER_QUARTET
 *    kartu rank tsb → form quartet, append `quartet.formed`, pindahkan kartu
 *    ke state.quartets. Phase tetap 'turn' (asker boleh lanjut bertanya).
 * 4. Kalau tidak ada → transfer count 0. Append `ask.made` only.
 *    Phase → 'bluff_window' dengan BluffWindow aktif (accuser=asker),
 *    append `bluff.opened`.
 *
 * Catatan signature: `actorId` + `now` ditambahkan (vs brief)
 * karena (a) PlayerAction tidak membawa actor identity — validasi
 * "aksi dari currentPlayer" butuh actor eksplisit, dan (b) semua event
 * butuh timestamp `now` (pure — tanpa Date.now()).
 */
export function applyAsk(
  state: GameState,
  action: AskAction,
  actorId: PlayerId,
  now: number,
): GameState {
  if (state.phase !== 'turn') {
    throw new Error(`applyAsk: phase harus 'turn', sekarang '${state.phase}'`);
  }
  if (!isValidRank(action.rank)) {
    throw new Error(`applyAsk: rank tidak valid: ${action.rank}`);
  }
  if (action.targetId === actorId) {
    throw new Error('applyAsk: tidak bisa bertanya ke diri sendiri');
  }
  if (currentPlayerId(state) !== actorId) {
    throw new Error('applyAsk: bukan giliran pemain ini');
  }

  const asker = findPlayer(state, actorId);
  const target = findPlayer(state, action.targetId);

  const transferredCards = target.hand.filter((cardId) => cardId.startsWith(`${action.rank}-`));
  const log: GameEvent[] = [
    ...state.log,
    { type: 'ask.made', at: now, fromId: actorId, toId: action.targetId, rank: action.rank },
  ];

  if (transferredCards.length === 0) {
    return {
      ...state,
      phase: 'bluff_window',
      bluffWindow: {
        accuserId: actorId,
        accusedId: action.targetId,
        rank: action.rank,
        openedAt: now,
        expiresAt: now + DEFAULT_BLUFF_WINDOW_MS,
      },
      log,
      version: state.version + 1,
    };
  }

  const targetHand = target.hand.filter((cardId) => !transferredCards.includes(cardId));
  const askerHand = [...asker.hand, ...transferredCards];
  log.push({
    type: 'card.transferred',
    at: now,
    fromId: action.targetId,
    toId: actorId,
    cardIds: transferredCards,
  });

  // Deteksi quartet setelah transfer (rank yang sama).
  const askerRankCards = askerHand.filter((cardId) => cardId.startsWith(`${action.rank}-`));
  let finalAskerHand = askerHand;
  let playerQuartets = asker.quartets;
  let quartets = state.quartets;
  if (askerRankCards.length >= CARDS_PER_QUARTET) {
    const quartetCards = askerRankCards.slice(0, CARDS_PER_QUARTET);
    finalAskerHand = askerHand.filter((cardId) => !quartetCards.includes(cardId));
    playerQuartets = [...asker.quartets, action.rank];
    const quartet: Quartet = {
      id: `quartet-${action.rank}-${actorId}`,
      rank: action.rank,
      ownerId: actorId,
      formedAtTurn: currentTurnNumber(state),
    };
    quartets = [...state.quartets, quartet];
    log.push({ type: 'quartet.formed', at: now, playerId: actorId, rank: action.rank });
  }

  const players = state.players.map((player) => {
    if (player.id === actorId) {
      return {
        ...player,
        hand: finalAskerHand,
        handCount: finalAskerHand.length,
        quartets: playerQuartets,
      };
    }
    if (player.id === action.targetId) {
      return { ...player, hand: targetHand, handCount: targetHand.length };
    }
    return player;
  });

  return { ...state, players, quartets, log, version: state.version + 1 };
}
