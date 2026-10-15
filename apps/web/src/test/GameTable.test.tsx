import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { asGameId, asPlayerId, type RedactedGameState } from '@quartet/shared';
import { GameTable } from '../features/game/components/GameTable.js';

const mockState: RedactedGameState = {
  gameId: asGameId('g1'),
  phase: 'turn',
  players: [
    {
      id: asPlayerId('p1'),
      name: 'TestPlayer',
      handCount: 10,
      quartets: [],
      isConnected: true,
      isBot: false,
    },
    {
      id: asPlayerId('p2'),
      name: 'Bot Cerdik',
      handCount: 13,
      quartets: [],
      isConnected: true,
      isBot: true,
    },
  ],
  currentPlayerIndex: 0,
  stockCount: 0,
  quartets: [],
  bluffWindow: null,
  lastEvents: [],
  version: 1,
};

describe('GameTable', () => {
  it('renders opponent name and hand count', () => {
    render(
      <GameTable
        state={mockState}
        yourHand={['7-spades', 'A-hearts']}
        yourPlayerId={asPlayerId('p1')}
        yourName="TestPlayer"
        onAction={() => {}}
      />,
    );
    expect(screen.getByText('Bot Cerdik')).toBeInTheDocument();
    expect(screen.getByText(/13 kartu/)).toBeInTheDocument();
  });

  it('renders your hand cards', () => {
    render(
      <GameTable
        state={mockState}
        yourHand={['7-spades']}
        yourPlayerId={asPlayerId('p1')}
        yourName="TestPlayer"
        onAction={() => {}}
      />,
    );
    // '7' muncul minimal sekali — di kartu hand (rank atas/bawah) &/atau tombol rank panel tanya
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
  });
});
