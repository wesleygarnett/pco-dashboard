import { buildMap, resolveTeamName, parseLeaderNames, parseDescriptionBubbles, matchLeaders, getPhoto, sortVideoTeam } from './matching.js';
import { capFirst, avatarGradient, fmtDate } from './format.js';

const LIVE_WINDOW_MS = 60 * 60 * 1000;

export function buildDashboardData({ items, teamMembers, planTimes, plan }, cfg, planId) {
  const teamMap = buildMap(teamMembers.included || [], 'Team');
  const personMap = buildMap(teamMembers.included || [], 'Person');

  const allMembers = (teamMembers.data || []).map((m) => ({
    ...m,
    _teamName: resolveTeamName(m, teamMap),
  }));

  const serviceTitle = plan.data.attributes.title || 'Weekend Services';
  const serviceDate = fmtDate(plan.data.attributes.sort_date, cfg.timezone);

  const serviceTimes = (planTimes.data || [])
    .filter((t) => t.attributes.time_type === 'service' && t.attributes.starts_at)
    .sort((a, b) => new Date(a.attributes.starts_at) - new Date(b.attributes.starts_at))
    .slice(0, 2)
    .map((t) => new Date(t.attributes.starts_at).getTime());

  const songs = buildSongs(items, allMembers, personMap, planId, cfg);
  const positions = buildPositions(allMembers, personMap, cfg);

  return { serviceTitle, serviceDate, serviceTimes, songs, positions };
}

function buildSongs(items, allMembers, personMap, planId, cfg) {
  const songMap = buildMap(items.included || [], 'Song');

  const bandMembers = allMembers.filter((m) =>
    cfg.bandTeamNames.some((k) => m._teamName.toLowerCase().includes(k)),
  );

  const songItems = (items.data || [])
    .filter((i) => i.attributes.item_type === 'song')
    .sort((a, b) => a.attributes.sequence - b.attributes.sequence);

  return songItems.map((item) => {
    const attr = item.attributes;
    const songId = item.relationships?.song?.data?.id;
    const songData = songId ? songMap[songId] : null;

    const title = songData?.attributes?.title || attr.title || 'Untitled';
    const titleMatch = title.match(/^(.*?)\s*(\(.*\))\s*$/);
    const titleMain = titleMatch ? titleMatch[1].trim() : title;
    const titleSub = titleMatch ? titleMatch[2].trim() : null;
    const keyName = attr.key_name || '';
    const notesKey = `pco_note_${planId}_${item.id}`;
    const note = localStorage.getItem(notesKey) || '';

    const bubbles = parseDescriptionBubbles(attr.description || '');
    const leaderNames = parseLeaderNames(attr.description || '').slice(0, 3);
    const leadResults = matchLeaders(leaderNames, bandMembers);

    let leaders, leadPills;
    if (leaderNames.length) {
      leaders = leaderNames.map((lName, i) => {
        const m = leadResults[i];
        if (m) {
          return {
            name: m.attributes.name || '?',
            photoUrl: getPhoto(m, personMap),
            gradient: avatarGradient(i),
          };
        }
        const isTbd = lName.startsWith('(');
        return { name: isTbd ? 'TBD' : lName.charAt(0).toUpperCase(), photoUrl: '', gradient: avatarGradient(i) };
      });
      leadPills = leaderNames.map((lName, i) => {
        const m = leadResults[i];
        return m ? capFirst(m.attributes.name.split(' ')[0]) : lName.startsWith('(') ? 'TBD' : capFirst(lName);
      });
    } else {
      leaders = [{ name: '♪', photoUrl: '', gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)' }];
      leadPills = ['TBD'];
    }

    return {
      id: item.id,
      keyName,
      titleMain,
      titleSub,
      leaders,
      leadPills,
      bubbles,
      note,
      notesKey,
      isChanged: false,
    };
  });
}

function buildPositions(allMembers, personMap, cfg) {
  const allVideoRaw = allMembers.filter((m) => m._teamName.toLowerCase().includes(cfg.videoTeamName));

  return cfg.videoPositions.map((pos) => {
    const re = new RegExp(pos.pattern, 'i');
    const members = allVideoRaw.filter((m) => re.test(m.attributes.team_position_name || ''));
    const confirmed = members.filter((m) => m.attributes.status !== 'D');
    const isEmpty = members.length === 0;
    const isDeclined = members.length > 0 && confirmed.length === 0;
    const displayList = confirmed.length > 0 ? confirmed : members;

    const people = displayList.map((m, i) => ({
      name: m.attributes.name || 'Unknown',
      photoUrl: getPhoto(m, personMap),
      gradient: avatarGradient(i),
      initials: (m.attributes.name || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
    }));

    return {
      label: pos.label,
      isDirector: !!pos.isDir,
      isEmpty,
      isDeclined,
      people,
    };
  });
}

export { LIVE_WINDOW_MS, sortVideoTeam };
