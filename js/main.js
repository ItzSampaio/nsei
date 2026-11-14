(function () {
  'use strict';
  const launcher = document.getElementById('launcher');
  const search = document.getElementById('launcher-search');
  function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('top-clock').textContent = time;
    document.getElementById('tray-clock').textContent = time;
    document.getElementById('top-date').textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function toggleLauncher(force) {
    const shouldOpen = typeof force === 'boolean' ? force : launcher.hidden;
    launcher.hidden = !shouldOpen;
    if (shouldOpen) { search.value = ''; filterApps(''); search.focus(); }
  }
  function filterApps(query) {
    const normalized = query.trim().toLowerCase();
    document.querySelectorAll('.launcher-item').forEach(item => { item.hidden = !item.dataset.appName.includes(normalized); });
  }
  function toast(message) {
    const region = document.getElementById('toast-region');
    const element = document.createElement('div');
    element.className = 'toast'; element.textContent = message; region.append(element);
    window.setTimeout(() => { element.classList.add('leaving'); window.setTimeout(() => element.remove(), 300); }, 2800);
  }
  window.Nexus = { toast, closeLauncher: () => toggleLauncher(false), toggleLauncher };
  window.NexusWidgets?.init();
  window.NexusApps.renderShortcuts();
  window.NexusSystem.init();
  updateClock();
  window.setInterval(updateClock, 1000);
  document.getElementById('launcher-button').addEventListener('click', () => toggleLauncher());
  document.getElementById('taskbar-launcher').addEventListener('click', () => toggleLauncher());
  document.getElementById('launcher-close').addEventListener('click', () => toggleLauncher(false));
  search.addEventListener('input', () => filterApps(search.value));
  const snapButton = document.getElementById('snap-layouts-button');
  const snapMenu = document.getElementById('snap-layouts-menu');
  snapButton?.addEventListener('click', event => {
    event.stopPropagation();
    if (snapMenu) snapMenu.hidden = !snapMenu.hidden;
  });
  document.addEventListener('pointerdown', event => {
    if (snapMenu && !event.target.closest('.snap-layout-control')) snapMenu.hidden = true;
  });
  document.addEventListener('pointerdown', event => {
    if (!launcher.hidden && !launcher.contains(event.target) && !event.target.closest('#launcher-button, #taskbar-launcher')) toggleLauncher(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !launcher.hidden) toggleLauncher(false);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === ' ') { event.preventDefault(); toggleLauncher(); }
  });
  document.getElementById('power-button').addEventListener('click', () => {
    toggleLauncher(false);
    document.getElementById('shutdown-screen').hidden = false;
  });
})();
