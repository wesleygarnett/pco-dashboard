import { useState } from 'react';
import { Overlay, Button, StatusLine, controlClass } from '../ui';
import { formatShotNote } from '../lib/shotNotes.js';
import { saveItemNote } from '../api/client.js';

/**
 * Edits the camera assignments for one song. Deliberately a modal rather than
 * inline on the card: nobody edits a shot plan from the booth wall at 9:02 on a
 * Sunday, and the wall layout has no room for per-position inputs.
 */
export default function ShotEditor({ song, cfg, planId, onClose, onSaved }) {
  const positions = cfg.videoPositions || [];
  const vocabulary = cfg.shotVocabulary || [];
  const [assignments, setAssignments] = useState(() => ({ ...song.shotAssignments }));
  const [status, setStatus] = useState({ message: '', type: '' });
  const [saving, setSaving] = useState(false);

  function setShot(label, value) {
    setAssignments((prev) => ({ ...prev, [label]: value }));
  }

  function appendTerm(label, term) {
    setAssignments((prev) => {
      const current = String(prev[label] || '').trim();
      return { ...prev, [label]: current ? `${current}, ${term.toLowerCase()}` : term };
    });
  }

  async function handleSave() {
    setSaving(true);
    setStatus({ message: 'Saving to Planning Center…', type: '' });
    try {
      const content = formatShotNote(assignments, positions);
      const result = await saveItemNote(cfg.serviceTypeId, planId, song.id, {
        categoryId: cfg.shotNoteCategoryId,
        noteId: song.shotNoteId || '',
        content,
      });
      onSaved(song.id, assignments, result.note?.id || song.shotNoteId || '');
    } catch (e) {
      setStatus({ message: e.message, type: 'error' });
      setSaving(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-[22px] font-bold text-[var(--text)]">{song.titleMain}</div>
          <div className="mt-1 text-[14px] text-[var(--muted)]">
            Camera assignments. Saved to Planning Center as a{' '}
            <span className="font-semibold text-[var(--text)]">{cfg.shotNoteCategoryName || 'shot'}</span> note, so the
            rest of the team sees them too.
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-[22px] leading-none text-[var(--muted)]">
          ×
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {positions.map((pos) => (
          <div key={pos.label} className="flex flex-col gap-1.5">
            <label htmlFor={`shot-${pos.label}`} className="text-[13px] font-semibold text-[var(--muted)]">
              {pos.label}
            </label>
            <input
              id={`shot-${pos.label}`}
              type="text"
              className={controlClass}
              value={assignments[pos.label] || ''}
              placeholder="e.g. wide, locked"
              onChange={(e) => setShot(pos.label, e.target.value)}
            />
            {vocabulary.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {vocabulary.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => appendTerm(pos.label, term)}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--muted)] hover:border-[var(--accent-border)] hover:text-[var(--text)]"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <StatusLine status={status} />

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving} className={saving ? 'opacity-60' : ''}>
          {saving ? 'Saving…' : 'Save Shots'}
        </Button>
      </div>
    </Overlay>
  );
}
