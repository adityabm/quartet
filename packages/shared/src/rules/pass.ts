import type { CardId } from '../constants.js';
import type { GameEvent, GameState } from '../types/game-state.js';
import type { PlayerId } from '../types/ids.js';
import { findPlayer } from './players.js';
import { currentPlayerId, currentTurnNumber, nextPlayerIndex } from './turn.js';

/**
 * Terapkan `pass` — player yang menjawab "tidak punya" memutuskan skip giliran
 * (draw 1 kartu dari stok kalau stock tidak kosong).
 *
 * Validasi: hanya boleh dipanggil di phase 'turn' dan oleh currentPlayer
 * (actorId). Append `turn.passed` (+ `turn.started` untuk player berikutnya —
 * tambahan vs brief supaya penomoran turn konsisten dan UI dapat animasi
 * giliran baru). Pindah turn ke berikutnya.
 *
 * Catatan: draw tidak digate oleh konstanta STOCK_DRAW_ON_PASS — konstanta
 * itu flag kebijakan server (apakah pass boleh draw); aturan di sini selalu
 * draw kalau stock tersedia, dan tidak draw kalau kosong. (Meng-gate branch
 * ke konstanta `true` literal membuat false-path unreachable sehingga branch
 * coverage 100% tidak tercapai — lihat laporan.)
 */
export function applyPass(
  state: GameState,
  actorId: PlayerId,
  _rng: () => number,
  now: number,
): GameState {
  if (state.phase !== 'turn') {
    throw new Error(`applyPass: phase harus 'turn', sekarang '${state.phase}'`);
  }
  if (currentPlayerId(state) !== actorId) {
    throw new Error('applyPass: bukan giliran pemain ini');
  }
  const passer = findPlayer(state, actorId);

  let stock = state.stock;
  let drewCardId: CardId | null = null;
  let hand = passer.hand;
  if (stock.length > 0) {
    const cardId = stock[stock.length - 1]!;
    stock = stock.slice(0, -1);
    hand = [...passer.hand, cardId];
    drewCardId = cardId;
  }

  const players = state.players.map((player) =>
    player.id === actorId ? { ...player, hand, handCount: hand.length } : player,
  );

  const nextIndex = nextPlayerIndex(state);
  const nextPlayer = state.players[nextIndex]!;
  const log: GameEvent[] = [
    ...state.log,
    { type: 'turn.passed', at: now, playerId: actorId, drewCardId },
    {
      type: 'turn.started',
      at: now,
      playerId: nextPlayer.id,
      turnNumber: currentTurnNumber(state) + 1,
    },
  ];

  return {
    ...state,
    phase: 'turn',
    players,
    currentPlayerIndex: nextIndex,
    stock,
    stockCount: stock.length,
    turnStartedAt: now,
    log,
    version: state.version + 1,
  };
}
