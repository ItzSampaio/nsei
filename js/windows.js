(function () {
  'use strict';
  const windows = new Map();
  let zIndex = 10;
  let activeId = null;
  let snapPreview;

  function bounds() {
    const area = document.getElementById('desktop-area');
    return { width: area.clientWidth, height: area.clientHeight };
  }
  function getRegion(name) {
    const area = bounds();
    const halfWidth = Math.floor(area.width / 2);
    const halfHeight = Math.floor(area.height / 2);
    const regions = {
      left: { x: 0, y: 0, width: halfWidth, height: area.height },
      right: { x: halfWidth, y: 0, width: area.width - halfWidth, height: area.height },
      top: { x: 0, y: 0, width: area.width, height: halfHeight },
      bottom: { x: 0, y: halfHeight, width: area.width, height: area.height - halfHeight },
      'top-left': { x: 0, y: 0, width: halfWidth, height: halfHeight },
      'top-right': { x: halfWidth, y: 0, width: area.width - halfWidth, height: halfHeight },
      'bottom-left': { x: 0, y: halfHeight, width: halfWidth, height: area.height - halfHeight },
      'bottom-right': { x: halfWidth, y: halfHeight, width: area.width - halfWidth, height: area.height - halfHeight },
      'third-left': { x: 0, y: 0, width: Math.floor(area.width / 3), height: area.height },
      'third-center': { x: Math.floor(area.width / 3), y: 0, width: Math.floor(area.width / 3), height: area.height },
      'third-right': { x: Math.floor(area.width / 3) * 2, y: 0, width: area.width - Math.floor(area.width / 3) * 2, height: area.height }
    };
    return regions[name] || null;
  }
  function hideSnapPreview() {
    if (snapPreview) snapPreview.hidden = true;
  }
  function detectSnapRegion(x, y, area) {
    const edge = 22;
    const left = x <= edge;
    const right = x >= area.width - edge;
    const top = y <= edge;
    const bottom = y >= area.height - edge;
    if (top && left) return 'top-left';
    if (top && right) return 'top-right';
    if (bottom && left) return 'bottom-left';
    if (bottom && right) return 'bottom-right';
    if (left) return 'left';
    if (right) return 'right';
    if (top) return 'top';
    if (bottom) return 'bottom';
    return null;
  }
  function applyRegion(item, name) {
    const region = getRegion(name);
    if (!item || !region) return;
    if (!item.snapRegion && !item.maximized) {
      item.restoreStyle = {
        left: item.element.style.left, top: item.element.style.top,
        width: item.element.style.width, height: item.element.style.height
      };
    }
    item.maximized = false;
    item.snapRegion = name;
    item.element.classList.remove('is-maximized');
    item.element.classList.add('is-snapped');
    Object.assign(item.element.style, {
      left: `${region.x}px`, top: `${region.y}px`,
      width: `${region.width}px`, height: `${region.height}px`
    });
    focus(item.id);
  }
  function visibleWindows() {
    return [...windows.values()].filter(item => !item.element.classList.contains('is-minimized'));
  }
  const layoutRegions = {
    halves: ['left','right'],
    'top-bottom': ['top','bottom'],
    quadrants: ['top-left','top-right','bottom-left','bottom-right'],
    columns: ['third-left','third-center','third-right']
  };
  function applyLayout(name) {
    const items = visibleWindows();
    const regions = layoutRegions[name];
    if (!regions) {
      const saved = window.NexusStorage.getLayouts().find(item => item.id === name);
      if (!saved) return false;
      saved.windows.forEach((entry, index) => {
        const item = windows.get(entry.id);
        if (!item || item.element.classList.contains('is-minimized')) return;
        item.maximized = false;
        item.snapRegion = null;
        item.element.classList.remove('is-maximized','is-snapped');
        const area = bounds();
        const left = Math.round(entry.x * area.width);
        const top = Math.round(entry.y * area.height);
        const width = Math.max(300, Math.min(area.width - left, Math.round(entry.width * area.width)));
        const height = Math.max(220, Math.min(area.height - top, Math.round(entry.height * area.height)));
        Object.assign(item.element.style, { left: `${Math.max(0, left)}px`, top: `${Math.max(0, top)}px`, width: `${width}px`, height: `${height}px` });
        if (index === 0) focus(item.id);
      });
      return true;
    }
    items.forEach((item, index) => {
      item.element.classList.remove('is-minimized');
      if (index < regions.length) applyRegion(item, regions[index]);
      else {
        item.snapRegion = null;
        item.element.classList.remove('is-snapped');
      }
    });
    return true;
  }
  function saveCurrentLayout() {
    const name = window.prompt('Name this window layout (up to 32 characters):');
    if (!name || !name.trim()) return false;
    const area = bounds();
    const items = visibleWindows().slice(0, 12).map(item => ({
      id: item.id,
      x: (parseFloat(item.element.style.left) || 0) / area.width,
      y: (parseFloat(item.element.style.top) || 0) / area.height,
      width: item.element.offsetWidth / area.width,
      height: item.element.offsetHeight / area.height
    }));
    const layouts = window.NexusStorage.getLayouts().filter(item => item.name !== name.trim());
    layouts.unshift({ id: `layout-${Date.now()}`, name: name.trim().slice(0,32), windows: items });
    if (!window.NexusStorage.saveLayouts(layouts)) {
      window.Nexus.toast('The saved layout could not be stored.');
      return false;
    }
    renderLayoutMenu();
    return true;
  }
  function renderLayoutMenu() {
    const menu = document.getElementById('snap-layouts-menu');
    if (!menu) return;
    menu.replaceChildren();
    const add = (name, label) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label;
      button.addEventListener('click', () => {
        applyLayout(name);
        menu.hidden = true;
      });
      menu.append(button);
    };
    [['halves','Left + right'],['top-bottom','Top + bottom'],['quadrants','Four corners'],['columns','Three columns']].forEach(([id,label]) => add(id,label));
    const saved = window.NexusStorage.getLayouts();
    if (saved.length) {
      const divider = document.createElement('div'); divider.className = 'context-divider'; menu.append(divider);
      saved.forEach(layout => add(layout.id, layout.name));
    }
    const save = document.createElement('button');
    save.type = 'button'; save.className = 'snap-save-layout'; save.textContent = 'Save current layout…';
    save.addEventListener('click', () => { menu.hidden = true; saveCurrentLayout(); });
    menu.append(save);
  }
  function setTaskActive(id, active) {
    const button = document.querySelector(`[data-window-task="${id}"]`);
    if (button) button.classList.toggle('active', active);
  }
  function focus(id) {
    const item = windows.get(id);
    if (!item || item.element.classList.contains('is-minimized')) return;
    activeId = id;
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
      if (item.snapRegion && item.restoreStyle) {
        item.snapRegion = null;
        item.element.classList.remove('is-snapped');
        Object.assign(item.element.style, item.restoreStyle);
      }
      focus(item.id);
      const rect = item.element.getBoundingClientRect();
      const areaRect = document.getElementById('desktop-area').getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const originX = rect.left - areaRect.left;
      const originY = rect.top - areaRect.top;
      bar.setPointerCapture(event.pointerId);
      const move = moveEvent => {
        position(item, originX + moveEvent.clientX - startX, originY + moveEvent.clientY - startY);
        const area = bounds();
        const localX = moveEvent.clientX - areaRect.left;
        const localY = moveEvent.clientY - areaRect.top;
        const region = detectSnapRegion(localX, localY, area);
        if (region) {
          const target = getRegion(region);
          snapPreview.hidden = false;
          Object.assign(snapPreview.style, { left:`${target.x}px`,top:`${target.y}px`,width:`${target.width}px`,height:`${target.height}px` });
        } else hideSnapPreview();
      };
      const end = endEvent => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', end);
        bar.removeEventListener('pointercancel', end);
        hideSnapPreview();
        const area = bounds();
        const areaRect = document.getElementById('desktop-area').getBoundingClientRect();
        const localX = endEvent.clientX - areaRect.left;
        const localY = endEvent.clientY - areaRect.top;
        const region = detectSnapRegion(localX, localY, area);
        if (region) {
          applyRegion(item, region);
        } else if (localY <= 10) {
          if (!item.maximized) toggleMaximize(item.id);
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
      item.snapRegion = null;
      item.element.classList.remove('is-snapped');
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
    if (activeId === id) activeId = visibleWindows().sort((a,b) => Number(a.element.style.zIndex) - Number(b.element.style.zIndex)).at(-1)?.id || null;
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
      item.snapRegion = null;
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
    toggleMaximize,
    snapActive(region) { const item = windows.get(activeId); if (item) applyRegion(item, region); },
    applyLayout,
    renderLayoutMenu,
    saveCurrentLayout
  };
  window.addEventListener('resize', () => windows.forEach(item => {
    if (item.maximized) {
      Object.assign(item.element.style, { left:'8px', top:'8px', width:'calc(100% - 16px)', height:'calc(100% - 16px)' });
      return;
    }
    if (item.snapRegion) {
      const region = getRegion(item.snapRegion);
      if (region) Object.assign(item.element.style, { left:`${region.x}px`, top:`${region.y}px`, width:`${region.width}px`, height:`${region.height}px` });
      return;
    }
    position(item, parseFloat(item.element.style.left) || 0, parseFloat(item.element.style.top) || 0);
  }));
  snapPreview = document.createElement('div');
  snapPreview.className = 'window-snap-preview';
  snapPreview.hidden = true;
  document.getElementById('window-layer').append(snapPreview);
  renderLayoutMenu();
})();
