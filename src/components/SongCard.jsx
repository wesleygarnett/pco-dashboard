import { useState } from 'react';
import Avatar from './Avatar.jsx';

export default function SongCard({
  index,
  keyName,
  titleMain,
  titleSub,
  leaders,
  leadPills,
  bubbles,
  note,
  notesKey,
  onNoteChange,
  isChanged,
  onDismissChanged,
  animationDelay,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [noteValue, setNoteValue] = useState(note);
  const changed = isChanged && !dismissed;

  return (
    <div
      className={`glass-card flex shrink-0 items-center overflow-hidden ${changed ? 'is-changed' : ''}`}
      style={{
        gap: 22,
        padding: '18px 26px',
        flex: 1,
        opacity: 0,
        animation: 'card-slide-in 0.4s ease forwards',
        animationDelay: `${animationDelay}s`,
      }}
      onClick={() => {
        if (changed) {
          setDismissed(true);
          onDismissChanged?.();
        }
      }}
    >
      <span className="shrink-0 whitespace-nowrap text-[30px] font-black text-[var(--purple)]" style={{ minWidth: 36 }}>
        {index + 1}
        {keyName ? <span className="ml-1 text-[16px] font-semibold text-[var(--muted)]">{keyName}</span> : null}
      </span>

      <div className="shrink-0 whitespace-nowrap text-[22px] font-extrabold text-[var(--text)]">
        {titleMain}
        {titleSub && <span className="ml-2 text-[15px] font-medium text-[var(--muted)]">{titleSub}</span>}
      </div>

      {leaders.length > 0 && (
        <div className="flex shrink-0">
          {leaders.map((leader, i) => (
            <div key={i} style={{ marginLeft: i > 0 ? -12 : 0, zIndex: leaders.length - i }}>
              <Avatar name={leader.name} photoUrl={leader.photoUrl} gradient={leader.gradient} size={46} />
            </div>
          ))}
        </div>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-1.5 overflow-hidden">
        {leadPills.map((p, i) => (
          <span
            key={`lead-${i}`}
            className="shrink-0 whitespace-nowrap rounded-full border border-[var(--purple-border)] bg-[var(--purple-bg)] px-3 py-1 text-[12px] font-extrabold text-[var(--purple)]"
          >
            {p}
          </span>
        ))}
        {bubbles.map((b, i) => (
          <span
            key={`bubble-${i}`}
            className="max-w-[220px] shrink truncate whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-[var(--muted)]"
            title={b}
          >
            {b}
          </span>
        ))}
      </div>

      <input
        type="text"
        value={noteValue}
        placeholder="Add notes…"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          setNoteValue(e.target.value);
          onNoteChange?.(notesKey, e.target.value);
        }}
        className="flex-1 border-0 border-l bg-transparent py-0 pl-6 text-right text-[16px] font-semibold italic outline-none placeholder:text-[var(--note-placeholder)]"
        style={{
          minWidth: 120,
          borderLeftColor: changed ? 'rgba(217,119,87,0.3)' : 'rgba(255,255,255,0.1)',
          color: noteValue ? 'var(--note-text)' : 'var(--note-placeholder)',
        }}
      />
    </div>
  );
}
