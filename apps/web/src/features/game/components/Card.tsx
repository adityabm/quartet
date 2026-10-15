import { type Rank, type Suit } from '@quartet/shared';
import { motion } from 'framer-motion';

export interface CardProps {
  readonly rank: Rank;
  readonly suit: Suit;
  readonly faceDown?: boolean;
  readonly highlighted?: boolean;
  readonly onClick?: () => void;
}

const suitSymbols: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const suitColors: Record<Suit, string> = {
  spades: 'text-batik-text',
  clubs: 'text-batik-text',
  hearts: 'text-batik-primary',
  diamonds: 'text-batik-primary',
};

/** Satu kartu remi: face-up (rank + suit) atau face-down (back motif batik). */
export function Card({ rank, suit, faceDown = false, highlighted = false, onClick }: CardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      whileHover={onClick ? { y: -8 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      className={`relative flex h-24 w-16 flex-col items-center justify-between rounded-lg border-2 bg-white p-1.5 font-bold shadow-md ${
        highlighted ? 'border-batik-primary ring-2 ring-batik-primary' : 'border-batik-text/20'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {faceDown ? (
        <div className="flex h-full w-full items-center justify-center rounded bg-gradient-to-br from-batik-primary to-batik-accent">
          <span className="font-display text-2xl text-white">Q</span>
        </div>
      ) : (
        <>
          <span className={`self-start text-lg ${suitColors[suit]}`}>{rank}</span>
          <span className={`text-3xl ${suitColors[suit]}`}>{suitSymbols[suit]}</span>
          <span className={`self-end text-lg ${suitColors[suit]} rotate-180`}>{rank}</span>
        </>
      )}
    </motion.button>
  );
}
