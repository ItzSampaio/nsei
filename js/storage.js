(function () {
  'use strict';
  const SETTINGS_KEY = 'nexus-os-settings-v1';
  const NOTES_KEY = 'nexus-os-notes-v1';
  const EVENTS_KEY = 'nexus-os-events-v1';
  const TASKS_KEY = 'nexus-os-tasks-v1';
  const RECYCLE_KEY = 'nexus-os-recycle-v1';
  const NOTIFICATIONS_KEY = 'nexus-os-notifications-v1';
  const APP_REGISTRY_KEY = 'nexus-os-app-registry-v1';
  const WIDGETS_KEY = 'nexus-os-widgets-v1';
  const LAYOUTS_KEY = 'nexus-os-layouts-v1';
  const WALLPAPERS_KEY = 'nexus-os-custom-wallpapers-v1';
  const appIds = ['terminal','explorer','calculator','notes','settings','about','music','browser','monitor','games','calendar','gallery','paint','time','worldclock','password','tasks','recycle','store','recovery','widgets','hologram','godmode','garage','dashboard','focus','monitorpro','dynamic','themes','python'];
  const defaults = {
    accent: 'violet', wallpaper: 'nexus', theme: 'dark', username: 'Guest',
    avatar: '👩‍🚀', bootAnimation: true, startupSound: false, showIcons: true,
    volume: 70, pin: '', customAccent: '#9c7cff', iconPositions: {}, widgetQuickNote: '',
    taskbarPosition: 'bottom', animations: true, taskbarApps: null, recentApps: [],
    muted: false, profileImage: ''
  };
  let galleryDatabase;

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      console.error(`NEXUS OS could not read local storage key "${key}".`, error);
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`NEXUS OS could not save local storage key "${key}".`, error);
      window.Nexus?.toast('Could not save your changes. Browser storage may be full or disabled.');
      return false;
    }
  }
  function openGalleryDatabase() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
    if (!galleryDatabase) {
      galleryDatabase = new Promise((resolve, reject) => {
        const request = indexedDB.open('nexus-os-gallery-v1', 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('photos')) request.result.createObjectStore('photos', { keyPath: 'id' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not open the photo library.'));
        request.onblocked = () => reject(new Error('The photo library is blocked by another browser tab.'));
      });
    }
    return galleryDatabase;
  }
  async function galleryRequest(mode, operation) {
    try {
      const database = await openGalleryDatabase();
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction('photos', mode);
        const store = transaction.objectStore('photos');
        const request = operation(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not access the photo library.'));
        transaction.onabort = () => reject(transaction.error || new Error('The photo library transaction was aborted.'));
      });
    } catch (error) {
      console.error('NEXUS OS photo library error.', error);
      throw error;
    }
  }
  window.NexusStorage = {
    getSettings() {
      const saved = read(SETTINGS_KEY, {});
      return { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
    },
    saveSettings(settings) { return write(SETTINGS_KEY, settings); },
    getNotes() {
      const saved = read(NOTES_KEY, []);
      return Array.isArray(saved) ? saved.filter(note => note && typeof note.id === 'string') : [];
    },
    saveNotes(notes) { return write(NOTES_KEY, notes); },
    getEvents() {
      const saved = read(EVENTS_KEY, []);
      return Array.isArray(saved) ? saved.filter(event => event && typeof event.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) : [];
    },
    saveEvents(events) { return write(EVENTS_KEY, events); },
    getTasks() {
      const saved = read(TASKS_KEY, []);
      return Array.isArray(saved) ? saved.filter(task => task && typeof task.id === 'string') : [];
    },
    saveTasks(tasks) { return write(TASKS_KEY, tasks); },
    getRecycleBin() {
      const saved = read(RECYCLE_KEY, []);
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.id === 'string') : [];
    },
    saveRecycleBin(items) { return write(RECYCLE_KEY, items); },
    getNotifications() {
      const saved = read(NOTIFICATIONS_KEY, []);
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.title === 'string').slice(-80) : [];
    },
    saveNotifications(items) { return write(NOTIFICATIONS_KEY, items.slice(-80)); },
    getAppRegistry() {
      const saved = read(APP_REGISTRY_KEY, {});
      const registry = {};
      appIds.forEach(id => {
        const state = saved && typeof saved === 'object' ? saved[id] : null;
        registry[id] = {
          installed: typeof state?.installed === 'boolean' ? state.installed : true,
          enabled: typeof state?.enabled === 'boolean' ? state.enabled : true,
          version: typeof state?.version === 'string' ? state.version.slice(0, 24) : '1.0.0'
        };
      });
      return registry;
    },
    saveAppRegistry(registry) { return write(APP_REGISTRY_KEY, registry); },
    getWidgets() {
      const saved = read(WIDGETS_KEY, []);
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.id === 'string' && typeof item.type === 'string').slice(0, 24) : [];
    },
    saveWidgets(items) { return write(WIDGETS_KEY, items.slice(0, 24)); },
    getLayouts() {
      const saved = read(LAYOUTS_KEY, []);
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.name === 'string' && Array.isArray(item.windows)).slice(0, 20) : [];
    },
    saveLayouts(items) { return write(LAYOUTS_KEY, items.slice(0, 20)); },
    getCustomWallpapers() {
      const saved = read(WALLPAPERS_KEY, []);
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.id === 'string' && typeof item.data === 'string').slice(0, 8) : [];
    },
    saveCustomWallpapers(items) { return write(WALLPAPERS_KEY, items.slice(0, 8)); },
    exportSnapshot() {
      const settings = this.getSettings();
      delete settings.pin;
      delete settings.profileImage;
      return {
        format: 'nexus-os-backup',
        version: 1,
        createdAt: new Date().toISOString(),
        categories: {
          settings,
          notes: this.getNotes(),
          events: this.getEvents(),
          tasks: this.getTasks(),
          recycle: this.getRecycleBin(),
          notifications: this.getNotifications(),
          apps: this.getAppRegistry(),
          widgets: this.getWidgets(),
          layouts: this.getLayouts(),
          wallpapers: this.getCustomWallpapers()
        }
      };
    },
    restoreSnapshot(categories) {
      const keyMap = {
        settings: SETTINGS_KEY, notes: NOTES_KEY, events: EVENTS_KEY, tasks: TASKS_KEY,
        recycle: RECYCLE_KEY, notifications: NOTIFICATIONS_KEY, apps: APP_REGISTRY_KEY,
        widgets: WIDGETS_KEY, layouts: LAYOUTS_KEY, wallpapers: WALLPAPERS_KEY
      };
      if (!categories || typeof categories !== 'object' || Array.isArray(categories)) throw new Error('Backup categories are invalid.');
      Object.entries(keyMap).forEach(([name, key]) => {
        if (Object.prototype.hasOwnProperty.call(categories, name)) {
          if (!write(key, categories[name])) throw new Error(`Could not restore ${name}; browser storage may be full.`);
        }
      });
      window.dispatchEvent(new CustomEvent('nexus-data-restored'));
      return true;
    },
    getGalleryPhotos() { return galleryRequest('readonly', store => store.getAll()); },
    saveGalleryPhoto(photo) { return galleryRequest('readwrite', store => store.put(photo)); },
    deleteGalleryPhoto(id) { return galleryRequest('readwrite', store => store.delete(id)); }
  };
})();
