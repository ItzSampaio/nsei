(function () {
  'use strict';
  function create() {
    const root = document.createElement('div');
    root.className = 'gallery-app';
    root.innerHTML = `<header class="gallery-header"><div><p class="eyebrow">YOUR LOCAL LIBRARY</p><h2>Photo Gallery</h2></div><label class="file-picker-button"><svg><use href="#i-plus"></use></svg> Import photos<input class="gallery-input" type="file" accept="image/*" multiple></label></header><div class="gallery-toolbar"><label class="gallery-search"><svg><use href="#i-search"></use></svg><input type="search" placeholder="Search your photos..." aria-label="Search photos"></label><select class="gallery-filter" aria-label="Filter photos"><option value="all">All images</option><option value="recent">Recently added</option></select><span class="gallery-count">Loading library...</span></div><div class="gallery-grid"></div><div class="gallery-empty" hidden><div class="gallery-empty-art">✳</div><strong>Your gallery starts here</strong><span>Import photos to create a private library stored in this browser.</span></div><div class="photo-viewer" hidden role="dialog" aria-modal="true" aria-label="Photo viewer"><button class="viewer-close" aria-label="Close photo viewer">×</button><button class="viewer-prev" aria-label="Previous photo">←</button><img alt=""><button class="viewer-next" aria-label="Next photo">→</button><div class="viewer-caption"></div></div>`;
    const input = root.querySelector('.gallery-input');
    const grid = root.querySelector('.gallery-grid');
    const search = root.querySelector('.gallery-search input');
    const filter = root.querySelector('.gallery-filter');
    const viewer = root.querySelector('.photo-viewer');
    const viewerImage = viewer.querySelector('img');
    const viewerCaption = viewer.querySelector('.viewer-caption');
    const urls = new Map();
    let photos = [];
    let selected = 0;
    let closed = false;
    const photoUrl = photo => {
      if (!urls.has(photo.id)) urls.set(photo.id, URL.createObjectURL(photo.blob));
      return urls.get(photo.id);
    };
    const render = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const visible = photos.filter(photo => photo.name.toLocaleLowerCase().includes(query));
      if (filter.value === 'recent') visible.sort((a, b) => b.createdAt - a.createdAt);
      root.querySelector('.gallery-count').textContent = `${visible.length} ${visible.length === 1 ? 'photo' : 'photos'}`;
      grid.replaceChildren();
      root.querySelector('.gallery-empty').hidden = visible.length > 0;
      grid.hidden = visible.length === 0;
      visible.forEach(photo => {
        const card = document.createElement('article');
        card.className = 'photo-card';
        const image = document.createElement('img');
        image.src = photoUrl(photo); image.alt = photo.name; image.loading = 'lazy';
        image.addEventListener('click', () => showPhoto(photos.indexOf(photo)));
        const footer = document.createElement('div'); footer.className = 'photo-card-footer';
        const name = document.createElement('span'); name.textContent = photo.name;
        const remove = document.createElement('button'); remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${photo.name}`); remove.textContent = '×';
        remove.addEventListener('click', async () => {
          try {
            await window.NexusStorage.deleteGalleryPhoto(photo.id);
            const url = urls.get(photo.id);
            if (url) URL.revokeObjectURL(url);
            urls.delete(photo.id);
            photos = photos.filter(item => item.id !== photo.id);
            render();
            window.Nexus.toast('Photo removed from your gallery.');
          } catch (error) {
            window.Nexus.toast(`Could not remove ${photo.name}: ${error.message}`);
          }
        });
        footer.append(name, remove); card.append(image, footer); grid.append(card);
      });
    };
    function showPhoto(index) {
      if (!photos.length) return;
      selected = (index + photos.length) % photos.length;
      viewerImage.src = photoUrl(photos[selected]);
      viewerImage.alt = photos[selected].name;
      viewerCaption.textContent = `${photos[selected].name} · ${selected + 1} of ${photos.length}`;
      viewer.hidden = false;
      viewer.querySelector('.viewer-close').focus();
    }
    const closeViewer = () => { viewer.hidden = true; };
    viewer.querySelector('.viewer-close').addEventListener('click', closeViewer);
    viewer.querySelector('.viewer-prev').addEventListener('click', () => showPhoto(selected - 1));
    viewer.querySelector('.viewer-next').addEventListener('click', () => showPhoto(selected + 1));
    viewer.addEventListener('click', event => { if (event.target === viewer) closeViewer(); });
    root.addEventListener('keydown', event => {
      if (viewer.hidden) return;
      if (event.key === 'Escape') closeViewer();
      if (event.key === 'ArrowLeft') showPhoto(selected - 1);
      if (event.key === 'ArrowRight') showPhoto(selected + 1);
    });
    search.addEventListener('input', render);
    filter.addEventListener('change', render);
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []).filter(file => file.type.startsWith('image/'));
      let imported = 0;
      for (const file of files) {
        const photo = { id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, type: file.type, createdAt: Date.now(), blob: file };
        try {
          await window.NexusStorage.saveGalleryPhoto(photo);
          photos.push(photo);
          imported += 1;
        } catch {
          window.Nexus.toast(`Could not import ${file.name}. Check available browser storage.`);
        }
      }
      input.value = '';
      render();
      if (imported) window.NexusSystem.notify('Photo Gallery', `${imported} photo${imported === 1 ? '' : 's'} imported locally.`);
    });
    window.NexusStorage.getGalleryPhotos().then(saved => {
      if (closed) return;
      photos = saved.sort((a, b) => b.createdAt - a.createdAt);
      render();
    }).catch(() => {
      root.querySelector('.gallery-count').textContent = 'Local photo storage unavailable';
      window.Nexus.toast('Could not load the local photo library.');
    });
    root._nexusCleanup = () => {
      closed = true;
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    };
    return root;
  }
  window.NexusGallery = { create };
})();
