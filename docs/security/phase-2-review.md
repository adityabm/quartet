# Security Review — Phase 2 Single-player vs Bot

> **Tanggal**: 15 Oktober 2026
> **Reviewer**: Agent (via `security-best-practices` skill)
> **Scope**: Phase 2 — BotRunner, Easy tier, GameSession, REST endpoints, FE Game UI
> **Referensi**: `javascript-typescript-react-web-frontend-security.md`, `javascript-express-web-server-security.md`

---

## Executive Summary

Phase 2 adalah **first end-to-end playable slice** (manusia vs bot via REST). Permukaan serangan meningkat dari Phase 1 (pure logic) karena sekarang ada:

- HTTP endpoints dengan input parsing
- Action validation
- Game state di server (bukan cuma types)

**Tidak ada finding High atau Critical.** Code sudah secure-by-default. Ada beberapa Medium/Low yang akan applicable di Phase 4 (multiplayer WS) dan Phase 5 (production).

| Severity | Count | Status                                       |
| -------- | ----- | -------------------------------------------- |
| Critical | 0     | ✅                                           |
| High     | 0     | ✅                                           |
| Medium   | 2     | ⏳ Deferred ke Phase 4 (rate limit, helmet)  |
| Low      | 3     | ⏳ Deferred ke Phase 5 (CSP, CORS allowlist) |
| Info     | 4     | ✅ Documented (positive findings)            |

---

## Phase 2 Scan Result (Active)

| Pattern                           | Result                                      |
| --------------------------------- | ------------------------------------------- |
| `dangerouslySetInnerHTML`         | ❌ None                                     |
| `innerHTML` / `outerHTML`         | ❌ None                                     |
| `eval(` / `new Function(`         | ❌ None                                     |
| `: any` / `as any`                | ❌ None                                     |
| `localStorage.setItem` (FE)       | ✅ Used for display name only (low risk)    |
| `process.env` direct              | ✅ Via `getServerConfig()` typed parser     |
| `child_process`                   | ❌ None                                     |
| `insecureHTTPParser`              | ❌ None                                     |
| `--inspect` in start              | ❌ None                                     |
| Hardcoded secrets                 | ❌ None                                     |
| Incrementing IDs                  | ❌ None (UUID v4 via `crypto.randomUUID()`) |
| `res.redirect(` / `res.sendFile(` | ❌ None                                     |
| `trust proxy` (BE)                | �� None (no proxy header reliance)          |

---

## Findings (Medium, Deferred)

### F-MED-01: No rate limiting on action endpoints

**Rule referensi**: EXPRESS-AUTH-001
**Lokasi**: `apps/server/src/http/routes/single-player.ts`
**Risk**: User bisa spam `POST /api/games/:gameId/action` untuk DoS atau auto-play abuse.
**Severity**: Medium (Phase 4 akan applicable)
**Fix target Phase 4**: Install `@fastify/rate-limit` dengan config 5 aksi/detik/IP. Khusus untuk `/action` endpoint.

### F-MED-02: No security headers (helmet)

**Rule referensi**: EXPRESS-HEADERS-001
**Lokasi**: `apps/server/src/index.ts` (tidak ada `app.register(helmet)`)
**Risk**: Missing CSP, X-Content-Type-Options, frame-ancestors, Referrer-Policy.
**Severity**: Medium (Phase 4 akan applicable; sebelum ada XSS attack surface, impact rendah)
**Fix target Phase 4-5**: `await app.register(helmet, { contentSecurityPolicy: { ... } })`.

---

## Findings (Low, Deferred)

### F-LOW-01: CORS reflect origin (liberal in production)

**Lokasi**: `apps/server/src/index.ts:30` — `cors({ origin: config.nodeEnv !== 'production' })`
**Rule referensi**: EXPRESS-CORS-001
**Risk**: Di production (`NODE_ENV=production`), CORS default = reflect any origin. Saat ada session cookie + WS, ini problematic.
**Severity**: Low (Phase 2 tidak ada cookie auth; baru issue di Phase 4)
**Fix target Phase 4**: `cors({ origin: ['https://quartet.adit.dev'], credentials: true })`.

### F-LOW-02: No `app.disable('x-powered-by')`

**Rule referensi**: EXPRESS-FINGERPRINT-001
**Lokasi**: `apps/server/src/index.ts` (tidak ada)
**Risk**: Fastify default kirim `X-Powered-By: Fastify`. Fingerprinting minor.
**Severity**: Low (defense-in-depth)
**Fix target Phase 5**: `app.disable('x-powered-by')` atau install helmet (disable by default).

### F-LOW-03: No CSP / security headers di FE

**Rule referensi**: REACT-HEADERS-001
**Lokasi**: `apps/web/index.html` (no meta CSP), `vite.config.ts` (no headers config)
**Risk**: SPA belum ter-deploy. Saat production, edge/CDN harus set headers.
**Severity**: Low
**Fix target Phase 5**: Set via Vercel/nginx config + meta tag fallback.

---

## Info Findings (Positive)

### F-INFO-01: All actions validated server-side

**Lokasi**: `apps/server/src/http/routes/single-player.ts` + `packages/shared/src/rules/apply-action.ts`
**Pattern**: Routes validate `isValidPlayerName`, `isValidRank`, action type. `applyAction` validates phase + actor identity.
**Impact positif**: Anti-cheat by design — client tidak bisa bypass rules via crafted payload.

### F-INFO-02: Snapshot redaction enforced at type level

**Lokasi**: `packages/shared/src/rules/redact.ts` (Phase 1) + `apps/server/src/game/GameSession.ts` metadata merge
**Pattern**: Server builds `RedactedGameState` yang tidak include `PlayerInGame.hand` (PRIVATE). Hanya `yourHand` untuk player sendiri yang dikirim.
**Impact positif**: Klien tidak bisa baca hand player lain dari API response — type system forbid ini.

### F-INFO-03: Bot = server-side player, no client trust

**Lokasi**: `apps/server/src/bot/BotRunner.ts`
**Pattern**: Bot keputusan terjadi di server, klien tidak punya akses ke bot RNG/state. Klien cuma lihat hasil akhir via snapshot.
**Impact positif**: Tidak ada cara client cheat untuk tau bot akan pilih kartu apa.

### F-INFO-04: UUID v4 untuk semua public IDs

**Lokasi**: `GameSession` constructor (`asGameId(crypto.randomUUID())`)
**Pattern**: gameId, playerId = UUID v4 (122-bit entropy). Tidak predictable, tidak enumerable.
**Impact positif**: User tidak bisa enumerate/guess IDs untuk akses game orang lain.

---

## Rules TIDAK applicable untuk Phase 2

| Rule                             | Phase applicable                          |
| -------------------------------- | ----------------------------------------- |
| WS CSRF / origin validation      | Phase 4                                   |
| Cookie auth (httpOnly, SameSite) | Phase 4                                   |
| Player blob (mass-assign)        | Tidak (server-controlled Player creation) |
| SQL injection                    | Phase 4+ (DB persist)                     |
| SSRF                             | Tidak applicable (no outbound HTTP)       |
| File upload                      | Tidak applicable                          |

---

## Verdict Phase 2

**AMAN untuk development & staging deployment** (Phase 5 docs). End-to-end flow tervalidasi: create → first turn → bot auto-play → snapshot updated → game progresses → game over → subsequent action returns 400.

5 catatan Medium/Low semua **deferred ke Phase 4-5** (saat WS auth + production deploy live). Phase 2 tidak menambah attack surface baru dibanding Phase 1 karena:

- Bot & session server-controlled
- Action validation via shared rules (single source)
- Type-level privacy untuk hand player lain
- UUID v4 untuk IDs

**Next step**: Push branch `feat/single-player-vs-bot` ke remote, user review & merge, lalu lanjut ke Phase 3 (Normal + Hard bot tier).

---

_Re-run security review di akhir Phase 3, 4, 5._
