const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Render sets PORT automatically; fallback to 3000 locally

// ─── Planning Center Credentials ─────────────────────────────────────────────
// Loaded from environment variables — never hardcode secrets in source code.
// For local dev: create a .env file (see .env.example) and load with dotenv.
// For Render: set these in the Render dashboard under Environment Variables.
try { require('dotenv').config(); } catch (_) { /* dotenv optional — skip if not installed */ }

const PCO_APP_ID = process.env.PCO_APP_ID;
const PCO_SECRET = process.env.PCO_SECRET;
const PCO_BASE   = 'https://api.planningcenteronline.com';

if (!PCO_APP_ID || !PCO_SECRET) {
  console.error('\n❌  Missing PCO credentials!');
  console.error('    Create a .env file with PCO_APP_ID and PCO_SECRET.');
  console.error('    See .env.example for the format.\n');
  process.exit(1);
}

const AUTH = 'Basic ' + Buffer.from(`${PCO_APP_ID}:${PCO_SECRET}`).toString('base64');

// ─── PCO Fetch Helper ─────────────────────────────────────────────────────────
async function pco(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${PCO_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Authorization': AUTH, 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PCO ${res.status}: ${text}`);
  }
  return res.json();
}

// Fetch ALL pages of a paginated PCO endpoint (follows links.next automatically)
async function pcoAll(endpoint) {
  let url = endpoint.startsWith('http') ? endpoint : `${PCO_BASE}${endpoint}`;
  const allData     = [];
  const allIncluded = [];
  let pageNum = 1;

  while (url) {
    const page = await pco(url);
    allData.push(...(page.data || []));
    allIncluded.push(...(page.included || []));
    console.log(`[pcoAll] page ${pageNum}: +${(page.data||[]).length} items (total so far: ${allData.length})`);
    url = page.links?.next || null;
    pageNum++;
  }

  return { data: allData, included: allIncluded };
}

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/service-types — list all service types
app.get('/api/service-types', async (req, res) => {
  try {
    res.json(await pco('/services/v2/service_types?per_page=100'));
  } catch (e) {
    console.error('[service-types]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/plans?serviceTypeId=XXX — upcoming plans for a service type
app.get('/api/plans', async (req, res) => {
  try {
    const { serviceTypeId } = req.query;
    if (!serviceTypeId) return res.status(400).json({ error: 'serviceTypeId required' });
    res.json(await pco(
      `/services/v2/service_types/${serviceTypeId}/plans?filter=future&order=sort_date&per_page=8`
    ));
  } catch (e) {
    console.error('[plans]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/plan?serviceTypeId=X&planId=Y — full plan details
app.get('/api/plan', async (req, res) => {
  try {
    const { serviceTypeId, planId } = req.query;
    if (!serviceTypeId || !planId) return res.status(400).json({ error: 'serviceTypeId and planId required' });

    // Fetch everything in parallel — team_members uses pcoAll to handle pagination
    // (PCO caps per_page at 100; large plans with many volunteers need multiple pages)
    const [items, teamMembers, planTimes, plan] = await Promise.all([
      pco(`/services/v2/service_types/${serviceTypeId}/plans/${planId}/items?include=song,arrangement&per_page=100`),
      pcoAll(`/services/v2/service_types/${serviceTypeId}/plans/${planId}/team_members?include=person,team&per_page=100`),
      pco(`/services/v2/service_types/${serviceTypeId}/plans/${planId}/plan_times`),
      pco(`/services/v2/service_types/${serviceTypeId}/plans/${planId}`)
    ]);
    console.log(`[plan] Total team members fetched: ${teamMembers.data.length}`);

    res.json({ items, teamMembers, planTimes, plan });
  } catch (e) {
    console.error('[plan]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/photo-proxy?url=XXX — proxy PCO photos to avoid CORS
app.get('/api/photo-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('No URL');

    // Safety: only proxy known PCO domains
    const allowed = ['planningcenteronline.com', 'pcoassets.com', 'people.planningcenter', 'cloudfront.net'];
    if (!allowed.some(d => url.includes(d))) {
      return res.status(403).send('Forbidden');
    }

    const response = await fetch(url, { headers: { 'Authorization': AUTH } });
    if (!response.ok) return res.status(response.status).send('Photo unavailable');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    response.body.pipe(res);
  } catch (e) {
    console.error('[photo-proxy]', e.message);
    res.status(500).send('Photo error');
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         PCO Service Dashboard  ✦  v1.0          ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║   Open in Chrome:  http://localhost:${PORT}          ║`);
  console.log('║   Press F11 for fullscreen before screensharing  ║');
  console.log('║   Press Ctrl+C to stop the server                ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
});
