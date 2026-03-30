const path = require('path');
const { app, BrowserWindow, shell } = require('electron');
const { createServer } = require('./app-server');

let mainWindow = null;
let dashboardServer = null;
let dashboardInfo = null;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function createMainWindow() {
  if (!dashboardServer) {
    dashboardServer = createServer({
      settingsPath: getSettingsPath(),
      staticDir: path.join(__dirname, 'public'),
    });
    dashboardInfo = await dashboardServer.start({ port: 0, host: '127.0.0.1' });
  }

  mainWindow = new BrowserWindow({
    width: 1560,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#080b10',
    title: 'PCO Service Dashboard',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(`http://${dashboardInfo.host}:${dashboardInfo.port}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.name = 'PCO Service Dashboard';

app.whenReady().then(createMainWindow).catch(error => {
  console.error('[electron]', error);
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch(error => {
      console.error('[electron:activate]', error);
      app.quit();
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  if (dashboardServer) {
    await dashboardServer.stop();
    dashboardServer = null;
  }
});
