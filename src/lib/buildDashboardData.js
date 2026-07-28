import { buildMap, resolveTeamName, parseLeaderNames, parseDescriptionBubbles, matchLeaders, getPhoto } from './matching.js';
import { capFirst, avatarGradient, fmtDate, fmtRelativeDate, getInitials } from './format.js';
import { parseShotNote, shotList } from './shotNotes.js';

const LIVE_WINDOW_MS = 60 * 60 * 1000;

const MAX_POSITION_NAME_LENGTH = 200;

export function buildDashboardData({ items, teamMembers, planTimes, plan }, cfg, planId) {
  const teamMap = buildMap(teamMembers.included || [], 'Team');
  const personMap = buildMap(teamMembers.included || [], 'Person');

  const allMembers = (teamMembers.data || []).map((m) => ({
    ...m,
    _teamName: resolveTeamName(m, teamMap),
  }));

  const serviceTitle = plan.data.attributes.title || 'Weekend Services';
  const serviceDate = fmtDate(plan.data.attributes.sort_date, cfg.timezone);

  // `name` ("9:00 AM Service") reads better than a bare time on a wall, and
  // `ends_at` gives a real service length instead of a hardcoded guess.
  const serviceTimes = (planTimes.data || [])
    .filter((t) => t.attributes.time_type === 'service' && t.attributes.starts_at)
    .sort((a, b) => new Date(a.attributes.starts_at) - new Date(b.attributes.starts_at))
    .slice(0, 2)
    .map((t) => ({
      startsAt: new Date(t.attributes.starts_at).getTime(),
      endsAt: t.attributes.ends_at ? new Date(t.attributes.ends_at).getTime() : null,
      name: (t.attributes.name || '').trim(),
    }));

  const songs = buildSongs(items, allMembers, personMap, planId, cfg);
  const { positions, unmatched } = buildPositions(allMembers, personMap, cfg);

  return { serviceTitle, serviceDate, serviceTimes, songs, positions, unmatched };
}

// Section labels arrive as ["Intro 1", "Verse 1", "Chorus 2", …]; the trailing
// repeat count is noise on a wall display read from across the booth.
function buildStructure(arrangement) {
  const sequence = arrangement?.attributes?.sequence;
  if (!Array.isArray(sequence)) return [];
  return sequence
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s+\d+$/, ''))
    .slice(0, 12);
}

function buildSongs(items, allMembers, personMap, planId, cfg) {
  const songMap = buildMap(items.included || [], 'Song');
  const arrangementMap = buildMap(items.included || [], 'Arrangement');
  const noteMap = buildMap(items.included || [], 'ItemNote');

  const bandMembers = allMembers.filter((m) =>
    cfg.bandTeamNames.some((k) => m._teamName.toLowerCase().includes(k.toLowerCase())),
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

    // Freshness: the Song objects have carried this all along; only `title` was
    // ever read off them.
    const lastScheduled = fmtRelativeDate(songData?.attributes?.last_scheduled_at, cfg.timezone);

    const arrangementId = item.relationships?.arrangement?.data?.id;
    const arrangement = arrangementId ? arrangementMap[arrangementId] : null;
    const structure = buildStructure(arrangement);
    const bpm = Number(arrangement?.attributes?.bpm) || null;

    // Shot assignments live in one PCO item note per song, in the configured
    // category. Both ids are kept so a save can PATCH in place rather than
    // creating a duplicate note.
    const shotNote = cfg.shotNoteCategoryId
      ? (item.relationships?.item_notes?.data || [])
          .map((ref) => noteMap[ref.id])
          .find((n) => n?.relationships?.item_note_category?.data?.id === cfg.shotNoteCategoryId)
      : null;
    const shotAssignments = parseShotNote(shotNote?.attributes?.content || '', cfg.videoPositions);

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
      lastScheduled,
      structure,
      bpm,
      shots: shotList(shotAssignments, cfg.videoPositions),
      shotAssignments,
      shotNoteId: shotNote?.id || '',
      isChanged: false,
    };
  });
}

// PCO statuses are C (confirmed), U (unconfirmed) and D (declined). Collapsing
// them to "not declined" made an unconfirmed volunteer look identical to a
// confirmed one; `notification_read_at` goes further and separates "hasn't
// replied" from "never even opened the request".
function memberState(m) {
  const attr = m.attributes || {};
  if (attr.status === 'D') return 'declined';
  if (attr.status === 'C') return 'confirmed';
  return attr.notification_sent_at && !attr.notification_read_at ? 'unopened' : 'unconfirmed';
}

function buildPositions(allMembers, personMap, cfg) {
  const allVideoRaw = allMembers.filter((m) => m._teamName.toLowerCase().includes(cfg.videoTeamName.toLowerCase()));
  const matched = new Set();

  const positions = cfg.videoPositions.map((pos) => {
    // The server validates patterns on save, but a settings.json written before
    // that validation existed would otherwise throw here and blank the display.
    let re;
    try {
      re = new RegExp(pos.pattern, 'i');
    } catch (_) {
      re = null;
    }
    // Bounding the input keeps a pathological pattern cheap rather than letting
    // it backtrack over an arbitrarily long position name.
    const members = re
      ? allVideoRaw.filter((m) => re.test((m.attributes.team_position_name || '').slice(0, MAX_POSITION_NAME_LENGTH)))
      : [];
    members.forEach((m) => matched.add(m.id));

    const confirmed = members.filter((m) => m.attributes.status !== 'D');
    const isEmpty = members.length === 0;
    const isDeclined = members.length > 0 && confirmed.length === 0;
    const displayList = confirmed.length > 0 ? confirmed : members;

    const people = displayList.map((m, i) => ({
      name: m.attributes.name || 'Unknown',
      photoUrl: getPhoto(m, personMap),
      gradient: avatarGradient(i),
      initials: getInitials(m.attributes.name),
      state: memberState(m),
      declineReason: (m.attributes.decline_reason || '').trim(),
      memberNote: (m.attributes.notes || '').trim(),
    }));

    return {
      label: pos.label,
      isDirector: !!pos.isDir,
      isEmpty,
      isDeclined,
      people,
    };
  });

  // Anyone on the production team whose position matches no configured pattern
  // used to disappear without a trace — the most common "why isn't Dave on the
  // dock?" support question. Surface them instead of dropping them.
  const unmatched = allVideoRaw
    .filter((m) => !matched.has(m.id))
    .map((m) => ({
      name: m.attributes.name || 'Unknown',
      positionName: (m.attributes.team_position_name || '').trim(),
    }));

  return { positions, unmatched };
}

export { LIVE_WINDOW_MS };
