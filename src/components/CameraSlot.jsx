import { Avatar } from '../ui';
import { photoProxyUrl } from '../lib/format.js';

const DIR_GRAD = 'var(--avatar-grad-director)';

export default function CameraSlot({ label, isDirector, isEmpty, isDeclined, people }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      style={{ opacity: isEmpty ? 0.4 : isDeclined ? 0.65 : 1 }}
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
              ringColor={isDirector ? 'var(--avatar-ring-director)' : 'var(--avatar-ring)'}
            />
          ))}
        </div>
      )}
      <div
        className="text-center text-[11px] font-bold uppercase tracking-wide"
        style={{ color: isDeclined ? 'var(--danger-bright)' : 'var(--muted)' }}
      >
        {label.toUpperCase()}
        {isDeclined && <span className="block whitespace-nowrap">Declined</span>}
      </div>
    </div>
  );
}
