(function () {
  'use strict';
  const container = document.getElementById('desktop-widgets');
  const definitions = [
    ['clock', 'Digital clock'], ['calendar', 'Calendar'], ['weather', 'Weather'],
    ['cpu', 'CPU usage'], ['ram', 'Memory usage'], ['battery', 'Battery'],
    ['music', 'Music controls'], ['note', 'Quick note'], ['uptime', 'Session uptime']
  ];
  const startedAt = performance.timeOrigin;
  let timer = null;
  let resizeObserver = null;
  const instances = new Map();
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]);
  const saved = () => window.NexusStorage.getWidgets();
  const persist = () => {
    const data = [...instances.values()].map(item => ({
      id: item.id, type: item.type, x: item.x, y: item.y, width: item.width, height: item.height, appearance: item.appearance
    }));
    window.NexusStorage.saveWidgets(data);
  };
  const typeName = type => definitions.find(item => item[0] === type)?.[1] || type;
  function makeCard(record) {
    const card = document.createElement('article');
    card.className = `desktop-widget${record.appearance === 'translucent' ? ' is-translucent' : ''}`;
    card.dataset.widgetId = record.id;
    card.style.left = `${record.x}px`;
    card.style.top = `${record.y}px`;
    if (Number.isFinite(record.width)) card.style.width = `${record.width}px`;
    if (Number.isFinite(record.height)) card.style.height = `${record.height}px`;
    card.innerHTML = `<header class="widget-header"><strong>${escapeHTML(typeName(record.type))}</strong><div><button type="button" class="widget-appearance" aria-label="Change widget appearance" title="Change appearance">◐</button><button type="button" class="widget-remove" aria-label="Remove widget">×</button></div></header><div class="widget-content"></div>`;
    const item = { ...record, element: card };
    instances.set(record.id, item);
    card.querySelector('.widget-remove').addEventListener('click', () => remove(record.id));
    card.querySelector('.widget-appearance').addEventListener('click', () => {
      item.appearance = item.appearance === 'translucent' ? 'solid' : 'translucent';
      card.classList.toggle('is-translucent', item.appearance === 'translucent');
      persist();
    });
    attachMove(item);
    renderContent(item);
    container.append(card);
    resizeObserver?.observe(card);
  }
  function attachMove(item) {
    const handle = item.element.querySelector('.widget-header');
    handle.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = item.x;
      const originY = item.y;
      handle.setPointerCapture(event.pointerId);
      const move = next => {
        const area = document.getElementById('desktop-area');
        item.x = Math.max(0, Math.min(area.clientWidth - 80, originX + next.clientX - startX));
        item.y = Math.max(0, Math.min(area.clientHeight - 60, originY + next.clientY - startY));
        item.element.style.left = `${item.x}px`;
        item.element.style.top = `${item.y}px`;
      };
      const end = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        persist();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
  }
  function renderContent(item) {
    const body = item.element.querySelector('.widget-content');
    if (item.type === 'clock') {
      body.innerHTML = '<time class="widget-clock"></time><span class="widget-date"></span>';
    } else if (item.type === 'calendar') {
      body.innerHTML = '<strong class="widget-calendar-month"></strong><div class="widget-calendar-grid"></div>';
      const now = new Date();
      body.querySelector('.widget-calendar-month').textContent = now.toLocaleDateString([], { month: 'long', year: 'numeric' });
      const grid = body.querySelector('.widget-calendar-grid');
      ['S','M','T','W','T','F','S'].forEach(day => { const el = document.createElement('span'); el.textContent = day; el.className = 'weekday'; grid.append(el); });
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
      const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let blank = 0; blank < firstDay; blank += 1) grid.append(document.createElement('span'));
      for (let date = 1; date <= count; date += 1) {
        const cell = document.createElement('span'); cell.textContent = String(date);
        if (date === now.getDate()) cell.className = 'today';
        grid.append(cell);
      }
    } else if (item.type === 'weather') {
      body.innerHTML = '<span class="widget-large-icon">☁</span><strong>Weather is not configured</strong><small>No weather provider is connected. NEXUS does not request remote location or weather data.</small>';
    } else if (item.type === 'cpu') {
      body.innerHTML = '<span class="widget-meter">—</span><strong>CPU unavailable</strong><small>Browsers do not provide system CPU usage to this desktop.</small>';
    } else if (item.type === 'ram') {
      body.innerHTML = '<span class="widget-meter"></span><strong>Browser memory</strong><small class="widget-data-note"></small>';
      updateMemory(item);
    } else if (item.type === 'battery') {
      body.innerHTML = '<span class="widget-meter">—</span><strong>Battery status unavailable</strong><small>Battery information is not exposed by this browser.</small>';
      if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
          if (!item.element.isConnected) return;
          const meter = body.querySelector('.widget-meter');
          const note = body.querySelector('small');
          const update = () => {
            meter.textContent = `${Math.round(battery.level * 100)}%`;
            note.textContent = battery.charging ? 'Charging' : 'On battery';
            body.querySelector('strong').textContent = 'Battery';
          };
          update();
          battery.addEventListener('levelchange', update);
          battery.addEventListener('chargingchange', update);
          item.cleanup = () => {
            battery.removeEventListener('levelchange', update);
            battery.removeEventListener('chargingchange', update);
          };
        }).catch(error => console.warn('Battery widget is unavailable.', error));
      }
    } else if (item.type === 'music') {
      body.innerHTML = '<span class="widget-large-icon">♫</span><strong>Local music player</strong><button type="button" class="widget-open-music">Open Music Player</button>';
      body.querySelector('.widget-open-music').addEventListener('click', () => window.NexusApps.open('music'));
    } else if (item.type === 'note') {
      body.innerHTML = '<textarea class="widget-quick-note" maxlength="1000" aria-label="Quick note" placeholder="Write a quick note…"></textarea><small>Saved on this device</small>';
      const note = body.querySelector('textarea');
      note.value = window.NexusApps.getSetting('widgetQuickNote') || '';
      note.addEventListener('input', () => window.NexusApps.updateSetting('widgetQuickNote', note.value));
    } else if (item.type === 'uptime') {
      body.innerHTML = '<span class="widget-meter"></span><strong>NEXUS session uptime</strong><small>Since this desktop page was opened.</small>';
      updateUptime(item);
    }
  }
  function updateMemory(item) {
    const memory = performance.memory;
    const meter = item.element.querySelector('.widget-meter');
    const note = item.element.querySelector('.widget-data-note');
    if (!memory || !meter || !note) return;
    meter.textContent = `${Math.round(memory.usedJSHeapSize / 1048576)} MB`;
    note.textContent = `Browser JavaScript heap of ${Math.round(memory.jsHeapSizeLimit / 1048576)} MB; not total system RAM.`;
  }
  function updateUptime(item) {
    const meter = item.element.querySelector('.widget-meter');
    if (!meter) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    meter.textContent = `${String(Math.floor(elapsed / 3600)).padStart(2,'0')}:${String(Math.floor(elapsed / 60) % 60).padStart(2,'0')}:${String(elapsed % 60).padStart(2,'0')}`;
  }
  function updateLive() {
    instances.forEach(item => {
      if (item.type === 'clock') {
        item.element.querySelector('.widget-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        item.element.querySelector('.widget-date').textContent = new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      } else if (item.type === 'ram') updateMemory(item);
      else if (item.type === 'uptime') updateUptime(item);
    });
  }
  function add(type) {
    if (!definitions.some(item => item[0] === type) || instances.size >= 24) {
      window.Nexus?.toast('This widget cannot be added or the desktop widget limit was reached.');
      return;
    }
    const area = document.getElementById('desktop-area');
    const position = (instances.size % 5) * 18;
    const record = { id: `widget-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type, x: Math.max(12, area.clientWidth - 280 - position), y: 20 + position, width: 250, height: type === 'calendar' ? 250 : 150, appearance: 'solid' };
    makeCard(record);
    persist();
    renderManagerList();
  }
  function remove(id) {
    const item = instances.get(id);
    item?.cleanup?.();
    item?.element.remove();
    instances.delete(id);
    persist();
    renderManagerList();
  }
  let managerList;
  function renderManagerList() {
    if (!managerList?.isConnected) return;
    managerList.replaceChildren();
    if (!instances.size) {
      const empty = document.createElement('p'); empty.textContent = 'No desktop widgets yet. Add one above.'; managerList.append(empty); return;
    }
    instances.forEach(item => {
      const row = document.createElement('div'); row.className = 'widget-manager-row';
      const label = document.createElement('span'); label.textContent = `${typeName(item.type)} · ${Math.round(item.x)}, ${Math.round(item.y)}`;
      const removeButton = document.createElement('button'); removeButton.type = 'button'; removeButton.textContent = 'Remove'; removeButton.addEventListener('click', () => remove(item.id));
      row.append(label, removeButton); managerList.append(row);
    });
  }
  function createManager() {
    const root = document.createElement('div');
    root.className = 'widget-manager';
    root.innerHTML = '<header class="widget-manager-header"><p class="eyebrow">PERSONALIZE YOUR DESKTOP</p><h2>Desktop Widgets</h2><p>Drag widgets to move. Resize from the bottom-right corner. Widget data availability depends on your browser.</p></header><div class="widget-type-grid"></div><h3>On your desktop</h3><div class="widget-manager-list"></div>';
    const types = root.querySelector('.widget-type-grid');
    managerList = root.querySelector('.widget-manager-list');
    definitions.forEach(([id, name]) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'widget-type-option';
      const title = document.createElement('strong'); title.textContent = name;
      const desc = document.createElement('small'); desc.textContent = id === 'weather' ? 'Not configured · no network requests' : id === 'cpu' ? 'Unavailable in browser' : 'Add to desktop';
      button.append(title, desc); button.addEventListener('click', () => add(id)); types.append(button);
    });
    renderManagerList();
    return root;
  }
  function init() {
    resizeObserver = window.ResizeObserver ? new ResizeObserver(entries => {
      entries.forEach(entry => {
        const item = instances.get(entry.target.dataset.widgetId);
        if (!item) return;
        item.width = Math.round(entry.contentRect.width);
        item.height = Math.round(entry.contentRect.height);
        persist();
      });
    }) : null;
    saved().forEach(record => {
      if (definitions.some(item => item[0] === record.type) && instances.size < 24) makeCard(record);
    });
    timer = window.setInterval(updateLive, 1000);
    updateLive();
  }
  window.NexusWidgets = Object.freeze({ init, add, remove, createManager, getTypes: () => definitions.map(item => ({ id:item[0], name:item[1] })) });
})();
