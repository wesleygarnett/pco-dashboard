import { Avatar } from '../ui';
import { photoProxyUrl } from '../lib/format.js';

const DIR_GRAD = 'var(--avatar-grad-director)';

// Roughly one in five scheduled church volunteers doesn't show up, so the
// booth cares about more than "declined or not". PCO distinguishes confirmed
// from unconfirmed, and notification_read_at separates "hasn't replied yet"
// from "never even opened the request" — the strongest no-show signal
// available, and worth its own state on the wall.
const STATE_NOTE = {
  unconfirmed: 'Unconfirmed',
  unopened: 'No reply',
};

function slotTitle(people, isDeclined) {
  return people
    .map((p) => {
      const bits = [p.name];
      if (isDeclined) bits.push(p.declineReason ? `Declined — ${p.declineReason}` : 'Declined');
      else if (p.state === 'unopened') bits.push('Scheduled, never opened the request');
      else if (p.state === 'unconfirmed') bits.push('Unconfirmed');
      if (p.memberNote) bits.push(p.memberNote);
      return bits.join(' · ');
    })
    .join('\n');
}

export default function CameraSlot({ label, isDirector, isEmpty, isDeclined, people }) {
  // Worst status wins the caption: one unconfirmed operator in a shared slot
  // still means the slot isn't locked in.
  const pending = people.find((p) => p.state === 'unopened') || people.find((p) => p.state === 'unconfirmed');
  const subLabel = isDeclined ? 'Declined' : pending ? STATE_NOTE[pending.state] : '';

  return (
    <div
      className="flex w-20 flex-col items-center gap-1.5 lg:w-auto"
      style={{ opacity: isEmpty ? 0.4 : isDeclined ? 0.65 : 1 }}
      title={isEmpty ? `${label} — nobody scheduled` : slotTitle(people, isDeclined)}
    >
      {isEmpty ? (
        <div
          className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[1.5px] border-dashed border-white/25 bg-white/[0.05] text-[16px] font-extrabold text-[var(--dim)]"
        >
          —
        </div>
      ) : isDeclined ? (
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-[var(--danger-border)] bg-[var(--danger-bg)] text-[18px] font-extrabold text-[var(--danger)]">
          {people[0]?.initials || '?'}
        </div>
      ) : (
        <div className="flex -space-x-3">
          {people.map((p, i) => (
            <Avatar
              key={i}
              name={p.name}
              src={photoProxyUrl(p.photoUrl)}
              gradient={isDirector ? DIR_GRAD : p.gradient}
              size={52}
              ringColor={
                p.state === 'unopened' || p.state === 'unconfirmed'
                  ? 'var(--avatar-ring-warn)'
                  : isDirector
                    ? 'var(--avatar-ring-director)'
                    : 'var(--avatar-ring)'
              }
            />
          ))}
        </div>
      )}
      {/* Two-line min-height keeps single- and double-word labels ("CAM 1" vs
          "BROADCAST DIRECTOR") on equal-height rows in the mobile grid. */}
      <div
        className="min-h-8 text-center text-[12px] font-bold uppercase leading-tight tracking-wide lg:min-h-0"
        style={{ color: isDeclined ? 'var(--danger-bright)' : 'var(--muted)' }}
      >
        {label.toUpperCase()}
        {subLabel && (
          <span
            className="block whitespace-nowrap"
            style={{ color: isDeclined ? 'var(--danger-bright)' : 'var(--warn-bright)' }}
          >
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}
