# PCO Service Dashboard

A TV-ready Planning Center dashboard that can run either as an Electron desktop app or as a standalone Node/Express web app. It displays songs, team assignments, countdowns, and production positions for upcoming services.

https://github.com/fliboys/pco-dashboard/releases/tag/v1.0.0

---

## What it does

- **Song cards** — displays each song in the plan with leader photos, key, and description notes
- **Video production team** — configurable camera/director slots filled automatically from PCO assignments
- **Live countdown** — counts down to each service time and switches to a pulsing LIVE indicator once the service starts
- **Song change alerts** — highlights updated songs during a live service
- **Auto-refresh** — configurable polling interval while a service is live
- **Director's notes** — per-song notes saved in browser `localStorage`
- **Test mode** — append `?test` to the URL to enable change detection outside service hours
- **First-run setup wizard** — configure credentials, service type, org labels, team names, and video positions in-app
- **Settings panel** — update dashboard config later without editing source files

---

## Desktop app

The preferred workflow is the Electron desktop app.

```bash
# install dependencies
npm install

# run the desktop app in development
npm run electron

# build packaged installers
npm run dist
```

For a quick unpacked build (skips the installer step):

```bash
npm run build && npx electron-builder --dir
```

The desktop app stores settings in the app's user data folder, not in the repo.

### GitHub Releases for non-technical downloads

This repo is set up so you can distribute desktop builds through **GitHub Releases** instead of asking people to browse the repo.

- Push source code normally
- Create and push a version tag like `v1.0.0`
- GitHub Actions builds the Windows and macOS desktop apps
- The built files are attached to the GitHub Release automatically

Example:

```bash
git tag v1.0.0
git push origin v1.0.0
```

After that, non-technical users can go to the repo's **Releases** page and download the app for their platform.

---

## Standalone server mode

Use this mode for Render deployment or for browser-only local development.

```bash
# 1. clone the repo
git clone https://github.com/YOUR_USERNAME/pco-dashboard.git
cd pco-dashboard

# 2. create your credentials file
cp .env.example .env

# 3. install dependencies
npm install

# 4. start the server (builds the frontend first)
npm start

# 5. open in a browser
# http://127.0.0.1:3000
```

For frontend-only hot-reload development, run `npm run dev` (Vite, port 5173) alongside `npm start` (Express, port 3000) in a second terminal — Vite proxies `/api` calls to the Express server.

`server.js` binds to `0.0.0.0` by default so the standalone app works on Render and similar hosted Node platforms. For local development, open `http://127.0.0.1:3000` in your browser.

---

## Component library (`src/ui/`)

The dashboard's presentational pieces (`Avatar`, `Button`, `Badge`, `Field`, `StatusLine`, `Overlay`, plus the terracotta design tokens) live in `src/ui/` as a standalone TypeScript library, separate from the data-coupled app components in `src/components/`. The app imports them directly from source; there's also a standalone build for using them outside this app:

```bash
npm run build:lib
# Output: dist-ui/ui.js, dist-ui/ui.css, dist-ui/*.d.ts
```

This build isn't part of the app build or desktop packaging — it exists so the component library can be consumed independently (declared via `package.json` `exports`), including syncing it to a [claude.ai/design](https://claude.ai/design) project (see `.design-sync/`) so new designs can be built with the app's real, on-brand components.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PCO_APP_ID` | Yes | Personal Access Token App ID from PCO |
| `PCO_SECRET` | Yes | Personal Access Token Secret from PCO |
| `PORT` | No | Port to listen on for standalone server mode; default `3000` |
| `HOST` | No | Host/interface for standalone server mode; default `0.0.0.0` |

Never commit `.env` to version control.

---

## Deploy to Render

Hosted mode still works.

1. Push the repo to GitHub
2. Create a new Render Web Service
3. Set:
   - **Runtime:** Node
   - **Build command:** `npm install && npm run build`
   - **Start command:** `node server.js`
4. Add environment variables:
   - `PCO_APP_ID`
   - `PCO_SECRET`

Render provides `PORT` automatically, and the app now listens on `0.0.0.0` by default, so no extra port-binding setup is needed.

Note: the new configuration flow is optimized for the desktop app. If Render storage is not persistent, some non-secret dashboard settings may reset after redeploys.

---

## Project structure

```text
pco-dashboard/
├── app-server.js      Shared backend used by both Electron and standalone server mode
├── electron-main.js   Electron main process / desktop bootstrap
├── server.js          Standalone web/server entrypoint
├── index.html         Vite dev/build template (root, not the frontend itself)
├── vite.config.js     App build — outputs to public/, dev-server proxies /api to port 3000
├── vite.lib.config.js Component library build — outputs to dist-ui/ (see src/ui/ below)
├── tsconfig.json      Covers all of src/ (app .jsx + library .tsx)
├── src/
│   ├── main.jsx           React entry point
│   ├── App.jsx             Top-level orchestration (data fetching, timers, view routing)
│   ├── components/         Header, SongList/SongCard, CameraTeam/CameraSlot, SetupWizard,
│   │                       SettingsModal, ParticleBackground, Loading/Error states —
│   │                       compose the src/ui primitives, own the PCO data/state
│   ├── ui/                 Standalone presentational component library (TypeScript):
│   │                       Avatar, Button, Badge, Field, StatusLine, Overlay, theme.css
│   ├── api/client.js        Thin fetch wrapper around the /api/* routes
│   ├── lib/                Pure helpers: dashboard data transform, team matching, formatting
│   ├── hooks/               Shared settings-form state (setup wizard + settings modal)
│   └── index.css            Tailwind entry (v4, CSS-first config) + app-level theme wiring
├── public/            Generated app build output (git-ignored — run `npm run build`)
├── dist-ui/           Generated component library build output (git-ignored — run `npm run build:lib`)
├── .design-sync/      Config + notes for syncing src/ui to a claude.ai/design project
├── .env.example       Safe template for local standalone server credentials
├── .gitignore
├── package.json
├── start-mac.sh       Legacy macOS launcher for standalone server mode
└── SETUP.txt          Supplemental setup notes
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| Server | Node.js + Express |
| PCO API auth | HTTP Basic Auth |
| Frontend | React + Vite, styled with Tailwind CSS |
| Component library | TypeScript (`src/ui/`), built separately via `npm run build:lib` → `dist-ui/` |
| Persistence | App-managed settings file + browser `localStorage` for renderer-only UI state |
| Deployment | Electron desktop app, or Render / any Node-compatible host |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| App shows an old/blank UI after pulling changes | Run `npm run build` — `public/` is generated and git-ignored, so a fresh checkout needs a build before `npm start`/`npm run electron` will reflect current code |
| Setup wizard keeps appearing in the desktop app | Complete setup and save a service type; desktop settings are stored per-user outside the repo |
| Hosted app forgets settings | Render may not be persisting local disk; env credentials still work, but app-level settings may reset |
| Render says no open ports were detected | Make sure the service starts with `node server.js`; the standalone server should bind to `0.0.0.0` and use Render's `PORT` automatically |
| Photos not loading | Expected on first load; they proxy through the server and cache for one hour |
| `start-mac.sh` won't open | It is only for legacy standalone server mode; use the Electron desktop app when possible |
| Render first load is slow | Free tier cold start — upgrade to paid for always-on |
