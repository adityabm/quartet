import { useState } from 'react';
import { GamePage } from './features/game/GamePage.js';

type Route = 'home' | 'game';

/** Halaman landing Quartet Web — routing state-based sederhana untuk Phase 2. */
function App(): JSX.Element {
  const [route, setRoute] = useState<Route>('home');

  if (route === 'game') {
    return <GamePage />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-batik-cream px-4 py-12 text-batik-text">
      <span className="rounded-full border border-batik-primary/30 bg-white px-4 py-1.5 text-sm font-semibold text-batik-primary">
        🚧 Phase 2 — Single-player
      </span>

      <section className="flex max-w-xl flex-col items-center gap-3 text-center">
        <h1 className="font-display text-6xl leading-tight text-batik-primary md:text-8xl">
          Quartet
        </h1>
        <p className="text-base text-batik-muted md:text-lg">
          Permainan kartu klasik Indonesia — versi web.
        </p>
      </section>

      <nav aria-label="Menu utama" className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setRoute('game')}
          className="w-48 rounded-xl bg-batik-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-batik-primary/90 sm:w-auto"
        >
          Main Sendirian
        </button>
        <button
          type="button"
          disabled
          className="w-48 cursor-not-allowed rounded-xl border border-batik-accent/50 px-6 py-3 text-sm font-semibold text-batik-accent/50 sm:w-auto"
          title="Coming soon — Phase 4"
        >
          Buat Room (Phase 4)
        </button>
        <button
          type="button"
          disabled
          className="w-48 cursor-not-allowed rounded-xl border border-batik-text/20 px-6 py-3 text-sm font-semibold text-batik-text/50 sm:w-auto"
          title="Coming soon — Phase 4"
        >
          Gabung Room (Phase 4)
        </button>
      </nav>
    </main>
  );
}

export default App;
