import type { Quartet } from '@quartet/shared';
import { motion } from 'framer-motion';
import { Card } from './Card.js';

export interface QuartetSlotProps {
  readonly quartet: Quartet;
  readonly ownerName: string;
}

/**
 * Satu quartet terbuka di tengah meja.
 * NOTE: Quartet hanya menyimpan rank (bukan suit per kartu) — visual 4× rank yang sama,
 * bisa di-improve di phase berikutnya.
 */
export function QuartetSlot({ quartet, ownerName }: QuartetSlotProps) {
  const cards: ReadonlyArray<Quartet['rank']> = [
    quartet.rank,
    quartet.rank,
    quartet.rank,
    quartet.rank,
  ];

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="rounded-xl border-2 border-batik-accent/40 bg-batik-cream/30 p-3"
    >
      <div className="mb-1 text-xs text-batik-muted">{ownerName}</div>
      <div className="grid grid-cols-2 gap-1">
        {cards.map((rank, i) => (
          <Card key={i} rank={rank} suit="spades" faceDown />
        ))}
      </div>
    </motion.div>
  );
}
