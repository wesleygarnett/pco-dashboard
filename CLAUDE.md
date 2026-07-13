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

# Build the standalone component library (src/ui) → dist-ui/
npm run build:lib
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

### Component library (`src/ui/`)
- **`src/ui/` is a standalone, presentational component library** (TypeScript `.tsx`): `Avatar`, `Button` (`variant` prop), `Badge`, `Field` (+ `controlClass`), `StatusLine`, `Overlay`, plus the terracotta design tokens in `src/ui/theme.css`. Pure, prop-driven, no app/PCO coupling — the app imports these via `import { … } from '../ui'`.
- `src/ui/index.ts` — CSS-free barrel the app imports (the app owns its own Tailwind entry). `src/ui/lib.ts` — library build entry that also pulls `ui.css`.
- `npm run build:lib` (config: `vite.lib.config.js`) compiles it to `dist-ui/ui.js` + `dist-ui/ui.css` (tokens + Tailwind utilities) + per-component `.d.ts`; declared in `package.json` `exports`. `dist-ui/` is git-ignored. This build is separate from the app build and not part of packaging/deploy.
- Smart, data-coupled components (`Header`, `SongList`, `CameraTeam`, `SettingsModal`, `SetupWizard`) stay in `src/components/` and compose the `src/ui` primitives.

### Design system sync (`.design-sync/`)
- `src/ui` is synced to a claude.ai/design project via the `/design-sync` skill so designs there can build with the real terracotta components. Config lives in `.design-sync/config.json` (`shape: "package"`, `buildCmd: "npm run build:lib"`, `cssEntry: "./dist-ui/ui.css"`) — re-running the sync is deterministic from this file.
- `.design-sync/conventions.md` — prepended to the synced README; teaches the design agent this library's conventions (dark-theme-only, no `ThemeProvider`, Tailwind + `var(--token)` styling idiom). `.design-sync/NOTES.md` — repo-specific gotchas for whoever re-runs the sync (e.g. why `package.json` needs a top-level `types` field, the `Overlay` fixed-position preview quirk).
- `.design-sync/previews/*.tsx` — hand-authored example compositions for each library component, used to generate preview cards; edit these directly, they're never regenerated.
- `.ds-sync/` and `ds-bundle/` are regenerated scratch/output from running the sync — git-ignored, not source.

### Frontend structure (`src/`)
- `src/main.jsx` — mounts `<App/>`
- `src/App.jsx` — top-level orchestration: settings/plan fetch, countdown/poll timers, routes between setup wizard / loading / error / dashboard
- `src/components/` — `Header`, `SongList`/`SongCard`, `CameraTeam`/`CameraSlot`, `SetupWizard`, `SettingsModal`, `ParticleBackground`, `LoadingState`/`ErrorState`; shared settings form pieces live in `src/components/settings/`
- `src/api/client.js` — thin fetch wrapper around the `/api/*` routes below
- `src/lib/` — pure helpers: `buildDashboardData.js` (transforms `/api/plan` response into song/position props), `matching.js` (team/leader matching), `format.js`, `positions.js`
- `src/hooks/useSettingsDraft.js` — shared form state for both the setup wizard and settings modal (same draft/validation/save logic, different step framing)
- `src/ui/theme.css` — CSS custom properties for the terracotta "Glass Panel" theme (moved here from `src/theme.css` when `src/ui/` was extracted); Tailwind (v4, CSS-first config) layers utility classes on top via `src/index.css`

## Key files
- `app-server.js` — shared Express backend (API routes, PCO proxy, settings)
- `electron-main.js` — Electron main process
- `server.js` — standalone web entrypoint
- `src/App.jsx` — frontend entry/orchestration (see Architecture above)
- `vite.config.js` — app build; output goes to `public/`, dev-server proxies `/api` to port 3000
- `vite.lib.config.js` — component library build (see Component library above); output goes to `dist-ui/`
- `tsconfig.json` — covers all of `src/` (`allowJs: true`) so the TypeScript `src/ui/*.tsx` primitives and the app's `.jsx` files type-check under one config
- `public/` — generated frontend build output (git-ignored, not source)
- `dist-ui/` — generated component library build output (git-ignored, not source)
- `package.json` `exports`/`types` — the library's public contract (`.` → `dist-ui/ui.js` + `dist-ui/lib.d.ts`, `./styles.css` → `dist-ui/ui.css`); `main` (`electron-main.js`) is unrelated and only used when Electron launches the app
- `.github/workflows/release-desktop.yml` — GitHub Actions desktop release (Windows + macOS)
- `.design-sync/` — config, notes, and hand-authored preview stories for syncing `src/ui` to a claude.ai/design project (see Design system sync below)

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
- `orgLogo` is an optional custom header logo stored inline as a data URL (the client downscales the dropped `.png`/`.jpg` to 128px before saving). Server-side `sanitizeLogo()` accepts only `data:image/(png|jpeg)` ≤500 KB and rejects anything else to empty. When set, it replaces the `orgIcon` emoji in the header.
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
- Branch `main` is the live/released React app (v2.0.0+, tagged `v*` for desktop releases); `react` is the active development branch, currently level with `main`. The pre-React single-file `public/index.html` app is gone — `public/` is now purely a git-ignored build artifact, so any run path that serves it (`node server.js`, Electron, Render) must build first.

## GitHub Releases
Workflow `.github/workflows/release-desktop.yml` builds Windows (NSIS) and macOS (DMG) on `v*` tag push (version comes from `package.json` — bump it before tagging). Only `.exe`/`.dmg` are published as user-facing release assets; the auto-update metadata (`.yml`/`.zip`/`.blockmap`) stays in CI artifacts and is not attached to the release.
- The `release` job checks out no repo, so `gh` needs `GH_REPO: ${{ github.repository }}` in its env — without it, `gh release create/upload` fails with `not a git repository`.
- electron-builder also **auto-creates a draft release** with all assets during the build job itself, so the installers may already be attached (as a draft) before the `release` job runs. Reconcile/publish that draft rather than assuming the job created everything.
- macOS build is **arm64 only** (Apple Silicon). Installing the CI-built DMG is the reliable way to get a correct desktop build, since CI always runs `npm run build` before packaging (a locally-built app can carry a stale bundled `public/`).
