/** Halaman landing Quartet Web — skeleton Phase 0 (belum ada logika game). */
function App(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-batik-cream px-4 py-12 text-batik-text">
      <span className="rounded-full border border-batik-primary/30 bg-white px-4 py-1.5 text-sm font-semibold text-batik-primary">
        🚧 Phase 0 — Skeleton
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
          className="w-48 rounded-xl bg-batik-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-batik-primary/90 sm:w-auto"
        >
          Main Sendirian
        </button>
        <button
          type="button"
          className="w-48 rounded-xl border border-batik-accent px-6 py-3 text-sm font-semibold text-batik-accent transition hover:bg-batik-accent/10 sm:w-auto"
        >
          Buat Room
        </button>
        <button
          type="button"
          className="w-48 rounded-xl border border-batik-text/20 px-6 py-3 text-sm font-semibold text-batik-text transition hover:bg-batik-text/5 sm:w-auto"
        >
          Gabung Room
        </button>
      </nav>
    </main>
  );
}

export default App;