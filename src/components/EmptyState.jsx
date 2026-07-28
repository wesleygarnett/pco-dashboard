import { Button } from '../ui';

/**
 * Shown when Planning Center answered fine but has nothing to display — an
 * unscheduled service type, most often. Deliberately not styled as an error:
 * nothing is broken, and "Try Again" would just fail again. What's needed is
 * either a different service type or a plan built in PCO.
 */
export default function EmptyState({ message, onOpenSettings, onRetry }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-[26px]" aria-hidden="true">
        📅
      </div>
      <div className="text-[16px] font-semibold text-[var(--text)]">Nothing scheduled yet</div>
      <div className="max-w-[520px] text-[13px] text-[var(--muted)]">{message}</div>
      <div className="max-w-[520px] text-[12px] text-[var(--dim)]">
        Build a plan in Planning Center, or pick a different service type in Settings.
      </div>
      <div className="mt-1 flex gap-2">
        <Button variant="primary" onClick={onOpenSettings}>
          Open Settings
        </Button>
        <Button variant="secondary" onClick={onRetry}>
          Check Again
        </Button>
      </div>
    </div>
  );
}
