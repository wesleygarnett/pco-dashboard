import { useEffect, useRef, useState } from 'react';
import ParticleBackground from './components/ParticleBackground.jsx';
import Header from './components/Header.jsx';
import SongList from './components/SongList.jsx';
import CameraTeam from './components/CameraTeam.jsx';
import LoadingState from './components/LoadingState.jsx';
import ErrorState from './components/ErrorState.jsx';
import EmptyState from './components/EmptyState.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SetupWizard from './components/SetupWizard.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { getSettings, getPlans, getPlan } from './api/client.js';
import ShotEditor from './components/ShotEditor.jsx';
import { buildDashboardData, LIVE_WINDOW_MS } from './lib/buildDashboardData.js';
import { shotList } from './lib/shotNotes.js';
import { fmtDate, fmtTime, fmtCountdown, isTodayOrLater } from './lib/format.js';

const TEST_MODE = new URLSearchParams(location.search).has('test');

// The app runs unattended on a wall display, so it has to recover on its own.
// Failed boots retry on a backoff, and the plan list is re-checked slowly even
// when nothing is live so the board rolls over to the next service by itself.
const RETRY_MIN_MS = 15000;
const RETRY_MAX_MS = 120000;
const BACKGROUND_REFRESH_MS = 15 * 60 * 1000;

// A service counts as live from its start until its real end time when PCO
// supplies one, falling back to the flat one-hour window otherwise.
function isLiveAt(serviceTime, at) {
  const diff = serviceTime.startsAt - at;
  if (diff > 0) return false;
  const window = serviceTime.endsAt
    ? Math.max(serviceTime.endsAt - serviceTime.startsAt, 0)
    : LIVE_WINDOW_MS;
  return diff > -window;
}

export default function App() {
  const [cfg, setCfg] = useState(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [plans, setPlans] = useState([]);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState({ state: 'loading', message: 'Connecting to Planning Center…' });
  const [now, setNow] = useState(Date.now());
  const [changedSongIds, setChangedSongIds] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [editingShotsFor, setEditingShotsFor] = useState(null);

  const songTitlesRef = useRef({});
  const cfgRef = useRef(null);
  const planIdRef = useRef(null);
  const retryCountRef = useRef(0);
  const statusRef = useRef(status.state);
  statusRef.current = status.state;
  const dashboardRef = useRef(null);
  dashboardRef.current = dashboard;

  useEffect(() => {
    boot();
  }, []);

  // 1s countdown ticker — drives header chip labels and live/poll gating
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const anyLive = (dashboard?.serviceTimes || []).some((t) => isLiveAt(t, now));

  // Background polling — only while a service is live (or ?test is set)
  useEffect(() => {
    if (!(anyLive || TEST_MODE) || !cfg?.pollIntervalMs) return;
    const id = setInterval(async () => {
      const planId = planIdRef.current;
      const settings = cfgRef.current;
      if (!planId || !settings) return;
      try {
        const d = await getPlan(settings.serviceTypeId, planId);
        if (planIdRef.current !== planId) return; // plan changed while this request was in flight
        applyDashboardData(d, settings, planId, { isPoll: true });
      } catch (e) {
        console.warn('[poll]', e.message);
      }
    }, cfg.pollIntervalMs);
    return () => clearInterval(id);
  }, [anyLive, cfg?.pollIntervalMs]);

  // Unattended recovery: retry a failed boot on a backoff so the display heals
  // itself if the mini came up before the network did. ErrorState's manual
  // "Try Again" still works — it just isn't the only way out any more.
  useEffect(() => {
    if (status.state !== 'error') {
      retryCountRef.current = 0;
      return;
    }
    const delay = Math.min(RETRY_MIN_MS * 2 ** retryCountRef.current, RETRY_MAX_MS);
    const id = setTimeout(() => {
      retryCountRef.current += 1;
      boot();
    }, delay);
    return () => clearTimeout(id);
  }, [status]);

  // Slow background refresh, running regardless of whether a service is live.
  // Without this a screen left up all week keeps showing last Sunday's plan.
  useEffect(() => {
    const id = setInterval(backgroundRefresh, BACKGROUND_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // Coming back from a router reboot shouldn't wait out the backoff.
  useEffect(() => {
    function onOnline() {
      if (statusRef.current === 'error') boot();
      else backgroundRefresh();
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  // Refresh in the background without disturbing what's on screen: a failure
  // here must never replace a good board with an error state.
  async function backgroundRefresh() {
    const settings = cfgRef.current;
    if (!settings || settings.setupRequired) return;
    // Only refresh from a settled screen. While loading, this would race the
    // boot; while in error, a successful quiet refresh would swap in fresh data
    // behind ErrorState without clearing it — recovery belongs to the retry
    // effect above, which owns the status transition back to 'ready'.
    if (statusRef.current !== 'ready' && statusRef.current !== 'empty') return;
    try {
      await loadPlans(settings, { quiet: true });
    } catch (e) {
      console.warn('[refresh]', e.message);
    }
  }

  async function boot() {
    try {
      setStatus({ state: 'loading', message: 'Connecting to Planning Center…' });
      const settings = await getSettings();
      setCfg(settings);
      cfgRef.current = settings;
      if (settings.setupRequired) {
        setSetupRequired(true);
        return;
      }
      setSetupRequired(false);
      await loadPlans(settings);
    } catch (e) {
      console.error(e);
      setStatus({ state: 'error', message: e.message });
    }
  }

  // `quiet` is the unattended-refresh mode: keep whatever is already on screen
  // unless there is something genuinely new to show, so the wall display never
  // flashes a spinner or an empty state at a room full of people.
  async function loadPlans(settings, { quiet = false } = {}) {
    const data = await getPlans(settings.serviceTypeId);
    const list = data.data || [];
    if (!list.length) {
      if (quiet && dashboardRef.current) return;
      setPlans([]);
      // Not an error: a service type with nothing scheduled is a normal state,
      // and retrying won't change it. Name the service type so it's obvious
      // whether the wrong one is selected.
      setStatus({
        state: 'empty',
        message: settings.serviceTypeName
          ? `No plans are scheduled in “${settings.serviceTypeName}”.`
          : 'No plans are scheduled in the selected service type.',
      });
      return;
    }

    const mapped = list.map((p) => ({
      id: p.id,
      label: fmtDate(p.attributes.sort_date, settings.timezone),
      isUpcoming: isTodayOrLater(p.attributes.sort_date, settings.timezone),
    }));
    setPlans(mapped);

    // Today's plan first, then the next one up; if everything is in the past,
    // fall back to the most recent.
    const current = mapped.find((p) => p.isUpcoming) || mapped[mapped.length - 1];

    // Still the same plan on a quiet refresh: update its contents in place
    // rather than going through selectPlan's loading state.
    if (quiet && current.id === planIdRef.current) {
      const d = await getPlan(settings.serviceTypeId, current.id);
      if (planIdRef.current !== current.id) return;
      applyDashboardData(d, settings, current.id, { isPoll: true });
      return;
    }

    await selectPlan(current.id, settings);
  }

  async function selectPlan(planId, settings = cfg) {
    setCurrentPlanId(planId);
    planIdRef.current = planId;
    songTitlesRef.current = {};
    setChangedSongIds(new Set());
    setStatus({ state: 'loading', message: 'Loading service…' });
    try {
      const d = await getPlan(settings.serviceTypeId, planId);
      // Switching plans quickly can land an older response after a newer one —
      // the poller already guards for this, and so must the primary path.
      if (planIdRef.current !== planId) return;
      applyDashboardData(d, settings, planId, { isPoll: false });
      setStatus({ state: 'ready' });
    } catch (e) {
      if (planIdRef.current !== planId) return;
      console.error(e);
      setStatus({ state: 'error', message: e.message });
    }
  }

  function applyDashboardData(rawPlanData, settings, planId, { isPoll }) {
    const data = buildDashboardData(rawPlanData, settings, planId);

    if (isPoll) {
      const isLiveNow = data.serviceTimes.some((t) => isLiveAt(t, Date.now()));
      if (isLiveNow || TEST_MODE) {
        const newlyChanged = [];
        data.songs.forEach((song) => {
          const oldTitle = songTitlesRef.current[song.id];
          if (oldTitle !== undefined && oldTitle !== song.titleMain) newlyChanged.push(song.id);
        });
        if (newlyChanged.length) {
          setChangedSongIds((prev) => new Set([...prev, ...newlyChanged]));
        }
      }
    }

    songTitlesRef.current = Object.fromEntries(data.songs.map((s) => [s.id, s.titleMain]));
    setDashboard(data);
  }

  const headerServiceTimes = (dashboard?.serviceTimes || []).map((t) => {
    const diff = t.startsAt - now;
    const isLive = isLiveAt(t, now);
    return {
      time: fmtTime(new Date(t.startsAt), cfg?.timezone),
      name: t.name,
      countdown: !isLive && diff > 0 ? fmtCountdown(diff) : null,
      isLive,
      isPast: diff <= 0 && !isLive,
    };
  });

  const songsWithChangeFlags = (dashboard?.songs || []).map((s) => ({
    ...s,
    isChanged: changedSongIds.has(s.id),
  }));

  // Write the saved shots straight back into the dashboard rather than
  // refetching the whole plan — the note we just PUT is the authority.
  function handleShotsSaved(songId, assignments, noteId) {
    setEditingShotsFor(null);
    setDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        songs: prev.songs.map((s) =>
          s.id === songId
            ? { ...s, shotAssignments: assignments, shotNoteId: noteId, shots: shotList(assignments, cfg.videoPositions) }
            : s,
        ),
      };
    });
  }

  async function applyNewSettings(settings) {
    setCfg(settings);
    cfgRef.current = settings;
    setSetupRequired(false);
    // Enter loading state before clearing the dashboard — the 'ready' branch
    // renders dashboard.positions and would crash on the null dashboard.
    setStatus({ state: 'loading', message: 'Loading service…' });
    setDashboard(null);
    setChangedSongIds(new Set());
    songTitlesRef.current = {};
    try {
      await loadPlans(settings);
    } catch (e) {
      // Without this the rejection escapes and the app sits on the spinner
      // forever, with no error state and no way back.
      console.error(e);
      setStatus({ state: 'error', message: e.message });
    }
  }

  function handleSetupComplete(settings) {
    applyNewSettings(settings);
  }

  function handleSettingsSaved(settings) {
    setShowSettings(false);
    applyNewSettings(settings);
  }

  function handleSetupRequiredFromSettings(settings) {
    setShowSettings(false);
    setCfg(settings);
    cfgRef.current = settings;
    setSetupRequired(true);
  }

  return (
    <div className="app-shell flex min-h-full flex-col gap-3 sm:gap-4 lg:grid lg:h-full lg:grid-rows-[auto_1fr_auto]">
      <ParticleBackground />
      <Header
        orgName={cfg?.orgName || 'My Church'}
        orgSub={cfg?.orgSub || 'Sunday Services'}
        orgIcon={cfg?.orgIcon || '⛪'}
        orgLogo={cfg?.orgLogo || ''}
        serviceTimes={headerServiceTimes}
        speakerName={null}
        testMode={TEST_MODE}
        plans={plans}
        currentPlanId={currentPlanId}
        onPlanChange={(id) => selectPlan(id)}
        onRefresh={() => currentPlanId && selectPlan(currentPlanId)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {setupRequired && cfg ? (
        <SetupWizard cfg={cfg} onComplete={handleSetupComplete} />
      ) : status.state === 'loading' ? (
        <LoadingState />
      ) : status.state === 'empty' ? (
        <EmptyState
          message={status.message}
          onOpenSettings={() => setShowSettings(true)}
          onRetry={boot}
        />
      ) : status.state === 'error' ? (
        <ErrorState message={status.message} onRetry={boot} />
      ) : (
        // Scoped inside the header so a render fault in the song list or camera
        // dock still leaves refresh and settings reachable.
        <ErrorBoundary>
          <SongList
            songs={songsWithChangeFlags}
            onNoteChange={(key, value) => localStorage.setItem(key, value)}
            onDismissChanged={(id) =>
              setChangedSongIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              })
            }
            canEditShots={!!cfg?.shotNoteCategoryId}
            onEditShots={setEditingShotsFor}
          />
          <CameraTeam positions={dashboard.positions} unmatched={dashboard.unmatched} />
        </ErrorBoundary>
      )}

      {editingShotsFor && cfg && currentPlanId && (
        <ShotEditor
          song={editingShotsFor}
          cfg={cfg}
          planId={currentPlanId}
          onClose={() => setEditingShotsFor(null)}
          onSaved={handleShotsSaved}
        />
      )}

      {showSettings && cfg && (
        <SettingsModal
          cfg={cfg}
          onClose={() => setShowSettings(false)}
          onSaved={handleSettingsSaved}
          onSetupRequired={handleSetupRequiredFromSettings}
        />
      )}
    </div>
  );
}
