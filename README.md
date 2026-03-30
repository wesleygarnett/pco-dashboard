# PCO Service Dashboard

A fullscreen, TV-ready service overview dashboard for church production teams. Pulls live data from [Planning Center Online](https://www.planningcenter.com/) and displays songs, team assignments, countdowns, and more — designed to be screenshared to a meeting room TV.

---

## What it does

- **Song cards** — displays each song in the plan with leader photos, key, and description notes; parenthetical subtitles shown separately
- **Video production team** — hardcoded camera/director slots filled automatically from PCO assignments; shows confirmed, empty, and declined states
- **Live countdown** — counts down to each service time; switches to a pulsing LIVE indicator once the service starts; greys out past services after 1 hour
- **Song change alerts** — during a live service, detects if a song title changes in PCO and highlights the card with an animated amber glow until dismissed
- **Auto-refresh** — polls PCO every 60 seconds while a service is live; manual refresh button available at any time
- **Director's notes** — per-song textarea saved in browser localStorage
- **Dark / light mode** — follows system preference; toggle persists across sessions
- **Test mode** — append `?test` to the URL to enable change detection outside of service hours

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- A [Planning Center](https://www.planningcenter.com/) account with Services access
- A PCO Personal Access Token (PCO → **Account** → **Developer** → **Personal Access Tokens**)

---

## Quick start (local)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/pco-dashboard.git
cd pco-dashboard

# 2. Create your credentials file
cp .env.example .env
# Edit .env and fill in PCO_APP_ID and PCO_SECRET

# 3. Install dependencies (first time only)
npm install

# 4. Start the server
node server.js

# 5. Open in Chrome
# http://localhost:3000
```

For a fullscreen TV display, press `F11` (Windows) or `Cmd+Ctrl+F` (Mac) in Chrome.

**Mac quick-start:** right-click `start-mac.sh` → Open With → Terminal. The server starts and Chrome opens automatically.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PCO_APP_ID` | Yes | Personal Access Token App ID from PCO |
| `PCO_SECRET` | Yes | Personal Access Token Secret from PCO |
| `PORT` | No | Port to listen on (default: `3000`; Render sets this automatically) |

Never commit `.env` to version control — it is listed in `.gitignore`.

---

## Deploy to Render

Render's free tier is enough for a meeting room display.

1. Push the repo to GitHub (private recommended)
2. Sign in at [render.com](https://render.com) → **New +** → **Web Service**
3. Connect your GitHub repo
4. Set the following:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
5. Add environment variables: `PCO_APP_ID` and `PCO_SECRET`
6. Click **Deploy**

The live URL will be something like `https://pco-dashboard.onrender.com`.

> **Note:** The free tier spins down after 15 minutes of inactivity. The first request after a cold start takes 30–60 seconds. Upgrade to the $7/month plan for always-on hosting.

---

## Project structure

```
pco-dashboard/
├── server.js          Express server — PCO API proxy, photo proxy, pagination
├── public/
│   └── index.html     Entire frontend: HTML, CSS, and JS in one file (no build step)
├── .env               Local credentials (gitignored, never commit)
├── .env.example       Safe template showing required variable names
├── .gitignore         Blocks .env and node_modules from GitHub
├── start-mac.sh       Double-click launcher for Mac
└── SETUP.txt          Full setup guide for Mac, Windows, and Render
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Server | Node.js + Express |
| PCO API auth | HTTP Basic Auth (App ID + Secret) |
| Frontend | Vanilla JS, HTML, CSS — no framework, no build step |
| Styling | CSS custom properties, `clamp()` for TV-responsive sizing, glassmorphism |
| Persistence | Browser `localStorage` (theme preference, director's notes) |
| Deployment | Render (or any Node-compatible host) |

**Dependency note:** `node-fetch` must stay at v2. v3 is ESM-only and breaks `require()`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `node: command not found` | Install Node.js from [nodejs.org](https://nodejs.org) |
| `Missing PCO credentials` error on start | Copy `.env.example` to `.env` and fill in both values |
| `Service type not found` in dashboard | Verify the service type name in PCO exactly matches the value in `CFG.SERVICE_TYPE_NAME` inside `index.html` |
| Photos not loading | Expected on first load; they proxy through the server and cache for 1 hour |
| `start-mac.sh` won't open | Right-click → Open With → Terminal; allow it in System Settings → Privacy & Security if blocked |
| Render first load is slow | Free tier cold start — upgrade to paid for always-on |
