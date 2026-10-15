import { useEffect, useState } from 'react';
import type { BluffWindow } from '@quartet/shared';
import { Button } from '../../../components/ui/Button.js';
import { Modal } from '../../../components/ui/Modal.js';

export interface BluffModalProps {
  readonly window: BluffWindow;
  readonly onAccuse: () => void;
  readonly onSkip: () => void;
}

/** Modal keputusan bluff window (5 detik): tuduh bohong atau lanjut. */
export function BluffModal({ window: bw, onAccuse, onSkip }: BluffModalProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, bw.expiresAt - Date.now());
      setRemaining(Math.ceil(ms / 1000));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [bw.expiresAt]);

  return (
    <Modal open title="🤔 Yakin bohong?">
      <p className="mb-2">
        <strong>Kamu tanya rank "{bw.rank}" — jawab "Tidak Punya".</strong>
      </p>
      <p className="mb-4 text-sm text-batik-muted">Countdown: {remaining} detik tersisa</p>
      <div className="flex gap-2">
        <Button variant="danger" onClick={onAccuse} className="flex-1">
          Tuduh Bohong
        </Button>
        <Button variant="ghost" onClick={onSkip} className="flex-1">
          Lanjut
        </Button>
      </div>
    </Modal>
  );
}
