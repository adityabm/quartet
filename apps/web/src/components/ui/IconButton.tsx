import { type ReactNode, forwardRef } from 'react';
import { Button, type ButtonProps } from './Button.js';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'className'> {
  /** Aksesibilitas: deskripsi singkat aksi (dipakai sebagai aria-label & title). */
  readonly label: string;
  /** Konten ikon (emoji atau SVG). */
  readonly icon: ReactNode;
}

/** Tombol persegi untuk aksi ikon (close/minimize) — delegasi styling ke Button. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, variant = 'ghost', size = 'sm', ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center p-0"
      {...props}
    >
      {icon}
    </Button>
  ),
);
IconButton.displayName = 'IconButton';
