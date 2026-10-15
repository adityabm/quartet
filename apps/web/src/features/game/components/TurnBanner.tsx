import { motion } from 'framer-motion';

export interface TurnBannerProps {
  readonly currentPlayerName: string;
  readonly isYourTurn: boolean;
  readonly phase: string;
}

/** Banner atas — indikator giliran aktif (highlight saat giliran kamu). */
export function TurnBanner({ currentPlayerName, isYourTurn, phase }: TurnBannerProps) {
  const text = isYourTurn ? '🎯 Giliran kamu!' : `Giliran ${currentPlayerName}`;

  return (
    <motion.div
      key={`${currentPlayerName}-${phase}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 p-3 text-center font-semibold ${
        isYourTurn
          ? 'border-batik-primary bg-batik-primary/10 text-batik-primary'
          : 'border-batik-text/20 bg-batik-cream text-batik-text'
      }`}
    >
      {text}
    </motion.div>
  );
}
