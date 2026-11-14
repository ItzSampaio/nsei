const { app, BrowserWindow, WebContentsView, ipcMain, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const HOME_URL = 'https://www.google.com';
const BROWSER_PARTITION = 'persist:nexus-browser';
const CHROME_HEIGHT = 139;
const MAX_HISTORY = 5000;

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeAddress(value) {
  const text = String(value || '').trim();
  if (!text) return HOME_URL;
  if (/^https?:\/\//i.test(text)) {
    return isWebUrl(text) ? new URL(text).href : null;
  }
  if (/^(localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(?:\/.*)?$/i.test(text)) {
    return `https://${text}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(text)}`;
}

function createBrowserManager() {
  const windows = new Map();
  const downloads = new Map();
  const downloadSessions = new Set();
  let downloadSequence = 0;
  const dataPath = path.join(app.getPath('userData'), 'browser-data.json');

  function readData() {
    try {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      return {
        bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
        history: Array.isArray(data.history) ? data.history.slice(-MAX_HISTORY) : []
      };
    } catch (error) {
      if (error.code === 'ENOENT') return { bookmarks: [], history: [] };
      throw error;
    }
  }

  let persistentData = readData();

  function saveData() {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    const temporaryPath = `${dataPath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(persistentData, null, 2), 'utf8');
    fs.renameSync(temporaryPath, dataPath);
  }

  function sendState(browserWindow) {
    const state = windows.get(browserWindow);
    if (!state || browserWindow.isDestroyed()) return;
    const active = state.tabs.find((tab) => tab.id === state.activeTabId);
    browserWindow.setTitle(active?.title ? `${active.title} — NEXUS Browser` : 'NEXUS Browser');
    browserWindow.webContents.send('browser:event', {
      type: 'state',
      tabs: state.tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favicon: tab.favicon,
        loading: tab.loading,
        canGoBack: tab.webContents.navigationHistory.canGoBack(),
        canGoForward: tab.webContents.navigationHistory.canGoForward(),
        active: tab.id === state.activeTabId
      })),
      activeTabId: state.activeTabId,
      bookmarks: persistentData.bookmarks
    });
  }

  function sendEvent(browserWindow, event) {
    if (!browserWindow.isDestroyed()) {
      browserWindow.webContents.send('browser:event', event);
    }
  }

  function currentTab(browserWindow) {
    const state = windows.get(browserWindow);
    return state?.tabs.find((tab) => tab.id === state.activeTabId) || null;
  }

  function updateViewBounds(browserWindow) {
    const state = windows.get(browserWindow);
    if (!state || browserWindow.isDestroyed()) return;
    const [width, height] = browserWindow.getContentSize();
    const activeTab = currentTab(browserWindow);
    if (activeTab && !state.panelOpen) {
      console.info(`Browser view bounds: ${JSON.stringify({ x: 0, y: CHROME_HEIGHT, width, height: Math.max(0, height - CHROME_HEIGHT) })}`);
    }
    for (const tab of state.tabs) {
      const active = tab.id === state.activeTabId && !state.panelOpen;
      if (active) {
        tab.view.setBounds({
          x: 0,
          y: CHROME_HEIGHT,
          width,
          height: Math.max(0, height - CHROME_HEIGHT)
        });
      } else {
        tab.view.setVisible(false);
        tab.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
      if (active) tab.view.setVisible(true);
    }
  }

  function addHistory(tab) {
    if (!isWebUrl(tab.url)) return;
    persistentData.history.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: tab.title || tab.url,
      url: tab.url,
      visitedAt: Date.now()
    });
    persistentData.history = persistentData.history.slice(-MAX_HISTORY);
    saveData();
    sendEvent(tab.browserWindow, { type: 'history-updated' });
  }

  async function loadFavicon(tab) {
    try {
      const origin = new URL(tab.url).origin;
      const response = await session.fromPartition(BROWSER_PARTITION).fetch(`${origin}/favicon.ico`, {
        method: 'GET',
        redirect: 'follow'
      });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.startsWith('image/')) return;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 256 * 1024) return;
      tab.favicon = `data:${type};base64,${buffer.toString('base64')}`;
      sendState(tab.browserWindow);
    } catch {
      tab.favicon = '';
    }
  }

  function configureTab(tab) {
    const contents = tab.webContents;
    contents.setWindowOpenHandler(({ url }) => {
      if (isWebUrl(url)) createTab(tab.browserWindow, url);
      return { action: 'deny' };
    });
    contents.on('will-navigate', (event, url) => {
      if (!isWebUrl(url)) event.preventDefault();
    });
    contents.on('will-redirect', (event, url) => {
      if (!isWebUrl(url)) event.preventDefault();
    });
    contents.on('did-start-loading', () => {
      tab.loading = true;
      console.info(`Browser navigation started: ${contents.getURL() || tab.url}`);
      sendState(tab.browserWindow);
    });
    contents.on('did-stop-loading', () => {
      tab.loading = false;
      tab.url = contents.getURL();
      console.info(`Browser navigation stopped: ${tab.url} (${contents.getTitle() || 'untitled'})`);
      const state = windows.get(tab.browserWindow);
      if (state?.activeTabId === tab.id && !state.panelOpen && !tab.browserWindow.isDestroyed()) {
        tab.browserWindow.contentView.addChildView(tab.view);
        updateViewBounds(tab.browserWindow);
        contents.invalidate();
        console.info(`Browser active view after navigation: ${JSON.stringify({
          visible: tab.view.getVisible(),
          bounds: tab.view.getBounds()
        })}`);
      }
      sendState(tab.browserWindow);
    });
    contents.on('page-title-updated', (_event, title) => {
      tab.title = title || tab.url;
      sendState(tab.browserWindow);
    });
    contents.on('did-navigate', (_event, url) => {
      tab.url = url;
      tab.title = contents.getTitle() || url;
      console.info(`Browser main-frame navigated: ${url} (${tab.title})`);
      tab.favicon = '';
      addHistory(tab);
      sendState(tab.browserWindow);
      loadFavicon(tab);
    });
    contents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
      if (!isMainFrame) return;
      tab.url = url;
      addHistory(tab);
      sendState(tab.browserWindow);
    });
    contents.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
      if (!isMainFrame || code === -3) return;
      tab.loading = false;
      tab.url = validatedURL || tab.url;
      console.error(`Browser navigation failed (${code}): ${tab.url} — ${description}`);
      sendEvent(tab.browserWindow, {
        type: 'navigation-error',
        tabId: tab.id,
        url: tab.url,
        message: description || 'The page could not be loaded.'
      });
      sendState(tab.browserWindow);
    });
    contents.on('render-process-gone', (_event, details) => {
      tab.loading = false;
      console.error(`Browser renderer exited: ${details.reason} (exit code ${details.exitCode})`);
      sendEvent(tab.browserWindow, {
        type: 'navigation-error',
        tabId: tab.id,
        url: tab.url,
        message: 'The website renderer stopped unexpectedly. Reload the page to try again.'
      });
      sendState(tab.browserWindow);
    });
    contents.on('console-message', (event) => {
      if (event.level === 'error') {
        console.warn(`Browser page console error: ${event.sourceId}:${event.lineNumber} ${event.message}`);
      }
    });
  }

  function createTab(browserWindow, initialUrl = HOME_URL) {
    const state = windows.get(browserWindow);
    if (!state) return null;
    const view = new WebContentsView({
      webPreferences: {
        partition: BROWSER_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false
      }
    });
    view.setBackgroundColor('#ffffff');
    const tab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      browserWindow,
      view,
      webContents: view.webContents,
      title: 'New tab',
      url: 'about:blank',
      favicon: '',
      loading: false
    };
    state.tabs.push(tab);
    browserWindow.contentView.addChildView(view);
    console.info(`Created browser tab ${tab.id}.`);
    configureTab(tab);
    activateTab(browserWindow, tab.id);
    updateViewBounds(browserWindow);
    const url = normalizeAddress(initialUrl);
    tab.webContents.loadURL(url || HOME_URL).then(() => {
      console.info(`Browser loadURL resolved: ${url || HOME_URL}`);
    }).catch((error) => {
      console.error(`Browser loadURL rejected: ${url || HOME_URL}`, error?.stack || error);
      sendEvent(browserWindow, {
        type: 'navigation-error',
        tabId: tab.id,
        url: url || HOME_URL,
        message: error.message
      });
    });
    sendState(browserWindow);
    return tab;
  }

  function activateTab(browserWindow, tabId) {
    const state = windows.get(browserWindow);
    if (!state || !state.tabs.some((tab) => tab.id === tabId)) return;
    state.activeTabId = tabId;
    const activeTab = state.tabs.find((tab) => tab.id === tabId);
    browserWindow.contentView.removeChildView(activeTab.view);
    browserWindow.contentView.addChildView(activeTab.view);
    updateViewBounds(browserWindow);
    sendState(browserWindow);
  }

  function closeTab(browserWindow, tabId) {
    const state = windows.get(browserWindow);
    if (!state) return;
    const index = state.tabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return;
    const [tab] = state.tabs.splice(index, 1);
    browserWindow.contentView.removeChildView(tab.view);
    if (!tab.webContents.isDestroyed()) tab.webContents.close();
    if (state.tabs.length === 0) {
      createTab(browserWindow);
    } else {
      if (state.activeTabId === tabId) {
        const nextTab = state.tabs[Math.max(0, index - 1)];
        state.activeTabId = nextTab.id;
      }
      updateViewBounds(browserWindow);
      sendState(browserWindow);
    }
  }

  function getWindowForSender(sender) {
    for (const [browserWindow] of windows) {
      if (!browserWindow.isDestroyed() && browserWindow.webContents === sender) return browserWindow;
    }
    return null;
  }

  function browserHandler(channel, handler) {
    ipcMain.handle(channel, (event, ...args) => {
      const browserWindow = getWindowForSender(event.sender);
      if (!browserWindow) throw new Error('Browser command rejected: sender is not a trusted browser window.');
      if (channel === 'browser:navigate' || channel === 'browser:new-tab') {
        console.info(`Browser command received: ${channel}.`);
      }
      try {
        return handler(browserWindow, ...args);
      } catch (error) {
        console.error(`Browser command failed (${channel}):`, error?.stack || error);
        throw error;
      }
    });
  }

  function setupDownloads() {
    const browserSession = session.fromPartition(BROWSER_PARTITION);
    if (downloadSessions.has(browserSession)) return;
    downloadSessions.add(browserSession);
    browserSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    browserSession.on('will-download', (event, item) => {
      const id = `download-${++downloadSequence}`;
      const directory = app.getPath('downloads');
      const originalName = path.parse(path.basename(item.getFilename()));
      let filePath = path.join(directory, originalName.base);
      let suffix = 1;
      while (fs.existsSync(filePath)) {
        filePath = path.join(directory, `${originalName.name} (${suffix++})${originalName.ext}`);
      }
      const entry = {
        id,
        name: item.getFilename(),
        path: filePath,
        url: item.getURL(),
        state: 'progressing',
        receivedBytes: 0,
        totalBytes: item.getTotalBytes()
      };
      downloads.set(id, entry);
      item.setSavePath(filePath);
      sendEventToBrowserWindows({ type: 'download-updated', download: { ...entry } });
      item.on('updated', (_updateEvent, state) => {
        entry.state = state === 'interrupted' ? 'interrupted' : 'progressing';
        entry.receivedBytes = item.getReceivedBytes();
        entry.totalBytes = item.getTotalBytes();
        sendEventToBrowserWindows({ type: 'download-updated', download: { ...entry } });
      });
      item.once('done', (_doneEvent, state) => {
        entry.state = state;
        entry.receivedBytes = item.getReceivedBytes();
        entry.totalBytes = item.getTotalBytes();
        entry.path = item.getSavePath();
        sendEventToBrowserWindows({ type: 'download-updated', download: { ...entry } });
      });
    });
  }

  function sendEventToBrowserWindows(event) {
    for (const browserWindow of windows.keys()) sendEvent(browserWindow, event);
  }

  function createBrowserWindow(initialUrl = HOME_URL) {
    console.info(`Creating native browser window for ${initialUrl}.`);
    const browserWindow = new BrowserWindow({
      width: 1320,
      height: 850,
      minWidth: 900,
      minHeight: 620,
      title: 'NEXUS Browser',
      backgroundColor: '#090b17',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    });
    const state = { tabs: [], activeTabId: null };
    let recoveredChromeRenderer = false;
    windows.set(browserWindow, state);
    browserWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    browserWindow.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('file://')) event.preventDefault();
    });
    browserWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error(`Browser chrome renderer exited: ${details.reason} (exit code ${details.exitCode})`);
      if (recoveredChromeRenderer || browserWindow.isDestroyed()) return;
      recoveredChromeRenderer = true;
      browserWindow.webContents.reload();
    });
    browserWindow.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
      if (isMainFrame && code !== -3) {
        console.error(`Browser chrome failed to load (${code}): ${url} — ${description}`);
      }
    });
    browserWindow.loadFile(path.join(__dirname, 'browser-window.html')).catch((error) => {
      console.error('Could not load the NEXUS Browser window:', error);
    });
    browserWindow.once('ready-to-show', () => {
      if (browserWindow.isDestroyed()) return;
      console.info('Native browser window is ready to show.');
      updateViewBounds(browserWindow);
      browserWindow.show();
    });
    browserWindow.on('resize', () => updateViewBounds(browserWindow));
    browserWindow.on('closed', () => {
      console.info('Native browser window closed.');
      const state = windows.get(browserWindow);
      state?.tabs.forEach((tab) => {
        if (!tab.webContents.isDestroyed()) tab.webContents.close();
      });
      windows.delete(browserWindow);
    });
    setupDownloads();
    browserWindow.webContents.on('did-finish-load', () => {
      console.info('Native browser chrome finished loading.');
      if (state.tabs.length === 0) createTab(browserWindow, initialUrl);
      updateViewBounds(browserWindow);
      sendState(browserWindow);
    });
    browserWindow.on('show', () => {
      console.info('Native browser window shown.');
      updateViewBounds(browserWindow);
    });
    return browserWindow;
  }

  browserHandler('browser:new-tab', (win, url) => {
    const tab = createTab(win, normalizeAddress(url) || HOME_URL);
    return tab?.id || null;
  });
  browserHandler('browser:activate-tab', (win, id) => activateTab(win, id));
  browserHandler('browser:close-tab', (win, id) => closeTab(win, id));
  browserHandler('browser:navigate', (win, url) => {
    const tab = currentTab(win);
    const target = normalizeAddress(url);
    if (!tab || !target) throw new Error('Enter a valid website address or search query.');
    console.info(`Browser navigate requested: ${target}.`);
    tab.webContents.loadURL(target).then(() => {
      console.info(`Browser navigation promise resolved: ${target}.`);
    }).catch((error) => {
      console.error(`Browser navigation promise rejected (${target}):`, error?.stack || error);
      sendEvent(win, { type: 'navigation-error', tabId: tab.id, url: target, message: error.message });
    });
  });
  browserHandler('browser:back', (win) => currentTab(win)?.webContents.navigationHistory.goBack());
  browserHandler('browser:forward', (win) => currentTab(win)?.webContents.navigationHistory.goForward());
  browserHandler('browser:reload', (win) => currentTab(win)?.webContents.reload());
  browserHandler('browser:stop', (win) => currentTab(win)?.webContents.stop());
  browserHandler('browser:home', (win) => {
    const tab = currentTab(win);
    if (tab) tab.webContents.loadURL(HOME_URL);
  });
  browserHandler('browser:set-bounds', (win, panelOpen) => {
    const state = windows.get(win);
    if (typeof panelOpen === 'boolean') state.panelOpen = panelOpen;
    updateViewBounds(win);
  });
  browserHandler('browser:get-data', () => ({
    bookmarks: persistentData.bookmarks,
    history: persistentData.history
  }));
  browserHandler('browser:search-history', (_win, query) => {
    const search = String(query || '').trim().toLowerCase();
    return persistentData.history.filter((item) =>
      item.title.toLowerCase().includes(search) || item.url.toLowerCase().includes(search)
    ).slice(-500).reverse();
  });
  browserHandler('browser:clear-history', () => {
    persistentData.history = [];
    saveData();
    sendEventToBrowserWindows({ type: 'history-updated' });
  });
  browserHandler('browser:add-bookmark', (win) => {
    const tab = currentTab(win);
    if (!tab || !isWebUrl(tab.url)) return;
    const exists = persistentData.bookmarks.some((item) => item.url === tab.url);
    if (!exists) {
      persistentData.bookmarks.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: tab.title || tab.url,
        url: tab.url,
        favicon: tab.favicon
      });
      saveData();
    }
    sendEventToBrowserWindows({ type: 'bookmarks-updated', bookmarks: persistentData.bookmarks });
  });
  browserHandler('browser:remove-bookmark', (_win, id) => {
    persistentData.bookmarks = persistentData.bookmarks.filter((item) => item.id !== id);
    saveData();
    sendEventToBrowserWindows({ type: 'bookmarks-updated', bookmarks: persistentData.bookmarks });
  });
  browserHandler('browser:open-bookmark', (win, id) => {
    const bookmark = persistentData.bookmarks.find((item) => item.id === id);
    if (bookmark) currentTab(win)?.webContents.loadURL(bookmark.url);
  });
  browserHandler('browser:show-downloads', () =>
    [...downloads.values()].map(({ id, name, path: filePath, url, state, receivedBytes, totalBytes }) => ({
      id, name, path: filePath, url, state, receivedBytes, totalBytes
    }))
  );
  browserHandler('browser:open-download', async (_win, id) => {
    const item = downloads.get(id);
    if (!item || item.state !== 'completed' || !fs.existsSync(item.path)) {
      throw new Error('This download is not ready to open.');
    }
    const error = await shell.openPath(item.path);
    if (error) throw new Error(error);
    return true;
  });
  browserHandler('browser:show-download-location', (_win, id) => {
    const item = downloads.get(id);
    if (!item) throw new Error('Download not found.');
    shell.showItemInFolder(item.path);
  });
  browserHandler('browser:open-external', async (win) => {
    const tab = currentTab(win);
    if (!tab || !isWebUrl(tab.url)) throw new Error('There is no HTTP or HTTPS page to open externally.');
    await shell.openExternal(tab.url);
  });

  ipcMain.handle('nexus:open-native-browser', (event, url) => {
    if (!/^file:\/\/.+\/index\.html(?:[?#].*)?$/i.test(event.senderFrame.url)) {
      throw new Error('Only NEXUS OS may open a browser window.');
    }
    const target = normalizeAddress(url);
    if (!target) throw new Error('Invalid browser URL.');
    createBrowserWindow(target);
    return true;
  });

  ipcMain.handle('nexus:open-external-browser', async (event, url) => {
    if (!/^file:\/\/.+\/index\.html(?:[?#].*)?$/i.test(event.senderFrame.url)) {
      throw new Error('Only NEXUS OS may open external links.');
    }
    if (!isWebUrl(url)) throw new Error('Only HTTP and HTTPS external links are allowed.');
    await shell.openExternal(new URL(url).href);
    return true;
  });

  return {
    createBrowserWindow,
    getBookmarks() {
      return persistentData.bookmarks.map((bookmark) => ({
        id: String(bookmark.id || ''),
        title: String(bookmark.title || bookmark.url || ''),
        url: String(bookmark.url || '')
      }));
    },
    closeAll() {
      for (const browserWindow of windows.keys()) {
        if (!browserWindow.isDestroyed()) browserWindow.close();
      }
      windows.clear();
    }
  };
}

module.exports = { createBrowserManager };
