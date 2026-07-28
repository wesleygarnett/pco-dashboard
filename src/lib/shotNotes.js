// Shot assignments are stored as a single Planning Center item note per song,
// in a dedicated note category. The note body is one `Label: shot` line per
// camera position:
//
//   Camera 1: wide, locked
//   Camera 2: Bekah — waist, push in on the bridge
//   Camera 3: detail — hands, 85mm
//
// That format is deliberate: the note is a shared document, not a private
// encoding. It has to stay readable — and hand-editable — inside PCO itself,
// because the worship leader and the ProPresenter operator see the same note.

const MAX_SHOT_LENGTH = 200;

// PCO note content can carry basic HTML when edited in their rich-text field.
function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function normalizeLabel(label) {
  return String(label || '').trim().toLowerCase();
}

/**
 * Parse a note body into `{ [positionLabel]: shot }`, keyed by the *configured*
 * label so callers can look positions up directly.
 *
 * Lines whose prefix doesn't match a configured position are kept under the
 * `_extra` key rather than dropped — someone editing the note in PCO shouldn't
 * lose text just because a camera was renamed here.
 */
export function parseShotNote(content, positions = []) {
  const byLabel = new Map(positions.map((p) => [normalizeLabel(p.label), p.label]));
  const assignments = {};
  const extra = [];

  stripHtml(content)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/^([^:]{1,40}):\s*(.*)$/);
      const label = match ? byLabel.get(normalizeLabel(match[1])) : null;
      if (!label) {
        extra.push(line);
        return;
      }
      const shot = match[2].trim().slice(0, MAX_SHOT_LENGTH);
      // Later lines win, so a duplicated label in a hand-edited note resolves
      // to whichever the author most recently wrote.
      if (shot) assignments[label] = shot;
    });

  if (extra.length) assignments._extra = extra.join('\n');
  return assignments;
}

/**
 * Render `{ [positionLabel]: shot }` back to note text, in configured position
 * order so the note reads top-to-bottom like the camera dock. Unrecognized
 * lines preserved by `parseShotNote` are appended verbatim.
 */
export function formatShotNote(assignments = {}, positions = []) {
  const lines = positions
    .map((p) => {
      const shot = String(assignments[p.label] || '').trim();
      return shot ? `${p.label}: ${shot.slice(0, MAX_SHOT_LENGTH)}` : null;
    })
    .filter(Boolean);

  const extra = String(assignments._extra || '').trim();
  if (extra) lines.push(extra);

  return lines.join('\n');
}

/** Shot entries in configured position order, for rendering. */
export function shotList(assignments = {}, positions = []) {
  return positions
    .map((p) => ({ label: p.label, shot: String(assignments[p.label] || '').trim() }))
    .filter((entry) => entry.shot);
}

export { MAX_SHOT_LENGTH };
