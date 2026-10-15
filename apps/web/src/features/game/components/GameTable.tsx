import type { CardId, PlayerAction, PlayerId, RedactedGameState } from '@quartet/shared';
import { useTurn } from '../../../hooks/useTurn.js';
import { AskPanel } from './AskPanel.js';
import { BluffModal } from './BluffModal.js';
import { Hand } from './Hand.js';
import { Opponent } from './Opponent.js';
import { QuartetSlot } from './QuartetSlot.js';
import { TurnBanner } from './TurnBanner.js';

export interface GameTableProps {
  readonly state: RedactedGameState;
  readonly yourHand: ReadonlyArray<CardId>;
  readonly yourPlayerId: PlayerId;
  readonly yourName: string;
  readonly onAction: (action: PlayerAction) => void;
}

/** Orchestrator layout meja game: lawan, banner giliran, quartet, hand, panel aksi. */
export function GameTable({ state, yourHand, yourPlayerId, onAction }: GameTableProps) {
  const { isYourTurn, isBluffWindow, currentPlayerName } = useTurn(state, yourPlayerId);
  const bluffWindow = isBluffWindow ? state.bluffWindow : null;

  const me = state.players.find((p) => p.id === yourPlayerId);
  const opponents = state.players.filter((p) => p.id !== yourPlayerId);

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-batik-cream p-4">
      {/* Lawan */}
      {opponents.map((opp) => (
        <Opponent
          key={opp.id}
          player={opp}
          isCurrentTurn={state.players[state.currentPlayerIndex]?.id === opp.id}
        />
      ))}

      {/* Banner giliran */}
      <TurnBanner
        currentPlayerName={currentPlayerName ?? '...'}
        isYourTurn={isYourTurn}
        phase={state.phase}
      />

      {/* Quartet di tengah meja */}
      {state.quartets.length > 0 && (
        <div className="rounded-xl bg-white p-3 shadow">
          <h3 className="mb-2 text-sm font-semibold text-batik-muted">Quartet Terbuka</h3>
          <div className="flex flex-wrap gap-2">
            {state.quartets.map((q) => {
              const ownerName = state.players.find((p) => p.id === q.ownerId)?.name ?? '?';
              return <QuartetSlot key={q.id} quartet={q} ownerName={ownerName} />;
            })}
          </div>
        </div>
      )}

      {/* Hand kamu */}
      <div className="rounded-xl bg-white p-3 shadow">
        <h3 className="mb-2 text-sm font-semibold text-batik-muted">
          Kartu Kamu ({yourHand.length})
        </h3>
        <Hand cards={yourHand} />
      </div>

      {/* Panel aksi saat giliran kamu */}
      {isYourTurn && state.phase === 'turn' && (
        <AskPanel
          targets={state.players}
          myPlayerId={yourPlayerId}
          myQuartets={me?.quartets ?? []}
          onSubmit={onAction}
        />
      )}

      {/* Modal bluff window */}
      {bluffWindow && (
        <BluffModal
          window={bluffWindow}
          onAccuse={() => onAction({ type: 'bluff.call', accusedId: bluffWindow.accusedId })}
          onSkip={() => onAction({ type: 'pass' })}
        />
      )}

      {/* Game over */}
      {state.phase === 'game_over' && (
        <div className="rounded-xl border-2 border-batik-success bg-batik-success/10 p-4 text-center">
          <h2 className="font-display text-3xl text-batik-success">🎉 Game Selesai!</h2>
          <p className="mt-2">
            Quartet: {state.players.map((p) => `${p.name}=${p.quartets.length}`).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
