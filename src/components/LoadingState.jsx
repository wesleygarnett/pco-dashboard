export default function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-white/10"
        style={{ borderTopColor: 'var(--purple)' }}
      />
      <div className="text-[15px] font-semibold text-[var(--muted)]">Loading service…</div>
    </div>
  );
}
