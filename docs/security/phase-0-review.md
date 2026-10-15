# Security Review — Phase 0 Skeleton

> **Tanggal**: 15 Oktober 2026
> **Reviewer**: Agent (via `security-best-practices` skill)
> **Scope**: Phase 0 — monorepo skeleton (root config + apps/web + apps/server + packages/shared + packages/bot-engine + quality gates)
> **Referensi**: `javascript-typescript-react-web-frontend-security.md`, `javascript-express-web-server-security.md`

---

## Executive Summary

Phase 0 adalah **skeleton hello world** — belum ada auth, DB, WS protocol, atau user-generated content. Permukaan serangan sangat kecil.

**Tidak ada finding High atau Critical.** Ada beberapa **Medium/Low** yang applicable untuk fase selanjutnya (akan ditangani di Phase 1+) dan beberapa catatan **deferred** untuk production launch.

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ |
| High | 0 | ✅ |
| Medium | 2 | ⏳ Deferred ke Phase 1+ (sebelum WS/auth live) |
| Low | 3 | ⏳ Deferred ke Phase 5 (sebelum production deploy) |
| Info | 2 | ✅ Documented |

---

## Phase 0 Scan Result (Active)

Grep high-signal patterns terhadap `apps/` & `packages/`:

| Pattern | Result |
|---------|--------|
| `dangerouslySetInnerHTML` | ❌ None |
| `innerHTML` / `outerHTML` / `insertAdjacentHTML` | ❌ None |
| `document.write` | ❌ None |
| `eval(` / `new Function(` / `setTimeout("...)` | ❌ None |
| `localStorage.` / `sessionStorage.` (FE) | ❌ None |
| `child_process` / `exec(` / `execSync(` (BE) | ❌ None |
| `insecureHTTPParser` (BE) | ❌ None |
| `--inspect` in start scripts | ❌ None |
| `res.redirect(` / `res.sendFile(` (BE) | ❌ None |
| `trust proxy` (BE) | ❌ None (no app.set trust proxy) |
| `process.env` (BE) | ✅ Expected & typed-safe (server config parser) |
| `import.meta.env` (FE) | ❌ None |

---

## Findings

### F-INFO-01 (Informational): Server config reads from env — **PASS**

**Lokasi**: `apps/server/src/config.ts` line 73
**Rule referensi**: Umum — env handling
**Evidence**: `getServerConfig(env: NodeJS.ProcessEnv = process.env)` dengan manual typed-safe parser (validate + throw on invalid, range-check, enum-check).
**Verdict**: ✅ Aman. Tidak ada secret hardcoded; semua via env dengan validasi.

### F-INFO-02 (Informational): CORS reflect-origin di dev — **PASS untuk sekarang, monitor**

**Lokasi**: `apps/server/src/index.ts` line 29
**Rule referensi**: EXPRESS-CORS-001
**Evidence**: `await app.register(cors, { origin: config.nodeEnv !== 'production' })`
**Verdict**: ✅ Aman di Phase 0 (dev only, no cookies/auth). ⚠️ Saat production WS/cookie auth live, **HARUS** diganti strict allowlist.

### F-MED-01 (Medium, Deferred): Belum ada `helmet` middleware — **DEFERRED ke Phase 4**

**Rule referensi**: EXPRESS-HEADERS-001
**Severity**: Medium
**Lokasi**: `apps/server/src/index.ts` (belum ada `helmet` registered)
**Impact**: Tidak ada CSP / `X-Content-Type-Options` / `frame-ancestors` / `Referrer-Policy` di response server. Saat ini tidak masalah karena hanya `/health`.
**Fix target**: Phase 4 saat multiplayer live — `await app.register(helmet, { contentSecurityPolicy: { ... } })` dengan CSP realistis (script-src tanpa `unsafe-inline`/`unsafe-eval`).
**Mitigation sementara**: Web Vite akan set default headers; di production edge (Cloudflare/Vercel) set CSP via header config.

### F-MED-02 (Medium, Deferred): Belum ada WS auth/CSRF protection — **DEFERRED ke Phase 4**

**Rule referensi**: EXPRESS-CSRF-001, REACT-AUTH-001
**Severity**: Medium
**Lokasi**: WS layer belum ada di Phase 0; akan di-implement di Phase 4.
**Impact**: Phase 0 aman karena tidak ada state-changing endpoint. Saat WS live: harus ada origin validation + room-code based session (cookie `httpOnly` + same-origin) dan token-based action validation di server.
**Fix target**: Phase 4 — implement `validateOrigin()` di WS handshake + cookie sesi `httpOnly` + rate-limit per socket.

### F-LOW-01 (Low, Deferred): FE tidak set `X-Frame-Options` / CSP header — **DEFERRED ke Phase 5**

**Rule referensi**: REACT-HEADERS-001, REACT-CSP-001
**Severity**: Low (Vite dev tidak set, produksi harus di edge)
**Lokasi**: `apps/web/index.html` (no meta CSP), `vite.config.ts` (no headers config)
**Impact**: SPA belum ter-deploy; tidak masalah di dev. Saat production: edge/CDN harus set CSP & frame-ancestors.
**Fix target**: Phase 5 (production launch) — set headers via Vercel/Cloudflare config + tambah `<meta http-equiv>` fallback.

### F-LOW-02 (Low, Deferred): `x-powered-by` masih default — **DEFERRED ke Phase 5**

**Rule referensi**: EXPRESS-FINGERPRINT-001
**Severity**: Low (defense-in-depth)
**Lokasi**: `apps/server/src/index.ts` (no `app.disable('x-powered-by')`)
**Impact**: Fastify default mungkin set `X-Powered-By: Fastify`. Fingerprinting minor.
**Fix target**: Phase 5 — `await app.register(helmet)` (yang disable by default) atau `app.disable('x-powered-by')` eksplisit.

### F-LOW-03 (Low, Deferred): Tidak ada rate-limiting middleware — **DEFERRED ke Phase 4**

**Rule referensi**: EXPRESS-AUTH-001 (brute force defense untuk auth endpoints)
**Severity**: Low di Phase 0 (no auth), Medium di Phase 4+ (ada room creation)
**Lokasi**: `apps/server/src/index.ts` (no rate-limit registered)
**Impact**: Saat room creation live, attacker bisa spam bikin room. AGENTS §2.5 sudah catat ini required.
**Fix target**: Phase 4 — pakai `@fastify/rate-limit` dengan konfigurasi 5 aksi/detik/socket (sesuai PRD §4.4).

---

## Rules TIDAK applicable untuk Phase 0

Berikut rules yang akan baru applicable di phase berikutnya — **tidak akan di-flag sekarang** tapi akan di-checklist sebelum phase-nya complete:

| Rule | Akan applicable di |
|------|--------------------|
| REACT-XSS-001/002 (XSS) | Phase 2/4 (game UI, room chat) |
| REACT-DOM-001 (DOM XSS sinks) | Phase 2/4 |
| REACT-URL-001 (URL validation) | Phase 4 (room navigation) |
| REACT-AUTH-001 (token storage) | Phase 4+ (kalau tambah akun di v2.0) |
| REACT-CSRF-001 (CSRF) | Phase 4 |
| REACT-MARKUP-001 (markdown rendering) | Phase 4 (kalau chat) |
| REACT-POSTMSG-001 (postMessage) | Tidak applicable (no iframe embed) |
| REACT-FILE-001 (file upload) | Tidak applicable di MVP |
| REACT-SW-001 (service worker / PWA) | v2.0 (PWA installable) |
| EXPRESS-INJECT-001/002 (SQL/NoSQL injection) | Phase 4+ (DB persistence) |
| EXPRESS-CMD-001 (command injection) | Tidak applicable (no shell execution) |
| EXPRESS-SSRF-001 (SSRF) | Tidak applicable (no outbound URL fetch dari user) |
| EXPRESS-FILES-001/002 (path traversal) | Tidak applicable (no user file serving di MVP) |
| EXPRESS-UPLOAD-001 (upload) | Tidak applicable |
| EXPRESS-INPUT-001/002 (input validation) | Phase 4 (WS events) |
| EXPRESS-PROXY-001 (trust proxy) | Phase 5 (deploy behind proxy) |

---

## Catatan Positif (yang sudah benar di Phase 0)

- ✅ **Tidak ada `any` typed sembarangan** (grep `:\s*any|as any|<any>` → 0 matches di apps/ & packages/).
- ✅ **TypeScript strict mode aktif** (`tsconfig.base.json`: `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters`).
- ✅ **Server config typed-safe manual parser** — range check, enum check, no zod dependency bloat, env-injectable untuk testing.
- ✅ **`buildApp()` factory terpisah dari `start()`** — pattern ideal untuk testability tanpa bind port.
- ✅ **ESLint config strict**: `@typescript-eslint/no-explicit-any: error`, `consistent-type-imports: prefer 'type-imports'`, `eqeqeq: always`, `prefer-const`.
- ✅ **`.gitignore` lengkap**: node_modules, dist, build, .turbo, .env, coverage, dsb.
- ✅ **`.env.example`** tanpa secret asli (semua default aman; tidak ada key/token/PII).
- ✅ **No third-party script di `index.html`** — Google Fonts dipakai via `<link>` (acceptable; akan di-handle CSP di Phase 5).
- ✅ **Lockfile sudah ada** (`pnpm-lock.yaml` — di-generate oleh subagent setelah `pnpm install`).
- ✅ **CI workflow** dengan `pnpm install --frozen-lockfile` + `pnpm audit --prod --audit-level moderate`.
- ✅ **Dependabot aktif** dengan grouping.
- ✅ **Husky + lint-staged** pre-commit hook untuk catch issue sebelum commit.

---

## Verdict Phase 0

**AMAN untuk commit & development lanjut.** Tidak ada blocker keamanan.

3 catatan Medium yang deferred (helmet/CSRF/rate-limit) harus di-checklist di Phase 4 saat multiplayer WS live, **sebelum** production deploy.

---

*Re-run security review di akhir setiap phase (Phase 1/2/3/4/5) untuk catch drift.*