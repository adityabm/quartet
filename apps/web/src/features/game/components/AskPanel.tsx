import {
  RANKS,
  asPlayerId,
  type PlayerAction,
  type Rank,
  type RedactedPlayerView,
} from '@quartet/shared';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button.js';

export interface AskPanelProps {
  readonly targets: ReadonlyArray<RedactedPlayerView>;
  readonly myPlayerId: string;
  readonly myQuartets: ReadonlyArray<string>;
  readonly onSubmit: (action: PlayerAction) => void;
  readonly disabled?: boolean;
}

/** Panel aksi giliran kamu: pilih rank + target, lalu Tanya (atau Pass). */
export function AskPanel({ targets, myPlayerId, myQuartets, onSubmit, disabled }: AskPanelProps) {
  const [rank, setRank] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  const validTargets = targets.filter((t) => t.id !== myPlayerId);
  const validRanks = RANKS.filter((r) => !myQuartets.includes(r));

  const handleAsk = () => {
    if (rank && targetId) {
      onSubmit({ type: 'ask', targetId: asPlayerId(targetId), rank: rank as Rank });
      setRank(null);
      setTargetId(null);
    }
  };

  return (
    <div className="rounded-xl border-2 border-batik-text/10 bg-batik-cream/50 p-4">
      <h3 className="mb-3 font-semibold">Tanya kartu apa?</h3>

      <div className="mb-3">
        <p className="mb-1 text-sm text-batik-muted">Rank:</p>
        <div className="flex flex-wrap gap-1">
          {validRanks.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRank(r)}
              className={`min-w-[2.5rem] rounded px-2 py-1 text-sm font-bold transition ${
                rank === r
                  ? 'bg-batik-primary text-white'
                  : 'bg-white text-batik-text hover:bg-batik-primary/10'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-sm text-batik-muted">Tanya ke:</p>
        <div className="flex flex-wrap gap-2">
          {validTargets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTargetId(t.id)}
              className={`rounded-lg border-2 px-3 py-1.5 text-sm transition ${
                targetId === t.id
                  ? 'border-batik-accent bg-batik-accent/10 text-batik-accent'
                  : 'border-batik-text/20 text-batik-text hover:border-batik-accent/50'
              }`}
            >
              {t.name} {t.isBot && '🤖'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleAsk} disabled={!rank || !targetId || disabled} className="flex-1">
          Tanya
        </Button>
        <Button variant="ghost" onClick={() => onSubmit({ type: 'pass' })} disabled={disabled}>
          Pass
        </Button>
      </div>
    </div>
  );
}
