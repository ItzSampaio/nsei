const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { fileURLToPath } = require('url');
const { createBrowserManager } = require('./browser');
const { registerSecurity } = require('./security');

let mainWindow;
let browserManager;
let logPath = null;
const pendingLogs = [];

function writeLog(level, ...values) {
  const line = `${new Date().toISOString()} [${level}] ${util.format(...values)}\n`;
  if (!logPath) {
    pendingLogs.push(line);
    return;
  }
  try {
    fs.appendFileSync(logPath, line, 'utf8');
  } catch (error) {
    process.stderr.write(`Could not write NEXUS OS log: ${error.message}\n${line}`);
  }
}

for (const level of ['log', 'info', 'warn', 'error']) {
  const original = console[level].bind(console);
  console[level] = (...values) => {
    writeLog(level.toUpperCase(), ...values);
    original(...values);
  };
}

function initializeLogging() {
  const userDataPath = app.getPath('userData');
  fs.mkdirSync(userDataPath, { recursive: true });
  logPath = path.join(userDataPath, 'nexus-os.log');
  if (pendingLogs.length) {
    fs.appendFileSync(logPath, pendingLogs.splice(0).join(''), 'utf8');
  }
  console.info('NEXUS OS startup', {
    version: app.getVersion(),
    packaged: app.isPackaged,
    executable: process.execPath,
    appPath: app.getAppPath(),
    userData: app.getPath('userData'),
    logPath
  });
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught main-process exception:', error?.stack || error);
  if (app.isReady()) dialog.showErrorBox('NEXUS OS encountered a fatal error', error?.stack || String(error));
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled main-process promise rejection:', reason?.stack || reason);
});

function getAppRoot() {
  return path.join(__dirname, '..');
}

function getIconPath() {
  const possible = [
    path.join(getAppRoot(), 'assets', 'icons', 'nexus-os-icon.ico'),
    path.join(getAppRoot(), 'assets', 'icons', 'nexus.svg'),
    path.join(getAppRoot(), 'assets', 'icons', 'nexus-icon.png')
  ];

  return possible.find((candidate) => require('fs').existsSync(candidate)) || undefined;
}

function createMainWindow() {
  console.info('Creating main desktop window.');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'NEXUS OS',
    backgroundColor: '#090b17',
    icon: getIconPath(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      nativeWindowOpen: true
    }
  });

  const window = mainWindow;
  let recoveredRenderer = false;
  let visibleFallback;
  window.loadFile(path.join(getAppRoot(), 'index.html')).catch((error) => {
    console.error('Could not load the NEXUS OS desktop:', error);
    if (!window.isDestroyed()) window.show();
    dialog.showErrorBox('NEXUS OS could not load', error.stack || error.message);
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('dom-ready', () => console.info('Main desktop DOM is ready.'));
  window.webContents.on('did-finish-load', () => {
    console.info('Main desktop renderer finished loading.');
    if (!window.isDestroyed() && !window.isVisible()) window.show();
  });
  window.webContents.on('console-message', (event) => {
    const logger = event.level === 'error' ? console.error : event.level === 'warning' ? console.warn : console.info;
    logger(`Desktop renderer console (${event.sourceId}:${event.lineNumber}): ${event.message}`);
  });
  window.webContents.on('will-navigate', (event, url) => {
    try {
      if (path.resolve(fileURLToPath(url)) !== path.resolve(getAppRoot(), 'index.html')) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });
  window.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      console.error(`NEXUS OS desktop failed to load (${code}): ${url} — ${description}`);
      if (!window.isDestroyed()) window.show();
    }
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error(`NEXUS OS renderer exited: ${details.reason} (exit code ${details.exitCode})`);
    if (recoveredRenderer || window.isDestroyed()) return;
    recoveredRenderer = true;
    window.webContents.reload();
  });
  window.once('ready-to-show', () => {
    console.info('Main desktop window is ready to show.');
    if (!window.isDestroyed()) window.show();
  });

  window.on('show', () => {
    console.info('Main desktop window shown.');
    if (visibleFallback) clearTimeout(visibleFallback);
  });
  window.on('close', () => console.info('Main desktop window closing.'));
  window.on('closed', () => {
    console.info('Main desktop window closed.');
    if (mainWindow === window) mainWindow = null;
  });

  visibleFallback = setTimeout(() => {
    if (!window.isDestroyed() && !window.isVisible()) {
      console.error('Main desktop did not become visible before startup timeout; showing it now.');
      window.show();
    }
  }, 10000);
  visibleFallback.unref();

  return window;
}

app.on('before-quit', () => console.info('NEXUS OS is shutting down.'));
app.on('will-quit', () => console.info('NEXUS OS will quit.'));
app.on('window-all-closed', () => {
  console.info('All application windows are closed.');
  if (process.platform !== 'darwin') {
    if (browserManager && typeof browserManager.closeAll === 'function') {
      browserManager.closeAll();
    }
    app.quit();
  }
});

app.whenReady().then(() => {
  initializeLogging();
  console.info('Electron app is ready.');
  registerSecurity();
  browserManager = createBrowserManager();
  console.info('Browser manager initialized.');
  createMainWindow();

  ipcMain.handle('nexus:get-app-info', () => ({
    name: 'NEXUS OS',
    version: '6.0.0',
    platform: process.platform
  }));

  ipcMain.handle('nexus:get-browser-bookmarks', (event) => {
    if (!/^file:\/\/.+\/index\.html(?:[?#].*)?$/i.test(event.senderFrame.url)) {
      throw new Error('Only NEXUS OS may read browser bookmarks.');
    }
    return browserManager?.getBookmarks?.() || [];
  });

  ipcMain.handle('nexus:notify', async (event, payload) => {
    if (!/^file:\/\/.+\/index\.html(?:[?#].*)?$/i.test(event.senderFrame.url)) {
      throw new Error('Notifications can only be requested by NEXUS OS.');
    }
    if (payload?.title) {
      return { sent: true, title: payload.title, body: payload.body || '' };
    }
    return { sent: false };
  });

  app.on('activate', () => {
    console.info('Application activated.');
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow();
    } else {
      mainWindow.show();
    }
  });
}).catch((error) => {
  console.error('Fatal startup failure:', error?.stack || error);
  if (app.isReady()) {
    dialog.showErrorBox('NEXUS OS failed to start', error?.stack || String(error));
    app.quit();
  }
});

module.exports = { createMainWindow };
