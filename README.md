# PCO Service Dashboard

A TV-ready Planning Center dashboard that can run either as an Electron desktop app or as a standalone Node/Express web app. It displays songs, team assignments, countdowns, and production positions for upcoming services.

---

## What it does

- **Song cards** — displays each song in the plan with leader photos, key, and description notes
- **Video production team** — configurable camera/director slots filled automatically from PCO assignments
- **Live countdown** — counts down to each service time and switches to a pulsing LIVE indicator once the service starts
- **Song change alerts** — highlights updated songs during a live service
- **Auto-refresh** — configurable polling interval while a service is live
- **Director's notes** — per-song notes saved in browser `localStorage`
- **Dark / light mode** — follows system preference and persists across sessions
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

For a quick unpacked Windows build:

```bash
npm exec electron-builder -- --dir
```

The desktop app stores settings in the app's user data folder, not in the repo.

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

# 4. start the server
node server.js

# 5. open in a browser
# http://127.0.0.1:3000
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PCO_APP_ID` | Yes | Personal Access Token App ID from PCO |
| `PCO_SECRET` | Yes | Personal Access Token Secret from PCO |
| `PORT` | No | Port to listen on for standalone server mode; default `3000` |

Never commit `.env` to version control.

---

## Deploy to Render

Hosted mode still works.

1. Push the repo to GitHub
2. Create a new Render Web Service
3. Set:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
4. Add environment variables:
   - `PCO_APP_ID`
   - `PCO_SECRET`

Note: the new configuration flow is optimized for the desktop app. If Render storage is not persistent, some non-secret dashboard settings may reset after redeploys.

---

## Project structure

```text
pco-dashboard/
├── app-server.js      Shared backend used by both Electron and standalone server mode
├── electron-main.js   Electron main process / desktop bootstrap
├── server.js          Standalone web/server entrypoint
├── public/
│   └── index.html     Entire frontend renderer: HTML, CSS, and JS in one file
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
| Frontend | Vanilla JS, HTML, CSS |
| Persistence | App-managed settings file + browser `localStorage` for renderer-only UI state |
| Deployment | Electron desktop app, or Render / any Node-compatible host |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Setup wizard keeps appearing in the desktop app | Complete setup and save a service type; desktop settings are stored per-user outside the repo |
| Hosted app forgets settings | Render may not be persisting local disk; env credentials still work, but app-level settings may reset |
| Photos not loading | Expected on first load; they proxy through the server and cache for one hour |
| `start-mac.sh` won't open | It is only for legacy standalone server mode; use the Electron desktop app when possible |
| Render first load is slow | Free tier cold start — upgrade to paid for always-on |
