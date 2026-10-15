import type { GameState, PlayerId } from '@quartet/shared';
import { applyAction, getValidActions, nextPlayerIndex, currentTurnNumber } from '@quartet/shared';
import { decideEasy } from './tiers/easy.js';

export interface BotRunnerDeps {
  /** Injectable clock — keep pure & deterministic di test. */
  readonly now: () => number;
  /**
   * Factory RNG — dipanggil sekali per runIfBotTurn call, menerima state
   * SAAT INI supaya seed bisa di-derive dari (seed + version): kalau seed
   * konstan per panggilan, setiap sesi bot memutuskan aksi yang SAMA
   * (rng restart) → game bisa macet (bot miss terus tanpa progres).
   */
  readonly createRng: (state: GameState) => () => number;
  /**
   * Predikat isBot per PlayerId.
   *
   * CATATAN: shared `PlayerInGame` (GameState.players) TIDAK membawa field
   * isBot (initGame hanya menyimpan id/hand/handCount/quartets), jadi bot
   * detection tidak bisa dibaca dari state — di-inject oleh GameSession
   * yang tahu player mana yang bot.
   */
  readonly isBot: (playerId: PlayerId) => boolean;
}

/**
 * Server-side bot executor.
 *
 * Menjalankan bot decision loop selama currentPlayer adalah bot:
 * - Phase 'turn' → pilih aksi legal uniform random (Easy tier) dan apply.
 * - Phase 'bluff_window' dengan accuser = bot → bot TIDAK menuduh
 *   (simulasi "tuduhan selalu dilewatkan" untuk Phase 2); window di-reset
 *   dan turn maju ke player berikutnya (event `turn.passed` + `turn.started`).
 * - Phase 'bluff_window' dengan accuser = human → BERHENTI; human yang
 *   memutuskan menuduh atau tidak (Phase 4: timeout server task).
 *
 * Loop berhenti saat giliran kembali ke player non-bot, phase game_over,
 * atau aksi legal bot habis (kondisi yang hanya terjadi kalau semua rank
 * sudah jadi quartet → game over; caller yang memfinalisasi).
 *
 * CATATAN: method ini SINCHRONOUS (bukan async) — loop murni komputasi,
 * tidak ada I/O, dan GameSession perlu menjalankannya langsung di
 * constructor saat bot yang mulai duluan. Kalau Phase 4 butuh delay
 * "bot berpikir" untuk UX, tambahkan async saat itu.
 */
export class BotRunner {
  constructor(private readonly deps: BotRunnerDeps) {}

  runIfBotTurn(state: GameState): GameState {
    let current = state;
    // Seed derived dari state saat ini (bukan konstanta) — lihat BotRunnerDeps.
    const rng = this.deps.createRng(current);

    // `for (;;)` = infinite loop yang kita keluar via break di bawah
    // (bentuk idiomatik yang tidak memicu no-constant-condition).
    for (;;) {
      const currentPlayer = current.players[current.currentPlayerIndex];
      if (currentPlayer === undefined || !this.deps.isBot(currentPlayer.id)) break;
      if (current.phase === 'game_over') break;

      if (current.phase === 'bluff_window') {
        if (current.bluffWindow?.accuserId === currentPlayer.id) {
          // Bot skip bluff — pass ke player berikutnya (bot tidak menuduh).
          current = this.passBotTurn(current, currentPlayer.id);
          continue;
        }
        // Accuser = human → tunggu keputusan human (atau timeout Phase 4).
        break;
      }

      const validActions = getValidActions(current, currentPlayer.id);
      if (validActions.length === 0) {
        // Di phase 'turn' dengan currentPlayer = bot, aksi kosong hanya
        // terjadi kalau semua rank sudah jadi quartet bot → game over.
        // Jangan throw (500) — biarkan caller finalisasi via isGameOver.
        break;
      }

      const action = decideEasy(validActions, rng);
      current = applyAction(current, action, currentPlayer.id, rng, this.deps.now());
    }

    return current;
  }

  /**
   * Simulasikan "bot tidak menuduh bohong": reset bluff window saat phase
   * 'bluff_window' (accuser = bot) dan lanjutkan ke player berikutnya.
   *
   * Mirip applyPass, tapi tanpa validasi phase='turn' dan tanpa draw dari
   * stok — bot bukan pihak yang menjawab "tidak punya", jadi tidak draw.
   * Append `turn.passed` (drewCardId: null) + `turn.started` supaya
   * penomoran turn tetap konsisten dengan aturan lain.
   */
  private passBotTurn(state: GameState, botId: PlayerId): GameState {
    const nextIndex = nextPlayerIndex(state);
    const nextPlayer = state.players[nextIndex];
    if (nextPlayer === undefined) {
      // nextPlayerIndex selalu modulo length → tidak pernah undefined;
      // guard untuk kepastian type-safety strict.
      throw new Error('passBotTurn: next player index out of bounds (should not happen)');
    }
    return {
      ...state,
      phase: 'turn',
      bluffWindow: null,
      currentPlayerIndex: nextIndex,
      turnStartedAt: this.deps.now(),
      version: state.version + 1,
      log: [
        ...state.log,
        { type: 'turn.passed', at: this.deps.now(), playerId: botId, drewCardId: null },
        {
          type: 'turn.started',
          at: this.deps.now(),
          playerId: nextPlayer.id,
          turnNumber: currentTurnNumber(state) + 1,
        },
      ],
    };
  }
}
