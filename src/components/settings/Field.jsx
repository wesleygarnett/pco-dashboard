export default function Field({ label, hint, fullSpan, children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${fullSpan ? 'col-span-2' : ''}`}>
      <label className="text-[13px] font-semibold text-[var(--muted)]">{label}</label>
      {children}
      {hint && <div className="text-[12px] text-[var(--dim)]">{hint}</div>}
    </div>
  );
}

export const inputClass =
  'rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--purple-border-strong)]';
