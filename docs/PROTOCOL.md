# WebSocket Protocol — Quartet Web

> Acuan resmi untuk komunikasi WebSocket antara klien dan game server.
> Definisi type ada di `packages/shared/src/protocol/`. Dokumen ini menjelaskan **perilaku**, **payload**, dan **alur** untuk setiap event.

---

## 0. Ringkasan

- **Transport**: WebSocket (JSON messages).
- **Encoding**: UTF-8 JSON, semua payload discriminated union by `type` field.
- **Arah**: client → server (`ClientToServer`), server → client (`ServerToClient`).
- **Connection lifecycle**: client connect dengan query `?room=XYZ&name=Budi` (planned Phase 4); server assign `playerId` + `sessionId`.
- **Reliability**: at-least-once (client retry on disconnect). Server validate every action; invalid → emit `error` event.
- **Rate limit**: maks 5 aksi/detik/socket (configurable via `MAX_PLAYERS` env-like constant di server config).

---

## 1. Tipe & Type Guards

Semua tipe di `packages/shared/src/protocol/`:

```
ClientToServer = ClientEvent['type'] extends ...  → discriminated union
ServerToClient = ServerEvent['type'] extends ...  → discriminated union
```

Gunakan `type` field untuk narrow di TypeScript:

```ts
function handle(event: ServerToClient) {
  switch (event.type) {
    case 'game.turn.changed':
      /* event.playerId, event.turnNumber */ break;
    case 'game.card.transferred':
      /* event.cardIds, event.fromId */ break;
    // ...
  }
}
```

---

## 2. Client → Server Events

### 2.1 `room.create`

```ts
{ type: 'room.create', hostName: string }
```

- **Trigger**: Pemain pertama yang ingin bikin room.
- **Server response**:
  - `connected` (dengan playerId baru)
  - `room.snapshot` (room baru, status `waiting`)
  - `room.player.joined` (broadcast ke room — host sendiri)
- **Validation**: `hostName` 2-20 char, `isValidPlayerName()` (lihat `protocol/validation.ts`).

### 2.2 `room.join`

```ts
{ type: 'room.join', code: RoomCode, name: string }
```

- **Trigger**: Pemain yang ingin gabung room existing.
- **Server response**:
  - `connected`
  - `room.snapshot` (room + redacted state kalau game sudah mulai)
  - `room.player.joined` (broadcast)
- **Validation**: `code` valid 6-char alphanumeric uppercase; `name` valid; room ada, belum full, belum started.

### 2.3 `room.leave`

```ts
{
  type: 'room.leave';
}
```

- **Trigger**: Pemain keluar room.
- **Server response**: `room.player.left` (broadcast) + `disconnected` (ke peminta).

### 2.4 `room.start` (host only)

```ts
{
  type: 'room.start';
}
```

- **Trigger**: Host mulai game.
- **Validation**: minimal 2 pemain, room status `waiting`, sender = host.
- **Server response**:
  - `room.started`
  - `game.snapshot` (setelah deal)
  - `game.turn.changed` (first player)

### 2.5 `room.kick` (host only)

```ts
{ type: 'room.kick', targetId: PlayerId }
```

- **Trigger**: Host kick pemain lain.
- **Server response**: `room.kicked` (ke target) + `room.player.left` (broadcast).

### 2.6 `game.ask`

```ts
{ type: 'game.ask', targetId: PlayerId, rank: Rank }
```

- **Trigger**: Pemain bertanya.
- **Validation**: phase `'turn'`, sender = currentPlayer, target ∈ players, target ≠ self, rank valid.
- **Server response** (lihat `applyAsk`):
  - Transfer sukses: `card.transferred` (mungkin + `quartet.formed`)
  - Transfer 0: `bluff.calling` (BluffWindow terbuka)
  - Invalid: `error`

### 2.7 `game.bluff.call`

```ts
{
  type: 'game.bluff.call';
}
```

- **Trigger**: Accuser tuduh bohong dalam window 5 detik.
- **Validation**: phase `'bluff_window'`, sender = accuser.
- **Server response** (lihat `resolveBluff`):
  - `bluff.resolved` (dengan penalty)
  - Kalau benar → `card.transferred`
  - Kalau salah → quartet hilang (state.quartets di-filter)

### 2.8 `game.pass`

```ts
{
  type: 'game.pass';
}
```

- **Trigger**: Pemain skip giliran setelah jawab "tidak punya".
- **Validation**: phase `'turn'`, sender = currentPlayer, log tail = `bluff.resolved`.
- **Server response**: `turn.passed` + `turn.changed` (next player).

### 2.9 `game.rematch`

```ts
{
  type: 'game.rematch';
}
```

- **Trigger**: Pemain request main ulang setelah game over.
- **Server response**: track `rematchReady` di game.over snapshot; kalau semua ready → start new game.

### 2.10 `chat.text`

```ts
{ type: 'chat.text', text: string }
```

- **Trigger**: Chat message.
- **Validation**: rate-limited, sanitized (basic), max 200 char.
- **Server response**: `chat.message` (broadcast).

---

## 3. Server → Client Events

### 3.1 Lifecycle

#### `connected`

```ts
{ type: 'connected', playerId: PlayerId, sessionId: string }
```

- Dikirim sekali saat WS handshake sukses.
- `sessionId` = token sesi untuk reconnection (cookie httpOnly recommended).

#### `error`

```ts
{ type: 'error', code: ErrorCode, message: string, recoverable: boolean }
```

- Dikirim saat aksi invalid atau server error.
- `recoverable: false` → putuskan koneksi (mis. unauthorized).
- Lihat `ERROR_CODES` di `protocol/errors.ts` untuk daftar code.

#### `disconnected`

```ts
{ type: 'disconnected', reason: 'kicked' | 'timeout' | 'room_closed' }
```

- Dikirim saat server putuskan koneksi.

### 3.2 Room

#### `room.snapshot`

```ts
{ type: 'room.snapshot', room: Room, redacted: RedactedGameState | null }
```

- Dikirim saat join / state berubah signifikan.
- `redacted = null` kalau room belum mulai game.

#### `room.player.joined`

```ts
{ type: 'room.player.joined', playerId: PlayerId, name: string, isBot: boolean, seatIndex: number }
```

- Broadcast saat pemain baru masuk.

#### `room.player.left`

```ts
{ type: 'room.player.left', playerId: PlayerId, reason: 'leave' | 'disconnect' | 'kick' }
```

- Broadcast saat pemain keluar.

#### `room.kicked`

```ts
{ type: 'room.kicked', byHostId: PlayerId }
```

- Dikirim ke target yang di-kick.

#### `room.started`

```ts
{ type: 'room.started', gameId: string }
```

- Broadcast saat host trigger `room.start`.

### 3.3 Game

#### `game.snapshot`

```ts
{
  type: 'game.snapshot',
  redacted: RedactedGameState,
  yourHand: CardId[],
  yourPlayerId: PlayerId,
}
```

- Snapshot lengkap state. PRIVASI: `yourHand` hanya untuk player sendiri.
- `redacted` untuk semua pemain lain (lihat `RedactedGameState`).

#### `game.turn.changed`

```ts
{ type: 'game.turn.changed', playerId: PlayerId, turnNumber: number, deadlineMs: number | null }
```

- Broadcast saat turn pindah.
- `deadlineMs`: optional turn timeout (Phase 4+ implement `TURN_TIMEOUT_MS`).

#### `game.card.transferred`

```ts
{
  type: 'game.card.transferred',
  fromId: PlayerId,
  toId: PlayerId,
  cardIds: CardId[],
  animationDelayMs: number,
}
```

- Broadcast untuk animasi kartu pindah.
- `animationDelayMs` = delay FE pakai untuk stagger animation (default 300ms per kartu).

#### `game.quartet.formed`

```ts
{ type: 'game.quartet.formed', playerId: PlayerId, rank: Rank }
```

- Broadcast saat quartet terbentuk.
- FE animasi quartet reveal di tengah meja.

#### `game.bluff.calling`

```ts
{
  type: 'game.bluff.calling',
  accuserId: PlayerId,
  accusedId: PlayerId,
  rank: Rank,
  windowMs: number,
}
```

- Broadcast saat BluffWindow terbuka.
- FE tampilkan countdown 5 detik di accuser UI + tombol "Tuduh Bohong".
- Untuk pemain lain: indicator visual saja.

#### `game.bluff.resolved`

```ts
{ type: 'game.bluff.resolved', correct: boolean, penalty: BluffPenalty }
```

- Broadcast setelah bluff resolve.
- `penalty`:
  - `{ kind: 'card_transferred', cardId }` → tuduhan benar
  - `{ kind: 'quartet_lost', rank }` → tuduhan salah, accuser kehilangan quartet
  - `{ kind: 'none' }` → tuduhan salah tapi accuser tidak punya quartet

#### `game.turn.passed`

```ts
{ type: 'game.turn.passed', playerId: PlayerId, drewCardId: CardId | null }
```

- Broadcast saat player pass.
- `drewCardId` = kartu yang di-draw dari stok (null kalau stok kosong).

#### `game.over`

```ts
{
  type: 'game.over',
  winnerIds: PlayerId[],
  scores: { playerId: PlayerId, quartetCount: number }[],
  rematchReady: PlayerId[],
}
```

- Broadcast saat game over.
- FE tampilkan modal "Game Selesai" + rematch option.

### 3.4 Chat

#### `chat.message`

```ts
{ type: 'chat.message', fromId: PlayerId, text: string, at: number }
```

- Broadcast chat message.
- **Privasi**: rate-limited & sanitized. Tidak boleh ada PII/leak server info.

### 3.5 Heartbeat

#### `pong`

```ts
{ type: 'pong', at: number }
```

- Respons ping dari client.
- Phase 4 implement actual heartbeat (`ping`/`pong` interval).

---

## 4. Error Codes

Lihat `packages/shared/src/protocol/errors.ts` untuk daftar lengkap. Highlights:

| Code                   | Trigger                            | Recoverable |
| ---------------------- | ---------------------------------- | ----------- |
| `invalid_action`       | Payload shape invalid              | true        |
| `not_your_turn`        | Action from non-current player     | true        |
| `invalid_target`       | TargetId tidak ada / self          | true        |
| `invalid_rank`         | Rank tidak valid                   | true        |
| `no_bluff_window`      | Bluff.call saat window tidak aktif | true        |
| `rate_limited`         | > 5 aksi/detik                     | false       |
| `room_not_found`       | Code tidak ditemukan               | true        |
| `room_full`            | Max players reached                | true        |
| `room_already_started` | Join saat in game                  | true        |
| `name_taken`           | Duplicate name in room             | true        |
| `name_invalid`         | Empty / too long / blocked word    | true        |
| `internal_error`       | Unexpected server error            | false       |
| `unauthorized`         | Session invalid                    | false       |

---

## 5. Sequence Examples

### 5.1 Happy Path: Successful Transfer

```
Client                          Server
  │  game.ask(target=B, rank=7)  │
  │ ──────────────────────────►  │
  │                              │ [validate] applyAsk → transfer 2 kartu
  │  game.card.transferred       │
  │ ◄──────────────────────────  │
  │  game.turn.changed (B's turn)│
  │ ◄──────────────────────────  │
```

### 5.2 Bluff Resolution

```
Client (asker)              Server                Client (accused)
  │  game.ask(B, 7)         │                          │
  │ ──────────────────────► │                          │
  │                         │ applyAsk → transfer 0    │
  │  game.bluff.calling     │                          │
  │ ◄────────────────────── │                          │
  │ [5 detik window]        │                          │
  │  game.bluff.call        │                          │
  │ ──────────────────────► │                          │
  │                         │ resolveBluff → cek B    │
  │                         │                          │
  │  game.bluff.resolved    │                          │
  │ ◄────────────────────── │                          │
  │  (correct=false,        │                          │
  │   penalty=none/quartet) │                          │
  └─────────────────────────┴──────────────────────────┘
```

### 5.3 Reconnection

```
Client                          Server
  │ WS connect (sessionId)       │
  │ ──────────────────────────►  │
  │                              │ [validate session]
  │  connected (same playerId)   │
  │ ◄──────────────────────────  │
  │  room.snapshot               │
  │ ◄──────────────────────────  │
  │  game.snapshot               │
  │ ◄──────────────────────────  │
  │  (resume from current state) │
```

---

## 6. Anti-Patterns (JANGAN)

- ❌ Kirim `GameState.players[].hand` ke klien manapun (selain `game.snapshot.yourHand` untuk player itu sendiri).
- ❌ Kirim `GameState.stock` lengkap — hanya `stockCount`.
- ❌ Trust klien untuk state apapun — selalu validate di server.
- ❌ Broadcast `error.message` dengan stack trace ke klien.
- ❌ Rate limit bypass untuk user "VIP" — konsistensi untuk semua.

---

## 7. Referensi Implementasi

| Konsep             | File                                               |
| ------------------ | -------------------------------------------------- |
| Client events      | `packages/shared/src/protocol/client-to-server.ts` |
| Server events      | `packages/shared/src/protocol/server-to-client.ts` |
| Error codes        | `packages/shared/src/protocol/errors.ts`           |
| Validators         | `packages/shared/src/protocol/validation.ts`       |
| Rules engine       | `packages/shared/src/rules/`                       |
| Snapshot redaction | `packages/shared/src/rules/redact.ts`              |

---

_End of PROTOCOL.md_
