(function () {
  'use strict';
  const windows = new Map();
  let zIndex = 10;

  function bounds() {
    const area = document.getElementById('desktop-area');
    return { width: area.clientWidth, height: area.clientHeight };
  }
  function setTaskActive(id, active) {
    const button = document.querySelector(`[data-window-task="${id}"]`);
    if (button) button.classList.toggle('active', active);
  }
  function focus(id) {
    const item = windows.get(id);
    if (!item || item.element.classList.contains('is-minimized')) return;
    item.element.style.zIndex = String(++zIndex);
    windows.forEach((other, otherId) => setTaskActive(otherId, otherId === id));
  }
  function position(item, x, y) {
    const area = bounds();
    const width = item.element.offsetWidth;
    const height = item.element.offsetHeight;
    const bar = item.element.querySelector('.window-titlebar').offsetHeight;
    item.element.style.left = `${Math.max(0, Math.min(x, Math.max(0, area.width - Math.min(width, area.width))))}px`;
    item.element.style.top = `${Math.max(0, Math.min(y, Math.max(0, area.height - Math.min(bar, area.height))))}px`;
  }
  function attachDrag(item) {
    const bar = item.element.querySelector('.window-titlebar');
    bar.addEventListener('pointerdown', event => {
      if (event.target.closest('.window-controls') || item.maximized) return;
      event.preventDefault();
      focus(item.id);
      const rect = item.element.getBoundingClientRect();
      const areaRect = document.getElementById('desktop-area').getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = rect.left - areaRect.left;
      const originY = rect.top - areaRect.top;
      bar.setPointerCapture(event.pointerId);
      const move = moveEvent => position(item, originX + moveEvent.clientX - startX, originY + moveEvent.clientY - startY);
      const end = endEvent => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', end);
        bar.removeEventListener('pointercancel', end);
        const area = bounds();
        const areaRect = document.getElementById('desktop-area').getBoundingClientRect();
        const rect = item.element.getBoundingClientRect();
        const localX = endEvent.clientX - areaRect.left;
        const localY = endEvent.clientY - areaRect.top;
        if (localY <= 10) {
          if (!item.maximized) toggleMaximize(item.id);
        } else if (localX <= 8 || localX >= area.width - 8) {
          item.restoreStyle = { left: item.element.style.left, top: item.element.style.top, width: item.element.style.width, height: item.element.style.height };
          item.element.classList.add('is-snapped');
          item.element.style.left = localX <= 8 ? '0px' : `${Math.floor(area.width / 2)}px`;
          item.element.style.top = '0px';
          item.element.style.width = `${Math.ceil(area.width / 2)}px`;
          item.element.style.height = `${area.height}px`;
        }
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', end);
      bar.addEventListener('pointercancel', end);
    });
    bar.addEventListener('dblclick', event => {
      if (!event.target.closest('.window-controls')) toggleMaximize(item.id);
    });
  }
  function toggleMaximize(id) {
    const item = windows.get(id);
    if (!item) return;
    if (item.maximized) {
      item.element.classList.remove('is-maximized');
      Object.assign(item.element.style, item.restoreStyle);
      item.maximized = false;
    } else {
      item.restoreStyle = { left: item.element.style.left, top: item.element.style.top, width: item.element.style.width, height: item.element.style.height };
      item.element.classList.add('is-maximized');
      Object.assign(item.element.style, { left: '8px', top: '8px', width: 'calc(100% - 16px)', height: 'calc(100% - 16px)' });
      item.maximized = true;
    }
    focus(id);
  }
  function close(id) {
    const item = windows.get(id);
    if (!item) return;
    if (window.NexusApps?.onClose) window.NexusApps.onClose(id);
    item.element.remove();
    document.querySelector(`[data-window-task="${id}"]`)?.remove();
    windows.delete(id);
  }
  function minimize(id) {
    const item = windows.get(id);
    if (!item) return;
    item.element.classList.add('is-minimized');
    setTaskActive(id, false);
  }
  window.NexusWindows = {
    has(id) { return windows.has(id); },
    open(id, title, icon, content, options = {}) {
      let existing = windows.get(id);
      if (existing) {
        existing.element.classList.remove('is-minimized');
        focus(id);
        return existing;
      }
      const layer = document.getElementById('window-layer');
      const element = document.createElement('section');
      element.className = 'app-window';
      element.dataset.windowId = id;
      element.setAttribute('role', 'dialog');
      element.setAttribute('aria-label', title);
      const size = options.size || { width: 480, height: 360 };
      const area = bounds();
      const width = Math.min(size.width, Math.max(300, area.width - 18));
      const height = Math.min(size.height, Math.max(220, area.height - 18));
      const stagger = windows.size % 8 * 24;
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.style.left = `${Math.max(8, (area.width - width) / 2 + stagger)}px`;
      element.style.top = `${Math.max(8, (area.height - height) / 2 + stagger)}px`;
      element.innerHTML = `<header class="window-titlebar"><span class="app-icon" data-app="${id}"><svg><use href="#i-${icon}"></use></svg></span><span class="window-title">${title}</span><div class="window-controls"><button class="window-control minimize" aria-label="Minimize ${title}"><svg><use href="#i-minimize"></use></svg></button><button class="window-control maximize" aria-label="Maximize ${title}"><svg><use href="#i-maximize"></use></svg></button><button class="window-control close" aria-label="Close ${title}"><svg><use href="#i-close"></use></svg></button></div></header><div class="window-content"></div>`;
      const item = { id, element, maximized: false, restoreStyle: null };
      windows.set(id, item);
      layer.appendChild(element);
      element.querySelector('.window-content').append(content);
      content._nexusMount?.();
      element.addEventListener('pointerdown', () => focus(id));
      element.querySelector('.minimize').addEventListener('click', () => minimize(id));
      element.querySelector('.maximize').addEventListener('click', () => toggleMaximize(id));
      element.querySelector('.close').addEventListener('click', () => close(id));
      attachDrag(item);
      const grip = document.createElement('button');
      grip.type = 'button';
      grip.className = 'window-resize-grip';
      grip.setAttribute('aria-label', `Resize ${title}`);
      grip.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
        if (item.maximized) return;
        focus(id);
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = element.offsetWidth;
        const startHeight = element.offsetHeight;
        const area = bounds();
        grip.setPointerCapture(event.pointerId);
        const move = moveEvent => {
          element.style.width = `${Math.max(300, Math.min(area.width - (parseFloat(element.style.left) || 0), startWidth + moveEvent.clientX - startX))}px`;
          element.style.height = `${Math.max(220, Math.min(area.height - (parseFloat(element.style.top) || 0), startHeight + moveEvent.clientY - startY))}px`;
        };
        const end = () => {
          grip.removeEventListener('pointermove', move);
          grip.removeEventListener('pointerup', end);
          grip.removeEventListener('pointercancel', end);
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', end);
        grip.addEventListener('pointercancel', end);
      });
      element.append(grip);
      const task = document.createElement('button');
      task.className = 'taskbar-app active';
      task.dataset.windowTask = id;
      task.title = title;
      task.setAttribute('aria-label', `Switch to ${title}`);
      task.innerHTML = `<span class="app-icon" data-app="${id}"><svg><use href="#i-${icon}"></use></svg></span>`;
      task.addEventListener('click', () => {
        if (element.classList.contains('is-minimized')) {
          element.classList.remove('is-minimized');
          focus(id);
        } else if (element.style.zIndex === String(zIndex)) minimize(id);
        else focus(id);
      });
      document.getElementById('taskbar-open').append(task);
      focus(id);
      return item;
    },
    close,
    focus,
    toggleMaximize
  };
  window.addEventListener('resize', () => windows.forEach(item => {
    if (item.maximized) return;
    position(item, parseFloat(item.element.style.left) || 0, parseFloat(item.element.style.top) || 0);
  }));
})();
