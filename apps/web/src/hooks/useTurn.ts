import type { PlayerId, RedactedGameState } from '@quartet/shared';

export interface TurnInfo {
  readonly isYourTurn: boolean;
  readonly isBluffWindow: boolean;
  readonly currentPlayerId: PlayerId | null;
  readonly currentPlayerName: string | null;
}

/**
 * Derived state untuk giliran aktif — murni turunan dari snapshot state,
 * tanpa side effect, supaya mudah di-test.
 */
export function useTurn(state: RedactedGameState | null, yourPlayerId: PlayerId | null): TurnInfo {
  if (!state || !yourPlayerId) {
    return {
      isYourTurn: false,
      isBluffWindow: false,
      currentPlayerId: null,
      currentPlayerName: null,
    };
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentPlayerId = currentPlayer?.id ?? null;
  const isYourTurn = currentPlayerId === yourPlayerId;
  const isBluffWindow =
    state.phase === 'bluff_window' && state.bluffWindow?.accuserId === yourPlayerId;

  return {
    isYourTurn,
    isBluffWindow,
    currentPlayerId,
    currentPlayerName: currentPlayer?.name ?? null,
  };
}
