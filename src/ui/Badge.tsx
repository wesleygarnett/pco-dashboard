import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'accent' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** `accent` (violet, emphasized) or `neutral` (muted, secondary). */
  variant?: BadgeVariant;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  accent: 'border border-[var(--accent-border)] bg-[var(--accent-bg)] text-[12px] font-extrabold text-[var(--accent)]',
  neutral: 'border border-white/10 bg-white/[0.05] text-[11px] font-semibold text-[var(--muted)]',
};

/** A small pill-shaped label. Use `accent` for primary tags (e.g. a lead name), `neutral` for secondary info. */
export default function Badge({ variant = 'neutral', children, className = '', ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1 ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
