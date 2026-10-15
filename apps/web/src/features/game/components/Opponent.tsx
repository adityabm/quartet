import type { RedactedPlayerView } from '@quartet/shared';
import { motion } from 'framer-motion';

export interface OpponentProps {
  readonly player: RedactedPlayerView;
  readonly isCurrentTurn: boolean;
}

/** Strip lawan (bot/pemain lain): avatar + jumlah kartu + quartet, highlight saat giliran. */
export function Opponent({ player, isCurrentTurn }: OpponentProps) {
  return (
    <motion.div
      animate={isCurrentTurn ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: isCurrentTurn ? Infinity : 0, duration: 1.5 }}
      className={`flex items-center gap-3 rounded-xl border-2 p-3 ${
        isCurrentTurn
          ? 'border-batik-primary bg-white shadow-lg'
          : 'border-batik-text/10 bg-batik-cream/50'
      }`}
    >
      <div className="text-3xl">{player.isBot ? '🤖' : '👤'}</div>
      <div className="flex flex-col">
        <span className="font-semibold">{player.name}</span>
        <span className="text-sm text-batik-muted">
          {player.handCount} kartu · {player.quartets.length} quartet
          {!player.isConnected && ' · ⚠️ disconnect'}
        </span>
      </div>
    </motion.div>
  );
}
