import { type ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-batik-primary text-white hover:bg-batik-primary/90',
  secondary: 'border border-batik-accent text-batik-accent hover:bg-batik-accent/10',
  ghost: 'text-batik-text hover:bg-batik-text/5',
  danger: 'bg-batik-danger text-white hover:bg-batik-danger/90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`rounded-xl font-semibold transition disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? '⏳' : children}
    </button>
  ),
);
Button.displayName = 'Button';
