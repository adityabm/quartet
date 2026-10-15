# @quartet/web

Frontend untuk Quartet Web — React 18 + Vite + TypeScript strict + Tailwind CSS (token desain "batik" dari AGENTS.md §1.4) + Vitest, dibangun sebagai skeleton Phase 0: landing page dengan tiga CTA utama ("Main Sendirian", "Buat Room", "Gabung Room") yang belum terhubung logika game. Halaman landing, komponen UI reusable, dan hook akan tumbuh dari sini mengikuti struktur `PROJECT_OVERVIEW.md` §2 (pages/, components/, hooks/, store/, motion/, lib/, styles/).

```bash
pnpm --filter @quartet/web dev        # dev server di http://localhost:5173
pnpm --filter @quartet/web build      # typecheck (tsc -b) + bundle produksi (vite build)
pnpm --filter @quartet/web typecheck  # typecheck saja
pnpm --filter @quartet/web test       # jalankan Vitest sekali
pnpm --filter @quartet/web lint       # ESLint
```