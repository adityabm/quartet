import { type ReactNode, useEffect } from 'react';

export interface ModalProps {
  readonly open: boolean;
  readonly onClose?: () => void;
  readonly title?: string;
  readonly children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-batik-surface p-6 shadow-2xl">
        {title && <h2 className="mb-4 font-display text-3xl text-batik-primary">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
