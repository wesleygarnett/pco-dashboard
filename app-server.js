const express = require('express');
const fetch = require('node-fetch');
const http = require('http');
const fs = require('fs');
const path = require('path');

try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

const PCO_BASE = 'https://api.planningcenteronline.com';

// Surfaced in Settings so someone standing at the wall display can tell which
// build is running. package.json ships inside the asar, so this resolves in a
// packaged app too.
const APP_VERSION = require('./package.json').version;

// Hosts the photo proxy will fetch from. Matched against the *parsed hostname*
// (exact or subdomain), never as a substring of the whole URL — a substring
// test lets `http://evil.com/?planningcenteronline.com` through.
const PHOTO_HOSTS = [
  'planningcenteronline.com',
  'planningcenter.com',
  'pcoassets.com',
  'cloudfront.net',
];

// PCO Basic credentials are only ever sent to hosts Planning Center actually
// owns. `cloudfront.net` stays fetchable because PCO serves avatars from it,
// but anyone can stand up a CloudFront distribution, so it never sees the
// Authorization header.
const PHOTO_AUTH_HOSTS = PHOTO_HOSTS.filter(host => host !== 'cloudfront.net');

const PHOTO_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);

const PCO_TIMEOUT_MS = 15000;

function hostAllowed(hostname, allowList) {
  return allowList.some(host => hostname === host || hostname.endsWith(`.${host}`));
}

const DEFAULT_SETTINGS = {
  pcoAppId: '',
  pcoSecret: '',
  serviceTypeId: '',
  serviceTypeName: '',
  orgName: 'My Church',
  orgSub: 'Sunday Services',
  orgIcon: '⛪',
  orgLogo: '',
  timezone: 'America/New_York',
  videoTeamName: 'video production',
  bandTeamNames: ['band', 'vocal'],
  pollIntervalMs: 60000,
  // Which PCO item-note category holds per-song camera assignments. Empty means
  // the feature is off. Categories can't be created through the API, so this is
  // picked from the ones the org already has.
  shotNoteCategoryId: '',
  shotNoteCategoryName: '',
  // Shot vocabulary is deliberately per-church: "if a director says 'push-in'
  // and the camera operator doesn't know what that means, you will not get what
  // you want." These are offered as one-click chips in the shot editor.
  shotVocabulary: ['Wide', 'Mid', 'Tight', 'Detail', 'Roaming', 'Locked', 'Push in'],
  videoPositions: [
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
  ],
};

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function sanitizeString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeMatcherString(value, fallback = '') {
  return sanitizeString(value, fallback).trim().toLowerCase();
}

function sanitizeBoolean(value) {
  return !!value;
}

// Logo images are stored inline as data URLs; the client downscales to 128px
// before upload, so anything huge or non-image is rejected outright.
function sanitizeLogo(value) {
  const v = sanitizeString(value).trim();
  if (!v || v.length > 500000) return '';
  return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : '';
}

function sanitizeStringArray(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return value
    .map(v => sanitizeMatcherString(v))
    .filter(Boolean);
}

// Like sanitizeStringArray but preserves case — these are shown to the user
// verbatim rather than used for matching.
const MAX_VOCABULARY = 24;
const MAX_VOCABULARY_TERM = 24;
function sanitizeLabelArray(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return value
    .map(v => sanitizeString(v).trim().slice(0, MAX_VOCABULARY_TERM))
    .filter(Boolean)
    .slice(0, MAX_VOCABULARY);
}

function sanitizePollInterval(value, fallback) {
  const allowed = new Set([0, 30000, 60000, 120000, 300000]);
  const n = Number(value);
  return allowed.has(n) ? n : fallback;
}

// Patterns are compiled and run in the browser on every render, so an unbounded
// or catastrophically-backtracking one is a persistent DoS of the wall display.
// These caps keep a pathological pattern cheap rather than trying to detect one.
const MAX_POSITIONS = 60;
const MAX_PATTERN_LENGTH = 120;

// Nested quantifiers — (a+)+, (x+x+)*, (\d{1,9}){2,} — are the shape that makes
// backtracking blow up. Cheap to reject, and no legitimate camera pattern needs one.
const NESTED_QUANTIFIER = /\([^)]*[+*}][^)]*\)\s*[+*{]/;

function sanitizeVideoPositions(value, fallback) {
  if (!Array.isArray(value) || !value.length) return fallback.map(item => ({ ...item }));

  if (value.length > MAX_POSITIONS) {
    throw new Error(`Too many video positions (${value.length}); the maximum is ${MAX_POSITIONS}.`);
  }

  const positions = [];
  value.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const label = sanitizeString(item.label).trim().slice(0, 40);
    const pattern = sanitizeString(item.pattern).trim();
    if (!label || !pattern) return;
    if (pattern.length > MAX_PATTERN_LENGTH) {
      throw new Error(`Video position ${idx + 1} has a pattern longer than ${MAX_PATTERN_LENGTH} characters.`);
    }
    if (NESTED_QUANTIFIER.test(pattern)) {
      throw new Error(`Video position ${idx + 1} has a pattern with nested repetition, which can hang the display.`);
    }
    try {
      new RegExp(pattern, 'i');
    } catch (_) {
      throw new Error(`Video position ${idx + 1} has an invalid regex pattern.`);
    }
    positions.push({ label, pattern, isDir: sanitizeBoolean(item.isDir) });
  });

  return positions.length ? positions : fallback.map(item => ({ ...item }));
}

function normalizeSettings(input = {}) {
  const defaults = cloneDefaults();
  const normalized = {
    ...defaults,
    pcoAppId: sanitizeString(input.pcoAppId, defaults.pcoAppId).trim(),
    pcoSecret: sanitizeString(input.pcoSecret, defaults.pcoSecret).trim(),
    serviceTypeId: sanitizeString(input.serviceTypeId, defaults.serviceTypeId).trim(),
    serviceTypeName: sanitizeString(input.serviceTypeName, defaults.serviceTypeName).trim(),
    orgName: sanitizeString(input.orgName, defaults.orgName).trim() || defaults.orgName,
    orgSub: sanitizeString(input.orgSub, defaults.orgSub).trim() || defaults.orgSub,
    orgIcon: sanitizeString(input.orgIcon, defaults.orgIcon).trim() || defaults.orgIcon,
    orgLogo: sanitizeLogo(input.orgLogo),
    timezone: sanitizeString(input.timezone, defaults.timezone).trim() || defaults.timezone,
    videoTeamName: sanitizeMatcherString(input.videoTeamName, defaults.videoTeamName) || defaults.videoTeamName,
    bandTeamNames: sanitizeStringArray(input.bandTeamNames, defaults.bandTeamNames),
    pollIntervalMs: sanitizePollInterval(input.pollIntervalMs, defaults.pollIntervalMs),
    shotNoteCategoryId: sanitizeString(input.shotNoteCategoryId, defaults.shotNoteCategoryId).trim(),
    shotNoteCategoryName: sanitizeString(input.shotNoteCategoryName, defaults.shotNoteCategoryName).trim(),
    shotVocabulary: sanitizeLabelArray(input.shotVocabulary, defaults.shotVocabulary),
    videoPositions: sanitizeVideoPositions(input.videoPositions, defaults.videoPositions),
  };

  return normalized;
}

function buildAuthHeader(credentials) {
  if (!credentials?.appId || !credentials?.secret) return '';
  return 'Basic ' + Buffer.from(`${credentials.appId}:${credentials.secret}`).toString('base64');
}

function createServer(options = {}) {
  const settingsPath = options.settingsPath || path.join(__dirname, 'settings.json');
  const staticDir = options.staticDir || path.join(__dirname, 'public');
  const envAppId = sanitizeString(options.env?.PCO_APP_ID ?? process.env.PCO_APP_ID).trim();
  const envSecret = sanitizeString(options.env?.PCO_SECRET ?? process.env.PCO_SECRET).trim();

  let runtime = {
    settings: cloneDefaults(),
    creds: { appId: '', secret: '' },
    envLocked: false,
  };

  let reportedCorruptSettings = false;

  function loadSettings() {
    let raw;
    try {
      raw = fs.readFileSync(settingsPath, 'utf8');
    } catch (_) {
      // No settings file yet — first run.
      return cloneDefaults();
    }

    try {
      return normalizeSettings(JSON.parse(raw));
    } catch (error) {
      // Falling back to defaults silently here is how a booth loses its entire
      // configuration without anyone noticing. Say so, and keep the bad file —
      // but only once, since every /api/settings request lands here.
      if (!reportedCorruptSettings) {
        reportedCorruptSettings = true;
        const backupPath = `${settingsPath}.corrupt`;
        console.error(`[settings:load] ${settingsPath} is unreadable (${error.message}); using defaults.`);
        try {
          fs.copyFileSync(settingsPath, backupPath);
          console.error(`[settings:load] preserved the unreadable file at ${backupPath}`);
        } catch (backupError) {
          console.error('[settings:load] could not preserve the unreadable file:', backupError.message);
        }
      }
      return cloneDefaults();
    }
  }

  function saveSettings(nextSettings) {
    const normalized = normalizeSettings(nextSettings);
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    // Write-then-rename: a crash mid-write leaves the previous settings intact
    // rather than a half-written file that parses as garbage on next boot.
    const tempPath = `${settingsPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(normalized, null, 2), 'utf8');
    fs.renameSync(tempPath, settingsPath);
    reportedCorruptSettings = false;
    runtime.settings = normalized;
    initCreds();
    return normalized;
  }

  function initCreds() {
    runtime.settings = loadSettings();
    runtime.envLocked = !!(envAppId && envSecret);
    if (runtime.envLocked) {
      runtime.creds = { appId: envAppId, secret: envSecret };
      return;
    }
    runtime.creds = {
      appId: runtime.settings.pcoAppId || '',
      secret: runtime.settings.pcoSecret || '',
    };
  }

  function getSettingsPayload() {
    const settings = loadSettings();
    runtime.settings = settings;
    const hasCredentials = !!(runtime.creds.appId && runtime.creds.secret);
    return {
      ...settings,
      pcoAppId: runtime.envLocked ? envAppId : settings.pcoAppId,
      pcoSecret: '',
      hasSecret: hasCredentials,
      envLocked: runtime.envLocked,
      setupRequired: !hasCredentials || !settings.serviceTypeId,
      appVersion: APP_VERSION,
    };
  }

  async function pco(endpoint, credentials = runtime.creds) {
    const auth = buildAuthHeader(credentials);
    if (!auth) {
      throw new Error('Planning Center credentials have not been configured yet.');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${PCO_BASE}${endpoint}`;
    // node-fetch v2 has no default timeout, so without this a hung PCO
    // connection pins an Express handler indefinitely.
    const res = await fetch(url, {
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(PCO_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PCO ${res.status}: ${text}`);
    }
    return res.json();
  }

  async function pcoWrite(method, endpoint, body, credentials = runtime.creds) {
    const auth = buildAuthHeader(credentials);
    if (!auth) {
      throw new Error('Planning Center credentials have not been configured yet.');
    }

    const res = await fetch(`${PCO_BASE}${endpoint}`, {
      method,
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      // DELETE carries no body.
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(PCO_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PCO ${res.status}: ${text}`);
    }
    // PCO returns 204 with no body on some writes.
    return res.status === 204 ? null : res.json();
  }

  // Backstop against a malformed `links.next` cycle; PCO caps per_page at 100,
  // so this still covers 5,000 records.
  const MAX_PAGES = 50;

  async function pcoAll(endpoint, credentials = runtime.creds) {
    let url = endpoint.startsWith('http') ? endpoint : `${PCO_BASE}${endpoint}`;
    const allData = [];
    const allIncluded = [];
    let pageNum = 1;

    while (url) {
      const page = await pco(url, credentials);
      allData.push(...(page.data || []));
      allIncluded.push(...(page.included || []));
      url = page.links?.next || null;
      if (url && pageNum >= MAX_PAGES) {
        console.warn(`[pcoAll] stopped at ${MAX_PAGES} pages (${allData.length} items); results may be truncated.`);
        break;
      }
      pageNum++;
    }

    return { data: allData, included: allIncluded };
  }

  function mergeIncomingSettings(existing, incoming) {
    const merged = {
      ...existing,
      ...incoming,
      bandTeamNames: incoming.bandTeamNames ?? existing.bandTeamNames,
      videoPositions: incoming.videoPositions ?? existing.videoPositions,
      shotVocabulary: incoming.shotVocabulary ?? existing.shotVocabulary,
    };

    if (runtime.envLocked) {
      merged.pcoAppId = existing.pcoAppId;
      merged.pcoSecret = existing.pcoSecret;
    } else {
      if (!Object.prototype.hasOwnProperty.call(incoming, 'pcoAppId')) {
        merged.pcoAppId = existing.pcoAppId;
      }
      if (!Object.prototype.hasOwnProperty.call(incoming, 'pcoSecret')) {
        merged.pcoSecret = existing.pcoSecret;
      } else if (!sanitizeString(incoming.pcoSecret).trim()) {
        merged.pcoSecret = existing.pcoSecret;
      }
    }

    return normalizeSettings(merged);
  }

  initCreds();

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(staticDir));

  app.get('/api/settings', (req, res) => {
    try {
      initCreds();
      res.json(getSettingsPayload());
    } catch (error) {
      console.error('[settings:get]', error.message);
      res.status(500).json({ error: 'Unable to load settings.' });
    }
  });

  app.post('/api/settings/test-credentials', async (req, res) => {
    const appId = sanitizeString(req.body?.appId).trim();
    const secret = sanitizeString(req.body?.secret).trim();
    if (!appId || !secret) {
      return res.status(400).json({ ok: false, error: 'App ID and Secret are required.' });
    }

    try {
      const serviceTypes = await pcoAll('/services/v2/service_types?per_page=100', { appId, secret });
      res.json({ ok: true, serviceTypes });
    } catch (error) {
      console.error('[settings:test-credentials]', error.message);
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/settings', (req, res) => {
    try {
      const existing = loadSettings();
      const next = mergeIncomingSettings(existing, req.body || {});
      const saved = saveSettings(next);
      res.json({
        ok: true,
        settings: {
          ...saved,
          pcoSecret: '',
          hasSecret: !!(runtime.creds.appId && runtime.creds.secret),
          envLocked: runtime.envLocked,
          setupRequired: !(runtime.creds.appId && runtime.creds.secret) || !saved.serviceTypeId,
          appVersion: APP_VERSION,
        },
      });
    } catch (error) {
      console.error('[settings:save]', error.message);
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/settings/reset', (req, res) => {
    try {
      if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
      initCreds();
      res.json({ ok: true, settings: getSettingsPayload() });
    } catch (error) {
      console.error('[settings:reset]', error.message);
      res.status(500).json({ ok: false, error: 'Unable to reset settings.' });
    }
  });

  app.get('/api/service-types', async (req, res) => {
    try {
      res.json(await pcoAll('/services/v2/service_types?per_page=100'));
    } catch (error) {
      console.error('[service-types]', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // PCO's `future` filter drops a plan once its date has passed, so a booth
  // display that only asked for future plans went blank during — or right
  // after — the very service it exists to show. Recent plans are fetched
  // alongside so today's is always reachable, and so the picker can look back
  // at last Sunday.
  app.get('/api/plans', async (req, res) => {
    try {
      const { serviceTypeId } = req.query;
      if (!serviceTypeId) return res.status(400).json({ error: 'serviceTypeId required' });
      const st = encodeURIComponent(serviceTypeId);
      const base = `/services/v2/service_types/${st}/plans`;

      const [future, past] = await Promise.all([
        pco(`${base}?filter=future&order=sort_date&per_page=8`),
        // Descending, so a small page gets the *most recent* past plans.
        pco(`${base}?filter=past&order=-sort_date&per_page=4`).catch(() => ({ data: [] })),
      ]);

      const byId = new Map();
      [...(past.data || []), ...(future.data || [])].forEach(p => byId.set(p.id, p));
      const data = [...byId.values()].sort(
        (a, b) => new Date(a.attributes?.sort_date || 0) - new Date(b.attributes?.sort_date || 0),
      );

      res.json({ data });
    } catch (error) {
      console.error('[plans]', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/plan', async (req, res) => {
    try {
      const { serviceTypeId, planId } = req.query;
      if (!serviceTypeId || !planId) {
        return res.status(400).json({ error: 'serviceTypeId and planId required' });
      }

      // Every collection here paginates — using plain pco() on any of them
      // silently drops everything past the first page.
      const st = encodeURIComponent(serviceTypeId);
      const pid = encodeURIComponent(planId);
      const [items, teamMembers, planTimes, plan] = await Promise.all([
        // item_notes rides along on the include that was already being made, so
        // the shot plan costs no additional request.
        pcoAll(`/services/v2/service_types/${st}/plans/${pid}/items?include=song,arrangement,item_notes&per_page=100`),
        pcoAll(`/services/v2/service_types/${st}/plans/${pid}/team_members?include=person,team&per_page=100`),
        pcoAll(`/services/v2/service_types/${st}/plans/${pid}/plan_times?per_page=100`),
        pco(`/services/v2/service_types/${st}/plans/${pid}`),
      ]);

      res.json({ items, teamMembers, planTimes, plan });
    } catch (error) {
      console.error('[plan]', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Item note categories are read-only through the PCO API — they have to be
  // created once in Planning Center itself. This just lists what exists so the
  // settings UI can offer a real choice instead of asking for an opaque id.
  app.get('/api/item-note-categories', async (req, res) => {
    try {
      const { serviceTypeId } = req.query;
      if (!serviceTypeId) return res.status(400).json({ error: 'serviceTypeId required' });
      const st = encodeURIComponent(serviceTypeId);
      res.json(await pcoAll(`/services/v2/service_types/${st}/item_note_categories?per_page=100`));
    } catch (error) {
      console.error('[item-note-categories]', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Create-or-update the shot note for one item. A category holds at most one
  // note per item, and item_note_category_id can only be set on create — so an
  // existing note is PATCHed in place and never recategorized.
  app.put('/api/item-note', async (req, res) => {
    try {
      const serviceTypeId = sanitizeString(req.query.serviceTypeId).trim();
      const planId = sanitizeString(req.query.planId).trim();
      const itemId = sanitizeString(req.query.itemId).trim();
      const categoryId = sanitizeString(req.body?.categoryId).trim();
      const content = sanitizeString(req.body?.content);
      const noteId = sanitizeString(req.body?.noteId).trim();

      if (!serviceTypeId || !planId || !itemId) {
        return res.status(400).json({ error: 'serviceTypeId, planId and itemId are required.' });
      }
      if (!categoryId) {
        return res.status(400).json({ error: 'No shot note category is configured.' });
      }

      const st = encodeURIComponent(serviceTypeId);
      const pid = encodeURIComponent(planId);
      const iid = encodeURIComponent(itemId);
      const base = `/services/v2/service_types/${st}/plans/${pid}/items/${iid}/item_notes`;

      // Clearing the last shot leaves nothing to save, and PCO rejects a blank
      // note body with a 422. Delete the note instead — which is also what the
      // user means, and it stops an empty shot note lingering on the item in
      // Planning Center.
      if (!content.trim()) {
        if (noteId) await pcoWrite('DELETE', `${base}/${encodeURIComponent(noteId)}`);
        return res.json({ ok: true, noteId: '', deleted: true });
      }

      const saved = noteId
        ? await pcoWrite('PATCH', `${base}/${encodeURIComponent(noteId)}`, {
            data: { type: 'ItemNote', id: noteId, attributes: { content } },
          })
        : await pcoWrite('POST', base, {
            data: {
              type: 'ItemNote',
              attributes: { content },
              relationships: { item_note_category: { data: { type: 'ItemNoteCategory', id: categoryId } } },
            },
          });

      res.json({ ok: true, noteId: saved?.data?.id || noteId || '', deleted: false });
    } catch (error) {
      console.error('[item-note]', error.message);
      // A Personal Access Token inherits its creator's permissions, so a
      // read-only PCO account fails here rather than at connection time.
      const forbidden = /PCO 40[13]/.test(error.message);
      res.status(forbidden ? 403 : 500).json({
        ok: false,
        error: forbidden
          ? 'Your Planning Center account does not have permission to edit this plan.'
          : error.message,
      });
    }
  });

  app.get('/api/photo-proxy', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') return res.status(400).send('No URL');

      let target;
      try {
        target = new URL(url);
      } catch (_) {
        return res.status(400).send('Invalid URL');
      }

      // https only — an http target would send the credentials below in the clear.
      if (target.protocol !== 'https:' || !hostAllowed(target.hostname, PHOTO_HOSTS)) {
        return res.status(403).send('Forbidden');
      }

      const auth = hostAllowed(target.hostname, PHOTO_AUTH_HOSTS) ? buildAuthHeader(runtime.creds) : '';
      // Redirects are followed because PCO legitimately redirects avatars to a
      // CDN. node-fetch 2.7 drops the Authorization header on any cross-host
      // hop, so the credentials can't ride along; the final URL is re-checked
      // below so a redirect still can't walk off the allowlist.
      const response = await fetch(target.toString(), {
        headers: auth ? { 'Authorization': auth } : undefined,
        signal: AbortSignal.timeout(PCO_TIMEOUT_MS),
        redirect: 'follow',
        follow: 5,
      });

      if (response.url) {
        let finalHost = '';
        try {
          finalHost = new URL(response.url).hostname;
        } catch (_) { /* keep finalHost empty so the check below fails closed */ }
        if (!hostAllowed(finalHost, PHOTO_HOSTS)) return res.status(403).send('Forbidden');
      }

      if (!response.ok) return res.status(response.status).send('Photo unavailable');

      // Never echo an unvalidated upstream type — that would let this route
      // serve HTML from the app's own origin.
      const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!PHOTO_CONTENT_TYPES.has(contentType)) {
        return res.status(415).send('Not an image');
      }

      res.set('Content-Type', contentType);
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Cache-Control', 'public, max-age=3600');
      response.body.on('error', error => {
        console.error('[photo-proxy:stream]', error.message);
        res.destroy();
      });
      response.body.pipe(res);
    } catch (error) {
      console.error('[photo-proxy]', error.message);
      res.status(500).send('Photo error');
    }
  });

  let server = null;

  async function start({ port = 3000, host = '127.0.0.1' } = {}) {
    if (server) return { app, server, port: server.address().port, host, settingsPath };

    server = http.createServer(app);
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => {
        server.off('error', reject);
        const address = server.address();
        resolve({ app, server, port: address.port, host, settingsPath });
      });
    });
  }

  async function stop() {
    if (!server) return;
    await new Promise(resolve => server.close(resolve));
    server = null;
  }

  return {
    app,
    start,
    stop,
    loadSettings,
    saveSettings,
    getSettingsPayload,
    initCreds,
    defaults: cloneDefaults(),
    settingsPath,
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  createServer,
};
