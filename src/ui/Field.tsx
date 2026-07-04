import type { ReactNode } from 'react';

export interface FieldProps {
  /** Label text shown above the control. */
  label: string;
  /** Optional helper text shown below the control. */
  hint?: string;
  /** When true, the field spans both columns of a two-column form grid. */
  fullSpan?: boolean;
  /** The form control (input, select, etc.) — style it with `controlClass`. */
  children?: ReactNode;
}

/** Shared class for text inputs and selects so form controls look consistent. */
export const controlClass =
  'rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--purple-border-strong)]';

/** A labeled form field: label on top, an optional hint below, and your control as children. */
export default function Field({ label, hint, fullSpan, children }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${fullSpan ? 'col-span-2' : ''}`}>
      <label className="text-[13px] font-semibold text-[var(--muted)]">{label}</label>
      {children}
      {hint && <div className="text-[12px] text-[var(--dim)]">{hint}</div>}
    </div>
  );
}
