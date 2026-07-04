import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Visual emphasis: `primary` (filled terracotta), `secondary` (subtle glass), `danger` (destructive). */
  variant?: ButtonVariant;
  children?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--purple)] text-[#211008]',
  secondary: 'border border-white/10 bg-white/[0.05] text-[var(--text)]',
  danger: 'border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]',
};

/** The design system's button. One component, three variants via the `variant` prop. */
export default function Button({ variant = 'primary', children, type = 'button', className = '', ...rest }: ButtonProps) {
  const weight = variant === 'secondary' ? 'font-semibold' : 'font-bold';
  return (
    <button
      type={type}
      className={`rounded-lg px-5 py-2.5 text-[14px] ${weight} ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
