(function () {
  'use strict';
  const historyKey = 'nexus-os-store-history-v1';
  const protectedApps = new Set(['store', 'recovery']);
  const activeInstalls = new Set();

  function getHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(historyKey) || '[]');
      return Array.isArray(value) ? value.filter(item => item && typeof item.appId === 'string').slice(-100) : [];
    } catch (error) {
      console.error('NEXUS Store could not read installation history.', error);
      return [];
    }
  }
  function record(appId, action) {
    const history = getHistory();
    history.push({ appId, action, at: new Date().toISOString() });
    try {
      localStorage.setItem(historyKey, JSON.stringify(history.slice(-100)));
    } catch (error) {
      console.error('NEXUS Store could not save installation history.', error);
    }
  }
  function create() {
    const root = document.createElement('div');
    root.className = 'nexus-store';
    root.innerHTML = `
      <header class="store-header"><div><p class="eyebrow">LOCAL CATALOGUE</p><h2>NEXUS Store</h2><p>Manage built-in NEXUS applications. No external code is downloaded or run.</p></div><label class="store-search"><svg><use href="#i-search"></use></svg><input type="search" placeholder="Search applications..." aria-label="Search store"></label></header>
      <nav class="store-categories" aria-label="Application categories"></nav>
      <div class="store-body"><section class="store-list-region"><div class="store-section-heading"><h3>Featured</h3><span class="store-count"></span></div><div class="store-grid"></div><details class="store-history"><summary>Installation history</summary><div class="store-history-list"></div></details></section><aside class="store-details"><div class="store-details-empty">Select an application to view its details.</div></aside></div>`;
    const search = root.querySelector('.store-search input');
    const grid = root.querySelector('.store-grid');
    const categories = root.querySelector('.store-categories');
    const details = root.querySelector('.store-details');
    const categoriesList = ['All', 'Productivity', 'System', 'Creative', 'Media', 'Tools'];
    let activeCategory = 'All';
    let selectedId = null;
    const apps = window.NexusApps.getCatalog();
    const categoryFor = app => ({
      terminal: 'System', explorer: 'Productivity', calculator: 'Tools', notes: 'Productivity',
      settings: 'System', about: 'System', music: 'Media', browser: 'Media', monitor: 'System',
      games: 'Media', calendar: 'Productivity', gallery: 'Creative', paint: 'Creative', time: 'Tools',
      worldclock: 'Tools', password: 'Tools', tasks: 'Productivity', recycle: 'System',
      store: 'System', widgets: 'System', recovery: 'System'
    })[app.id] || 'Tools';
    const registry = () => window.NexusStorage.getAppRegistry();
    const renderHistory = () => {
      const list = root.querySelector('.store-history-list');
      list.replaceChildren();
      const history = getHistory().reverse();
      if (!history.length) {
        const empty = document.createElement('p'); empty.textContent = 'No installation changes yet.'; list.append(empty); return;
      }
      history.forEach(entry => {
        const app = apps.find(item => item.id === entry.appId);
        if (!app) return;
        const row = document.createElement('p');
        row.textContent = `${new Date(entry.at).toLocaleString()} · ${app.name} · ${entry.action}`;
        list.append(row);
      });
    };
    const renderDetails = () => {
      details.replaceChildren();
      const app = apps.find(item => item.id === selectedId);
      if (!app) {
        const empty = document.createElement('div'); empty.className = 'store-details-empty'; empty.textContent = 'Select an application to view its details.'; details.append(empty); return;
      }
      const state = registry()[app.id];
      const header = document.createElement('div'); header.className = 'store-detail-header';
      header.innerHTML = `<span class="app-icon" data-app="${app.id}"><svg><use href="#i-${app.icon}"></use></svg></span>`;
      const title = document.createElement('h3'); title.textContent = app.name;
      const version = document.createElement('small'); version.textContent = `Version ${state.version} · ${categoryFor(app)}`;
      const description = document.createElement('p'); description.textContent = app.description;
      const explanation = document.createElement('p'); explanation.className = 'store-safety-note'; explanation.textContent = 'This is part of the local NEXUS OS catalogue. Installing or enabling it only updates the local app registry; no executable code is downloaded.';
      const actions = document.createElement('div'); actions.className = 'store-actions';
      const addButton = (label, action, className = '') => {
        const button = document.createElement('button'); button.type = 'button'; button.className = className; button.textContent = label;
        button.addEventListener('click', action); actions.append(button); return button;
      };
      if (!state.installed) {
        const install = addButton('Install', () => installApp(app, install, progress), 'store-primary-action');
        const progress = document.createElement('progress'); progress.className = 'store-progress'; progress.hidden = true; progress.max = 100; progress.value = 0; actions.append(progress);
        install.dataset.progressButton = 'true';
      } else {
        if (state.enabled) addButton('Disable', () => changeState(app, 'disable'));
        else addButton('Enable', () => changeState(app, 'enable'), 'store-primary-action');
        addButton('Check for local update', () => changeState(app, 'update'), 'store-primary-action');
        if (!protectedApps.has(app.id)) addButton('Uninstall', () => changeState(app, 'uninstall'), 'store-danger-action');
      }
      header.append(title, version);
      details.append(header, description, explanation, actions);
      if (state.installed) {
        const updateNote = document.createElement('p'); updateNote.className = 'store-update-note';
        updateNote.textContent = 'Updates are not configured for this offline, built-in catalogue.';
        details.append(updateNote);
      }
      if (state.installed && state.enabled) {
        const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'store-primary-action store-launch-action'; launch.textContent = 'Open application';
        launch.addEventListener('click', () => window.NexusApps.open(app.id)); details.append(launch);
      }
    };
    const changeState = (app, action) => {
      if (protectedApps.has(app.id) && ['uninstall', 'disable'].includes(action)) return;
      const all = registry();
      const state = all[app.id];
      if (!state) return;
      if (action === 'install') { state.installed = true; state.enabled = true; record(app.id, 'installed'); }
      else if (action === 'uninstall') { state.installed = false; state.enabled = false; record(app.id, 'uninstalled (local app data retained)'); }
      else if (action === 'enable') { state.enabled = true; record(app.id, 'enabled'); }
      else if (action === 'disable') { state.enabled = false; record(app.id, 'disabled'); }
      else if (action === 'update') {
        const [major, minor] = String(state.version || '1.0.0').split('.').map(value => Number.parseInt(value, 10) || 0);
        state.version = `${major}.${minor + 1}.0`;
        record(app.id, `updated to ${state.version}`);
      }
      if (!window.NexusStorage.saveAppRegistry(all)) { window.Nexus.toast('The app registry could not be saved.'); return; }
      window.dispatchEvent(new CustomEvent('nexus-app-registry-change'));
      const stateLabel = { uninstall:'uninstalled; its local data was preserved', disable:'disabled', enable:'enabled', update:`updated to ${state.version}` }[action] || action;
      window.Nexus?.toast(`${app.name} ${stateLabel}.`);
      render();
      selectedId = app.id;
      renderDetails();
    };
    const installApp = (app, button, progress) => {
      button.disabled = true;
      button.textContent = 'Installing locally…';
      progress.hidden = false;
      progress.value = 0;
      let value = 0;
      const timer = window.setInterval(() => {
        value = Math.min(100, value + 25);
        progress.value = value;
        if (value < 100) return;
        window.clearInterval(timer);
        activeInstalls.delete(timer);
        const all = registry();
        all[app.id].installed = true;
        all[app.id].enabled = true;
        if (!window.NexusStorage.saveAppRegistry(all)) {
          window.Nexus.toast('The app registry could not be saved.');
          render();
          return;
        }
        record(app.id, 'installed locally');
        window.dispatchEvent(new CustomEvent('nexus-app-registry-change'));
        window.Nexus?.toast(`${app.name} is now installed.`);
        render();
        selectedId = app.id;
        renderDetails();
      }, 90);
      activeInstalls.add(timer);
    };
    const render = () => {
      const query = search.value.trim().toLowerCase();
      const all = registry();
      const visible = apps.filter(app => {
        const matchesCategory = activeCategory === 'All' || categoryFor(app) === activeCategory;
        const matchesQuery = `${app.name} ${app.description} ${categoryFor(app)}`.toLowerCase().includes(query);
        return matchesCategory && matchesQuery;
      });
      grid.replaceChildren();
      root.querySelector('.store-count').textContent = `${visible.length} applications`;
      visible.forEach((app, index) => {
        const state = all[app.id];
        const card = document.createElement('button'); card.type = 'button'; card.className = `store-card${app.id === selectedId ? ' selected' : ''}`;
        card.style.setProperty('--store-card-index', String(index));
        const icon = document.createElement('span'); icon.className = 'app-icon'; icon.dataset.app = app.id; icon.innerHTML = `<svg><use href="#i-${app.icon}"></use></svg>`;
        const name = document.createElement('strong'); name.textContent = app.name;
        const description = document.createElement('span'); description.textContent = app.description;
        const status = document.createElement('small'); status.textContent = !state.installed ? 'Not installed' : state.enabled ? 'Installed' : 'Disabled';
        card.append(icon, name, description, status);
        card.addEventListener('click', () => { selectedId = app.id; render(); renderDetails(); });
        grid.append(card);
      });
      renderHistory();
      if (selectedId) renderDetails();
    };
    categoriesList.forEach(category => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = category;
      button.classList.toggle('selected', category === activeCategory);
      button.addEventListener('click', () => {
        activeCategory = category;
        categories.querySelectorAll('button').forEach(item => item.classList.toggle('selected', item === button));
        render();
      });
      categories.append(button);
    });
    search.addEventListener('input', render);
    root._nexusCleanup = () => {
      activeInstalls.forEach(timer => window.clearInterval(timer));
      activeInstalls.clear();
    };
    render();
    return root;
  }
  window.NexusStore = Object.freeze({ create });
})();
