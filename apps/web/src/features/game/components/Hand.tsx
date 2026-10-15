import { RANKS, SUITS, type CardId, type Rank, type Suit } from '@quartet/shared';
import { useMemo } from 'react';
import { Card } from './Card.js';

export interface HandProps {
  readonly cards: ReadonlyArray<CardId>;
  readonly onSelect?: (rank: Rank) => void;
  readonly selectedRank?: Rank;
}

function parseCardId(cardId: CardId): { rank: Rank; suit: Suit } {
  const [rank, suit] = cardId.split('-');
  return { rank: rank as Rank, suit: suit as Suit };
}

/** Hand kartu milik pemain — urut rank lalu suit; klik memilih rank (untuk tanya). */
export function Hand({ cards, onSelect, selectedRank }: HandProps) {
  const sorted = useMemo(() => {
    return [...cards].sort((a, b) => {
      const pa = parseCardId(a);
      const pb = parseCardId(b);
      const rankDiff = RANKS.indexOf(pa.rank) - RANKS.indexOf(pb.rank);
      return rankDiff !== 0 ? rankDiff : SUITS.indexOf(pa.suit) - SUITS.indexOf(pb.suit);
    });
  }, [cards]);

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((cardId) => {
        const { rank, suit } = parseCardId(cardId);
        return (
          <Card
            key={cardId}
            rank={rank}
            suit={suit}
            highlighted={selectedRank === rank}
            {...(onSelect ? { onClick: () => onSelect(rank) } : {})}
          />
        );
      })}
    </div>
  );
}
