# Project Overview — Quartet Web

> Companion document untuk `PRD.md`. PRD menjawab **what**, dokumen ini menjawab **how we'll build it**.
> Versi: 0.1 (Draft)
> Tanggal: 14 Oktober 2026

---

## 1. Project at a Glance

**Quartet Web** adalah permainan kartu Quartet Indonesia klasik (dengan bluffing) versi web yang bisa dimainkan:
- **Single-player** melawan bot dengan 3 tingkat kesulitan.
- **Multiplayer real-time** dengan teman via room code 6 karakter.

| Aspek | Pilihan |
|-------|---------|
| Jenis | Real-time multiplayer web game |
| Platform | Web responsif (mobile-first), PWA di v2.0 |
| Bahasa UI | Bahasa Indonesia (MVP) |
| Akun | Tidak ada (MVP) |
| Tech stack (default) | TypeScript end-to-end, React + Vite + Tailwind + Framer Motion (FE), Node + Fastify + uWebSockets.js (BE), PostgreSQL + Redis (data) |
| Repo layout | Monorepo (pnpm + Turborepo) |
| Region hosting | Asia Tenggara (SG) |

---

## 2. Repository Structure

Monorepo dengan 3 apps + 2 packages shared. Tujuannya: **satu sumber kebenaran untuk types & protocol** antara FE dan BE.

```
quartet/                            ← root repo (this folder)
├── apps/
│   ├── web/                        ← React + Vite frontend
│   │   ├── src/
│   │   │   ├── pages/              ← Landing, Lobby, Room, Game, Result
│   │   │   ├── components/         ← Card, Hand, Opponent, QuartetSlot, TurnBanner, BluffModal, ...
│   │   │   ├── hooks/              ← useGameSocket, useTurn, useBotMatch, useLocalStorage
│   │   │   ├── store/              ← Zustand store mirror server state
│   │   │   ├── motion/             ← Framer Motion variants (card flip, deal, transfer)
│   │   │   ├── lib/                ← api client, display helpers, id gen
│   │   │   └── styles/             ← Tailwind tokens, theme
│   │   ├── public/                 ← favicon, sound stubs, deck assets
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── server/                     ← Node + Fastify + uWebSockets game server
│       ├── src/
│       │   ├── http/               ← REST routes (/health, POST /api/rooms)
│       │   ├── ws/                 ← WebSocket handler, room registry
│       │   ├── game/               ← GameEngine, rules, state machine, event log
│       │   ├── bot/                ← BotRunner + tier impls (Easy/Normal/Hard)
│       │   ├── room/               ← RoomManager, matchmaking by code
│       │   ├── persistence/        ← Postgres adapter, Redis adapter, replay store
│       │   └── index.ts            ← bootstrap
│       ├── migrations/             ← SQL migrations
│       └── package.json
│
├── packages/
│   ├── shared/                     ← TypeScript types shared FE↔BE
│   │   ├── src/
│   │   │   ├── types/              ← Card, Player, GameState, Rank, Suit
│   │   │   ├── protocol/           ← WS event catalog (ClientToServer, ServerToClient)
│   │   │   └── rules/              ← Pure rule functions (no I/O), importable di FE & BE
│   │   └── package.json
│   │
│   └── bot-engine/                 ← Decision logic, bisa dipakai di server (dan di FE untuk "Suggest move" demo nanti)
│       ├── src/
│       │   ├── easy/
│       │   ├── normal/
│       │   ├── hard/               ← belief state, expected-info-gain
│       │   └── shared/             ← ActionValidator, BeliefState
│       └── package.json
│
├── tools/
│   ├── bot-arena/                  ← CLI untuk simulasi head-to-head bot (CI friendly)
│   └── seed-scripts/               ← generate dummy rooms, replays
│
├── docs/
│   ├── PRD.md                      ← (sudah ada)
│   ├── PROJECT_OVERVIEW.md         ← (this file)
│   ├── ARCHITECTURE.md             ← detail architecture (next doc)
│   ├── RULES.md                    ← canonical aturan Quartet
│   └── PROTOCOL.md                 ← WS protocol spec lengkap
│
├── turbo.json                      ← Turborepo pipeline
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── README.md
```

**Kenapa monorepo?** — Shared types dan rules function dipakai dua sisi; tanpa satu repo, drift types sering jadi bug source of truth.

---

## 3. High-Level Architecture

```
              ┌────────────────────────────────────────────┐
              │              Browser Client                │
              │  ┌──────────────────────────────────────┐  │
              │  │ React UI (cards, lobby, animations)  │  │
              │  └────────────────┬─────────────────────┘  │
              │                   │ WS                     │
              └───────────────────┼────────────────────────┘
                                  │
                                  ▼
        ┌──────────────────────────────────────────────────┐
        │                Game Server (Node)                │
        │                                                  │
        │   ┌─────────────┐   ┌─────────────────────────┐  │
        │   │ RoomManager │ ─►│       GameEngine         │  │
        │   └─────────────┘   │  (state machine, rules)  │  │
        │          ▲          │                          │  │
        │          │          │   ┌────────────────────┐  │  │
        │          │          │   │   BluffResolver    │  │  │
        │          │          │   └────────────────────┘  │  │
        │          │          └────────┬──────────────────┘  │
        │          │                   │                     │
        │          │            ┌──────▼──────────┐          │
        │          └────────────│   BotRunner     │          │
        │                       │  (Easy/Normal/  │          │
        │                       │   Hard runners) │          │
        │                       └─────────────────┘          │
        │                                                  │
        │   ┌─────────────┐   ┌─────────────────────────┐  │
        │   │  WS layer   │   │   Persistence layer     │  │
        │   │ (snapshot,  │   │   (Postgres + Redis)    │  │
        │   │  events)    │   │                         │  │
        │   └─────────────┘   └─────────────────────────┘  │
        └────────────┬──────────────────────┬──────────────┘
                     │                      │
                     ▼                      ▼
              ┌──────────────┐       ┌──────────────┐
              │  PostgreSQL  │       │    Redis     │
              │ (rooms,      │       │ (ephemeral   │
              │  replays)    │       │  game state) │
              └──────────────┘       └──────────────┘
```

**Prinsip kunci:**
1. **Server authoritative** — klien tidak pernah dipercaya untuk state. Server owns truth, klien render snapshot.
2. **Bot = pemain biasa** — bot pakai `ActionValidator` & `GameState` API yang sama dengan manusia (no cheat).
3. **Stateless clients** — tiap refresh/reconnect = join ulang + server kirim snapshot.

---

## 4. Module Responsibilities

### 4.1 `apps/web` — Frontend

| Modul | Tanggung Jawab |
|-------|----------------|
| `pages/Landing` | CTA "Main Sendirian" / "Buat Room" / "Gabung Room" + link aturan |
| `pages/Lobby` | Single-player: pilih difficulty. Multiplayer: form kode + nama |
| `pages/Room` | List pemain, status ready, tombol "Mulai" (host only) |
| `pages/Game` | Render snapshot, interaksi (ask, bluff-call), animasi |
| `pages/Result` | Skor akhir, timeline, rematch |
| `components/Card` | Single card dengan flip animation, hover, selected state |
| `components/Hand` | Sortable hand of player's own cards |
| `components/Opponent` | Avatar + card count + quartet slots |
| `components/TurnBanner` | Highlight giliran + countdown bluff-call |
| `components/BluffModal` | 5-second decision modal |
| `store/gameStore` | Zustand: state mirror, derived selectors |
| `hooks/useGameSocket` | Connect, reconnect, dispatch events to store |

### 4.2 `apps/server` — Backend

| Modul | Tanggung Jawab |
|-------|----------------|
| `RoomManager` | CRUD room by code, expiry, occupancy, host management |
| `GameEngine` | Pure-ish state machine: init → turn loop → quartet detection → game over. Emit events. |
| `BluffResolver` | Setelah jawaban "tidak punya", buka window 5 detik, jalankan tuduhan atau timeout |
| `BotRunner` | Scheduler; panggil `bot.decide(state)` saat giliran bot; inject ke GameEngine sebagai aksi |
| `ws/handler` | Auth (cookie), dispatch event ke room, broadcast snapshot |
| `persistence/postgres` | Rooms, replays, snapshots (untuk reconnect & replay) |
| `persistence/redis` | Ephemeral: in-game state hot cache, presence |
| `http/routes` | `/health`, `POST /api/rooms` |

### 4.3 `packages/shared` — Shared types & rules

| Modul | Tanggung Jawab |
|-------|----------------|
| `types/Card` | `{ rank: Rank; suit: Suit; id: CardId }` |
| `types/Player` | `{ id, name, handCount, quartets, isConnected }` |
| `types/GameState` | snapshot lengkap: deck, players, currentTurn, log, phase |
| `protocol/events.ts` | Katalog event WS dua arah, type-safe via discriminated unions |
| `rules/` | Pure functions: `canAsk`, `completeQuartet`, `isGameOver`, `applyAction` (input → newState) |

### 4.4 `packages/bot-engine` — Bot AI

| Modul | Tanggung Jawab |
|-------|----------------|
| `shared/ActionValidator` | Filter aksi valid (rank ≠ quartet lengkap, target ≠ self, dll.) |
| `shared/BeliefState` | Maintain posterior P(pemain punya rank) — dipakai Hard |
| `easy/index` | Uniform random |
| `normal/index` | Greedy + bookkeeping ringan |
| `hard/index` | Bayesian + expected info gain |

---

## 5. Data Flow — Satu Aksi

Contoh: Budi bertanya ke Sari untuk rank "7".

```
┌─────────┐                          ┌─────────┐                     ┌─────────┐
│  Budi   │  WS: { type:"ask",       │  Server │ applyAction()       │  Sari   │
│ (FE)    │   target:"sari",         │         │                     │ (FE)    │
│         │   rank:"7" }             │         │                     │         │
│         │ ───────────────────────► │         │ ─────────────────► │         │
│         │                          │         │   state.snapshot    │         │
│         │                          │         │   turn.changed      │         │
│         │                          │         │   card.transferred  │         │
│         │ ◄─────────────────────── │         │                     │         │
│         │   broadcast ke semua     │         │                     │         │
└─────────┘                          └─────────┘                     └─────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  BluffResolver  │
                              │  (5s window)    │
                              └────────┬────────┘
                                       │
                          (Sari jawab "tidak punya" padahal bohong?)
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Budi (FE)      │
                              │  BluffModal     │
                              │  5 detik timer  │
                              │  [Tuduh][Lanjut]│
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  resolveBluff() │
                              │  → penalty      │
                              │  → broadcast    │
                              └─────────────────┘
```

**Key point**: Klien tidak pernah memutuskan hasil — hanya mengirim intent. Server validate + execute + broadcast.

---

## 6. Game State Machine

```
        ┌──────────┐
        │  LOBBY   │  (nungguin pemain / start)
        └────┬─────┘
             │ host.start (min 2 pemain)
             ▼
        ┌──────────┐
        │ DEALING  │  (acak & bagi kartu)
        └────┬─────┘
             │ auto
             ▼
        ┌──────────┐  ◄────────────────────────┐
        │  TURN    │   currentPlayer.ask()     │
        │  (loop)  │ ─────────────────────────►│
        └────┬─────┘                          │
             │ transfer == 0                  │
             │ → BLOFF_WINDOW                 │
             ▼                                │
        ┌──────────────┐  timeout / no-call    │
        │ BLUFF_WINDOW │ ──────────────────────┘
        └────┬─────────┘
             │ accuse
             ▼
        ┌──────────────┐
        │  RESOLVE     │  → next turn
        └────┬─────────┘
             │
             ▼
        ┌──────────┐
        │ QUARTET? │  jika iya → emit quartet.formed, pisah kartu
        └────┬─────┘
             │
             ▼
        ┌──────────────┐
        │ GAME_OVER?   │  ya → GAME_OVER
        └────┬─────────┘
             │ tidak
             ▼
        (balik ke TURN, pemain berikutnya)
```

State machine ini enforceable via TypeScript discriminated unions, jadi semua transisi invalid akan error di compile time.

---

## 7. WebSocket Protocol — Ringkas

Detail lengkap akan di `docs/PROTOCOL.md`. Overview:

| Arah | Event | Purpose |
|------|-------|---------|
| S→C | `state.snapshot` | Full state saat join + setiap aksi |
| S→C | `turn.changed` | Highlight giliran + tampilkan countdown bluff |
| S→C | `card.transferred` | Animasi kartu pindah |
| S→C | `quartet.formed` | Quartet dibuka di tengah meja |
| S→C | `bluff.calling` | 5 detik window aktif |
| S→C | `bluff.resolved` | Hasil tuduhan + penalty |
| S→C | `game.over` | Skor + rematch option |
| C→S | `join` | Daftar sebagai pemain |
| C→S | `start` | Host kick off |
| C→S | `ask` | `{ targetId, rank }` |
| C→S | `bluff.call` | Tuduh bohong |
| C→S | `chat.text` | Rate-limited, sanitized |
| C→S | `rematch` | Request main ulang |

Semua event di-type dengan discriminated union → autocompletion di klien & server, invalid shape compile-error.

---

## 8. Bot Architecture

```
                     GameEngine.notify(state)
                              │
                              ▼
                     BotRunner (per room)
                              │
                              ▼
              ┌───────────────┴───────────────┐
              │  if currentPlayer is bot     │
              │  → bot.decide(state)         │
              │     ┌─────────────────┐      │
              │     │ ActionValidator │      │
              │     │  → valid actions │      │
              │     └────────┬────────┘      │
              │              │               │
              │              ▼               │
              │     ┌──────────────────┐    │
              │     │ Bot tier picker  │    │
              │     │  (Easy/Normal/   │    │
              │     │   Hard)          │    │
              │     └────────┬─────────┘    │
              │              │              │
              │              ▼              │
              │     ┌──────────────────┐    │
              │     │ Hard: BeliefState│    │
              │     │ + EIG selection  │    │
              │     └────────┬─────────┘    │
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                     Action { type, target, rank }
                             │
                             ▼
                     GameEngine.applyAction()
                             │
                             ▼
                     broadcast state.snapshot
```

**Kunci testing**: `tools/bot-arena/` CLI bisa simulasi 1000 game head-to-head antar tier, output win-rate matrix → dipakai di CI sebagai gate quality.

---

## 9. Phased Delivery

| Phase | Scope | Estimasi | Exit Criteria |
|-------|-------|----------|---------------|
| **0. Skeleton** | Monorepo, shared types, FE Hello World, BE `/health`, CI lint+typecheck | 2–3 hari | `pnpm dev` jalan, typecheck clean |
| **1. GameEngine** | `packages/shared/rules` lengkap + unit tests | 1 minggu | 100% aturan tertutup test, deterministic shuffle via seed |
| **2. Single-player** | FE Game UI, BotRunner (Easy), end-to-end 1 manusia vs 1 bot | 1 minggu | Bisa main 1 game penuh melawan bot Easy |
| **3. Bot tiers** | Normal + Hard, bot-arena CI | 1 minggu | Hard > Normal > Easy di 1000 simulasi |
| **4. Multiplayer MVP** | RoomManager, WS layer, FE Room + Lobby | 1 minggu | 2 manusia di room berbeda device bisa main end-to-end |
| **5. Polish & launch** | BluffModal timing, animasi, sound (optional), hosting, observability | 1 minggu | KPI metrik terpasang, deployed ke staging |

Total MVP: **~6 minggu** untuk 1 developer.

---

## 10. Local Development Setup

### Prasyarat
- Node.js 20+
- pnpm 9+
- Docker (untuk Postgres + Redis lokal) atau keduanya terinstall langsung
- (Opsional) `just` atau `make` untuk shortcut

### One-time setup
```bash
pnpm install
docker compose up -d postgres redis
pnpm db:migrate                  # di apps/server
pnpm dev                         # turbo parallel: web + server
```

### Akses
- Web: http://localhost:5173
- Server: http://localhost:3000 (REST), ws://localhost:3000/ws
- Postgres: localhost:5432, Redis: localhost:6379

### Commands berguna
```bash
pnpm typecheck                   # tsc --noEmit di semua packages
pnpm test                        # vitest di semua packages
pnpm lint
pnpm --filter @quartet/server test
pnpm --filter @quartet/bot-engine arena --tier hard vs normal --games 1000
pnpm --filter @quartet/web dev
```

---

## 11. Open Questions (Recap dari PRD)

Ini jawaban yang masih dibutuhkan sebelum implement; sementara saya pakai default di overview ini.

| # | Question | Default sementara |
|---|----------|-------------------|
| 1 | Tech stack final: React+Node vs SvelteKit? | **React+Node** (sesuai recommendation) |
| 2 | Bahasa UI: ID saja atau bilingual? | **ID saja** (MVP) |
| 3 | Perlu SFX? | **Silent dulu**, sound optional di v1.1 |
| 4 | Visual style: realistis vs flat-illustration? | **Standard flat card** (hemat waktu) |
| 5 | Hosting: self-host vs managed? | **Managed Railway/Vercel** (faster iteration) |
| 6 | Aset kartu: open-source SVG atau custom? | **Open-source SVG deck** (simple playing cards) |
| 7 | Target concurrent users bulan 1? | **≤ 200 concurrent rooms** (default aman) |

---

## 12. Next Steps

Setelah dokumen ini disetujui:

1. **Phase 0 — Skeleton** (1 file `pnpm-workspace.yaml`, `turbo.json`, package.json per app, hello world pages).
2. **ARCHITECTURE.md** — detail arsitektur untuk fase implementasi (komponen, sequence diagram, dsb.).
3. **PROTOCOL.md** — WebSocket protocol full spec dengan payload types.
4. **RULES.md** — canonical aturan Quartet yang akan jadi acuan `packages/shared/rules`.
5. **First commit**: monorepo skeleton + CI lint/typecheck passing.

Mau saya lanjut ke phase berikutnya (skeleton repo), atau mau dokumen lain dulu (ARCHITECTURE / PROTOCOL / RULES)?

---
*End of Project Overview*