(function () {
  'use strict';
  let objectUrls = [];

  function create() {
    const root = document.createElement('div');
    root.className = 'music-app';
    root.innerHTML = `
      <header class="music-header"><div><p class="eyebrow">YOUR SOUNDTRACK</p><h2>Music Player</h2></div><label class="file-picker-button"><svg><use href="#i-plus"></use></svg> Add music<input class="music-files" type="file" accept="audio/*" multiple></label></header>
      <div class="music-body">
        <section class="music-now"><div class="album-art"><div class="album-orbit"></div><svg><use href="#i-music"></use></svg></div>
          <div class="track-title">Choose a track</div><div class="track-artist">Your music, on your device</div>
          <audio preload="metadata"></audio>
          <div class="music-progress"><span class="time-current">0:00</span><input class="seek-slider" type="range" min="0" max="1000" value="0" aria-label="Track position"><span class="time-duration">0:00</span></div>
          <div class="music-controls"><button class="music-prev" aria-label="Previous track"><svg><use href="#i-prev"></use></svg></button><button class="music-play" aria-label="Play"><svg><use href="#i-play"></use></svg></button><button class="music-next" aria-label="Next track"><svg><use href="#i-skip"></use></svg></button></div>
          <label class="music-volume"><svg><use href="#i-volume"></use></svg><input type="range" min="0" max="100" value="${window.NexusSystem?.getVolume() ?? 70}" aria-label="Music volume"></label>
        </section>
        <section class="music-library"><div class="music-library-title">PLAY QUEUE <span class="track-count">0 tracks</span></div><div class="music-track-list"></div><div class="music-empty">Add audio files from your device to begin. Files stay local and are never uploaded.</div></section>
      </div>`;
    const audio = root.querySelector('audio');
    const picker = root.querySelector('.music-files');
    const list = root.querySelector('.music-track-list');
    const title = root.querySelector('.track-title');
    const artist = root.querySelector('.track-artist');
    const seek = root.querySelector('.seek-slider');
    const currentTime = root.querySelector('.time-current');
    const duration = root.querySelector('.time-duration');
    const playButton = root.querySelector('.music-play');
    const tracks = [];
    let active = -1;
    let seeking = false;
    const format = seconds => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';
    const setPlayIcon = playing => {
      playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      playButton.innerHTML = `<svg><use href="#i-${playing ? 'pause' : 'play'}"></use></svg>`;
    };
    const renderList = () => {
      list.replaceChildren();
      root.querySelector('.track-count').textContent = `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`;
      root.querySelector('.music-empty').hidden = tracks.length > 0;
      tracks.forEach((track, index) => {
        const row = document.createElement('button');
        row.className = `music-track ${index === active ? 'selected' : ''}`;
        row.innerHTML = '<span class="track-number"></span><span class="track-meta"><strong></strong><small>Audio file · on this device</small></span><span class="track-length"></span>';
        row.querySelector('.track-number').textContent = index === active && !audio.paused ? '♫' : String(index + 1).padStart(2, '0');
        row.querySelector('strong').textContent = track.name.replace(/\.[^.]+$/, '');
        row.querySelector('.track-length').textContent = format(track.duration);
        row.addEventListener('click', () => select(index, true));
        list.append(row);
      });
    };
    const select = (index, autoplay) => {
      if (!tracks.length) return;
      active = (index + tracks.length) % tracks.length;
      const track = tracks[active];
      audio.src = track.url;
      audio.volume = (window.NexusSystem?.getVolume() ?? 70) / 100;
      title.textContent = track.name.replace(/\.[^.]+$/, '');
      artist.textContent = track.file.type || 'Local audio file';
      currentTime.textContent = '0:00'; duration.textContent = format(track.duration);
      seek.value = '0';
      renderList();
      if (autoplay) audio.play().then(() => setPlayIcon(true)).catch(() => {
        setPlayIcon(false);
        window.Nexus.toast('The selected audio could not be played by this browser.');
      });
    };
    picker.addEventListener('change', () => {
      Array.from(picker.files || []).forEach(file => {
        if (!file.type.startsWith('audio/')) return;
        const url = URL.createObjectURL(file);
        objectUrls.push(url);
        tracks.push({ name: file.name, file, url, duration: 0 });
      });
      renderList();
      if (active < 0 && tracks.length) select(0, false);
      picker.value = '';
    });
    audio.addEventListener('loadedmetadata', () => {
      if (tracks[active]) tracks[active].duration = audio.duration;
      duration.textContent = format(audio.duration);
      renderList();
    });
    audio.addEventListener('timeupdate', () => {
      currentTime.textContent = format(audio.currentTime);
      if (!seeking && audio.duration) seek.value = String(Math.round(audio.currentTime / audio.duration * 1000));
    });
    audio.addEventListener('play', () => { setPlayIcon(true); renderList(); });
    audio.addEventListener('pause', () => { setPlayIcon(false); renderList(); });
    audio.addEventListener('ended', () => { if (tracks.length) select(active + 1, true); });
    playButton.addEventListener('click', () => {
      if (active < 0) { picker.click(); return; }
      if (audio.paused) audio.play().catch(() => window.Nexus.toast('Unable to play this track.'));
      else audio.pause();
    });
    root.querySelector('.music-prev').addEventListener('click', () => {
      if (active < 0) return;
      if (audio.currentTime > 3) audio.currentTime = 0;
      else select(active - 1, true);
    });
    root.querySelector('.music-next').addEventListener('click', () => { if (active >= 0) select(active + 1, true); });
    seek.addEventListener('input', () => { seeking = true; if (audio.duration) currentTime.textContent = format(Number(seek.value) / 1000 * audio.duration); });
    seek.addEventListener('change', () => { if (audio.duration) audio.currentTime = Number(seek.value) / 1000 * audio.duration; seeking = false; });
    root.querySelector('.music-volume input').addEventListener('input', event => {
      audio.volume = Number(event.target.value) / 100;
      window.NexusSystem?.setVolume(Number(event.target.value));
    });
    renderList();
    return root;
  }
  function close() {
    const app = document.querySelector('[data-window-id="music"]');
    app?.querySelector('audio')?.pause();
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
  }
  window.NexusMusic = {
    create,
    onClose: close,
    setVolume(value) {
      document.querySelectorAll('.music-app audio').forEach(audio => { audio.volume = Math.max(0, Math.min(100, value)) / 100; });
      document.querySelectorAll('.music-app .music-volume input').forEach(input => { input.value = String(value); });
    }
  };
})();
