export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div className="text-[26px]">⚠️</div>
      <div className="text-[16px] font-semibold text-[var(--text)]">Error loading service</div>
      <div className="text-[13px] text-[var(--danger-text)]">{message}</div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-2 text-[13px] font-bold text-[var(--danger)]"
      >
        Try Again
      </button>
    </div>
  );
}
