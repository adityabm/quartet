# @quartet/server — Backend Quartet Web

Backend game server Quartet Web: HTTP layer dibangun di atas **Fastify** (`/health`, nanti `POST /api/rooms`), dengan WebSocket untuk real-time gameplay yang menyusul. Phase 0 ini hanya scaffold: config env type-safe, bootstrap dengan graceful shutdown, dan satu endpoint health check — semua struktur (`src/http`, `src/ws`, `src/game`, `src/room`, `src/persistence`, `src/bot`) sudah dirancang di `PROJECT_OVERVIEW.md` §4.2 dan akan diisi bertahap.

## Menjalankan

```bash
pnpm --filter @quartet/server dev         # dev mode (tsx watch, auto-restart)
pnpm --filter @quartet/server build       # tsc -b → dist/
pnpm --filter @quartet/server start       # node dist/index.js
pnpm --filter @quartet/server test        # vitest run
pnpm --filter @quartet/server typecheck   # tsc -b --noEmit
```

## Endpoint

| Method | Path      | Deskripsi                          |
|--------|-----------|------------------------------------|
| GET    | `/health` | Health check: status, service, version, timestamp |

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "service": "quartet-server",
  "version": "0.1.0",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

## Test manual

```bash
pnpm --filter @quartet/server dev
# di terminal lain:
curl -i http://localhost:3000/health   # → 200 {"status":"ok", ...}
```

Unit test (`pnpm --filter @quartet/server test`) memakai `buildApp()` + `app.inject()` Fastify sehingga **tidak perlu bind port** — intake `src/test/health.test.ts`.

## Konfigurasi (env)

Semua config dibaca dari env dengan default; parsing manual + validasi di `src/config.ts` (invalid → throw `Error`).

| Variable              | Default       | Deskripsi                                   |
|-----------------------|---------------|---------------------------------------------|
| `PORT`                | `3000`        | Port HTTP server                            |
| `NODE_ENV`            | `development` | `development` \| `production` \| `test`      |
| `LOG_LEVEL`           | `info`        | Pino log level                              |
| `DATABASE_URL`        | *(kosong)*    | Postgres DSN — Phase 1+ (persistence)       |
| `REDIS_URL`           | *(kosong)*    | Redis DSN — Phase 1+ (presence/hot cache)   |
| `ROOM_EXPIRY_MINUTES` | `30`          | Umur room tanpa aktivitas (menit)           |
| `BLUFF_WINDOW_MS`     | `5000`        | Jendela tuduh bohong setelah "tidak punya"  |
| `MAX_PLAYERS`         | `6`           | Maksimal pemain per room                    |

## Catatan WebSocket stack (Phase 4)

Phase 0 memakai **`ws`** (`ws@^8.18.0`) — ringan, kompatibel luas, cukup untuk socket real-time awal. Di **Phase 4** kita pindah ke **uWebSockets.js** yang jauh lebih cepat untuk ribuan koneksi serentak. Catatan penting: package ini dipublish di npm dengan nama yang tidak lazim, **`uWebSockets.js`** (juga dikenal dengan alias `uws`); saat switch nanti, pastikan meng-install dari nama npm yang benar dan sesuaikan import di `src/ws/`.

## Struktur kode

```
apps/server/src/
├── index.ts              ← buildApp() factory + start() (terpisah agar testable)
├── config.ts             ← env parser type-safe (manual, tanpa zod)
├── http/routes/health.ts ← registerHealthRoutes(app) + payload health
└── test/health.test.ts   ← vitest: inject /health tanpa bind port
```

`buildApp()` terpisah dari `start()`: test import `buildApp` lalu pakai `app.inject()`; `start()` (bind port + graceful shutdown SIGINT/SIGTERM) hanya jalan saat entry dieksekusi langsung.