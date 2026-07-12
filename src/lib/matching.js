export function buildMap(arr, type) {
  const m = {};
  (arr || []).forEach((i) => {
    if (i.type === type) m[i.id] = i;
  });
  return m;
}

export function resolveTeamName(member, teamMap) {
  if (member.attributes.team_name) return member.attributes.team_name;
  const teamId = member.relationships?.team?.data?.id;
  if (teamId && teamMap[teamId]) return teamMap[teamId].attributes.name || '';
  return '';
}

export function parseLeaderNames(description) {
  const text = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const match = text.match(/\+?\s*lead[s]?\s*[:\-]\s*([^\n+|<]+)/i);
  if (!match) return [];
  // The lead line often carries extra info after bullets ("Lead: Bekah • Altos
  // on Melody • …") — only the first segment is the leader name(s); the rest
  // surfaces as info bubbles via parseDescriptionBubbles.
  const namePart = match[1].split('•')[0];
  return namePart.split(/[,&]+/).map((s) => s.trim()).filter(Boolean);
}

// Parse description into info bubbles — strips HTML, splits on '+', removes Lead line
export function parseDescriptionBubbles(description) {
  const text = description
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text
    .split(/\+/)
    .map((s) => s.replace(/^[>\s]+/, '').trim())
    .filter((s) => s.length > 0)
    .flatMap((s) => {
      if (!/^leads?\s*[:\-]/i.test(s)) return [s];
      // Lead segment: the name renders as its own pill (parseLeaderNames);
      // keep any bullet-separated extras as individual bubbles.
      return s.split('•').slice(1).map((p) => p.trim()).filter(Boolean);
    });
}

// Returns parallel array to leaderNames: matched PlanPerson or null if not found
export function matchLeaders(leaderNames, bandMembers) {
  return leaderNames.map((lName) => {
    const lLower = lName.toLowerCase();
    return (
      bandMembers.find((m) => {
        const full = (m.attributes.name || '').toLowerCase();
        const first = full.split(' ')[0];
        const last = full.split(' ').pop();
        return first === lLower || last === lLower || full.includes(lLower) || lLower.includes(first);
      }) || null
    );
  });
}

export function camNum(s) {
  const m = s.match(/(?:camera|cam)\s*(\d+)/);
  return m ? parseInt(m[1]) : null;
}

export function sortVideoTeam(members, directorKeywords) {
  return [...members].sort((a, b) => {
    const ap = (a.attributes.team_position_name || '').toLowerCase();
    const bp = (b.attributes.team_position_name || '').toLowerCase();
    const aDir = directorKeywords.some((k) => ap.includes(k.toLowerCase()));
    const bDir = directorKeywords.some((k) => bp.includes(k.toLowerCase()));
    if (aDir && !bDir) return -1;
    if (!aDir && bDir) return 1;
    const aPTZ = /ptz/.test(ap);
    const bPTZ = /ptz/.test(bp);
    if (!aPTZ && bPTZ) return -1;
    if (aPTZ && !bPTZ) return 1;
    const an = camNum(ap);
    const bn = camNum(bp);
    if (an !== null && bn !== null) return an - bn;
    return ap.localeCompare(bp);
  });
}

export function getPhoto(member, personMap) {
  let p = member.attributes.photo_thumbnail || '';
  if (!p || /generic|placeholder|missing/i.test(p)) {
    const pid = member.relationships?.person?.data?.id;
    if (pid && personMap[pid]) p = personMap[pid].attributes.photo_thumbnail_url || '';
  }
  return p && !/generic|placeholder|missing/i.test(p) ? p : '';
}
