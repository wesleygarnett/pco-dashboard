import { useEffect, useRef, useState } from 'react';
import { Avatar, Badge } from '../ui';
import { photoProxyUrl } from '../lib/format.js';

function PencilIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export default function SongCard({
  index,
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
  const [noteValue, setNoteValue] = useState(note);
  const [editingNote, setEditingNote] = useState(false);
  const noteInputRef = useRef(null);
  const changed = isChanged;

  useEffect(() => {
    if (editingNote) noteInputRef.current?.focus();
  }, [editingNote]);

  function saveNote(value) {
    setNoteValue(value);
    onNoteChange?.(notesKey, value);
  }

  const showNoteStrip = editingNote || !!noteValue;

  return (
    <div
      className={`glass-card flex shrink-0 flex-col justify-center gap-3 overflow-hidden md:flex-1 ${changed ? 'is-changed' : ''}`}
      style={{
        padding: '18px 26px',
        opacity: 0,
        animation: 'card-slide-in 0.4s ease forwards',
        animationDelay: `${animationDelay}s`,
      }}
      onClick={() => {
        if (changed) {
          onDismissChanged?.();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-y-3 md:flex-nowrap" style={{ columnGap: 22 }}>
        <span className="shrink-0 whitespace-nowrap text-[36px] font-black text-[var(--accent)]" style={{ minWidth: 43 }}>
          {index + 1}
        </span>

        <h2 className="shrink-0 text-[26px] font-extrabold text-[var(--text)] md:whitespace-nowrap">
          {titleMain}
          {titleSub && <span className="ml-2 text-[18px] font-medium text-[var(--muted)]">{titleSub}</span>}
        </h2>

        {changed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismissChanged?.();
            }}
            className="shrink-0 cursor-pointer rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--accent)]"
            aria-label="Song updated — dismiss"
          >
            Updated ✕
          </button>
        )}

        {leaders.length > 0 && (
          <div className="flex shrink-0">
            {leaders.map((leader, i) => (
              <div key={i} style={{ marginLeft: i > 0 ? -14 : 0, zIndex: leaders.length - i }}>
                <Avatar name={leader.name} src={photoProxyUrl(leader.photoUrl)} gradient={leader.gradient} size={55} />
              </div>
            ))}
          </div>
        )}

        <div className="flex min-w-0 flex-wrap items-center gap-1.5 overflow-hidden">
          {leadPills.map((p, i) => (
            <Badge key={`lead-${i}`} variant="accent" className="max-w-[280px] truncate sm:max-w-[520px]" style={{ fontSize: 14 }} title={p}>
              {p}
            </Badge>
          ))}
          {bubbles.map((b, i) => (
            <Badge key={`bubble-${i}`} variant="neutral" className="max-w-[220px] shrink truncate" title={b}>
              {b}
            </Badge>
          ))}
        </div>

        {!showNoteStrip && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingNote(true);
            }}
            className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-semibold text-[var(--dim)] hover:border-white/20 hover:text-[var(--muted)]"
          >
            <PencilIcon />
            Add note
          </button>
        )}
      </div>

      {showNoteStrip && (
        <div
          className="flex w-full items-center gap-2.5 rounded-lg py-1.5 pl-3 pr-2"
          style={{ borderLeft: '3px solid var(--note-accent)', background: 'var(--note-bg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="shrink-0 text-[var(--note-text)]" aria-hidden="true">
            <PencilIcon size={14} />
          </span>
          {editingNote ? (
            <input
              ref={noteInputRef}
              type="text"
              value={noteValue}
              placeholder="Type a note for this song…"
              aria-label="Song note"
              onChange={(e) => saveNote(e.target.value)}
              onBlur={() => setEditingNote(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingNote(false);
              }}
              className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold text-[var(--note-text)] outline-none placeholder:text-[var(--note-placeholder)]"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              title="Edit note"
              className="min-w-0 flex-1 cursor-text truncate text-left text-[15px] font-semibold text-[var(--note-text)]"
            >
              {noteValue}
            </button>
          )}
          <button
            type="button"
            aria-label="Clear note"
            onClick={() => {
              saveNote('');
              setEditingNote(false);
            }}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[12px] text-[var(--dim)] hover:bg-white/10 hover:text-[var(--text)]"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
