# Quartet Web

> Versi web dari permainan kartu **Quartet Indonesia klasik** dengan bluffing.
> Single-player vs bot (3 tingkat) + multiplayer real-time via room code.

## Status

🚧 **Phase 0 — Skeleton** (inisialisasi monorepo). Lihat [`PROGRESS.md`](./PROGRESS.md) untuk detail.

## Tech Stack

- **TypeScript** end-to-end (strict mode)
- **pnpm + Turborepo** monorepo
- **Frontend**: React 18, Vite, Tailwind, Framer Motion, Zustand
- **Backend**: Node 20+, Fastify, uWebSockets.js
- **Data**: PostgreSQL, Redis
- **Testing**: Vitest
- **Lint/Format**: ESLint, Prettier

Lihat detail di [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md).

## Struktur Repo

```
quartet/
├── apps/
│   ├── web/        ← Frontend (React + Vite)
│   └── server/     ← Backend (Node + Fastify + uWS)
├── packages/
│   ├── shared/     ← Types & rules (sumber tunggal FE↔BE)
│   └── bot-engine/ ← Decision logic untuk bot
├── tools/
│   └── bot-arena/  ← CLI simulasi head-to-head bot
└── docs/           ← PRD, Overview, AGENTS, Protocol, Rules
```

## Quickstart (Development Lokal)

### Prasyarat

- **Node.js 20+** ([download](https://nodejs.org))
- **pnpm 9+**: `npm install -g pnpm`
- **Docker** (untuk Postgres + Redis lokal) — opsional di Phase 0

### Setup

```bash
# Install dependencies
pnpm install

# Copy env template
cp .env.example .env

# (Opsional) Jalankan Postgres + Redis via Docker
docker compose up -d postgres redis

# Jalankan semua apps secara paralel
pnpm dev
```

Akses di Phase 0:

- Web: http://localhost:5173
- Server: http://localhost:3000/health

### Quality Gates

```bash
pnpm typecheck   # tsc --noEmit di semua packages
pnpm test        # vitest di semua packages
pnpm lint        # eslint di semua packages
pnpm audit       # pnpm audit untuk dependency vulnerabilities
```

## Kontribusi

Sebelum push, **wajib** baca [`AGENTS.md`](./AGENTS.md) — di situ workflow, conventional commits, dan security review policy didefinisikan.

## Dokumen

| File | Isi |
|------|-----|
| [`PRD.md`](./PRD.md) | Product Requirements Document — apa yang dibuat |
| [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) | Arsitektur & struktur repo |
| [`AGENTS.md`](./AGENTS.md) | Operating manual untuk agent & developer |
| [`PROGRESS.md`](./PROGRESS.md) | Tracker sesi & phase progress |

---

*Lisensi: TBD. Aset kartu: open-source SVG deck (default sementara).*