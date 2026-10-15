# PRD — Quartet Web

> Product Requirements Document
> Versi: 0.1 (Draft awal)
> Tanggal: 14 Oktober 2026
> Status: Menunggu konfirmasi tech stack & open questions

---

## 1. Executive Summary

### Problem Statement
Quartet adalah permainan kartu klasik Indonesia yang dicintai banyak orang, dengan mekanisme sosial unik berupa **bluffing** (berbohong soal kepemilikan kartu) dan konsekuensinya (quartet bisa direbut). Saat ini belum ada implementasi web yang authentikan memadukan aturan klasik + bluffing, multiplayer real-time, dan latihan lawan komputer yang menantang dalam satu produk yang ringan dan gratis.

### Proposed Solution
**Quartet Web** — aplikasi web responsif (mobile-first) yang menyediakan:

- Mode **Single-player vs Bot** dengan 3 tingkat kesulitan (Easy / Normal / Hard).
- Mode **Multiplayer real-time** berbasis WebSocket dengan room code 6 karakter.
- Aturan Quartet Indonesia klasik **lengkap termasuk mekanisme bluffing & hukumannya**.
- Tanpa registrasi akun untuk MVP (identifikasi hanya melalui display name + room code).
- Animasi ringan, kartu remi standar, fokus pada gameplay > visual.

### Success Criteria (KPI)

| # | KPI | Target |
|---|-----|--------|
| 1 | **Completion rate** | ≥ 80% room multiplayer menyelesaikan 1 game penuh tanpa disconnect |
| 2 | **Time-to-first-game** | < 30 detik dari landing page hingga kartu pertama dibagikan |
| 3 | **Bot Hard win-rate vs pemain baru** | 55–70% pada 100 game simulasi (menantang tapi fair) |
| 4 | **Latency P95 aksi** | < 300 ms end-to-end untuk region Asia Tenggara |
| 5 | **Lighthouse Mobile** | ≥ 90 Performance & Accessibility pada mid-tier Android |

---

## 2. User Experience & Functionality

### 2.1 User Personas

1. **Budi (25, Pemain Kasual)** — biasa main Quartet saat kumpul keluarga. Ingin versi online supaya bisa main saat terpisah jarak dengan teman/keponakan.
2. **Sari (17, Pemain Baru)** — baru kenal Quartet, ingin belajar aturan dan mekanisme bluffing dengan aman lewat bot Easy sebelum menantang manusia.
3. **Rio (30, Pemain Kompetitif)** — hafal kartu dan probabilitas. Ingin menantang bot Hard atau teman online dengan waktu singkat.

### 2.2 User Stories & Acceptance Criteria

#### Single-player
- **US-1**: *Sebagai pemain baru, saya ingin bermain melawan bot **Easy** agar bisa belajar aturan tanpa tekanan.*
  - AC: Bot Easy melakukan keputusan valid secara acak (uniform random).
  - AC: Tombol **"Lihat Aturan"** selalu tersedia dari lobby & in-game.
- **US-2**: *Sebagai pemain berpengalaman, saya ingin memilih tingkat kesulitan bot.*
  - AC: 3 opsi (Easy / Normal / Hard) di lobby single-player.
  - AC: Pilihan terakhir disimpan di `localStorage` dan di-prefill di sesi berikutnya.
- **US-3**: *Sebagai pemain, saya ingin melihat **statistik akhir game** (quartet dikumpulkan, giliran, kartu diambil dari stok).*
  - AC: Modal "Akhir Game" menampilkan skor, quartet per pemain, dan urutan kejadian (timeline).
  - AC: Riwayat 10 game terakhir tersimpan lokal dan bisa dibuka kembali.

#### Multiplayer
- **US-4**: *Sebagai tuan rumah, saya ingin membuat **room** dan membagikan kode 6-karakter agar teman bisa gabung.*
  - AC: Room code = 6 char alfanumerik uppercase, unik, collision-free.
  - AC: Room kosong auto-expire dalam 30 menit.
  - AC: Host dapat kick pemain lain.
- **US-5**: *Sebagai pemain, saya ingin gabung room via kode tanpa akun agar cepat mulai.*
  - AC: Form input kode + display name (2–20 char, unik dalam room).
  - AC: Tidak ada email / password / captcha untuk MVP.
- **US-6**: *Sebagai pemain, saya ingin **umpan balik jelas** saat giliran saya.*
  - AC: State "giliran kamu" di-highlight dengan border glow + animasi pulse ≤ 1.5 detik.
  - AC: Indikator visual "kamu sedang ditanyakan kartu X oleh Y".

#### Aturan & UI
- **US-7**: *Sebagai pemain, kartu saya harus **tersembunyi** dari pemain lain.*
  - AC: Server tidak pernah mengirim state kartu private ke client yang bukan pemiliknya.
  - AC: Yang terlihat publik: jumlah kartu per pemain + quartet terbuka di tengah meja.
- **US-8**: *Sebagai pemain, saya ingin tombol **"Tuduh Bohong"** saat lawan menjawab "tidak punya" untuk mengaktifkan bluffing.*
  - AC: Setelah lawan menjawab "tidak punya", pemain yang bertanya punya **5 detik** untuk memilih "Tuduh bohong".
  - AC: Jika **benar**: penanya mengambil 1 kartu random dari tangan lawan.
  - AC: Jika **salah**: penanya kehilangan 1 quartet yang sudah dikumpulkan (jika ada).
  - AC: Status "siapa yang sedang dituduh" tampil ke semua pemain.

### 2.3 Non-Goals (MVP)

- Akun pengguna, profil persisten, friends list.
- Matchmaking otomatis, ranked, leaderboard.
- Tema kartu koleksi bergambar (kecuali kartu remi standar).
- Mobile native app (cukup web responsive / PWA nanti).
- Turn-based async / play-by-mail.
- Modifikasi aturan, kartu custom, power-up.
- Tutorial interaktif step-by-step (cukup halaman aturan tekstual).
- i18n multibahasa (MVP hanya Bahasa Indonesia).
- Replay video / share ke sosmed.

---

## 3. AI System Requirements (Bot)

Bot berjalan **di server** sebagai "pemain sintetis" dengan API yang sama dengan pemain manusia (tidak ada akses cheat ke state) untuk menjamin fairness dan testability.

### 3.1 Tiga Tingkatan

#### Easy
- **Strategi**: Uniform random di antara semua aksi valid.
- **Memori**: Tidak ada.
- **Tujuan**: Pemanasan, validasi aturan, pemain baru.
- **Deterministik**: Tidak (acak), kecuali di-seed untuk testing.

#### Normal
- **Strategi**: Greedy + bookkeeping ringan.
- **Memori**: Track semua `ask(rank, target)` dan jawabannya (ya/tidak); track kartu yang masuk dari stok.
- **Heuristik**:
  - Hindari bertanya rank yang sudah terbukti tidak ada di tangan lawan (dari riwayat).
  - Pilih target yang peluangnya paling tinggi berdasarkan inferensi sederhana (rank yang sering "ya" untuk target tersebut).
- **Tujuan**: Lawan yang masuk akal untuk pemain kasual.
- **Deterministik**: Deterministik terhadap seed.

#### Hard
- **Strategi**: Probabilistik Bayesian + adaptive questioning.
- **Belief State**: Pertahankan `P(pemain p punya rank r)` untuk semua (p, r) yang belum jadi quartet, diperbarui setiap event tanya-jawab, transfer kartu, dan ambil stok.
- **Pemilihan Aksi**: Maksimize **expected information gain** atau **expected quartet completion probability**.
- **Saat ditanya & jawab "tidak punya"**: Keputusan bohong/tidak bohong dengan probabilitas yang menurun bila sering ketahuan.
- **Akurasi**: Tuning parameter internal agar Hard > Normal > Easy di head-to-head, tapi tetap bisa dikalahkan.
- **Deterministik**: Deterministik terhadap seed + RNG.

### 3.2 Evaluation Strategy

| Metode | Deskripsi | Pass Criteria |
|---|---|---|
| **Head-to-head simulasi** | 1000 game bot vs bot (Hard vs Normal vs Hard vs Easy) dengan seed terkontrol | Hard > Normal > Easy; minimal 60% win-rate antar tier |
| **Vs-pemain-baru simulasi** | Hard vs pemain yang memilih aksi uniform random | Win-rate Hard 55–70% |
| **Compliance unit tests** | Bot tidak boleh bertanya rank yang sudah dimiliki quartet lengkap, dst. | 100% pass |
| **Replay determinism** | Seed yang sama → pohon keputusan identik (kecuali Hard) | 100% pass untuk Easy/Normal |

### 3.3 Tools & Modul yang Dibutuhkan

- `GameState` API (read-only): tangan sendiri, kartu publik lawan, stok, giliran, log.
- `ActionValidator`: daftar `(targetId, rank)` yang valid.
- `BeliefState` (khusus Hard): struktur data distribusi posterior & update rules.
- `BotRunner`: scheduler yang memanggil `bot.decide(state)` saat giliran bot.

---

## 4. Technical Specifications

### 4.1 Architecture Overview

```
┌──────────────────┐    WebSocket    ┌─────────────────────────┐
│  React SPA       │  ─────────────► │   Game Server (Node)    │
│  (Vite + TS)     │  ◄───────────── │                         │
│  Tailwind        │    JSON events  │  ├─ RoomManager         │
│  Framer Motion   │                 │  ├─ GameEngine          │
└──────────────────┘                 │  ├─ BluffResolver       │
                                     │  ├─ BotRunner           │
                                     │  └─ Persistence layer   │
                                     └────────────┬────────────┘
                                                  │
                                       ┌──────────▼──────────┐
                                       │ Postgres (rooms,    │
                                       │ replay)             │
                                       │ Redis (ephemeral)   │
                                       └─────────────────────┘
```

**Prinsip**: Server **authoritative** — klien hanya render snapshot. Anti-cheat by design.

### 4.2 Tech Stack (Proposal — Konfirmasi Required)

| Layer | Pilihan A (Recommended) | Pilihan B (Alternatif) |
|-------|-------------------------|-------------------------|
| Frontend | React 18 + Vite + TS + Tailwind + Framer Motion | SvelteKit (lebih ringan) |
| Backend | Node.js + Fastify + `uWebSockets.js` | Node.js + Socket.IO |
| Database | PostgreSQL (rooms, replay) + Redis (ephemeral) | SQLite + Redis (lebih simpel dev) |
| Bot | TypeScript module di server | Sama |
| Hosting | FE: Vercel/Cloudflare Pages; BE: Railway/Render region SG | Monorepo single VPS (Hetzner SG) |

### 4.3 Integration Points

**HTTP**:
- `GET /health` → status server.
- `POST /api/rooms` → bikin room → `{ roomCode }`.

**WebSocket** (`/ws?room=XYZ&name=Budi`):

| Arah | Event | Payload |
|------|-------|---------|
| S→C | `state.snapshot` | full snapshot saat join / setelah aksi |
| S→C | `turn.changed` | `{ playerId }` |
| S→C | `card.transferred` | `{ from, to, rank }` (untuk animasi) |
| S→C | `quartet.formed` | `{ playerId, rank }` |
| S→C | `bluff.calling` | `{ accuserId, accusedId, deadlineMs }` |
| S→C | `bluff.resolved` | `{ correct, penalty }` |
| S→C | `game.over` | `{ scores, quartets }` |
| C→S | `join` | `{ name }` |
| C→S | `start` | host only |
| C→S | `ask` | `{ targetId, rank }` |
| C→S | `bluff.call` | `{}` |
| C→S | `chat.text` | `{ text }` (rate-limited, sanitized) |
| C→S | `rematch` | `{}` |

### 4.4 Security & Privacy

- **Auth MVP**: Tidak ada akun. Identifikasi via room code + display name + cookie sesi `httpOnly`.
- **Rate limit**: Maks 5 aksi/detik per socket untuk cegah spam.
- **Server validation**: Semua aksi divalidasi server (anti-cheat). Klien tidak boleh mengirim aksi di luar giliran, dengan rank yang tidak valid, atau tanpa kartu yang diminta.
- **Privacy kartu**: Tangan pemain tidak pernah dikirim ke klien lain. Yang publik: jumlah kartu & quartet terbuka. Transfer kartu hanya via event `card.transferred`.
- **Data minimization**: Tidak ada PII untuk MVP. Display name max 20 char, tidak disimpan permanen (kecuali di log internal yang di-hash).
- **Abuse mitigation**: Filter nama sederhana (blocklist kata kasar) + host-kick + auto-ban sementara bila rate limit dilanggar 3x.

---

## 5. Risks & Roadmap

### 5.1 Phased Rollout

#### MVP — Rilis 1 (~4–6 minggu, 1 dev)
- Single-player vs bot (3 tingkat) + multiplayer real-time dengan room code.
- Aturan klasik + bluffing lengkap.
- Animasi dasar + kartu remi standar.
- Hosting region Asia Tenggara (SG).
- Tanpa akun; analytics minimum (Plausible self-host).

#### v1.1 (+4 minggu)
- Rematch / new game in same room.
- Sound effects (SFX kartu, suara quartet).
- Statistik lokal (riwayat game, win-rate, distribusi rank).
- Halaman aturan **in-app** (offline-friendly).
- Anti-spam lebih kuat (CAPTCHA opsional untuk buat room).

#### v1.2 (+4 minggu)
- 1 tema kartu alternatif bergambar (ilustrasi original Indonesia).
- Spectator mode (join sebagai penonton).
- Replay viewer lengkap dengan timeline.
- Leaderboard mingguan (anonim, opt-in).

#### v2.0 (Eksplorasi)
- Akun opsional (Google/Apple sign-in).
- Friends list & invite.
- Tournament / bracket.
- PWA installable + push notification.
- i18n (English).
- Bot tier "Impossible" (eksperimen).

### 5.2 Technical Risks

| # | Risiko | Dampak | Mitigasi |
|---|--------|--------|----------|
| R1 | Latency tinggi antar kota | Multiplayer buruk | Region server SG dulu; tambah region ID di v1.1; fallback ke async jika WS gagal. |
| R2 | State drift (klien vs server) | Inkonsistensi UI, eksploitasi | Server authoritative; snapshot tiap aksi + heartbeat re-sync 30 detik. |
| R3 | Bot Hard imbalance (terlalu kuat/lemah) | Bukan tantangan yang pas | Evaluasi head-to-head otomatis di CI; threshold pass-rate; tuning parameter berkala. |
| R4 | Abuse (spam room, nama toxic) | UX rusak | Rate limit + filter nama + host-kick + ban sementara. |
| R5 | WebSocket gagal di jaringan tertentu | Pemain tidak bisa main | Auto-detect + pesan jelas + saran coba mode single-player. |
| R6 | UU PDP / GDPR bila ekspansi global | Risiko hukum | MVP minim data. DPIA saat v2.0 jika tambah akun. |
| R7 | Kompetitor (Quartet collection-card apps) | Diferensiasi kurang | Fokus pada bluffing klasik yang autentik — koleksi apps biasanya tanpa bluffing. |

### 5.3 Open Questions (perlu konfirmasi)

1. **Tech stack final**: React + Node (recommended) atau SvelteKit (single-repo)?
2. **Bahasa UI**: Cukup Bahasa Indonesia, atau perlu bilingual EN/ID?
3. **Suara**: Perlu SFX atau fully silent?
4. **Visual style**: Realistis (foto kartu) atau flat-illustration modern?
5. **Distribusi**: Self-host (Hetzner SG) atau managed (Vercel + Railway)?
6. **Lisensi aset kartu**: Boleh pakai open-source SVG deck, atau perlu custom?
7. **Skala awal**: Target berapa concurrent users di bulan 1? (mempengaruhi pilihan hosting.)

---

## Lampiran A — Referensi Aturan Quartet (ringkasan)

(UntukPRD; aturan detail akan diimplementasi di `GameEngine` dan diuji unit.)

1. Deck: 52 kartu remi standar (4 suit × 13 rank).
2. Pembagian: Semua kartu dibagi rata; jika tidak habis, sisa ditaruh di tengah sebagai **stok**.
3. Giliran: Dimulai dari pemain dengan kartu tertua (atau random jika seri). Searah jarum jam.
4. Aksi: Pemain bertanya pemain lain untuk **rank tertentu**.
5. Jika target punya → kartu diberikan; penanya boleh lanjut bertanya (max 3 aksi beruntun).
6. Jika target tidak punya → giliran pindah; penanya boleh (opsional) ambil 1 kartu dari stok.
7. Quartet lengkap → kartu dipisah ke tengah meja, terbuka untuk semua.
8. **Bluffing**: Setelah jawaban "tidak punya", penanya dalam 5 detik boleh **tuduh bohong**. Tuduh benar → ambil 1 kartu random dari tangan yang dituduh. Tuduh salah → penanya kehilangan 1 quartet yang sudah dikumpulkan.
9. Game berakhir saat stok habis & tidak ada lagi transfer yang mungkin. Pemenang = pemain dengan quartet terbanyak.

---
*End of PRD*