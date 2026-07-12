const express = require('express');
const fetch = require('node-fetch');
const http = require('http');
const fs = require('fs');
const path = require('path');

try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

const PCO_BASE = 'https://api.planningcenteronline.com';

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
  directorKeywords: ['director', 'td', 'tech dir', 'broadcast'],
  pollIntervalMs: 60000,
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

function sanitizePollInterval(value, fallback) {
  const allowed = new Set([0, 30000, 60000, 120000, 300000]);
  const n = Number(value);
  return allowed.has(n) ? n : fallback;
}

function sanitizeVideoPositions(value, fallback) {
  if (!Array.isArray(value) || !value.length) return fallback.map(item => ({ ...item }));

  const positions = [];
  value.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const label = sanitizeString(item.label).trim().slice(0, 40);
    const pattern = sanitizeString(item.pattern).trim();
    if (!label || !pattern) return;
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
    directorKeywords: sanitizeStringArray(input.directorKeywords, defaults.directorKeywords),
    pollIntervalMs: sanitizePollInterval(input.pollIntervalMs, defaults.pollIntervalMs),
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

  function loadSettings() {
    try {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      return normalizeSettings(JSON.parse(raw));
    } catch (_) {
      return cloneDefaults();
    }
  }

  function saveSettings(nextSettings) {
    const normalized = normalizeSettings(nextSettings);
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(normalized, null, 2), 'utf8');
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
    };
  }

  async function pco(endpoint, credentials = runtime.creds) {
    const auth = buildAuthHeader(credentials);
    if (!auth) {
      throw new Error('Planning Center credentials have not been configured yet.');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${PCO_BASE}${endpoint}`;
    const res = await fetch(url, {
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PCO ${res.status}: ${text}`);
    }
    return res.json();
  }

  async function pcoAll(endpoint, credentials = runtime.creds) {
    let url = endpoint.startsWith('http') ? endpoint : `${PCO_BASE}${endpoint}`;
    const allData = [];
    const allIncluded = [];
    let pageNum = 1;

    while (url) {
      const page = await pco(url, credentials);
      allData.push(...(page.data || []));
      allIncluded.push(...(page.included || []));
      console.log(`[pcoAll] page ${pageNum}: +${(page.data || []).length} items (total so far: ${allData.length})`);
      url = page.links?.next || null;
      pageNum++;
    }

    return { data: allData, included: allIncluded };
  }

  function mergeIncomingSettings(existing, incoming) {
    const merged = {
      ...existing,
      ...incoming,
      bandTeamNames: incoming.bandTeamNames ?? existing.bandTeamNames,
      directorKeywords: incoming.directorKeywords ?? existing.directorKeywords,
      videoPositions: incoming.videoPositions ?? existing.videoPositions,
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
      const serviceTypes = await pco('/services/v2/service_types?per_page=100', { appId, secret });
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
      res.json(await pco('/services/v2/service_types?per_page=100'));
    } catch (error) {
      console.error('[service-types]', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/plans', async (req, res) => {
    try {
      const { serviceTypeId } = req.query;
      if (!serviceTypeId) return res.status(400).json({ error: 'serviceTypeId required' });
      res.json(await pco(
        `/services/v2/service_types/${serviceTypeId}/plans?filter=future&order=sort_date&per_page=8`
      ));
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

      const [items, teamMembers, planTimes, plan] = await Promise.all([
        pco(`/services/v2/service_types/${serviceTypeId}/plans/${planId}/items?include=song,arrangement&per_page=100`),
        pcoAll(`/services/v2/service_types/${serviceTypeId}/plans/${planId}/team_members?include=person,team&per_page=100`),
        pco(`/services/v2/service_types/${serviceTypeId}/plans/${planId}/plan_times`),
        pco(`/services/v2/service_types/${serviceTypeId}/plans/${planId}`),
      ]);

      console.log(`[plan] Total team members fetched: ${teamMembers.data.length}`);
      res.json({ items, teamMembers, planTimes, plan });
    } catch (error) {
      console.error('[plan]', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/photo-proxy', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).send('No URL');

      const allowed = ['planningcenteronline.com', 'pcoassets.com', 'people.planningcenter', 'cloudfront.net'];
      if (!allowed.some(domain => String(url).includes(domain))) {
        return res.status(403).send('Forbidden');
      }

      const auth = buildAuthHeader(runtime.creds);
      const response = await fetch(url, auth ? { headers: { 'Authorization': auth } } : undefined);
      if (!response.ok) return res.status(response.status).send('Photo unavailable');

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=3600');
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
