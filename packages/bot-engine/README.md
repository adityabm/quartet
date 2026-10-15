# @quartet/bot-engine

Paket berisi **logika keputusan bot** Quartet untuk tier Easy / Normal / Hard. Bot memilih aksi legal (`ask` / `pass`) dari daftar `validActions` — diperlakukan sebagai pemain biasa, tidak pernah punya akses ke kartu lawan. Semua fungsi murni dan deterministic dengan seeded RNG agar mudah diuji (Vitest) dan disimulasikan head-to-head di `tools/bot-arena`.

Tier:

- **easy** — uniform random (`decideEasyRandom`), sudah diimplementasikan di Phase 0.
- **normal** — greedy + bookkeeping ringan (Phase berikutnya).
- **hard** — belief state + expected information gain (Phase berikutnya).

```ts
import { createSeededRng } from '@quartet/shared';
import { decideEasyRandom } from '@quartet/bot-engine';

const action = decideEasyRandom(validActions, createSeededRng(42));
```