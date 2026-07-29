const path = require('path');
const { app, BrowserWindow, powerSaveBlocker, shell } = require('electron');
const { createServer } = require('./app-server');

let mainWindow = null;
let dashboardServer = null;
let dashboardInfo = null;
let powerSaveBlockerId = null;
let quitting = false;

// This app is built to run unattended on a wall display, so every failure path
// has to end in "try again later" rather than "quit". Backoff caps quickly —
// a TV that recovers in 30s is fine, one that gave up at 6am is not.
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 30000;

function nextDelay(delay) {
  return Math.min(delay * 2, RETRY_MAX_MS);
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function ensureServer() {
  if (dashboardServer) return;
  dashboardServer = createServer({
    settingsPath: getSettingsPath(),
    staticDir: path.join(__dirname, 'public'),
  });
  // Port 0 = ephemeral loopback port, so a stale process can never block startup.
  dashboardInfo = await dashboardServer.start({ port: 0, host: '127.0.0.1' });
}

function dashboardUrl() {
  return `http://${dashboardInfo.host}:${dashboardInfo.port}`;
}

// Reload the renderer on a backoff until it comes back. Used for load failures
// and hangs, where the window itself is still usable.
let reloadTimer = null;
let reloadDelay = RETRY_MIN_MS;

function scheduleReload(reason) {
  if (quitting || reloadTimer || !mainWindow || mainWindow.isDestroyed()) return;
  console.warn(`[electron] reloading in ${reloadDelay}ms (${reason})`);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    if (quitting || !mainWindow || mainWindow.isDestroyed()) return;
    reloadDelay = nextDelay(reloadDelay);
    mainWindow.loadURL(dashboardUrl()).catch(error => {
      console.error('[electron:reload]', error.message);
      scheduleReload('reload failed');
    });
  }, reloadDelay);
}

function cancelReload() {
  if (reloadTimer) {
    clearTimeout(reloadTimer);
    reloadTimer = null;
  }
  reloadDelay = RETRY_MIN_MS;
}

async function createMainWindow() {
  await ensureServer();

  mainWindow = new BrowserWindow({
    width: 1560,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    // Native macOS fullscreen rather than `kiosk: true` — deliberately
    // escapable, so Cmd+Ctrl+F, Cmd+Tab and Cmd+Q all still work on the mini.
    fullscreen: true,
    backgroundColor: '#080b10',
    title: 'PCO Service Dashboard',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const contents = mainWindow.webContents;

  contents.on('did-finish-load', cancelReload);

  contents.on('did-fail-load', (_event, errorCode, errorDescription, _url, isMainFrame) => {
    if (!isMainFrame) return;
    if (errorCode === -3) return; // ERR_ABORTED — a navigation we replaced ourselves
    scheduleReload(`did-fail-load ${errorCode} ${errorDescription}`);
  });

  // A hung renderer is recoverable by reloading; a dead one needs a new window.
  contents.on('unresponsive', () => scheduleReload('renderer unresponsive'));

  contents.on('render-process-gone', (_event, details) => {
    console.error('[electron] render process gone:', details.reason);
    if (quitting) return;
    cancelReload();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
    mainWindow = null;
    startWithRetry();
  });

  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    cancelReload();
    mainWindow = null;
  });

  await mainWindow.loadURL(dashboardUrl());
}

// Startup itself retries forever. The old code quit the app on any throw here,
// which turned a boot-before-the-network into a black screen until someone
// walked over to the mini.
let startDelay = RETRY_MIN_MS;

function startWithRetry() {
  createMainWindow()
    .then(() => {
      startDelay = RETRY_MIN_MS;
    })
    .catch(error => {
      if (quitting) return;
      console.error(`[electron] startup failed, retrying in ${startDelay}ms:`, error.message);
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
      mainWindow = null;
      const delay = startDelay;
      startDelay = nextDelay(startDelay);
      setTimeout(startWithRetry, delay);
    });
}

app.name = 'PCO Service Dashboard';

// A login item plus a manual open would otherwise run two apps and two servers.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Held for the process lifetime. This is the app-level half of keeping the
    // TV awake; macOS Energy Saver settings on the mini are the other half.
    powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    startWithRetry();
  });
}

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) startWithRetry();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  quitting = true;
  cancelReload();
  if (powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
    powerSaveBlocker.stop(powerSaveBlockerId);
    powerSaveBlockerId = null;
  }
  if (dashboardServer) {
    await dashboardServer.stop();
    dashboardServer = null;
  }
});
