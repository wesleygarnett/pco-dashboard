# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Run locally
```bash
# Electron desktop app (builds the frontend first)
npm run electron

# Standalone web server (builds the frontend first, then open http://127.0.0.1:3000)
npm start

# Frontend-only hot-reload dev server (Vite, port 5173) — proxies /api to
# a separately-running `node server.js` / `npm start` on port 3000
npm run dev
```

### Build desktop packages
```bash
npm run dist          # Windows + macOS installers (builds frontend first)
npm run dist:win      # Windows only
npm run dist:mac      # macOS only

# Unpacked build (faster, no installer)
npm run build && npx electron-builder --mac --dir
# Output: dist/mac-arm64/ (or dist/win-unpacked/ on Windows)
```

### Render / hosted deployment
- Build: `npm install && npm run build` (must include the Vite build step — set this in Render's dashboard under Build & Deploy; it is not declared in-repo)
- Start: `node server.js` (or `npm start`)
- Credentials come from env vars (`PCO_APP_ID`, `PCO_SECRET`)
- For local dev, a `.env` file is supported (dotenv is loaded optionally)

## Architecture

Two run modes share the same backend:
- **Electron desktop**: `electron-main.js` starts `app-server.js` internally, opens a BrowserWindow pointed at `localhost`
- **Web/server mode**: `server.js` starts `app-server.js` and listens on `PORT` (default 3000)

`app-server.js` exports a `createServer()` factory used by both entry points. All PCO API calls, settings management, and photo proxying live here.

**Frontend is a Vite + React app.** Source lives in `src/` (components, state, API client, lib helpers — see below). `public/` is a **generated build artifact** (git-ignored) produced by `npm run build` — never hand-edit files in `public/`; edit `src/` and rebuild. Both Electron and the Express static server just serve whatever is currently in `public/`, so a build must run before either will reflect frontend changes.

### Frontend structure (`src/`)
- `src/main.jsx` — mounts `<App/>`
- `src/App.jsx` — top-level orchestration: settings/plan fetch, countdown/poll timers, routes between setup wizard / loading / error / dashboard
- `src/components/` — `Header`, `SongList`/`SongCard`, `CameraTeam`/`CameraSlot`, `SetupWizard`, `SettingsModal`, `ParticleBackground`, `LoadingState`/`ErrorState`; shared settings form pieces live in `src/components/settings/`
- `src/api/client.js` — thin fetch wrapper around the `/api/*` routes below
- `src/lib/` — pure helpers: `buildDashboardData.js` (transforms `/api/plan` response into song/position props), `matching.js` (team/leader matching), `format.js`, `positions.js`
- `src/hooks/useSettingsDraft.js` — shared form state for both the setup wizard and settings modal (same draft/validation/save logic, different step framing)
- `src/theme.css` — CSS custom properties for the terracotta "Glass Panel" theme; Tailwind (v4, CSS-first config) layers utility classes on top via `src/index.css`

## Key files
- `app-server.js` — shared Express backend (API routes, PCO proxy, settings)
- `electron-main.js` — Electron main process
- `server.js` — standalone web entrypoint
- `src/App.jsx` — frontend entry/orchestration (see Architecture above)
- `vite.config.js` — build output goes to `public/`; dev-server proxies `/api` to port 3000
- `public/` — generated frontend build output (git-ignored, not source)
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
- `pollIntervalMs` is whitelisted to specific values: `0` (off), `30000`, `60000`, `120000`, `300000`
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
- Frontend build must run (`npm run build`) before packaging (`dist*`) or before `node server.js`/Electron will serve current code — CI, Electron scripts, and Render's build command must all include it
- Don't break the Render-hosted path when changing desktop behavior
- `signAndEditExecutable: false` for Windows builds (local packaging requirement)
- Branch `main` = live hosted version (stable); active development was on `codex/app`, then migrated to React on branch `react`

## GitHub Releases
Workflow `.github/workflows/release-desktop.yml` builds Windows (NSIS) and macOS (DMG) on tag push. The release asset upload patterns have previously been too broad — only upload `.exe` and `.dmg` files for user-facing releases.
