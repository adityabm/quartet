import type {
  CardId,
  GameId,
  GameState,
  PlayerAction,
  PlayerId,
  Player,
  RedactedGameState,
} from '@quartet/shared';
import {
  applyAction,
  asPlayerId,
  buildPrivateSnapshot,
  createSeededRng,
  dealCards,
  finalizeGame,
  initGame,
  isGameOver,
} from '@quartet/shared';
import { BotRunner } from '../bot/BotRunner.js';

export interface CreateGameParams {
  readonly humanPlayerName: string;
  /** Phase 2 cuma 'easy' yang didukung (normal/hard menyusul Phase 3). */
  readonly botDifficulty: 'easy' | 'normal' | 'hard';
  /** Injectable clock — default Date.now(); dipakai test agar deterministik. */
  readonly now?: () => number;
}

export interface GameSnapshot {
  readonly state: RedactedGameState;
  readonly yourHand: ReadonlyArray<CardId>;
}

/**
 * Single-game session. Memegang authoritative GameState di server.
 *
 * - Semua aksi human masuk via applyHumanAction → rules engine → bot loop
 *   (kalau giliran bot) → snapshot baru.
 * - Snapshot yang diekspor immutable; internal state mutable.
 * - Redacted state hasil `buildPrivateSnapshot` memakai placeholder
 *   name/isBot/isConnected (lihat shared redact.ts) — sesi ini merge
 *   metadata player asli sebelum diekspor (sesuai catatan di shared:
 *   "server layer wajib merge metadata").
 * - Phase 4 akan extend dengan WS broadcast & multiple human players.
 */
export class GameSession {
  private state: GameState;
  private readonly botRunner: BotRunner;
  private readonly now: () => number;
  private readonly playerMeta: ReadonlyMap<
    PlayerId,
    { readonly name: string; readonly isBot: boolean; readonly isConnected: boolean }
  >;
  public readonly gameId: GameId;
  public readonly humanPlayerId: PlayerId;

  constructor(params: CreateGameParams, gameId: GameId, seed: number) {
    this.gameId = gameId;
    this.now = params.now ?? (() => Date.now());

    const humanId = asPlayerId(crypto.randomUUID());
    const botId = asPlayerId(crypto.randomUUID());
    this.humanPlayerId = humanId;

    this.botRunner = new BotRunner({
      now: this.now,
      createRng: (state) => createSeededRng((state.seed + state.version) >>> 0),
      isBot: (playerId) => playerId === botId,
    });

    const players: Player[] = [
      {
        id: humanId,
        name: params.humanPlayerName,
        isBot: false,
        isConnected: true,
        joinedAt: this.now(),
      },
      {
        id: botId,
        name: 'Bot Cerdik',
        isBot: true,
        botTier: params.botDifficulty,
        isConnected: true,
        joinedAt: this.now(),
      },
    ];

    const playerMeta = new Map<PlayerId, { name: string; isBot: boolean; isConnected: boolean }>();
    for (const player of players) {
      playerMeta.set(player.id, {
        name: player.name,
        isBot: player.isBot,
        isConnected: player.isConnected,
      });
    }
    this.playerMeta = playerMeta;

    const initState = initGame({
      gameId,
      seed,
      players,
      now: this.now(),
    });

    const rng = createSeededRng(seed);
    let dealt = dealCards(initState, rng, this.now());

    // Kalau bot yang mulai (pegang kartu tertinggi), langsung jalankan bot
    // loop supaya sesi selalu "istirahat" di giliran human (atau game over).
    dealt = this.botRunner.runIfBotTurn(dealt);

    // Bot loop bisa langsung menghabiskan game (mis. semua quartet terbentuk
    // di sesi pertama) → finalisasi segera supaya tidak ada state menggantung
    // di phase 'turn' dengan currentPlayer = bot.
    if (isGameOver(dealt)) {
      this.state = finalizeGame(dealt, this.now());
    } else {
      this.state = dealt;
    }
  }

  /**
   * Snapshot terkini untuk player (human): redacted state + hand sendiri,
   * dengan metadata (name/isBot/isConnected) player asli.
   */
  snapshot(): GameSnapshot {
    const { redacted, yourHand } = buildPrivateSnapshot(this.state, this.humanPlayerId);
    const players = redacted.players.map((player) => {
      const meta = this.playerMeta.get(player.id);
      if (meta === undefined) return player;
      return { ...player, name: meta.name, isBot: meta.isBot, isConnected: meta.isConnected };
    });
    return { state: { ...redacted, players }, yourHand };
  }

  /**
   * Apply aksi human + jalankan bot loop + return snapshot baru.
   *
   * Phase yang diterima:
   * - 'turn' → ask / pass (harus giliran human — divalidasi applyAction).
   * - 'bluff_window' → bluff.call, hanya kalau human adalah accuser
   *   (window dengan accuser = bot selalu di-skip bot loop di request
   *   sebelumnya, jadi tidak pernah menunggu human).
   * Phase 'game_over' → throw (game selesai).
   */
  async applyHumanAction(action: PlayerAction): Promise<GameSnapshot> {
    if (this.state.phase === 'game_over') {
      throw new Error('Game sudah selesai');
    }
    if (this.state.phase !== 'turn' && this.state.phase !== 'bluff_window') {
      throw new Error(`Aksi tidak valid di phase ${this.state.phase}`);
    }

    // RNG baru per aksi, derived dari seed + version → deterministic,
    // tapi stream tidak selalu identik antar aksi.
    const rng = createSeededRng((this.state.seed + this.state.version) >>> 0);
    const newState = applyAction(this.state, action, this.humanPlayerId, rng, this.now());

    // Run bot loop kalau giliran bot berikutnya.
    const finalState = this.botRunner.runIfBotTurn(newState);

    if (isGameOver(finalState)) {
      this.state = finalizeGame(finalState, this.now());
    } else {
      this.state = finalState;
    }

    return this.snapshot();
  }
}
