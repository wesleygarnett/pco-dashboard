# Wall display setup — Mac mini

One-time setup for a Mac mini that drives a TV and runs the dashboard unattended.
Target: Intel Mac mini, macOS 11 (Big Sur) or newer.

The app is deliberately **escapable** — `Cmd+Q`, `Cmd+Tab`, and `Cmd+Ctrl+F` all still
work, so you can get to the desktop without a keyboard trick. It is not locked kiosk mode.

---

## 1. Build the app (on your dev Mac, not the mini)

```bash
npm install && npm run dist:mac
```

This produces two DMGs in `dist/`. Note the naming — the Intel one has **no** arch suffix:

- `PCO Service Dashboard-<version>.dmg` → **x64 (Intel)** — this is the one for the mini
- `PCO Service Dashboard-<version>-arm64.dmg` → Apple Silicon

Don't build on the mini: the lockfile resolved arm64-only build binaries
(`lightningcss-darwin-arm64`, `@tailwindcss/oxide-darwin-arm64`, `@rolldown/binding-darwin-arm64`),
and Vite needs Node ≥ 20.19.

Confirm the arch before copying it over:

```bash
lipo -archs "dist/mac/PCO Service Dashboard.app/Contents/MacOS/PCO Service Dashboard"
```

## 2. Install on the mini

Drag the app to `/Applications`, then clear the quarantine flag — the build is
unsigned and unnotarized, so Gatekeeper will otherwise refuse to open it:

```bash
xattr -dr com.apple.quarantine "/Applications/PCO Service Dashboard.app"
```

Open it once and complete the Setup Wizard. Credentials are stored at
`~/Library/Application Support/PCO Service Dashboard/settings.json`.

> `PCO_APP_ID` / `PCO_SECRET` environment variables **do not work here**. A Finder or
> login-item launch doesn't inherit your shell environment, and `dotenv` resolves
> relative to the working directory, which is `/` for a GUI launch. Use the wizard.

## 3. System Settings on the mini

**Users & Groups**
- Automatic login → the dashboard user. Required for the mini to come back after a
  power cut without someone typing a password.

**General → Login Items**
- Add `PCO Service Dashboard.app`.

**Energy Saver / Battery**
- *Start up automatically after a power failure* → **on**
- *Prevent automatic sleeping when the display is off* → on
- Computer sleep → Never
- *Wake for network access* → on

**Lock Screen**
- Start screen saver when inactive → Never
- Require password after screen saver begins → Never

**Software Update**
- Turn **off** automatic install of macOS updates. An unattended 3am restart that stops
  at an update prompt is a dead TV.

**Focus**
- Turn on a permanent Do Not Disturb so notification banners never land on the wall.

**Displays**
- The TV must report **≥ 1024px wide** — that's the `lg` breakpoint where the app
  switches to its fixed, no-scroll wall layout. Below it you get the phone layout.
- Turn off Night Shift and True Tone.

**Optional — nightly restart**

```bash
sudo pmset repeat restartall MTWRFSU 04:00
```

Combined with auto-login and the login item, this gives a clean slate every night.

---

## 4. Verify

```bash
# Display-sleep assertion is held while the app runs
pmset -g assertions | grep -i NoDisplaySleep
```

Then the real test: **pull the power cord.** The mini should boot, auto-login, launch the
app, and land on the dashboard fullscreen with no input.

Leave it up overnight and confirm the next morning that it has rolled over to the current
plan on its own and the fans aren't running hard.

---

## What the app handles by itself

You shouldn't need to touch the mini for any of these:

| Situation | Behavior |
|---|---|
| Boots before the network/DNS is up | Shows the error screen, retries on its own (15s → 2min backoff) until it connects |
| Router reboot / network drops | Recovers on the next retry; an `online` event triggers an immediate refresh |
| PCO API blip during a service | Live poll swallows the error and keeps the last good board on screen |
| New week, new plan | 15-minute background refresh rolls the board to the next plan; no spinner flash |
| Renderer crashes | Electron destroys and recreates the window automatically |
| Renderer hangs, or the page fails to load | Reloads on a 1s → 30s backoff |
| App launched twice | Second launch focuses the existing window instead of starting a second server |
| Display tries to sleep | `powerSaveBlocker` assertion holds it awake (with the Energy Saver settings above) |
