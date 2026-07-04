export default function Header({
  orgName,
  orgSub,
  orgIcon,
  serviceTimes,
  speakerName,
  testMode,
  plans,
  currentPlanId,
  onPlanChange,
  onRefresh,
  onOpenSettings,
}) {
  return (
    <header
      className="glass-pill flex shrink-0 items-center justify-between"
      style={{
        gap: 'clamp(12px, 1.6vw, 28px)',
        height: 'clamp(52px, 7.4vh, 64px)',
        padding: '0 clamp(16px, 2vw, 30px)',
      }}
    >
      <div className="flex min-w-0 items-center" style={{ gap: 'clamp(10px, 1.2vw, 16px)' }}>
        <div
          className="flex shrink-0 items-center justify-center rounded-xl text-[17px] font-extrabold"
          style={{
            width: 'clamp(34px, 4.4vh, 44px)',
            height: 'clamp(34px, 4.4vh, 44px)',
            background: 'var(--avatar-grad-1)',
            color: '#211008',
          }}
        >
          {orgIcon}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="truncate text-[16px] font-bold text-[var(--text)]">{orgName}</div>
          {plans && plans.length > 1 ? (
            <select
              value={currentPlanId || ''}
              onChange={(e) => onPlanChange?.(e.target.value)}
              className="truncate rounded border-0 bg-transparent p-0 text-[12px] font-medium text-[var(--muted)] outline-none"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id} style={{ background: 'var(--plan-option-bg)', color: 'var(--text)' }}>
                  {p.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="truncate text-[12px] font-medium text-[var(--muted)]">{orgSub}</div>
          )}
        </div>
      </div>

      <div className="flex items-center" style={{ gap: 'clamp(12px, 1.6vw, 28px)' }}>
        {testMode && (
          <span className="rounded-full bg-[var(--danger-bg)] px-3 py-1 text-[12px] font-bold text-[var(--danger)]">
            🔴 TEST MODE
          </span>
        )}

        <div className="flex gap-2">
          {serviceTimes.map((svc, i) => (
            <span
              key={i}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[16px] font-bold ${
                svc.isPast
                  ? 'bg-white/[0.04] text-[var(--dim)]'
                  : svc.isLive
                    ? 'border border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--live)]'
                    : 'bg-white/[0.04] text-[var(--muted)]'
              }`}
            >
              {svc.label}
              {svc.isLive && (
                <span className="ml-1" style={{ animation: 'pulse-live 1.6s ease-in-out infinite' }}>
                  ●
                </span>
              )}
            </span>
          ))}
        </div>

        {speakerName && (
          <>
            <div className="h-6 w-px bg-white/[0.14]" />
            <div className="text-[13px] font-semibold text-[var(--muted)]">Speaker</div>
            <span className="rounded-full border border-white/[0.14] bg-white/[0.07] px-4 py-1.5 text-[15px] font-bold text-[#f0e4d8]">
              {speakerName}
            </span>
          </>
        )}

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-[14px] text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Refresh"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-[14px] text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </div>
    </header>
  );
}
