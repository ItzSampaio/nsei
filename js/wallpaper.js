(function () {
  'use strict';
  const layer = document.getElementById('wallpaper-layer');
  const customKey = id => window.NexusStorage.getCustomWallpapers().find(item => item.id === id);
  let activeVideo = null;
  const liveOptions = [
    { id: 'live:aurora', name: 'Living Aurora', category: 'Animated' },
    { id: 'live:nebula', name: 'Orbiting Nebula', category: 'Animated' }
  ];

  function apply(selection) {
    layer.replaceChildren();
    layer.className = 'wallpaper-layer';
    activeVideo = null;
    if (selection === 'live:aurora' || selection === 'live:nebula') {
      layer.classList.add(selection === 'live:aurora' ? 'wallpaper-aurora' : 'wallpaper-nebula');
    } else if (typeof selection === 'string' && selection.startsWith('custom:')) {
      const wallpaper = customKey(selection.slice(7));
      if (!wallpaper) return;
      if (wallpaper.kind === 'video') {
        const video = document.createElement('video');
        video.className = 'wallpaper-video';
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.src = wallpaper.data;
        video.addEventListener('error', () => window.Nexus?.toast('This video wallpaper could not be played.'), { once: true });
        layer.append(video);
        activeVideo = video;
        video.play().catch(() => {});
      } else {
        const image = document.createElement('div');
        image.className = 'wallpaper-custom-image';
        image.style.backgroundImage = `url("${wallpaper.data}")`;
        layer.append(image);
      }
    }
    updatePlayback();
  }
  function updatePlayback() {
    const shouldPause = document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.NexusApps?.getSetting('animations') === false;
    if (activeVideo) {
      if (shouldPause) activeVideo.pause();
      else activeVideo.play().catch(() => {});
    }
    layer.classList.toggle('wallpaper-motion-paused', shouldPause);
  }
  async function importFile(file) {
    if (!file || !['image/', 'video/'].some(prefix => file.type.startsWith(prefix))) {
      throw new Error('Choose an image or video file.');
    }
    if (file.size > 2 * 1024 * 1024) throw new Error('Wallpaper files must be 2 MB or smaller to fit local browser storage.');
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the selected wallpaper.'));
      reader.readAsDataURL(file);
    });
    const item = {
      id: `wallpaper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name.slice(0, 60),
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      type: file.type,
      data
    };
    const wallpapers = window.NexusStorage.getCustomWallpapers();
    wallpapers.unshift(item);
    if (!window.NexusStorage.saveCustomWallpapers(wallpapers)) {
      throw new Error('Could not save this wallpaper. Browser storage may be full.');
    }
    return item;
  }
  function getOptions() {
    return [...liveOptions, ...window.NexusStorage.getCustomWallpapers().map(item => ({
      id: `custom:${item.id}`,
      name: item.name,
      category: item.kind === 'video' ? 'Local video' : 'Local image'
    }))];
  }
  document.addEventListener('visibilitychange', updatePlayback);
  window.addEventListener('nexus-wallpaper-settings', updatePlayback);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', updatePlayback);
  window.NexusWallpaper = Object.freeze({ apply, importFile, getOptions, updatePlayback });
})();
