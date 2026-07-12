function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const ICON_BUTTON_CLASS =
  'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-[var(--muted)] hover:text-[var(--text)]';

export default function Header({
  orgName,
  orgSub,
  orgIcon,
  orgLogo,
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
      className="glass-pill flex shrink-0 flex-wrap items-center justify-between gap-y-2 md:flex-nowrap"
      style={{
        columnGap: 'clamp(12px, 1.6vw, 28px)',
        minHeight: 'clamp(52px, 7.4vh, 64px)',
        padding: '8px clamp(16px, 2vw, 30px)',
      }}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-y-1" style={{ columnGap: 'clamp(10px, 1.2vw, 16px)' }}>
        {orgLogo ? (
          <img
            src={orgLogo}
            alt=""
            className="shrink-0 rounded-xl object-contain"
            style={{
              width: 'clamp(34px, 4.4vh, 44px)',
              height: 'clamp(34px, 4.4vh, 44px)',
            }}
          />
        ) : (
          <div
            className="flex shrink-0 items-center justify-center rounded-xl text-[17px] font-extrabold"
            style={{
              width: 'clamp(34px, 4.4vh, 44px)',
              height: 'clamp(34px, 4.4vh, 44px)',
              background: 'var(--avatar-grad-1)',
              color: '#171226',
            }}
          >
            {orgIcon}
          </div>
        )}
        <h1 className="text-[20px] font-bold text-[var(--text)]">{orgName}</h1>
        {plans && plans.length > 1 ? (
          <div className="relative flex max-w-full items-center">
            <select
              value={currentPlanId || ''}
              onChange={(e) => onPlanChange?.(e.target.value)}
              aria-label="Service date"
              className="max-w-full cursor-pointer appearance-none truncate rounded-md border border-white/10 bg-white/[0.06] py-1 pl-2.5 pr-6 text-[13px] font-medium text-[var(--muted)] outline-none hover:text-[var(--text)] focus:border-[var(--accent-border)]"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id} style={{ background: 'var(--plan-option-bg)', color: 'var(--text)' }}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 text-[9px] text-[var(--dim)]">▼</span>
          </div>
        ) : (
          <div className="min-w-0 truncate text-[13px] font-medium text-[var(--muted)]">{orgSub}</div>
        )}
      </div>

      <div
        className="flex min-w-0 flex-wrap items-center gap-y-2"
        style={{ columnGap: 'clamp(12px, 1.6vw, 28px)' }}
      >
        {testMode && (
          <span className="rounded-full bg-[var(--danger-bg)] px-3 py-1 text-[12px] font-bold text-[var(--danger-bright)]">
            🔴 TEST MODE
          </span>
        )}

        <div className="flex flex-wrap gap-2">
          {serviceTimes.map((svc, i) => (
            <span
              key={i}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[15px] font-bold ${
                svc.isPast
                  ? 'bg-white/[0.04] text-[var(--dim)]'
                  : svc.isLive
                    ? 'border border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--live)]'
                    : 'bg-white/[0.04] text-[var(--text)]'
              }`}
            >
              {svc.time}
              {svc.isLive ? (
                <>
                  <span className="mx-1.5 opacity-50">·</span>
                  LIVE
                  <span className="ml-1" style={{ animation: 'pulse-live 1.6s ease-in-out infinite' }}>
                    ●
                  </span>
                </>
              ) : svc.countdown ? (
                <>
                  <span className="mx-1.5 opacity-50">·</span>
                  <span className="font-semibold text-[var(--muted)]">in {svc.countdown}</span>
                </>
              ) : null}
            </span>
          ))}
        </div>

        {speakerName && (
          <>
            <div className="h-6 w-px bg-white/[0.14]" />
            <div className="text-[13px] font-semibold text-[var(--muted)]">Speaker</div>
            <span className="rounded-full border border-white/[0.14] bg-white/[0.07] px-4 py-1.5 text-[15px] font-bold text-[var(--text)]">
              {speakerName}
            </span>
          </>
        )}

        <div className="flex gap-1.5">
          <button type="button" onClick={onRefresh} className={ICON_BUTTON_CLASS} aria-label="Refresh">
            <RefreshIcon />
          </button>
          <button type="button" onClick={onOpenSettings} className={ICON_BUTTON_CLASS} aria-label="Settings">
            <GearIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
