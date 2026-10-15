# @quartet/shared

Paket berisi **satu sumber kebenaran** (single source of truth) untuk tipe & aturan murni yang dipakai bersama frontend (`apps/web`) dan backend (`apps/server`): konstanta kartu (`SUITS`, `RANKS`, dll.), tipe `Card`, helper deck (`createShuffledDeck`, `sortHand`), dan seeded RNG (`createSeededRng`) agar shuffle & simulasi deterministic. Tidak ada I/O di paket ini — semua fungsi murni supaya aman dipanggil dari dua sisi.

```ts
import { createSeededRng, createShuffledDeck, sortHand } from '@quartet/shared';

const deck = createShuffledDeck(createSeededRng(42));
const sorted = sortHand(deck);
```