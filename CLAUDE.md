# PCO Service Dashboard — Project Context

## What this is
A fullscreen web dashboard for Free Chapel Gainesville's Sunday services, displayed on a meeting room TV via screenshare. Built with Node.js + Express (server) and a single HTML/CSS/JS file (frontend). The server proxies Planning Center Online (PCO) API calls to avoid CORS issues.

## How to run locally
```bash
npm install        # first time only
node server.js     # or: nodemon server.js for auto-restart
```
Then open Chrome → http://localhost:3000

## Deployment
- **GitHub repo:** push changes here, Render auto-deploys
- **Live URL:** on Render (check render.com dashboard)
- **Credentials:** stored in `.env` locally and in Render environment variables — never hardcoded

## File structure
```
server.js          — Express server, PCO API proxy, pagination handling
public/index.html  — Entire frontend: HTML + CSS + JS in one file
.env               — Local credentials (gitignored, never commit)
.env.example       — Safe template showing required env var names
.gitignore         — Blocks .env and node_modules from GitHub
start-mac.sh       — Double-click launcher for Mac
SETUP.txt          — Full setup guide for Mac, Windows, and Render
```

## Architecture decisions
- **Single file frontend** (`public/index.html`) — all CSS and JS inline, intentional
- **No build step** — vanilla JS, no React/Vue/bundler
- **node-fetch v2** — CommonJS compatible (v3 is ESM only, breaks with require())
- **dotenv** — loaded with try/catch so it's optional (Render sets env vars natively)

## Planning Center API
- Auth: Basic Auth with PCO_APP_ID + PCO_SECRET
- **team_members uses `pcoAll()`** — PCO caps per_page at 100; large plans need pagination
- Team name resolved via `include=person,team` + relationship lookup (not direct attribute)
- Song leaders parsed from item `description` field — format: `+ Lead: Name, Name`
- Song leader matching is fuzzy (first/last name substring)

## UI layout
- CSS Grid: `grid-template-rows: 11.5% 1fr 20%` (header / songs / cameras)
- Dark glassmorphic design — bg `#080b10`, rgba glass cards, backdrop-filter blur
- Inter font (Google Fonts)
- CSS `clamp()` throughout for TV-readable responsive sizing

## Header (3-column grid)
- **Left:** Free Chapel Gainesville logo/icon, plan selector dropdown, refresh button
- **Center:** Plan name + date
- **Right:** Service time chips (filtered to `time_type === 'service'`, max 2) + countdown timer + speaker

## Countdown timer
- Updates every second via `setInterval`
- Next upcoming service shows live countdown (green)
- Service past start time shows `● LIVE` in red, pulsing animation
- Clears after 2 hours post-start

## Song cards
- Leaders parsed from item description (`+ Lead: Name, Name`, up to 3)
- Matched against Band/Vocal team members for photos
- Unmatched names get initials avatars — all parsed names always shown
- Description bubbles: rest of description (non-Lead lines) shown as small pills
- Director's notes: plain orange textarea, saves to localStorage per plan+item ID
- No song author/writer shown

## Video Production Team
- **Hardcoded position slots** — always rendered regardless of PCO assignments:
  `DIRECTOR, BROADCAST DIR, CAM 1–10, CAM 11/12`
- Slot states: normal (confirmed), greyed (unassigned), red+dimmed (all declined)
- Multiple confirmed people in one slot: overlapping avatars, names with `+` between
- Floating position label pill sits on the top border of each card
- Declined members filtered out of confirmed display

## Key JS functions
- `pcoAll(endpoint)` — server-side: fetches all paginated pages
- `resolveTeamName(member, teamMap)` — tries attribute then relationship lookup
- `parseLeaderNames(description)` — strips HTML, regex matches Lead: line
- `parseDescriptionBubbles(description)` — everything except Lead: line, split on `+`
- `matchLeaders(leaderNames, bandMembers)` — returns parallel array (member|null)
- `memberAvatarHtml(member, personMap, zIndex)` — photo if available, initials fallback
- `updateCountdowns()` — runs every second, drives countdown/LIVE display
- `renderVideoTeam()` — maps PCO data onto VIDEO_POSITIONS hardcoded slots

## Config (top of index.html JS)
```js
const CFG = {
  SERVICE_TYPE_NAME : 'Free Chapel Gainesville Sunday AM Services',
  VIDEO_TEAM_NAME   : 'video production',   // lowercase substring match
  BAND_TEAM_NAMES   : ['band', 'vocal'],
  DIRECTOR_KEYWORDS : ['director', 'td', 'tech dir', 'broadcast'],
};
```

## Known gotchas
- **node-fetch must stay at v2** — do not upgrade to v3
- **Per_page 200 doesn't work** — PCO silently caps at 100, always use pcoAll for team_members
- Photo URLs must be proxied through `/api/photo-proxy` — direct browser fetches fail (CORS + auth)
- `overflow: hidden` on `.cam-box` is required for glow containment — label lives on `.cam-slot` wrapper
- Director's notes persist in localStorage, not PCO — they are device/browser specific
