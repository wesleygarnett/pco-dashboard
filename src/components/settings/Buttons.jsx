export function PrimaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-[var(--purple)] px-5 py-2.5 text-[14px] font-bold text-[#211008]"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/10 bg-white/[0.05] px-5 py-2.5 text-[14px] font-semibold text-[var(--text)]"
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-2.5 text-[14px] font-bold text-[var(--danger)]"
    >
      {children}
    </button>
  );
}
