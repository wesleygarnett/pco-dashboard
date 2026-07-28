export function getInitials(name) {
  return (name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Song subtitles arrive parenthesized ("(Elevation Worship)") because they're
// split off the PCO title. The mobile card renders them as their own line where
// the parens are visual noise; the desktop row keeps them inline as-is.
export function stripParens(s) {
  return s ? s.replace(/^\s*\(\s*|\s*\)\s*$/g, '') : s;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function fmtCountdown(ms) {
  if (ms >= DAY_MS) {
    const days = Math.floor(ms / DAY_MS);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

// The night-mode theme uses a fixed 3-tone violet/green/indigo rotation
// (see src/ui/theme.css) instead of the old 10-color hash palette.
const AVATAR_GRADIENTS = ['var(--avatar-grad-1)', 'var(--avatar-grad-2)', 'var(--avatar-grad-3)'];

export function avatarGradient(index) {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
}

// PCO photo URLs don't load cross-origin from a browser, so route them through
// the app's /api/photo-proxy. Returns undefined for empty input so <Avatar>
// falls back to initials.
export function photoProxyUrl(url) {
  return url ? `/api/photo-proxy?url=${encodeURIComponent(url)}` : undefined;
}

export function fmtDate(d, timezone) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone || 'America/New_York',
  });
}

// "Last done" freshness for a song. Weeks are the unit worship teams actually
// argue in, so favour those over exact dates for the first few months.
export function fmtRelativeDate(d, timezone) {
  if (!d) return '';
  const then = new Date(d).getTime();
  if (Number.isNaN(then)) return '';

  const days = Math.floor((Date.now() - then) / DAY_MS);
  if (days < 0) return '';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 70) return `${Math.round(days / 7)} weeks ago`;

  return new Date(then).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: timezone || 'America/New_York',
  });
}

export function fmtTime(d, timezone) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone || 'America/New_York',
  });
}
