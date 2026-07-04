export const DEFAULT_VIDEO_POSITIONS = [
  { label: 'Main Director', pattern: 'main\\s*director', isDir: true },
  { label: 'Broadcast Director', pattern: 'broadcast\\s*director', isDir: true },
  { label: 'Camera 1', pattern: 'camera\\s*0?1\\b', isDir: false },
  { label: 'Camera 2', pattern: 'camera\\s*0?2\\b', isDir: false },
  { label: 'Camera 3', pattern: 'camera\\s*0?3\\b', isDir: false },
  { label: 'Camera 4', pattern: 'camera\\s*0?4\\b', isDir: false },
  { label: 'Camera 5', pattern: 'camera\\s*0?5\\b', isDir: false },
  { label: 'Camera 6', pattern: 'camera\\s*0?6\\b', isDir: false },
  { label: 'Camera 7', pattern: 'camera\\s*0?7\\b', isDir: false },
  { label: 'Camera 8', pattern: 'camera\\s*0?8\\b', isDir: false },
  { label: 'Camera 9', pattern: 'camera\\s*0?9\\b', isDir: false },
  { label: 'Camera 10', pattern: 'camera\\s*10\\b', isDir: false },
  { label: 'Camera 11/12', pattern: 'camera\\s*1[12]\\b|ptz', isDir: false },
];

export function getDefaultVideoPositions() {
  return DEFAULT_VIDEO_POSITIONS.map((item) => ({ ...item }));
}

// Auto-generate a regex pattern from a plain-text position name.
const LABEL_ABBREVS = { cam: 'cam(?:era)?' };
export function patternFromLabel(label) {
  return label
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (/^\d+$/.test(word)) return '0?' + word + '\\b';
      const expanded = LABEL_ABBREVS[word];
      if (expanded) return expanded;
      return word.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('\\s*');
}

export function readCommaList(value) {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getTimezoneOptions() {
  if (Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone');
  return ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];
}
