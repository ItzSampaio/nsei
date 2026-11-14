const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusDesktop', {
  openExternalBrowser: (url) => ipcRenderer.invoke('nexus:open-external-browser', url),
  openNativeBrowser: (url) => ipcRenderer.invoke('nexus:open-native-browser', url),
  notify: (title, body) => ipcRenderer.invoke('nexus:notify', { title, body }),
  getAppInfo: () => ipcRenderer.invoke('nexus:get-app-info'),
  browser: {
    newTab: (url) => ipcRenderer.invoke('browser:new-tab', url),
    activateTab: (id) => ipcRenderer.invoke('browser:activate-tab', id),
    closeTab: (id) => ipcRenderer.invoke('browser:close-tab', id),
    navigate: (url) => ipcRenderer.invoke('browser:navigate', url),
    back: () => ipcRenderer.invoke('browser:back'),
    forward: () => ipcRenderer.invoke('browser:forward'),
    reload: () => ipcRenderer.invoke('browser:reload'),
    stop: () => ipcRenderer.invoke('browser:stop'),
    home: () => ipcRenderer.invoke('browser:home'),
    setBounds: (panelOpen) => ipcRenderer.invoke('browser:set-bounds', panelOpen),
    getData: () => ipcRenderer.invoke('browser:get-data'),
    searchHistory: (query) => ipcRenderer.invoke('browser:search-history', query),
    clearHistory: () => ipcRenderer.invoke('browser:clear-history'),
    addBookmark: () => ipcRenderer.invoke('browser:add-bookmark'),
    removeBookmark: (id) => ipcRenderer.invoke('browser:remove-bookmark', id),
    openBookmark: (id) => ipcRenderer.invoke('browser:open-bookmark', id),
    showDownloads: () => ipcRenderer.invoke('browser:show-downloads'),
    openDownload: (id) => ipcRenderer.invoke('browser:open-download', id),
    showDownloadLocation: (id) => ipcRenderer.invoke('browser:show-download-location', id),
    openExternal: () => ipcRenderer.invoke('browser:open-external')
  },
  onBrowserEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('browser:event', listener);
    return () => ipcRenderer.removeListener('browser:event', listener);
  }
});
