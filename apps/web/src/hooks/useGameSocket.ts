import { useCallback, useState } from 'react';
import type { CardId, PlayerAction, PlayerId, RedactedGameState } from '@quartet/shared';

const API_BASE = '/api';

export interface UseGameSocketResult {
  readonly gameId: string | null;
  readonly state: RedactedGameState | null;
  readonly yourHand: ReadonlyArray<CardId>;
  readonly yourPlayerId: PlayerId | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly startGame: (name: string, difficulty: 'easy') => Promise<void>;
  readonly sendAction: (action: PlayerAction) => Promise<void>;
  readonly reset: () => void;
}

/**
 * Manage sesi game single-player (Phase 2: REST polling; Phase 4 diganti WebSocket).
 */
export function useGameSocket(): UseGameSocketResult {
  const [gameId, setGameId] = useState<string | null>(null);
  const [state, setState] = useState<RedactedGameState | null>(null);
  const [yourHand, setYourHand] = useState<ReadonlyArray<CardId>>([]);
  const [yourPlayerId, setYourPlayerId] = useState<PlayerId | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = useCallback(async (name: string, difficulty: 'easy') => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/games/single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, difficulty }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        gameId: string;
        state: RedactedGameState;
        yourHand: CardId[];
        yourPlayerId: PlayerId;
      };
      setGameId(data.gameId);
      setState(data.state);
      setYourHand(data.yourHand);
      setYourPlayerId(data.yourPlayerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendAction = useCallback(
    async (action: PlayerAction) => {
      if (!gameId) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/games/${gameId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(err.message ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { state: RedactedGameState; yourHand: CardId[] };
        setState(data.state);
        setYourHand(data.yourHand);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send action');
      } finally {
        setIsLoading(false);
      }
    },
    [gameId],
  );

  const reset = useCallback(() => {
    setGameId(null);
    setState(null);
    setYourHand([]);
    setYourPlayerId(null);
    setError(null);
  }, []);

  return { gameId, state, yourHand, yourPlayerId, isLoading, error, startGame, sendAction, reset };
}
