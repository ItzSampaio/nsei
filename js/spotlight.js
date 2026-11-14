(function () {
  'use strict';
  const overlay = document.getElementById('spotlight');
  const input = document.getElementById('spotlight-input');
  const resultHost = document.getElementById('spotlight-results');
  const form = document.getElementById('spotlight-form');
  const settingTerms = [
    { title: 'Wallpaper', detail: 'Settings · Personalization', terms: 'background theme live video' },
    { title: 'Accent color', detail: 'Settings · Personalization', terms: 'accent colour color appearance' },
    { title: 'Theme', detail: 'Settings · Appearance', terms: 'dark light appearance' },
    { title: 'Username and avatar', detail: 'Settings · User profile', terms: 'profile name avatar picture' },
    { title: 'Taskbar and pinned apps', detail: 'Settings · Taskbar', terms: 'position pin customize' },
    { title: 'Boot and animation options', detail: 'Settings · Startup and desktop', terms: 'boot motion sound icons' }
  ];
  let results = [];
  let selected = 0;
  const recent = () => {
    const saved = window.NexusApps.getSetting('spotlightHistory');
    return Array.isArray(saved) ? saved.filter(value => typeof value === 'string').slice(0, 8) : [];
  };
  function close() {
    overlay.hidden = true;
    input.value = '';
    resultHost.replaceChildren();
  }
  function setSelected(index) {
    if (!results.length) return;
    selected = (index + results.length) % results.length;
    resultHost.querySelectorAll('.spotlight-result').forEach((item, itemIndex) => {
      item.classList.toggle('selected', itemIndex === selected);
      item.setAttribute('aria-selected', String(itemIndex === selected));
    });
    resultHost.querySelector('.spotlight-result.selected')?.scrollIntoView({ block: 'nearest' });
  }
  function quickCalculation(query) {
    const percent = query.match(/^(.+?)\s*%\s+of\s+(.+)$/i);
    if (percent) return window.NexusScientificMath.evaluate(`(${percent[1]})/100*(${percent[2]})`, 'DEG');
    return window.NexusScientificMath.evaluate(query, 'DEG');
  }
  function buildResults(query) {
    const normalized = query.trim().toLowerCase();
    const found = [];
    if (!normalized) {
      recent().forEach(search => found.push({ category: 'Recent searches', title: search, detail: 'Search again', action: { query: search } }));
      return found;
    }
    const appIndex = window.NexusApps.getSearchIndex();
    appIndex.forEach(item => {
      const haystack = `${item.title} ${item.detail} ${item.type}`.toLowerCase();
      if (haystack.includes(normalized)) found.push({ ...item, category: item.type });
    });
    settingTerms.forEach(item => {
      if (`${item.title} ${item.detail} ${item.terms}`.toLowerCase().includes(normalized)) {
        found.push({ category: 'Setting', title: item.title, detail: item.detail, action: { app: 'settings' } });
      }
    });
    try {
      const value = quickCalculation(query);
      found.unshift({ category: 'Calculator', title: String(Number(value.toPrecision(12))), detail: `Result for ${query}`, action: { calculation: true } });
    } catch { }
    const bookmarkApi = window.nexusDesktop?.getBrowserBookmarks;
    if (bookmarkApi && normalized) {
      bookmarkApi().then(bookmarks => {
        if (input.value.trim().toLowerCase() !== normalized || overlay.hidden) return;
        const matches = (Array.isArray(bookmarks) ? bookmarks : []).filter(item =>
          `${item.title || ''} ${item.url || ''}`.toLowerCase().includes(normalized)
        ).map(item => ({ category: 'Bookmark', title: item.title || item.url, detail: item.url, action: { bookmark: item.url } }));
        results = [...results.filter(item => item.category !== 'Bookmark'), ...matches].slice(0, 16);
        renderResults();
      }).catch(error => console.warn('Spotlight could not search browser bookmarks.', error));
    }
    return found.slice(0, 16);
  }
  function renderResults() {
    resultHost.replaceChildren();
    if (!results.length) {
      const empty = document.createElement('p'); empty.className = 'spotlight-empty'; empty.textContent = 'No matching applications, notes, or documents.'; resultHost.append(empty); return;
    }
    let category = '';
    results.forEach((result, index) => {
      if (result.category !== category) {
        category = result.category;
        const heading = document.createElement('div'); heading.className = 'spotlight-category'; heading.textContent = category; resultHost.append(heading);
      }
      const button = document.createElement('button'); button.type = 'button'; button.className = 'spotlight-result'; button.setAttribute('role','option'); button.setAttribute('aria-selected',String(index === selected));
      const title = document.createElement('strong'); title.textContent = result.title;
      const detail = document.createElement('span'); detail.textContent = result.detail;
      button.append(title, detail);
      button.addEventListener('mouseenter', () => setSelected(index));
      button.addEventListener('click', () => activate(index));
      resultHost.append(button);
    });
    setSelected(selected);
  }
  function search(query) {
    results = buildResults(query);
    selected = 0;
    renderResults();
  }
  function activate(index = selected) {
    const result = results[index];
    if (!result) return;
    if (input.value.trim()) {
      const history = [input.value.trim(), ...recent().filter(item => item !== input.value.trim())].slice(0, 8);
      window.NexusApps.updateSetting('spotlightHistory', history);
    }
    if (result.action.query) {
      input.value = result.action.query;
      search(input.value);
      return;
    }
    close();
    if (result.action.calculation) {
      window.Nexus.toast(`${result.detail}: ${result.title}`);
      return;
    }
    if (result.action.bookmark) {
      window.NexusApps.open('browser');
      window.nexusDesktop?.openNativeBrowser(result.action.bookmark).catch(error => window.Nexus.toast(error.message));
      return;
    }
    if (result.action.app) window.NexusApps.open(result.action.app);
    if (result.action.app === 'notes' && result.action.id) window.NexusApps.openSearchResult?.(result.action);
    if (result.action.app === 'explorer' && result.action.file) {
      window.Nexus.toast(`Open ${result.action.file} in File Explorer.`);
    }
  }
  function open() {
    overlay.hidden = false;
    search('');
    input.focus();
  }
  input.addEventListener('input', () => search(input.value));
  form.addEventListener('submit', event => { event.preventDefault(); activate(); });
  document.getElementById('spotlight-clear').addEventListener('click', () => {
    window.NexusApps.updateSetting('spotlightHistory', []);
    search('');
  });
  overlay.addEventListener('pointerdown', event => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', event => {
    if (overlay.hidden) {
      if (event.altKey && event.code === 'Space') { event.preventDefault(); open(); }
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(selected + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(selected - 1); }
    else if (event.key === 'Enter' && document.activeElement !== input) { event.preventDefault(); activate(); }
  });
  window.NexusSpotlight = Object.freeze({ open, close });
})();
