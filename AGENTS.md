# AGENTS.md — Operating Manual Quartet Web

> Dokumen ini adalah **tumpuan kerja** untuk AI agent (dan developer) yang mengerjakan Quartet Web.
>
> - `PRD.md` → **what** (apa yang dibuat)
> - `PROJECT_OVERVIEW.md` → **how we'll build it** (arsitektur, struktur, phased)
> - `AGENTS.md` (file ini) → **how we work** (aturan main, workflow, quality gate)

> **WAJIB**: Sebelum mulai task apapun yang menyentuh produk, agent harus skim `PRD.md` + `PROJECT_OVERVIEW.md`. Anggap mereka sebagai kontrak.

---

## 1. Gameplay Design — Quartet Indonesia Klasik + Nuansa Nusantara

### 1.1 Canonical Rules (tidak boleh dilanggar)
Mengacu pada PRD §Lampiran A:

- Deck 52 kartu remi standar (4 suit × 13 rank).
- Aturan Quartet Indonesia klasik dengan **bluffing + tuduhan** — siapa bohong soal kepemilikan kartu dihukum (quartet bisa direbut atau kartu berpindah).
- 3 tingkat bot (Easy/Normal/Hard), multiplayer real-time via room code.
- Kartu quartet terbuka di tengah meja untuk semua pemain.

**Aturan ini adalah "jeroan" produk** — tidak boleh dilonggarkan tanpa eksplisit disetujui user dan di-update di PRD.

### 1.2 Nuansa Indonesia — Filosofi Desain

Quartet dengan bluffing **sudah** inherently Indonesia. Nuansa Nusantara kita tambahkan sebagai **lapisan presentasi & identitas**, bukan dengan mengubah mekanisme main. Prinsipnya: *"rasa Indonesia di setiap pixel, aturan main tetap klasik."*

| Lapisan | MVP | v1.1 | v1.2+ |
|---------|-----|-------|-------|
| **Bahasa** | 100% Bahasa Indonesia (copy, UI, error, tutorial) | Sama | + i18n EN |
| **Visual identity** | Aksen batik subtle (background pattern, kartu overlay), tipografi modern-Indonesia (`Plus Jakarta Sans` + `Caveat` untuk display) | Animasi kartu dengan motif batik fade-in | Avatar wayang, batik loader, kartu bergambar |
| **Sound** | Silent (default) | Gamelan SFX opsional (card flip, quartet formed, bluff call) | Musik latar pilihan |
| **Quartet theme (visual only)** | Kartu remi standar | Sama | + 1 tema ilustrasi asli: **"Quartet Nusantara"** — koleksi 4 motif batik, 4 kuliner daerah, 4 senjata tradisional, dll. sebagai koleksi alternatif |

### 1.3 Copy & Tone — Bahasa Indonesia Kasual-Sopan

- Nada: **kasual tapi hormat**, tidak kaku, tidak lebay.
- Contoh micro-copy:
  - Banner giliran: *"Giliran kamu!"*
  - Tombol aksi: *"Tanya"*, *"Lanjut"*, *"Tuduh Bohong"*, *"Main Lagi"*
  - Notifikasi quartet: *"Quartet! 🎉 Budi dapat quartet 7."*
  - Error: *"Tidak bisa tanya rank itu — coba lagi ya."*
  - Room kosong timeout: *"Room sepi… otomatis tutup dalam 30 menit."*
- **Hindari**: bahasa Inggris untuk user-facing copy, kecuali istilah teknis universal (room code, WebSocket, dst.).
- **Emoji**: secukupnya untuk emosi (🎉 untuk quartet, 🤔 untuk bluff) — jangan berlebihan.

### 1.4 Design Tokens Awal (untuk MVP)

```css
:root {
  /* Palet warna: hangat, seperti kain batik & kartu remi */
  --color-bg:        #FAF6EF;   /* krem hangat */
  --color-surface:   #FFFFFF;
  --color-primary:   #C53030;   /* merah klasik kartu remi */
  --color-accent:    #1F4E5F;   /* biru tarakan / tarakan */
  --color-text:      #1A1A1A;
  --color-muted:     #6B6B6B;
  --color-success:   #2F855A;
  --color-danger:    #C53030;

  /* Tipografi: modern + sentuhan Nusantara */
  --font-display: "Caveat", "Plus Jakarta Sans", cursive;
  --font-body:    "Plus Jakarta Sans", system-ui, sans-serif;

  /* Pattern aksen (batik parang geometris, opacity rendah) */
  --pattern-accent: url("/patterns/batik-parang.svg");
}
```

Detail visual final (komponen tertentu, layout kartu, animasi) **wajib** minta approval user sebelum implementasi — lihat §6.

---

## 2. Workflow Rules

### 2.1 Conventional Commits — WAJIB

Format: `<type>(<scope>): <subject>` — subject ≤ 72 char, imperative mood, no trailing period.

| Type | Dipakai untuk |
|------|---------------|
| `feat` | Fitur baru yang terlihat user |
| `fix` | Bug fix |
| `chore` | Tooling, dependencies, config non-functional |
| `docs` | Dokumentasi saja |
| `style` | Formatting, whitespace, missing semicolon — no logic change |
| `refactor` | Code change yang bukan fix atau feature |
| `perf` | Performance improvement |
| `test` | Tambah atau fix unit/integration test |
| `build` | Build system atau external dependencies |
| `ci` | CI configuration |

Contoh:
```
feat(game-engine): implement quartet detection on card transfer
fix(ws): prevent duplicate ask action within 500ms
chore(repo): init pnpm workspace with turbo pipeline
docs(prd): update bot evaluation pass criteria
test(bot-hard): add belief state update unit tests
refactor(shared): extract rank validation to single source
```

### 2.2 Unit Tests — WAJIB

- **Setiap** perubahan kode produksi WAJIB disertai unit test yang lulus.
- Framework: **Vitest** (cocok dengan Vite/TS, cepat, ESM-native).
- Coverage target:
  - `packages/shared/rules` → **100%** (pure functions, critical)
  - `packages/bot-engine` → **≥ 90%**
  - `apps/server/game` → **≥ 85%**
  - `apps/web` logic hooks → **≥ 80%** (UI render opsional)
- Aturan test:
  - File pattern: `*.test.ts` (co-located atau `__tests__/`).
  - **Pure functions only** — no I/O, no DB, no network.
  - **Deterministic** — pakai seeded RNG untuk randomness (lihat `packages/shared/rng`).
  - Test harus fail dulu sebelum implementasi (red-green-refactor friendly).
- Test dijalankan di CI dan wajib pass sebelum merge.
- Command: `pnpm test` atau scoped: `pnpm --filter @quartet/shared test`.

### 2.3 DRY — Jangan Ulangi Diri

- Logic yang dipakai ≥ 2 tempat → **extract** ke `packages/shared` (rules) atau utility module yang sesuai.
- Tipe & protocol hanya ada **satu sumber** di `packages/shared` — FE & BE import dari sana.
- Kalau FE & BE butuh fungsi sama (mis. validasi rank, format display), **import dari shared** — jangan copy-paste.
- Konstanta (rank names, suit colors, timeouts) → satu tempat di `packages/shared/constants.ts`.
- Review checklist: setiap PR, cek apakah ada duplikasi logic yang harus di-extract.

### 2.4 Component-Based — UI

- React components: **single responsibility**, nama & props jelas.
- Folder per-feature ketika kompleks (mis. `apps/web/src/features/game/`), komponen reusable di `apps/web/src/components/ui/`.
- Hindari **prop drilling** > 2 level — pakai Zustand store atau React Context.
- **Composable**: komponen UI primitif (Button, Modal, Card) tidak berisi business logic.
- **Custom hooks** untuk stateful logic (mis. `useGameSocket`, `useTurn`).
- Setiap komponen reusable → default export + JSDoc singkat tentang prop.

### 2.5 Security Review Sebelum Push — WAJIB

Sebelum `git push` (atau PR creation):

1. Jalankan **security-best-practices** skill pada diff changeset.
2. Kalau ada temuan **High/Critical** → fix dulu sebelum push.
3. Catat hasil review di PR description (singkat: "Reviewed via skill, no high/critical findings").

**Scope review minimum:**
- Input validation di server endpoints & WS events (rank, targetId, action type).
- Auth/identity check: room ownership, turn ownership, action validity.
- Tidak ada secret/PII yang ter-commit (cek env, log, hardcoded value).
- Dependency vulnerability: `pnpm audit` harus clean atau acceptable.
- Rate limiting untuk aksi user (anti spam/abuse).

Skill yang relevan tersedia di environment agent; invoke saat akan push.

---

## 3. Pre-Execution Checklist

Sebelum mulai kerja apapun yang menyentuh produk:

- [ ] **Skim `PRD.md`** (5 menit) — konfirmasi scope tidak keluar dari MVP.
- [ ] **Skim `PROJECT_OVERVIEW.md`** — cek struktur repo, phase yang sedang berjalan, owned file.
- [ ] **Konfirmasi masuk MVP** — cek Non-Goals (PRD §2.3). Kalau di luar, tanya user dulu.
- [ ] **Identifikasi file yang akan disentuh** — hindari tabrakan dengan lane paralel.
- [ ] **Untuk UI/UX**: minta approval design dulu (lihat §6) sebelum kode.
- [ ] **Untuk shared types/protocol**: cek apakah ada perubahan ke katalog event WS → perlu update FE & BE sinkron.

---

## 4. Definition of Done

Fitur/task dianggap **done** bila semua checklist terpenuhi:

- [ ] Kode ditulis dengan TypeScript strict mode (no `any` kecuali ter-justifikasi).
- [ ] Unit test ditulis dan lulus (`pnpm test`).
- [ ] Typecheck lulus (`pnpm typecheck`).
- [ ] Lint lulus (`pnpm lint`).
- [ ] Conventional commit message dipakai.
- [ ] Tidak ada file yang di-commit berisi secret, API key, atau PII.
- [ ] Security review dijalankan (via skill) — tidak ada high/critical findings.
- [ ] Dokumen terkait (PRD/Overview/Protocol/Rules) di-update kalau ada perubahan scope atau kontrak.
- [ ] Kalau ada perubahan API/protocol → FE & BE sama-sama update dan typecheck pass.

---

## 5. Design Approval Flow

Untuk **setiap** pekerjaan UI/UX (kecuali pengecualian di bawah):

1. **Brief**: agent jelaskan打算 bikin apa — 1-2 paragraf: tujuan, komponen yang dibuat, interaksi.
2. **Mock/Plan**: sajikan sketsa layout (ASCII atau deskripsi), color tokens, daftar komponen, daftar micro-copy.
3. **Tunggu approval eksplisit user** ("Cocok" / "Ubah X" / "Skip approval, langsung gas").
4. Baru mulai implementasi.

**Pengecualian** (tidak perlu approval):
- Micro-copy non-button (placeholder, empty state text).
- Animation timing tweak kecil.
- Layout minor adjustment (spacing, alignment) yang tidak mengubah hierarki.

**Aturan tambahan**: copy button label utama (mis. "Tuduh Bohong") tetap dianggap butuh approval karena memengaruhi tone produk.

---

## 6. Stack & Tooling Recap

| Layer | Tool |
|-------|------|
| Bahasa | TypeScript 5+ (strict mode) |
| Package manager | pnpm 9+ |
| Monorepo | Turborepo |
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Zustand |
| Backend | Node 20+, Fastify, uWebSockets.js |
| Data | PostgreSQL, Redis |
| Testing | Vitest (unit), Playwright (e2e, opsional) |
| Lint/Format | ESLint + Prettier |
| Git hooks | Husky + lint-staged |
| CI | GitHub Actions (typecheck, test, lint, audit, security review) |
| Deploy | Vercel (FE), Railway (BE), region SG |

Detail struktur folder & dependency per package ada di `PROJECT_OVERVIEW.md` §2.

---

## 7. Agent Behavior Rules

- **Honest pushback**: kalau permintaan di luar MVP / merusak aturan / ada risiko, agent WAJIB angkat concern + alternatif sebelum lanjut. Jangan diam-diam melakukan.
- **No flattery, no preamble**: langsung kerja. Jangan *"Tentu, dengan senang hati!"* atau pujian basa-basi.
- **Minimal output**: tulis apa yang perlu. Jangan ulangi task user di awal balasan.
- **Delegation**: paralelkan task independen (multi `subagent` dalam 1 pesan). Lane paralel **tidak boleh** saling tulis di file yang sama.
- **Verify**: ringkasan subagent adalah klaim — baca artifact sendiri sebelum percaya.
- **Reconcile**: kalau multi-lane, reconcili sebelum finalisasi.
- **Re-read PRD/Overview** sebelum eksekusi produk (lihat §3).
- **Selalu** invoke security-best-practices skill sebelum push (lihat §2.5).
- **Jangan** commit langsung tanpa explicit go dari user, kecuali untuk chore/docs kecil.

---

## 8. Quick Reference Commands

```bash
# Setup
pnpm install
docker compose up -d postgres redis
pnpm db:migrate

# Dev (paralel semua apps via turbo)
pnpm dev
pnpm --filter @quartet/web dev
pnpm --filter @quartet/server dev

# Quality gates
pnpm typecheck
pnpm test
pnpm test:watch --filter @quartet/shared
pnpm lint
pnpm audit

# Bot arena (head-to-head simulasi)
pnpm --filter @quartet/bot-engine arena --tier hard vs normal --games 1000

# Database
pnpm db:migrate
pnpm db:seed
```

---

## 9. Commit & Push Workflow

```bash
# 1. Stage
git add -A

# 2. Status
git status

# 3. Commit (conventional)
git commit -m "feat(game-engine): implement quartet detection"

# 4. Pre-push quality gates (HARUS hijau semua)
pnpm typecheck
pnpm test
pnpm lint
pnpm audit

# 5. Security review (manual via skill)
#    → Invoke security-best-practices skill, review changeset

# 6. Push (hanya jika SEMUA gate hijau & security review OK)
git push origin feat/<branch-name>
```

Branch naming: `<type>/<short-kebab-description>`, contoh:
- `feat/game-engine-quartet-detection`
- `fix/ws-duplicate-ask`
- `chore/init-monorepo`

---

## 10. Catatan & Asumsi yang Bisa Berubah

Item-item berikut bisa di-adjust seiring waktu (perlu diskusi + update dokumen ini):

- **Bot tier pass criteria** — threshold 60% win-rate bisa di-tune.
- **Visual tokens final** — setelah user lihat mock, bisa shift.
- **Conventional commit scope list** — bisa ditambah kalau muncul category baru.
- **Coverage target** — bisa naik setelah MVP stabil.

Setiap perubahan → update file terkait (PRD/Overview/AGENTS) di commit yang sama atau di PR terpisah.

---

*End of AGENTS.md — Jadikan dokumen ini sebagai referensi tetap selama development Quartet Web.*