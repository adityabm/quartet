# PROGRESS.md — Quartet Web Tracker

> Companion doc untuk `PRD.md` + `PROJECT_OVERVIEW.md` + `AGENTS.md`.
> File ini adalah **catatan hidup** proyek: apa yang sudah kita lakukan, apa yang akan dilakukan, keputusan yang diambil, dan blocker yang masih terbuka.

---

## 📌 How to Use

**Awal sesi (agent):**
1. Baca `PRD.md` + `PROJECT_OVERVIEW.md` (kontrak).
2. Cek `§1 Current State` dan `§2 Phase Tracker` di file ini untuk tahu posisi kita.
3. Cek `§5 Open Questions` untuk blocker yang perlu jawaban user.

**Akhir sesi (agent):**
1. Append entry baru di `§3 Session Log` (jangan overwrite entry lama).
2. Update centang di `§2 Phase Tracker` untuk item yang selesai.
3. Kalau ada keputusan baru → tambahkan baris di `§4 Decisions Log`.
4. Kalau ada pertanyaan baru / jawaban user → update `§5 Open Questions`.
5. Update `§6 File Inventory` kalau ada file baru.

User juga boleh update manual kapan saja. Format entry di `§3` singkat saja: tanggal, yang dilakukan, keputusan, blockers, next plan.

---

## 1. Current State (Snapshot)

| Item | Status |
|------|--------|
| Repo | `D:\Server\web\quartet` (greenfield, belum ada kode) |
| Phase saat ini | **Pre-Phase 0** (dokumentasi selesai, skeleton belum dimulai) |
| Next milestone | Init monorepo (pnpm + turbo + tsconfig.base + hello world apps) |
| Last update | 2026-10-15 (Sesi 1) |
| Open blockers | 7 pertanyaan dari PRD §4.2 — user belum jawab (masih pakai default) |
| Total file committed | 0 (belum `git init`) |
| Total lines of code | 0 |

---

## 2. Phase Tracker

> ✅ done · 🚧 in progress · ⏳ todo · 🚫 blocked · ⏸️ deferred

### Phase 0 — Skeleton  ⏳ TODO
- [ ] `pnpm-workspace.yaml` + `turbo.json` + root `package.json`
- [ ] `tsconfig.base.json` (strict mode)
- [ ] `apps/web` — Vite + React + TS hello world + Tailwind + Framer Motion
- [ ] `apps/server` — Fastify + uWebSockets hello world + `GET /health`
- [ ] `packages/shared` — folder skeleton + placeholder exports
- [ ] `packages/bot-engine` — folder skeleton + placeholder exports
- [ ] ESLint + Prettier (root config + per-package extends)
- [ ] Husky + lint-staged hooks
- [ ] Vitest config + 1 smoke test (`packages/shared`)
- [ ] GitHub Actions: typecheck, test, lint, audit
- [ ] `docker-compose.yml` (postgres + redis)
- [ ] `README.md` (dev quickstart)
- [ ] `.gitignore` + `.env.example`
- [ ] First commit: `chore(repo): init monorepo skeleton`

### Phase 1 — GameEngine  ⏳ TODO
- [ ] `packages/shared/types` — Card, Player, GameState, Rank, Suit, RoomCode
- [ ] `packages/shared/protocol` — WS event catalog (ClientToServer, ServerToClient)
- [ ] `packages/shared/rules` — pure functions: init, deal, ask, completeQuartet, isGameOver, applyAction
- [ ] `packages/shared/rng` — seeded RNG (mulberry32 atau serupa)
- [ ] `packages/shared/constants.ts` — timeouts, deck size, max players, dll.
- [ ] Unit tests untuk semua rules (target 100% coverage)
- [ ] `docs/RULES.md` — canonical aturan Quartet Indonesia + bluffing
- [ ] `docs/PROTOCOL.md` — WS event spec lengkap dengan payload types

### Phase 2 — Single-player  ⏳ TODO
- [ ] FE Game UI: Card, Hand, Opponent, QuartetSlot, TurnBanner, BluffModal
- [ ] FE Zustand store mirror server state
- [ ] FE `useGameSocket` hook + `useTurn` hook
- [ ] BE BotRunner + Easy tier (uniform random)
- [ ] End-to-end: 1 manusia vs 1 bot, 1 game penuh berjalan
- [ ] Animasi dasar (card flip, transfer, quartet)

### Phase 3 — Bot tiers  ⏳ TODO
- [ ] Normal tier (greedy + bookkeeping)
- [ ] Hard tier (Bayesian belief state + expected info gain)
- [ ] `tools/bot-arena` CLI untuk head-to-head simulasi
- [ ] CI gate: Hard > Normal > Easy win-rate ≥ 60%
- [ ] Compliance unit tests untuk bot

### Phase 4 — Multiplayer MVP  ⏳ TODO
- [ ] BE RoomManager (create/join/leave/expire)
- [ ] BE WS layer (auth cookie, dispatch event, broadcast snapshot)
- [ ] FE Room page (lobby, players list, ready/start)
- [ ] FE BluffModal dengan 5-second countdown
- [ ] FE animasi transfer kartu antar pemain
- [ ] End-to-end: 2 manusia, 2 device berbeda, 1 game penuh

### Phase 5 — Polish & Launch  ⏳ TODO
- [ ] Animasi Framer Motion (card flip, slide, pulse, celebrate)
- [ ] Hosting setup (Vercel + Railway, region SG)
- [ ] Observability minimum (logs, metrics, error tracking)
- [ ] Staging deploy + smoke test
- [ ] Documentation final + release notes

### Backlog (v1.1, v1.2, v2.0)  ⏸️ DEFERRED
Lihat `PROJECT_OVERVIEW.md` §5.1 untuk roadmap lengkap. Catatan singkat:

- v1.1: rematch, SFX gamelan, stats lokal, halaman aturan in-app
- v1.2: 1 tema kartu alternatif "Quartet Nusantara", spectator mode, replay viewer, leaderboard
- v2.0: akun opsional, friends list, tournament, PWA, i18n EN, bot "Impossible"

---

## 3. Session Log

### 2026-10-15 — Sesi 1

**Yang dilakukan:**
- ✅ Brainstorm awal Quartet Web dengan user.
- ✅ Grill 4 pertanyaan kunci (variant aturan, multiplayer arch, bot scope, MVP scope) — semua dijawab dengan recommended.
- ✅ Buat `PRD.md` (v0.1) — Executive Summary, UX & Functionality, Bot Spec, Technical Spec, Risks & Roadmap.
- ✅ Buat `PROJECT_OVERVIEW.md` (v0.1) — Repo structure, arsitektur, module breakdown, data flow, state machine, protocol, phased delivery, local dev setup.
- ✅ Buat `AGENTS.md` (v0.1) — Operating manual: gameplay design (Quartet Indonesia + nuansa Nusantara), workflow rules (conventional commits, unit tests, DRY, component-based, security review), Definition of Done, Design Approval Flow.
- ✅ Buat `PROGRESS.md` (file ini).

**Decisions yang diambil:** (lihat §4 untuk detail)
- Variant: Quartet Indonesia klasik + bluffing.
- Multiplayer: Real-time WebSocket dengan room code.
- Bot: 3 tingkat (Easy/Normal/Hard).
- Scope: MVP ramping.
- Repo: Monorepo (pnpm + Turborepo), TS end-to-end.
- Server authoritative; bot = pemain biasa (no cheat).
- Indonesian flavor: lapisan presentasi (bahasa ID, visual batik subtle), bukan mengubah aturan.
- Default tech: React + Node sampai user konfirmasi.

**Open questions / blockers:**
- 7 pertanyaan PRD §4.2 / PROJECT_OVERVIEW §11 masih pakai default — perlu jawaban user.

**Next session plan:**
- (a) Jawab 7 open questions dulu sebelum kode.
- (b) Atau mulai Phase 0 — Skeleton dengan default yang sudah disepakati.
- Pilih: tanyakan ke user di awal sesi berikutnya.

---

## 4. Decisions Log

| # | Date | Decision | Rationale | Source |
|---|------|----------|-----------|--------|
| D1 | 2026-10-15 | Quartet Indonesia klasik + bluffing untuk MVP | User confirm; autentik & diferensiasi kuat | PRD §1, AGENTS §1.1 |
| D2 | 2026-10-15 | Real-time WebSocket multiplayer | User confirm; UX paling seru | PRD §1 |
| D3 | 2026-10-15 | Bot 3 tingkat (Easy/Normal/Hard) | User confirm; jangkauan pemain luas | PRD §3 |
| D4 | 2026-10-15 | MVP ramping dulu | User confirm; iterasi cepat, polish belakangan | PRD §1, §5.1 |
| D5 | 2026-10-15 | Monorepo pnpm + Turborepo | Shared types & protocol antara FE & BE wajib satu sumber | PROJECT_OVERVIEW §2 |
| D6 | 2026-10-15 | Server authoritative | Anti-cheat by design; klien hanya mirror state | PROJECT_OVERVIEW §3, §4.4 |
| D7 | 2026-10-15 | Bot = pemain biasa (no cheat) | Fairness & testability | PROJECT_OVERVIEW §3, AGENTS §1.1 |
| D8 | 2026-10-15 | Indonesian flavor = lapisan presentasi | Aturan tidak diubah, rasa Nusantara di pixel | AGENTS §1.2 |
| D9 | 2026-10-15 | Default tech: React+Node, Postgres+Redis | Default sementara sampai user konfirmasi | PROJECT_OVERVIEW §11 |
| D10 | 2026-10-15 | Quality gates wajib sebelum push | typecheck + test + lint + audit + security review | AGENTS §2.5, §4 |
| D11 | 2026-10-15 | Conventional commits + DRY + component-based | Standar industri, memudahkan review & maintenance | AGENTS §2.1, §2.3, §2.4 |
| D12 | 2026-10-15 | Unit tests wajib dengan coverage target | shared 100%, bot ≥90%, game ≥85%, FE hooks ≥80% | AGENTS §2.2 |

---

## 5. Open Questions (Blockers)

### Dari PRD §4.2 / PROJECT_OVERVIEW §11

| # | Question | Default sementara | Impact kalau dijawab nanti |
|---|----------|-------------------|----------------------------|
| Q1 | Tech stack final: React+Node (recommended) atau SvelteKit single-repo? | React+Node | Mengubah struktur repo & dependency list |
| Q2 | Bahasa UI: ID saja atau bilingual EN/ID? | ID saja | Menambah struktur i18n + extra strings |
| Q3 | Perlu SFX? | Silent dulu, SFX di v1.1 | Menambah audio assets + state management |
| Q4 | Visual style: realistis foto kartu atau flat-illustration? | Standard flat card | Mengubah asset pipeline + design system |
| Q5 | Hosting: self-host atau managed? | Managed Railway/Vercel | Mengubah deployment config + biaya |
| Q6 | Aset kartu: open-source SVG deck atau custom? | Open-source SVG deck | Mengubah asset folder + license notes |
| Q7 | Target concurrent users bulan 1? | ≤ 200 concurrent rooms | Mengubah arsitektur scaling + DB choice |

### Tambahan (selesai Sesi 1)

| # | Question | Notes |
|---|----------|-------|
| Q8 | Mau jawab Q1–Q7 dulu sebelum Phase 0, atau mulai skeleton dengan default? | Mengubah urutan eksekusi |
| Q9 | Ada desain/mock yang sudah ada di kepala user, atau agent yang propose lebih dulu? | Menentukan alur design approval |

---

## 6. File Inventory

| Path | Status | Last touched | Phase |
|------|--------|--------------|-------|
| `PRD.md` | ✅ v0.1 | 2026-10-15 | — |
| `PROJECT_OVERVIEW.md` | ✅ v0.1 | 2026-10-15 | — |
| `AGENTS.md` | ✅ v0.1 | 2026-10-15 | — |
| `PROGRESS.md` | ✅ v0.1 (this file) | 2026-10-15 | — |
| `package.json` (root) | ⏳ TODO | — | Phase 0 |
| `pnpm-workspace.yaml` | ⏳ TODO | — | Phase 0 |
| `turbo.json` | ⏳ TODO | — | Phase 0 |
| `tsconfig.base.json` | ⏳ TODO | — | Phase 0 |
| `.gitignore` | ⏳ TODO | — | Phase 0 |
| `.env.example` | ⏳ TODO | — | Phase 0 |
| `docker-compose.yml` | ⏳ TODO | — | Phase 0 |
| `README.md` | ⏳ TODO | — | Phase 0 |
| `.github/workflows/ci.yml` | ⏳ TODO | — | Phase 0 |
| `apps/web/` | ⏳ TODO | — | Phase 0+ |
| `apps/server/` | ⏳ TODO | — | Phase 0+ |
| `packages/shared/` | ⏳ TODO | — | Phase 0+ |
| `packages/bot-engine/` | ⏳ TODO | — | Phase 0+ |
| `tools/bot-arena/` | ⏳ TODO | — | Phase 3 |
| `docs/RULES.md` | ⏳ TODO | — | Phase 1 |
| `docs/PROTOCOL.md` | ⏳ TODO | — | Phase 1 |
| `docs/ARCHITECTURE.md` | ⏳ TODO | — | Phase 0.5 (optional) |

---

## 7. Quick Status

```
╔════════════════════════════════════════════════════════════╗
║  Quartet Web — Status Sesi 1 (2026-10-15)                  ║
╠════════════════════════════════════════════════════════════╣
║  📋 PRD                 ✅ Done                             ║
║  🏗  Project Overview    ✅ Done                             ║
║  🤖 Agent Manual         ✅ Done                             ║
║  📈 Progress Tracker     ✅ Done (this file)                 ║
║  💻 Code                 ⏳ Not started                     ║
║  🧪 Tests                ⏳ Not started                     ║
║  🚀 Deploy               ⏳ Not started                     ║
╠════════════════════════════════════════════════════════════╣
║  Open blockers: 9 (7 PRD + 2 tambahan)                      ║
║  Next action: tunggu user jawab blockers atau mulai Phase 0 ║
╚════════════════════════════════════════════════════════════╝
```

---

*Update file ini di akhir setiap sesi kerja. Format entry baru di §3 chronological — jangan overwrite entry lama.*