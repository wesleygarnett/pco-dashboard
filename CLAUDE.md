# PCO Service Dashboard - Project Context

## Current state
- The project now supports **two run modes**:
  - **Electron desktop app** for normal end users
  - **Standalone Node/Express web app** for local browser testing and Render
- Current working branch on GitHub: `codex/app`
- `main` is intentionally being kept safer/stabler for the currently live hosted version
- GitHub release tags created so far:
  - `v1.0.0` triggered the first release workflow but uploaded far too many assets
  - `v1.0.1` was created after hardening the workflow

## Most important files
- [app-server.js](C:/Users/wesle/Documents/Claude/Dash/Service%20Overview%20Dashboard/pco-dashboard/app-server.js)
  Shared backend for both Electron and standalone server mode.
- [electron-main.js](C:/Users/wesle/Documents/Claude/Dash/Service%20Overview%20Dashboard/pco-dashboard/electron-main.js)
  Electron main process that starts the internal server and opens the app window.
- [server.js](C:/Users/wesle/Documents/Claude/Dash/Service%20Overview%20Dashboard/pco-dashboard/server.js)
  Standalone web/server entrypoint for Render and browser-only local dev.
- [public/index.html](C:/Users/wesle/Documents/Claude/Dash/Service%20Overview%20Dashboard/pco-dashboard/public/index.html)
  Entire renderer UI in one HTML file: dashboard, setup wizard, settings modal, CSS, JS.
- [package.json](C:/Users/wesle/Documents/Claude/Dash/Service%20Overview%20Dashboard/pco-dashboard/package.json)
  Electron scripts and electron-builder config live here.
- [.github/workflows/release-desktop.yml](C:/Users/wesle/Documents/Claude/Dash/Service%20Overview%20Dashboard/pco-dashboard/.github/workflows/release-desktop.yml)
  GitHub Actions workflow for Windows/macOS desktop release builds.

## How to run locally

### Electron desktop app
```bash
npm install
npm run electron
```

### Packaged Windows build
```bash
npm exec electron-builder -- --dir
```
This creates an unpacked Windows app in `dist/win-unpacked`.

### Full installer build
```bash
npm run dist
```

### Standalone server mode
```bash
npm install
node server.js
```
Then open `http://127.0.0.1:3000`

## App architecture
- **Renderer stays single-file** in `public/index.html`
- **Electron uses localhost fetches** rather than a big IPC rewrite
- **app-server.js** exposes a reusable `createServer()` factory so Electron can start the backend itself
- **server.js** still exists for hosted/web mode

## Settings + setup flow
- Settings are no longer hardcoded in `index.html`
- Desktop settings are stored in a per-user settings file outside the repo
- `GET /api/settings` returns current settings plus:
  - `hasSecret`
  - `envLocked`
  - `setupRequired`
- `POST /api/settings/test-credentials`
  - validates PCO credentials
  - returns service types on success
- `POST /api/settings`
  - saves settings
  - hot-reloads credentials
- `POST /api/settings/reset`
  - clears local saved settings

### Important settings behavior
- Secret handling uses `hasSecret`; the API does **not** echo raw secrets back
- Blank secret input in the settings modal means “keep the existing secret”
- Team-matching values are normalized to lowercase on save and when applied in the renderer
- Video position regex patterns are validated server-side before save

## UI changes already made
- Added a **first-run setup wizard**
- Added a **gear/settings modal**
- Added `applySettings()`
- Added `resetRuntimeState()` to clear stale timers/state before reloads
- `serviceTypeId` is now the canonical service selection
- `fmtDate()` / `fmtTime()` use configurable timezone
- `startPolling()` uses configurable polling interval

## Important bug fix already made
- The “all cameras show unassigned” regression was fixed by normalizing:
  - `videoTeamName`
  - `bandTeamNames`
  - `directorKeywords`
- If this issue appears again, first inspect saved settings values and confirm they match actual PCO team names / position names.

## Planning Center specifics
- Auth is Basic Auth with `PCO_APP_ID` + `PCO_SECRET`
- `team_members` still requires pagination via `pcoAll()`
- Team name resolution still uses `include=person,team` + relationship lookup
- Photo URLs must still be proxied through `/api/photo-proxy`

## Electron packaging notes
- `electron-builder` is configured in `package.json`
- `signAndEditExecutable` is disabled for Windows because that avoided a local packaging failure in this environment
- A Windows unpacked build was successfully created locally in `dist/win-unpacked`
- We did **not** fully validate a macOS package locally because we are working from Windows

## GitHub Releases / Actions
- Goal: non-technical users download desktop builds from **GitHub Releases**, not from repo files
- Workflow file: `.github/workflows/release-desktop.yml`
- It builds:
  - Windows
  - macOS
- It was updated to:
  - opt into Node 24 for action runtime
  - use `gh release create` / `gh release upload` instead of the earlier action-based upload step

### Known release issue
- The first release flow uploaded **way too many assets** because the artifact/release upload patterns are too broad (`dist/*` / release-assets globs)
- This likely still needs cleanup so Releases only show user-facing files like:
  - `.exe`
  - `.dmg`
  - maybe update metadata if auto-update is ever added
- Next cleanup task: narrow uploaded artifacts/assets so users don’t see 100+ files

## Render / hosted mode caveat
- Hosted mode still works via `node server.js`
- Render should continue using:
  - Build: `npm install`
  - Start: `node server.js`
- Credentials from Render env vars still work
- **Important caveat**:
  non-secret app settings are now file-backed, and hosted storage may not persist across redeploys/restarts
- If hosted behavior matters long-term, consider adding env-based config for the critical hosted settings such as `serviceTypeId`

## Repo cleanup already done
- README rewritten to reflect Electron + server dual mode
- `SETUP.txt` rewritten with concise modern instructions
- `start-mac.sh` relabeled as legacy standalone-server launcher
- `.gitignore` now excludes:
  - `.env`
  - `node_modules`
  - `.claude/`
  - `settings.json`
  - `dist/`

## Known next good tasks
1. Clean up GitHub Release asset upload patterns so Releases only show final downloadable installers
2. Decide whether hosted/Render mode should get more env-config support for non-secret settings
3. Optionally add a proper Windows installer polish pass and app icon/signing work
4. If desired, merge `codex/app` into `main` only after desktop and hosted behavior are both validated

## Constraints / preferences
- Keep the single-file frontend unless there is a strong reason to split it
- Keep `node-fetch` on v2 for CommonJS compatibility
- Prefer not to break the Render-hosted path while improving the desktop app
- The user wants to be able to continue in Claude tomorrow with this context intact
