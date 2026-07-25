import { useEffect, useRef, useState } from 'react';
import { Avatar, Badge } from '../ui';
import { photoProxyUrl, stripParens } from '../lib/format.js';

// Below lg the card shows at most this many tags on one line so every card in
// the list keeps identical geometry; the rest surface as a "+N" counter and are
// all still rendered at lg, where the row can wrap.
const MOBILE_TAG_LIMIT = 2;

function PencilIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

// `first` is the leader pill — kept at its natural width so the arrangement
// note beside it absorbs the remaining space instead of both being squeezed.
function TagBadge({ tag, first }) {
  return (
    <Badge
      variant={tag.variant}
      className={`truncate text-[13px] lg:max-w-[420px] lg:text-[14px] ${first ? 'shrink-0' : 'min-w-0 shrink'}`}
      title={tag.label}
    >
      {tag.label}
    </Badge>
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

  // Leader name(s) first, then the arrangement notes — one list so the mobile
  // two-tag cap always keeps the leader visible.
  const tags = [
    ...leadPills.map((label) => ({ label, variant: 'accent' })),
    ...bubbles.map((label) => ({ label, variant: 'neutral' })),
  ];
  const visibleTags = tags.slice(0, MOBILE_TAG_LIMIT);
  const overflowTags = tags.slice(MOBILE_TAG_LIMIT);
  const hiddenTagCount = overflowTags.length;

  return (
    <div
      // Content is top-aligned below lg: cards are equalized to a uniform
      // height, so centering would split the leftover space and drop the
      // avatar a different distance from the top on every card. All the slack
      // goes to the bottom instead, pinning the avatar to a constant offset.
      className={`glass-card flex h-full shrink-0 flex-col justify-start gap-3 overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:flex-1 lg:justify-center ${changed ? 'is-changed' : ''}`}
      style={{
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
      {/* Five siblings placed by .song-card-body: a 3-column grid below lg,
          a single flex row at lg (see src/index.css). */}
      <div className="song-card-body">
        <span className="song-card-num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-border-soft)] bg-[var(--accent-bg)] text-[15px] font-extrabold leading-none text-[var(--accent)] lg:h-auto lg:w-auto lg:border-0 lg:bg-transparent lg:px-0 lg:text-[36px] lg:font-black">
          {index + 1}
        </span>

        <h2 className="song-card-title min-w-0 text-[20px] font-extrabold leading-tight text-[var(--text)] lg:shrink-0 lg:whitespace-nowrap lg:text-[26px] lg:leading-normal">
          <span className="song-card-title-main">{titleMain}</span>
          {titleSub && (
            <span className="song-card-artist truncate text-[14px] font-medium text-[var(--muted)] lg:text-[18px]">
              <span className="lg:hidden">{stripParens(titleSub)}</span>
              <span className="hidden lg:inline">{titleSub}</span>
            </span>
          )}
          {changed && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismissChanged?.();
              }}
              className="ml-2 shrink-0 cursor-pointer rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-2.5 py-0.5 align-middle text-[12px] font-extrabold uppercase tracking-wide text-[var(--accent)]"
              aria-label="Song updated — dismiss"
            >
              Updated ✕
            </button>
          )}
        </h2>

        {leaders.length > 0 && (
          <div className="song-card-media flex shrink-0">
            {leaders.map((leader, i) => (
              <div key={i} style={{ marginLeft: i > 0 ? -14 : 0, zIndex: leaders.length - i }}>
                <Avatar name={leader.name} src={photoProxyUrl(leader.photoUrl)} gradient={leader.gradient} size={52} />
              </div>
            ))}
          </div>
        )}

        {/* One non-wrapping line below lg so card heights stay uniform; wraps
            freely at lg where there's room for the full set. */}
        <div className="song-card-tags flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden lg:flex-wrap">
          {visibleTags.map((tag, i) => (
            <TagBadge key={`${tag.variant}-${i}`} tag={tag} first={i === 0} />
          ))}
          {hiddenTagCount > 0 && (
            <>
              {/* Hidden as a group below lg — putting `hidden` on this wrapper
                  instead of each Badge avoids fighting Badge's own
                  `inline-block`, which wins on display by source order. */}
              <span className="hidden lg:contents">
                {overflowTags.map((tag, i) => (
                  <TagBadge key={`overflow-${tag.variant}-${i}`} tag={tag} />
                ))}
              </span>
              <span
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[13px] font-semibold text-[var(--muted)] lg:hidden"
                title={overflowTags.map((t) => t.label).join(' • ')}
              >
                +{hiddenTagCount}
              </span>
            </>
          )}
        </div>

        {!showNoteStrip && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingNote(true);
            }}
            className="song-card-note flex shrink-0 cursor-pointer items-center gap-1.5 justify-self-end rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[13px] font-semibold text-[var(--dim)] hover:border-white/20 hover:text-[var(--muted)] lg:ml-auto lg:text-[12px]"
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
