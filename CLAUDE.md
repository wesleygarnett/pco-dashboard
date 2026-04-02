# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Run locally
```bash
# Electron desktop app
npm run electron

# Standalone web server (then open http://127.0.0.1:3000)
node server.js
```

### Build desktop packages
```bash
npm run dist          # Windows + macOS installers
npm run dist:win      # Windows only
npm run dist:mac      # macOS only

# Unpacked build (faster, no installer)
npm exec electron-builder -- --dir
# Output: dist/win-unpacked/
```

### Render / hosted deployment
- Build: `npm install`
- Start: `node server.js`
- Credentials come from env vars (`PCO_APP_ID`, `PCO_SECRET`)

## Architecture

Two run modes share the same backend:
- **Electron desktop**: `electron-main.js` starts `app-server.js` internally, opens a BrowserWindow pointed at `localhost`
- **Web/server mode**: `server.js` starts `app-server.js` and listens on `PORT` (default 3000)

`app-server.js` exports a `createServer()` factory used by both entry points. All PCO API calls, settings management, and photo proxying live here.

`public/index.html` is the **entire frontend** — dashboard, setup wizard, settings modal, CSS, and JS all in one file. Keep it single-file.

## Key files
- `app-server.js` — shared Express backend (API routes, PCO proxy, settings)
- `electron-main.js` — Electron main process
- `server.js` — standalone web entrypoint
- `public/index.html` — all UI
- `.github/workflows/release-desktop.yml` — GitHub Actions desktop release (Windows + macOS)

## Settings API
- `GET /api/settings` — returns settings + `hasSecret`, `envLocked`, `setupRequired`
- `POST /api/settings` — saves settings, hot-reloads credentials
- `POST /api/settings/test-credentials` — validates PCO creds, returns service types
- `POST /api/settings/reset` — clears saved settings

### Settings behavior
- Secret is never echoed back; API only returns `hasSecret: true/false`
- Blank secret in settings modal = keep existing secret
- `videoTeamName`, `bandTeamNames`, `directorKeywords` are normalized to lowercase on save — if team-matching breaks, check that saved values match actual PCO team/position names
- `videoPositions` patterns are validated as regex server-side before save
- Desktop settings stored in a per-user file outside the repo (`settings.json` at the app's user data path)
- Hosted/Render settings are file-backed and **do not persist across redeploys** — consider env-based config for `serviceTypeId` if that matters

## Planning Center API
- Auth: HTTP Basic with `PCO_APP_ID` + `PCO_SECRET`
- Base URL: `https://api.planningcenteronline.com`
- `per_page` capped at 100 by PCO — use `pcoAll()` for paginated endpoints (e.g. `team_members`)
- Team name resolution uses `include=person,team` + relationship lookup
- Photo URLs must be proxied through `/api/photo-proxy` (direct PCO photo URLs don't work from browsers)

## Constraints
- Keep `node-fetch` on v2 — v3 is ESM-only and breaks CommonJS
- Keep `public/index.html` single-file
- Don't break the Render-hosted path when changing desktop behavior
- `signAndEditExecutable: false` for Windows builds (local packaging requirement)
- Branch `main` = live hosted version (stable); active development was on `codex/app`

## GitHub Releases
Workflow `.github/workflows/release-desktop.yml` builds Windows (NSIS) and macOS (DMG) on tag push. The release asset upload patterns have previously been too broad — only upload `.exe` and `.dmg` files for user-facing releases.
