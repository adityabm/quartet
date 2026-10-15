import { useGameSocket } from '../../hooks/useGameSocket.js';
import { GameTable } from './components/GameTable.js';

/** Halaman game single-player: form setup sebelum main, tabel game sesudahnya. */
export function GamePage(): JSX.Element {
  const { state, yourHand, yourPlayerId, isLoading, error, startGame, sendAction } =
    useGameSocket();

  // Pre-game: form nama + kesulitan
  if (!state || !yourPlayerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-batik-cream p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h1 className="mb-4 text-center font-display text-4xl text-batik-primary">
            Main Sendirian
          </h1>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const name = String(fd.get('name') ?? '');
              startGame(name, 'easy');
            }}
            className="space-y-3"
          >
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-semibold">
                Nama kamu
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={20}
                defaultValue="Pemain"
                className="w-full rounded-lg border-2 border-batik-text/20 px-3 py-2 focus:border-batik-primary focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="difficulty" className="mb-1 block text-sm font-semibold">
                Kesulitan
              </label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue="easy"
                disabled
                className="w-full rounded-lg border-2 border-batik-text/20 px-3 py-2"
              >
                <option value="easy">Easy (satu-satunya di Phase 2)</option>
              </select>
              <p className="mt-1 text-xs text-batik-muted">Normal &amp; Hard menyusul di Phase 3</p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-batik-primary px-6 py-3 font-semibold text-white transition hover:bg-batik-primary/90 disabled:opacity-50"
            >
              {isLoading ? '⏳ Memulai...' : '🎴 Mulai Main'}
            </button>
          </form>

          {error && <p className="mt-3 text-center text-sm text-batik-danger">{error}</p>}
        </div>
      </div>
    );
  }

  const yourName = state.players.find((p) => p.id === yourPlayerId)?.name ?? 'Kamu';

  return (
    <GameTable
      state={state}
      yourHand={yourHand}
      yourPlayerId={yourPlayerId}
      yourName={yourName}
      onAction={sendAction}
    />
  );
}
