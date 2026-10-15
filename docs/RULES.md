# Quartet Indonesia — Canonical Rules

> Acuan resmi untuk implementasi GameEngine di `packages/shared/src/rules/`.
> Aturan ini **tidak boleh dilanggar** tanpa eksplisit disetujui user dan di-update di PRD.

---

## 0. Ringkasan

Quartet Indonesia klasik adalah permainan kartu sosial dengan elemen **bluffing** (berbohong soal kepemilikan kartu). Aturan inti:

1. Deck 52 kartu remi standar (4 suit × 13 rank).
2. Semua kartu dibagi rata ke 2–6 pemain; sisa (kalau ada) jadi **stok**.
3. Pemain bertanya satu sama lain untuk kartu rank tertentu.
4. Kalau target **punya** → kartu wajib diberikan, asker boleh lanjut bertanya.
5. Kalau target **tidak punya** → asker boleh (dalam 5 detik) **tuduh bohong**.
6. Tuduhan benar → penanya mengambil 1 kartu rank tsb dari tangan yang dituduh.
7. Tuduhan salah → penanya kehilangan 1 quartet yang sudah dimiliki.
8. Quartet (4 kartu rank sama) → dipisah ke tengah meja, terbuka untuk semua.
9. Game berakhir saat tidak ada lagi transfer yang mungkin; pemenang = quartet terbanyak.

---

## 1. Deck & Pembagian

- **52 kartu** = 13 rank (`A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K`) × 4 suit (`spades, hearts, diamonds, clubs`).
- Setiap kartu punya ID `<rank>-<suit>`, mis. `7-spades`, `A-hearts`.
- **Distribusi**: shuffle dengan seeded RNG (lihat `packages/shared/src/rng.ts`), lalu bagikan **round-robin** ke pemain sampai habis.
  - 4 pemain × 13 kartu = 52 → tidak ada sisa.
  - 5 pemain × 10 kartu = 50 → 2 kartu sisa → stok.
  - 6 pemain × 8 kartu = 48 → 4 kartu sisa → stok.
  - dst.
- **First player**: pemegang kartu "tertinggi" (definisi: posisi di `RANKS × SUITS` ordered array). Tiebreak via RNG (catatan: dengan mapping injective, tiebreak biasanya unreachable).

Implementasi: `packages/shared/src/rules/deal.ts` → `dealCards(state, rng, now)`.

---

## 2. Struktur Game State

Lihat `packages/shared/src/types/game-state.ts` untuk definisi lengkap. Ringkasan:

```
GameState {
  gameId, seed,
  phase: 'lobby' | 'dealing' | 'turn' | 'bluff_window' | 'resolve' | 'game_over',
  players: PlayerInGame[],         // PRIVATE — hand hanya di server
  currentPlayerIndex: number,
  stock: CardId[],                 // face-down, face-up saat di-stok
  stockCount: number,              // publik cache
  quartets: Quartet[],             // terbuka di tengah
  bluffWindow: BluffWindow | null, // window aktif untuk tuduhan
  log: GameEvent[],                // event log untuk replay + UI
  turnStartedAt, version
}
```

Klien **tidak pernah** menerima `players[].hand` atau `stock` secara langsung — hanya `RedactedGameState` (lihat `redact.ts`).

---

## 3. State Machine

```
       ┌──────────┐
       │  LOBBY   │ (host.start → transition)
       └────┬─────┘
            │ host.start
            ▼
       ┌──────────┐
       │ DEALING  │ (auto: dealCards)
       └────┬─────┘
            │ auto
            ▼
       ┌──────────┐  ◄─────────────────────────┐
       │  TURN    │  currentPlayer.ask()       │
       │ (loop)   │ ─────────────────────────► │
       └────┬─────┘                            │
            │ transfer == 0                    │
            ▼                                  │
       ┌──────────────┐                        │
       │ BLUFF_WINDOW │  accuser.bluff.call()  │
       └────┬─────────┘ ──────────────────────►│
            │ atau timeout                     │
            ▼
       ┌──────────┐
       │ RESOLVE  │ (auto setelah bluff.call atau timeout)
       └────┬─────┘
            │ kalau transfer ada → balik ke TURN dengan currentPlayerIndex tidak berubah
            │ kalau tidak ada → GAME_OVER atau pass → nextTurn
            ▼
       ┌──────────────┐
       │ GAME_OVER?   │ ya → GAME_OVER
       └────┬─────────┘
            │ tidak
            ▼
       (balik ke TURN, nextPlayerIndex)
```

Transisi fase diimplementasi via:

- `init.ts` → set phase ke `'lobby'`
- `deal.ts` → set phase ke `'turn'` setelah kartu dibagi
- `ask.ts` → tetap `'turn'` kalau transfer sukses, atau ke `'bluff_window'` kalau transfer 0
- `bluff.ts` → kembali ke `'turn'` setelah resolve
- `pass.ts` → tetap `'turn'` tapi `currentPlayerIndex` maju
- `game-over.ts` → `finalizeGame()` set phase ke `'game_over'`

---

## 4. Aksi Pemain (Player Actions)

Lihat `packages/shared/src/types/action.ts` untuk definisi. Tiga aksi yang valid:

### 4.1 `ask`

```
{ type: 'ask', targetId: PlayerId, rank: Rank }
```

- **Kapan**: phase `'turn'`, pemain yang sedang giliran.
- **Validasi**: rank valid, target ≠ self, target ∈ room.
- **Hasil**:
  - Target punya kartu rank tsb → **semua** kartu rank tsb pindah dari target ke asker. AskER boleh lanjut bertanya (turn **tidak** pindah).
  - Target tidak punya → phase jadi `'bluff_window'`, BluffWindow terbuka (accuser=asker, accused=target, window=5 detik).
- **Quartet auto-formation**: setelah transfer, kalau asker punya ≥ 4 kartu rank tsb, quartet terbentuk (4 kartu pindah ke `state.quartets`).

### 4.2 `bluff.call`

```
{ type: 'bluff.call' }
```

- **Kapan**: phase `'bluff_window'`, dan player = accuser dari BluffWindow.
- **Hasil** (`resolveBluff`):
  - Kalau accused memang punya kartu rank tsb di tangannya → tuduhan **benar**:
    - 1 kartu random rank tsb pindah dari accused ke accuser.
    - Quartet auto-formation di accuser dicek (best practice).
    - Phase kembali ke `'turn'`, currentPlayerIndex TIDAK berubah (giliran tetap di accuser karena dia boleh lanjut tanya atau pass).
  - Kalau accused tidak punya → tuduhan **salah**:
    - Accuser kehilangan 1 quartet random (kalau punya). 4 kartu quartet **dikembalikan ke tangan accuser** (invariant total kartu: `Σ hands + Σ 4×quartets + stock = 52` selalu terjaga).
    - Kalau accuser tidak punya quartet → `{ kind: 'none' }`.
    - Phase kembali ke `'turn'`, currentPlayerIndex TIDAK berubah.

### 4.3 `pass`

```
{ type: 'pass' }
```

- **Kapan**: phase `'turn'`, pemain yang baru saja menjawab "tidak punya" (setelah bluff resolve atau langsung setelah ask dengan transfer 0). Derivasi: log tail = event `bluff.resolved`.
- **Hasil**: draw 1 kartu dari stok (kalau tidak kosong), turn pindah ke next player.
- **Catatan**: kalau stok kosong dan tidak ada lagi transfer yang mungkin → game over.

---

## 5. Quartet

- **Formasi**: 4 kartu rank sama di tangan seorang pemain.
- **Auto-detection**: dicek setelah setiap `applyAsk` (transfer) dan `resolveBluff` (kalau tuduhan benar → kartu tambahan).
- **Penyimpanan**: kartu quartet dipindah dari `PlayerInGame.hand` ke `state.quartets` (terbuka untuk semua).
- **Loss**: hanya via `resolveBluff` dengan tuduhan salah (4 kartu kembali ke tangan accuser).

---

## 6. Bluffing — Detail

### 6.1 Mengapa Bluff Penting

Tanpa bluff, Quartet jadi deterministik (semua tanya kartu → kartu diberikan). Bluff menambah dimensi sosial: pemain bisa **berbohong** waktu ditanya ("Saya tidak punya"), lalu kalau ketahuan dihukum.

### 6.2 Mekanisme Saat Ini (Phase 1)

Di implementasi Phase 1, **`applyAsk` auto-reveal & auto-transfer** sebelum BluffWindow terbuka. Artinya:

- Kalau target punya → kartu langsung pindah (tidak ada pertanyaan "Punya?" → "Iya/Punya").
- Kalau target tidak punya → BluffWindow terbuka, asker boleh tuduh.

**Implikasi**: "tuduhan benar" (accused ternyata punya) **sangat jarang tercapai** karena kartu auto-transferred. Ini adalah **limitation desain** untuk MVP awal.

### 6.3 TODO Phase 4 — Manual Answer Mode

Untuk mengaktifkan bluff secara proper, Phase 4 harus tambahkan mode **manual answer**:

```
Sequence (planned):
1. Asker: ask(target, rank)
2. Server: broadcast "ask.made" + buka PendingAsk window
3. Target: jawab "Punya" atau "Tidak Punya" (explicit)
4a. "Punya" → kartu pindah (sama seperti sekarang)
4b. "Tidak Punya" → BluffWindow terbuka untuk asker
```

Dengan mode ini, **target bisa bohong** ("Tidak Punya" padahal punya) dan **resiko ketahuan via tuduhan** jadi meaningful. Detail implementasi di Phase 4.

### 6.4 Timeout

Phase 1 tidak implementasi timeout untuk BluffWindow (5-detik expire). Phase 4 server task akan handle ini. Default behavior sekarang: window tetap terbuka sampai `bluff.call` atau game over.

---

## 7. Turn Order

- **First player**: pemegang kartu tertinggi (A-spades dkk), tiebreak via RNG.
- **Rotation**: cyclic (searah jarum jam), `nextPlayerIndex = (current + 1) % players.length`.
- **Turn tidak pindah** saat:
  - `applyAsk` dengan transfer sukses (asker lanjut).
  - `resolveBluff` (giliran tetap di accuser).
- **Turn pindah** saat:
  - `applyAsk` dengan transfer 0 → `pass` (manual).
  - `applyPass`.

---

## 8. Game Over

Kondisi (lihat `isGameOver` di `game-over.ts`):

1. **Hanya 1 pemain aktif** (yang lain disconnect/kicked).
2. **Stok habis** + **tidak ada lagi transfer yang mungkin** (semua player tidak punya kartu yang relevan untuk player lain).
3. **Semua 13 quartet sudah terbentuk** (max 13 × 4 = 52 kartu terpakai semua).

Winner: pemain dengan quartet terbanyak. Tie → semua yang punya count max.

---

## 9. Invariant & Konservasi

**Invariant total kartu** harus selalu terjaga di setiap state transition:

```
Σ (PlayerInGame.hand.length) + (Σ quartetCount × 4) + stock.length === 52
```

Test: `integration.test.ts` memverifikasi invariant di end-of-game.

---

## 10. Referensi Implementasi

| Konsep             | File                                            |
| ------------------ | ----------------------------------------------- |
| Phase enum         | `packages/shared/src/types/phase.ts`            |
| GameState          | `packages/shared/src/types/game-state.ts`       |
| PlayerAction       | `packages/shared/src/types/action.ts`           |
| Seeded RNG         | `packages/shared/src/rng.ts`                    |
| Deck shuffle       | `packages/shared/src/rules/deck.ts`             |
| Init               | `packages/shared/src/rules/init.ts`             |
| Deal               | `packages/shared/src/rules/deal.ts`             |
| Ask                | `packages/shared/src/rules/ask.ts`              |
| Bluff resolve      | `packages/shared/src/rules/bluff.ts`            |
| Pass               | `packages/shared/src/rules/pass.ts`             |
| Turn rotation      | `packages/shared/src/rules/turn.ts`             |
| Quartet detection  | `packages/shared/src/rules/complete-quartet.ts` |
| Valid actions      | `packages/shared/src/rules/valid-actions.ts`    |
| Game over          | `packages/shared/src/rules/game-over.ts`        |
| Snapshot redaction | `packages/shared/src/rules/redact.ts`           |
| Action dispatcher  | `packages/shared/src/rules/apply-action.ts`     |

---

_End of RULES.md_
