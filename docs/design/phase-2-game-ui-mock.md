# Phase 2 — Game UI Mock & Design Plan

> Dokumen ini adalah design approval request sebelum implementasi FE Game UI.
> Sesuai AGENTS.md §5: setiap pekerjaan UI/UX butuh approval sebelum kode.

---

## 1. Tujuan Phase 2

**End-to-end playable**: 1 manusia vs 1 bot (Easy), 1 game penuh tanpa disconnect. Backend sudah punya semua rules (`packages/shared/rules/**`) — FE tinggal render state + kirim aksi, BE tinggal BotRunner yang call rules.

## 2. Arsitektur FE

```
apps/web/src/
├── features/game/              ← game-specific code (per AGENTS §2.4)
│   ├── components/
│   │   ├── Card.tsx            ← single card dengan flip/face-down
│   │   ├── Hand.tsx            ← hand sortable player sendiri
│   │   ├── Opponent.tsx        ← bot/player lain: avatar + count + quartets
│   │   ├── QuartetSlot.tsx     ← quartet terbuka di tengah meja
│   │   ├── TurnBanner.tsx      ← highlight giliran + countdown bluff
│   │   ├── BluffModal.tsx      ← 5-second decision modal
│   │   ├── AskPanel.tsx        ← UI untuk memilih (target, rank) dan bertanya
│   │   └── GameTable.tsx       ← orchestrator layout
│   └── GamePage.tsx            ← page utama (route /game/:gameId)
├── components/ui/              ← reusable primitives
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── IconButton.tsx
├── hooks/
│   ├── useGameSocket.ts        ← WS connect, dispatch events ke store
│   ├── useTurn.ts              ← derived state untuk current player
│   └── useLocalStorage.ts      ← persist display name + difficulty
├── store/
│   └── gameStore.ts            ← Zustand mirror server state
├── lib/
│   └── api.ts                  ← REST + WS helper
└── App.tsx                     ← router setup
```

## 3. Backend additions

```
apps/server/src/
├── bot/                        ← NEW
│   ├── BotRunner.ts            ← scheduler; panggil bot.decide(state) saat giliran bot
│   └── tiers/
│       └── easy.ts             ← uniform random over valid actions
├── game/                       ← NEW (Phase 4 will extend)
│   └── GameSession.ts          ← wraps GameState + applyAction + bot scheduling
└── http/routes/
    └── single-player.ts        ← POST /api/games/single → start bot game
```

**Catatan**: Untuk Phase 2 single-player, kita **TIDAK butuh WebSocket** — REST endpoint cukup. Bot akan auto-play saat giliran. Frontend polling atau SSE opsional untuk update. Phase 4 nanti kita tambah WS untuk multiplayer.

## 4. Wire flow single-player

```
1. User buka / → klik "Main Sendirian"
2. Modal pilih kesulitan (Easy/Normal/Hard — Phase 2 cuma Easy enabled)
3. POST /api/games/single { difficulty: 'easy' }
   → server bikin GameState baru (initGame + dealCards)
   → mulai bot loop
   → return { gameId, initialRedacted, yourHand, yourPlayerId }
4. Client navigate ke /game/:gameId
5. Render GameTable dengan state snapshot
6. User interact (klik kartu, pilih target, klik Tanya)
7. POST /api/games/:gameId/action { type: 'ask', targetId, rank }
   → server validate + applyAction
   → kalau bot giliran → server run bot loop (async)
   → return { state, yourHand }
8. Client update UI dengan new state
9. Loop sampai game over
```

## 5. Layout mockup

```
┌────────────────────────────────────────────────────────────────────┐
│  Quartet                                          [Keluar] [Menu]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  🤖 Bot Cerdik (Easy)         Giliran: Kamu!                  │  │
│  │  [Count: 13]  Quartets: 7♠ 7♥                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│         ┌──────────────────────────────────────────────┐            │
│         │  7♠  7♠  7♠  7♠                                │            │
│         │  Quartet! 🎉                                  │            │
│         └──────────────────────────────────────────────┘            │
│              (Quartet terbuka di tengah meja)                       │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│         7♥   9♠   A♣   K♦   3♥   ... (13 kartu)                  │  │
│         ↑klik untuk pilih rank                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Tanya kartu apa?                                              │  │
│  │  Rank:  [A] [2] [3] [4] [5] [6] [7] [8] [9] [10] [J] [Q] [K] │  │
│  │  Target: [Bot Cerdik ▾]                                       │  │
│  │  [ Tanya ]  [ Pass ]                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Score: Kamu 1 — Bot 0                          Log ▾               │
└────────────────────────────────────────────────────────────────────┘
```

**Saat BluffWindow aktif:**

```
┌────────────────────────────────────────────────────────────────────┐
│  Quartet                                          [Keluar] [Menu]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  🤖 Bot Cerdik (Easy)         Giliran: Bot                    │  │
│  │  [Count: 11]  Quartets:                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│         ┌──────────────────────────────────────────────┐            │
│         │  (Quartet di tengah)                          │            │
│         └──────────────────────────────────────────────┘            │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  🤔 Kamu tanya rank "K" ke Bot — Bot bilang "Tidak Punya".  ││
│  │                                                                ││
│  │  Yakin Bot bohong? [Tuduh Bohong]  [Lanjut]                    ││
│  │                                                                ││
│  │  Countdown: 5... 4... 3... 2... 1...                            ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Saat Game Over:**

```
┌────────────────────────────────────────────────────────────────────┐
│  🎉 Game Selesai!                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│        Pemenang: Kamu! 🏆                                          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Pemain       │ Quartets │ Cards                               │  │
│  │ Kamu         │    4     │  ♠A  ♥K  ♦7  ♣3  ...              │  │
│  │ Bot Cerdik   │    2     │  ♠Q  ♥9  ♦2  ♣J  ...              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Timeline:                                                         │
│  • Turn 1: Kamu tanya 7♠ → dapat 2 kartu                          │
│  • Turn 3: Quartet 9!                                              │
│  • Turn 8: Bluff call SALAH — kamu kehilangan quartet K            │
│  • Turn 23: Bot membentuk quartet A                                │
│  • Turn 34: Kamu menang!                                           │
│                                                                    │
│  [Main Lagi]  [Lihat History]  [Keluar]                            │
└────────────────────────────────────────────────────────────────────┘
```

## 6. Color & typography

Sesuai AGENTS §1.4:

- Background: `bg-batik-cream` (#FAF6EF)
- Primary (merah kartu): untuk "Kamu", quartet highlight, tombol utama
- Accent (biru tarakan): untuk state, badges, secondary
- Typography: Plus Jakarta Sans (body) + Caveat (display untuk header)

## 7. Animasi (Framer Motion)

- **Card flip**: 300ms ease-out saat reveal
- **Card transfer**: slide dari asker ke target, 400ms
- **Quartet formed**: pulse + scale up + confetti (ringan), 600ms
- **Turn change**: fade in 200ms di TurnBanner
- **BluffModal**: slide up dari bawah + countdown pulse

## 8. Komponen reusable (components/ui/)

- `Button` — variant: primary/secondary/ghost, size: sm/md/lg, support loading state
- `Modal` — backdrop + centered, with close handler
- `IconButton` — square button dengan icon, untuk close/minimize

## 9. Komponen game-specific (features/game/components/)

| Komponen      | Props (Ringkas)                                                  | Behavior                                                           |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Card`        | `{rank, suit, faceDown?, highlighted?, onClick?}`                | Static visual dengan flip animation. Back face motif batik simple. |
| `Hand`        | `{cards, onSelect?, layout: 'fan'\|'grid'}`                      | Sortable (rank then suit). Click → highlight + callback.           |
| `Opponent`    | `{name, isBot, cardCount, quartets, isCurrentTurn, isConnected}` | Avatar + count + quartet list. Highlighted jika current turn.      |
| `QuartetSlot` | `{quartet: {rank, ownerId, ownerName}}`                          | Centered card grid 2x2 dengan border.                              |
| `TurnBanner`  | `{currentPlayerName, isYourTurn, deadlineMs?}`                   | Top banner dengan highlight pulse.                                 |
| `BluffModal`  | `{accuserName, accusedName, rank, windowMs, onAccuse, onSkip}`   | Modal dengan countdown + 2 tombol.                                 |
| `AskPanel`    | `{validActions, onAsk}`                                          | UI untuk memilih target + rank + submit Tanya.                     |
| `GameTable`   | `{state, yourHand, yourPlayerId, onAction}`                      | Layout orchestrator.                                               |

## 10. Hooks & store

### `useGameSocket` (Phase 2: REST polling, Phase 4: WS)

```ts
// Phase 2 simplified: just call REST endpoint after each action
function useGameSocket(gameId: string) {
  const state = useGameStore((s) => s.state);
  const yourHand = useGameStore((s) => s.yourHand);
  const sendAction = useGameStore((s) => s.sendAction);
  // returns { state, yourHand, sendAction, isLoading, error }
}
```

### `useTurn`

```ts
function useTurn() {
  const state = useGameStore((s) => s.state);
  const yourPlayerId = useGameStore((s) => s.yourPlayerId);
  const isYourTurn = state?.currentPlayerId === yourPlayerId;
  const isBluffWindow =
    state?.phase === 'bluff_window' && state?.bluffWindow?.accuserId === yourPlayerId;
  return { isYourTurn, isBluffWindow, currentPlayerId: state?.currentPlayerId };
}
```

### `gameStore` (Zustand)

```ts
interface GameStore {
  state: RedactedGameState | null;
  yourHand: CardId[];
  yourPlayerId: PlayerId | null;
  isLoading: boolean;
  error: string | null;
  startSinglePlayer: (difficulty: BotTier) => Promise<{ gameId: string }>;
  sendAction: (action: PlayerAction) => Promise<void>;
  reset: () => void;
}
```

## 11. Backend API contracts (Phase 2)

### `POST /api/games/single`

Request:

```json
{ "difficulty": "easy" }
```

Response 200:

```json
{
  "gameId": "uuid",
  "state": RedactedGameState,
  "yourHand": ["7-spades", "A-hearts", ...],
  "yourPlayerId": "uuid"
}
```

Response 400: invalid difficulty.

### `POST /api/games/:gameId/action`

Request:

```json
{ "type": "ask", "targetId": "uuid", "rank": "7" }
// atau { "type": "bluff.call" }
// atau { "type": "pass" }
```

Response 200:

```json
{
  "state": RedactedGameState,
  "yourHand": [...],  // updated
  "events": GameEvent[]  // last N events
}
```

Response 400: invalid action / not your turn / game over.
Response 404: game not found.

### `GET /api/games/:gameId`

Response 200:

```json
{ "state": RedactedGameState, "yourHand": [...] }
```

### `POST /api/games/:gameId/leave`

Response 204.

## 12. Bot runner (server-side)

```ts
// apps/server/src/bot/BotRunner.ts
export class BotRunner {
  async runIfBotTurn(state: GameState, actorId: PlayerId, rng: () => number): Promise<GameState> {
    const player = state.players.find((p) => p.id === actorId);
    if (!player?.isBot) return state;
    const bot = this.bots.get(player.botTier!);
    const action = bot.decide(getValidActions(state, actorId), rng);
    return applyAction(state, action, actorId, rng, Date.now());
  }
}
```

Bot loop di game session: setelah setiap action, kalau nextPlayer.bot, run bot sampai human turn.

## 13. Indonesian copy

- "Giliran kamu!" / "Giliran bot"
- "Tanya" / "Lanjut" / "Tuduh Bohong" / "Pass"
- "Main Lagi" / "Lihat History" / "Keluar"
- "Quartet! 🎉"
- "Yakin bot bohong?"
- "Game Selesai! Pemenang: Kamu!"
- Error: "Tidak bisa bertanya rank itu — coba lagi ya."

## 14. Out of scope (Phase 2)

- Multiplayer room (Phase 4)
- Bot Normal/Hard (Phase 3)
- Chat (Phase 4)
- Replay/save (v1.2)
- Sound (v1.1)
- Animasi advanced (Phase 5)

---

## ❓ Approval Questions

Mohon konfirmasi sebelum saya mulai kode:

1. **Layout mockup** di §5 — cocok dengan vibe yang kamu bayangkan? Atau ada perubahan (mis. posisi quartet, style opponent, layout hand)?
2. **Card design** — pakai flat dengan motif batik subtle di back face, atau lebih dekoratif?
3. **Bahasa copy** — semua Bahasa Indonesia kasual-sopan (sesuai AGENTS §1.3). Ada tambahan/frasa khusus?
4. **Animasi** — minimal dulu (card flip + transfer + quartet pulse). Atau tambah confetti untuk quartet?
5. **Phase 2 simplify**: single-player pakai **REST polling** (bukan WS dulu). Setuju?
6. **Backend runner**: bot auto-play loop di server saat giliran bot. Player tinggal lihat UI update. Setuju?
7. **Test coverage target**: Phase 2 FE logic hooks ≥ 80%, BE bot runner + game session ≥ 85% (sesuai AGENTS §2.2). Setuju?

Mohon jawab salah satu dari tiga opsi:

- **"Cocok semua, gas"** — saya langsung mulai implementasi
- **"Ubah X, Y, Z"** — sebutkan perubahannya
- **"Skip approval, langsung gas"** — pakai default di dokumen ini, langsung implementasi
