(function () {
  'use strict';
  const settings = () => window.NexusApps.getSettings();
  const boot = document.getElementById('boot-screen');
  const lock = document.getElementById('lock-screen');
  const contextMenu = document.getElementById('desktop-context-menu');
  const quickPanel = document.getElementById('quick-settings');
  const notificationPanel = document.getElementById('notification-center');
  const notifications = window.NexusStorage.getNotifications();
  let bootTimer = null;
  let startupSoundEnabled = false;

  function syncProfile() {
    const config = settings();
    const username = config.username || 'Guest';
    const avatar = config.avatar || '👩‍🚀';
    startupSoundEnabled = Boolean(config.startupSound);
    document.getElementById('lock-username').textContent = username;
    const lockAvatar = document.getElementById('lock-avatar');
    const topAvatar = document.getElementById('top-avatar');
    if (config.profileImage) {
      lockAvatar.textContent = '';
      lockAvatar.style.backgroundImage = `url("${config.profileImage}")`;
      topAvatar.textContent = '';
      topAvatar.style.backgroundImage = `url("${config.profileImage}")`;
      topAvatar.classList.add('avatar-photo');
    } else {
      lockAvatar.style.backgroundImage = '';
      lockAvatar.textContent = avatar;
      topAvatar.style.backgroundImage = '';
      topAvatar.textContent = avatar;
      topAvatar.classList.remove('avatar-photo');
    }
    const pinInput = document.getElementById('unlock-pin');
    const needsPin = Boolean(config.pin);
    pinInput.hidden = !needsPin;
    pinInput.required = needsPin;
    document.getElementById('pin-label').textContent = needsPin ? 'Enter your PIN to unlock' : 'Your desktop is ready';
    document.getElementById('lock-volume').classList.toggle('muted', !config.startupSound);
  }
  function updateLockClock() {
    const now = new Date();
    document.getElementById('lock-clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('lock-date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  function setPanel(panel) {
    const next = panel === 'quick' ? quickPanel : notificationPanel;
    const other = panel === 'quick' ? notificationPanel : quickPanel;
    const open = next.hidden;
    next.hidden = !open;
    other.hidden = true;
    contextMenu.hidden = true;
    if (open && panel === 'quick') syncQuickSettings();
  }
  function closePanels() {
    quickPanel.hidden = true;
    notificationPanel.hidden = true;
    contextMenu.hidden = true;
  }
  function syncQuickSettings() {
    const config = settings();
    const themeButton = document.getElementById('quick-theme');
    const light = config.theme === 'light';
    themeButton.querySelector('use').setAttribute('href', light ? '#i-sun' : '#i-moon');
    themeButton.querySelector('span').textContent = `${light ? 'Light' : 'Dark'} theme`;
    const mute = document.getElementById('quick-mute');
    mute.querySelector('span').textContent = config.muted ? 'Unmute sounds' : 'Mute sounds';
    mute.classList.toggle('selected', Boolean(config.muted));
    mute.querySelector('use').setAttribute('href', config.muted ? '#i-volume-off' : '#i-volume');
    const volume = Number.isFinite(config.volume) ? config.volume : 70;
    document.getElementById('system-volume').value = String(volume);
    document.getElementById('volume-value').textContent = `${volume}%`;
    document.getElementById('quick-date').textContent = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function updateNotificationIndicator() {
    document.querySelector('.notification-indicator').classList.toggle('has-notifications', notifications.length > 0);
    const list = document.getElementById('notification-list');
    list.replaceChildren();
    if (!notifications.length) {
      const empty = document.createElement('p'); empty.className = 'notification-empty'; empty.textContent = 'You are all caught up.'; list.append(empty); return;
    }
    notifications.slice().reverse().forEach(item => {
      const card = document.createElement('article');
      card.className = 'notification-card';
      const heading = document.createElement('strong'); heading.textContent = item.title;
      const body = document.createElement('p'); body.textContent = item.message;
      const time = document.createElement('small'); time.textContent = item.time;
      card.append(heading, body, time); list.append(card);
    });
  }
  function notify(title, message) {
    notifications.push({ title, message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    if (notifications.length > 80) notifications.splice(0, notifications.length - 80);
    window.NexusStorage.saveNotifications(notifications);
    updateNotificationIndicator();
  }
  function playStartupSound() {
    if (!startupSoundEnabled || settings().muted || Number(settings().volume ?? 70) <= 0) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audio = new AudioContext();
      const now = audio.currentTime;
      const outputVolume = Number(settings().volume ?? 70) / 100;
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.08 * outputVolume, now + index * 0.11 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.11 + 0.28);
        oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(now + index * 0.11); oscillator.stop(now + index * 0.11 + 0.3);
      });
      window.setTimeout(() => audio.close().catch(() => {}), 800);
    } catch (error) {
      console.warn('NEXUS OS startup sound is unavailable in this browser.', error);
    }
  }
  function beginLockScreen() {
    boot.hidden = true;
    lock.hidden = false;
    syncProfile();
    const input = document.getElementById('unlock-pin');
    if (!input.hidden) input.focus();
  }
  function start() {
    const config = settings();
    startupSoundEnabled = Boolean(config.startupSound);
    if (!config.bootAnimation || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      beginLockScreen();
      return;
    }
    boot.hidden = false;
    const bar = document.getElementById('boot-progress-bar');
    const status = document.getElementById('boot-status');
    const messages = ['Initializing your workspace', 'Loading system services', 'Preparing your desktop', 'Almost ready'];
    const started = Date.now();
    const duration = 1900;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / duration);
      bar.style.width = `${Math.round(progress * 100)}%`;
      status.textContent = messages[Math.min(messages.length - 1, Math.floor(progress * messages.length))];
      if (progress >= 1) { window.clearInterval(bootTimer); window.setTimeout(beginLockScreen, 240); }
    };
    tick();
    bootTimer = window.setInterval(tick, 45);
  }
  function skipBoot() {
    if (bootTimer) window.clearInterval(bootTimer);
    bootTimer = null;
    document.getElementById('boot-progress-bar').style.width = '100%';
    beginLockScreen();
  }
  function unlock(event) {
    event.preventDefault();
    const config = settings();
    const input = document.getElementById('unlock-pin');
    const error = document.getElementById('unlock-error');
    if (config.pin && input.value !== config.pin) {
      error.textContent = 'That PIN did not match. Please try again.';
      input.value = '';
      input.focus();
      return;
    }
    error.textContent = '';
    input.value = '';
    playStartupSound();
    lock.hidden = true;
    notify('Welcome back', `${config.username || 'Guest'}, your NEXUS desktop is ready.`);
  }
  function lockSession() {
    closePanels();
    document.getElementById('shutdown-screen').hidden = true;
    lock.hidden = false;
    syncProfile();
    const input = document.getElementById('unlock-pin');
    if (!input.hidden) input.focus();
    else document.querySelector('.unlock-button').focus();
  }
  function showContextMenu(x, y) {
    contextMenu.replaceChildren();
    const addAction = (label, action, icon) => {
      const button = document.createElement('button');
      button.className = 'context-action';
      button.innerHTML = `<svg><use href="#i-${icon}"></use></svg><span></span>`;
      button.querySelector('span').textContent = label;
      button.addEventListener('click', () => { contextMenu.hidden = true; action(); });
      contextMenu.append(button);
    };
    addAction('Open app launcher', () => window.Nexus.toggleLauncher(), 'grid');
    addAction('New note', () => {
      window.NexusApps.open('notes');
      document.querySelector('[data-window-id="notes"] .notes-sidebar-head button')?.click();
    }, 'note');
    addAction('Open Settings', () => window.NexusApps.open('settings'), 'settings');
    addAction('Open Calendar', () => window.NexusApps.open('calendar'), 'calendar');
    const divider = document.createElement('div'); divider.className = 'context-divider'; contextMenu.append(divider);
    const icons = document.createElement('button');
    icons.className = 'context-action';
    icons.innerHTML = `<svg><use href="#i-grid"></use></svg><span>${settings().showIcons === false ? 'Show' : 'Hide'} desktop icons</span>`;
    icons.addEventListener('click', () => {
      window.NexusApps.updateSetting('showIcons', settings().showIcons === false);
      contextMenu.hidden = true;
    });
    contextMenu.append(icons);
    addAction('Refresh desktop', () => window.Nexus.toast('Desktop refreshed.'), 'refresh');
    const rect = document.getElementById('desktop-area').getBoundingClientRect();
    contextMenu.hidden = false;
    contextMenu.style.left = `${Math.max(8, Math.min(x - rect.left, rect.width - 210))}px`;
    contextMenu.style.top = `${Math.max(8, Math.min(y - rect.top, rect.height - 280))}px`;
  }
  function initIconRearrangement() {
    const icons = document.getElementById('desktop-icons');
    icons.addEventListener('dragstart', event => {
      const icon = event.target.closest('.desktop-icon');
      if (!icon) return;
      event.dataTransfer.setData('text/nexus-app', icon.dataset.desktopApp);
      event.dataTransfer.effectAllowed = 'move';
      icon.classList.add('is-dragging');
    });
    icons.addEventListener('dragend', event => event.target.closest('.desktop-icon')?.classList.remove('is-dragging'));
    icons.addEventListener('dragover', event => event.preventDefault());
    icons.addEventListener('drop', event => {
      event.preventDefault();
      const appId = event.dataTransfer.getData('text/nexus-app');
      const icon = icons.querySelector(`[data-desktop-app="${appId}"]`);
      if (!icon) return;
      const rect = icons.getBoundingClientRect();
      const x = Math.max(0, Math.min(event.clientX - rect.left - 38, rect.width - icon.offsetWidth));
      const y = Math.max(0, Math.min(event.clientY - rect.top - 38, rect.height - icon.offsetHeight));
      icon.style.position = 'absolute'; icon.style.left = `${x}px`; icon.style.top = `${y}px`;
      const positions = { ...(settings().iconPositions || {}), [appId]: { x, y } };
      window.NexusApps.updateSetting('iconPositions', positions);
      window.Nexus.toast('Desktop icon position saved.');
    });
  }
  function init() {
    syncProfile();
    syncQuickSettings();
    updateNotificationIndicator();
    updateLockClock();
    window.setInterval(updateLockClock, 1000);
    initIconRearrangement();
    document.getElementById('unlock-form').addEventListener('submit', unlock);
    document.getElementById('skip-boot').addEventListener('click', skipBoot);
    document.getElementById('profile-button').addEventListener('click', lockSession);
    document.getElementById('notifications-toggle').addEventListener('click', () => setPanel('notifications'));
    document.getElementById('quick-toggle').addEventListener('click', () => setPanel('quick'));
    document.getElementById('taskbar-tray').addEventListener('click', () => setPanel('quick'));
    document.querySelectorAll('[data-panel-close]').forEach(button => button.addEventListener('click', closePanels));
    document.getElementById('clear-notifications').addEventListener('click', () => {
      notifications.length = 0;
      window.NexusStorage.saveNotifications(notifications);
      updateNotificationIndicator();
    });
    document.getElementById('quick-mute').addEventListener('click', () => {
      window.NexusApps.updateSetting('muted', !settings().muted);
      syncQuickSettings();
      window.Nexus.toast(settings().muted ? 'System sounds muted.' : 'System sounds enabled.');
    });
    document.getElementById('quick-theme').addEventListener('click', () => {
      window.NexusApps.updateSetting('theme', settings().theme === 'light' ? 'dark' : 'light');
      syncQuickSettings();
    });
    document.getElementById('quick-lock').addEventListener('click', lockSession);
    document.getElementById('quick-settings-app').addEventListener('click', () => { closePanels(); window.NexusApps.open('settings'); });
    document.getElementById('quick-calendar-app').addEventListener('click', () => { closePanels(); window.NexusApps.open('calendar'); });
    document.getElementById('system-volume').addEventListener('input', event => {
      const volume = Number(event.target.value);
      window.NexusApps.updateSetting('volume', volume);
      document.getElementById('volume-value').textContent = `${volume}%`;
      window.NexusMusic?.setVolume(volume);
    });
    document.getElementById('lock-volume').addEventListener('click', () => {
      startupSoundEnabled = !startupSoundEnabled;
      window.NexusApps.updateSetting('startupSound', startupSoundEnabled);
      syncProfile();
      window.Nexus.toast(`Startup sound ${startupSoundEnabled ? 'enabled' : 'muted'}.`);
    });
    document.getElementById('lock-shutdown').addEventListener('click', () => {
      lock.hidden = true;
      document.getElementById('shutdown-screen').hidden = false;
    });
    document.getElementById('wake-button').addEventListener('click', () => {
      document.getElementById('shutdown-screen').hidden = true;
      lockSession();
    });
    document.getElementById('desktop-area').addEventListener('contextmenu', event => {
      if (event.target.closest('.app-window, #launcher, .side-panel')) return;
      event.preventDefault();
      showContextMenu(event.clientX, event.clientY);
    });
    document.addEventListener('pointerdown', event => {
      if (!event.target.closest('#desktop-context-menu')) contextMenu.hidden = true;
      if (!event.target.closest('.side-panel, #quick-toggle, #notifications-toggle, #taskbar-tray')) {
        quickPanel.hidden = true; notificationPanel.hidden = true;
      }
    });
    document.addEventListener('keydown', event => {
      const editing = event.target.matches('input, textarea, select, [contenteditable="true"]');
      if (event.key === 'Escape') {
        if (!quickPanel.hidden || !notificationPanel.hidden || !contextMenu.hidden) closePanels();
      }
      if (editing || lock.hidden === false || !event.ctrlKey || !event.altKey) return;
      const shortcuts = { E:'explorer', T:'terminal', M:'music', S:'settings', C:'calendar', N:'notes', G:'gallery', P:'paint', W:'worldclock', K:'tasks', B:'browser' };
      const app = shortcuts[event.key.toUpperCase()];
      if (app) { event.preventDefault(); window.NexusApps.open(app); }
    });
    notify('NEXUS OS 6.0 is ready', 'Your upgraded desktop is ready to explore.');
    start();
  }
  window.NexusSystem = {
    init,
    notify,
    syncProfile,
    lock: lockSession,
    getVolume: () => Number(settings().volume ?? 70),
    setVolume(value) {
      window.NexusApps.updateSetting('volume', Math.max(0, Math.min(100, Math.round(value))));
      document.getElementById('system-volume').value = String(settings().volume);
      document.getElementById('volume-value').textContent = `${settings().volume}%`;
    },
    playSound(type = 'open') {
      const config = settings();
      if (config.muted || Number(config.volume ?? 70) <= 0) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audio = new AudioContext();
        const now = audio.currentTime;
        const frequency = type === 'alert' ? 660 : 440;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.22, now + 0.075);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.025 * Number(config.volume ?? 70) / 100, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(now); oscillator.stop(now + 0.12);
        window.setTimeout(() => audio.close().catch(() => {}), 250);
      } catch (error) {
        console.warn('NEXUS OS sound effect is unavailable in this browser.', error);
      }
    }
  };
})();
