(function () {
  'use strict';
  const categoryLabels = {
    settings: 'Settings and personalization',
    notes: 'Notes',
    events: 'Calendar events',
    tasks: 'Tasks',
    recycle: 'Recycle Bin',
    notifications: 'Notification history',
    apps: 'Installed application registry',
    widgets: 'Desktop widgets',
    layouts: 'Saved window layouts',
    wallpapers: 'Imported wallpapers'
  };
  const maxBackupBytes = 20 * 1024 * 1024;
  const arrayCategories = new Set(['notes','events','tasks','recycle','notifications','widgets','layouts','wallpapers']);
  const allowedCategories = new Set([...Object.keys(categoryLabels)]);

  function download(snapshot, prefix = 'nexus-backup') {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function validate(raw) {
    if (!raw || typeof raw !== 'object' || raw.format !== 'nexus-os-backup' || raw.version !== 1 || !raw.categories || typeof raw.categories !== 'object' || Array.isArray(raw.categories)) {
      throw new Error('This is not a supported NEXUS OS backup.');
    }
    const categories = {};
    for (const [name, value] of Object.entries(raw.categories)) {
      if (!allowedCategories.has(name)) throw new Error(`Unknown backup category: ${name}.`);
      if (arrayCategories.has(name) && (!Array.isArray(value) || value.length > 20000)) throw new Error(`The ${name} backup section is invalid or too large.`);
      if (name === 'settings' && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error('The settings section is invalid.');
      if (name === 'apps' && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error('The app registry section is invalid.');
      if (name === 'settings') {
        const cleaned = { ...value };
        delete cleaned.pin;
        delete cleaned.profileImage;
        if (cleaned.accent !== undefined && !['violet','blue','cyan','rose','amber','custom'].includes(cleaned.accent)) throw new Error('The backup contains an invalid accent setting.');
        if (cleaned.theme !== undefined && !['dark','light'].includes(cleaned.theme)) throw new Error('The backup contains an invalid theme setting.');
        if (cleaned.wallpaper !== undefined && typeof cleaned.wallpaper !== 'string') throw new Error('The backup contains an invalid wallpaper setting.');
        categories[name] = cleaned;
      } else if (name === 'wallpapers') {
        categories[name] = value.map(item => {
          if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' ||
              !['image','video'].includes(item.kind) || typeof item.data !== 'string' ||
              !/^data:(image\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+);base64,/i.test(item.data) ||
              item.data.length > 3 * 1024 * 1024) throw new Error('A custom wallpaper entry is invalid or too large.');
          return { id:item.id.slice(0,100), name:item.name.slice(0,60), kind:item.kind, type:String(item.type || '').slice(0,80), data:item.data };
        });
      } else {
        categories[name] = value;
      }
    }
    return { format: 'nexus-os-backup', version: 1, createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '', categories };
  }
  function create() {
    const root = document.createElement('div');
    root.className = 'nexus-recovery';
    root.innerHTML = `
      <header class="recovery-header"><p class="eyebrow">LOCAL DATA PROTECTION</p><h2>NEXUS Recovery</h2><p>Create a portable backup or restore selected categories. Imported data is validated before it is applied.</p></header>
      <section class="recovery-card"><div><h3>Create backup</h3><p>Passwords, lock PIN, profile photos, and browser cookies are not included. Imported wallpaper files may be included.</p></div><button type="button" class="recovery-export">Export all supported data</button></section>
      <section class="recovery-card recovery-import-card"><div><h3>Import backup</h3><p>Select a NEXUS JSON backup up to 20 MB to inspect its contents.</p></div><label class="profile-photo-picker">Choose backup<input type="file" class="recovery-file" accept=".json,application/json"></label></section>
      <section class="recovery-preview" hidden><div class="recovery-preview-heading"><div><h3>Backup contents</h3><p class="recovery-backup-meta"></p></div><button type="button" class="recovery-discard">Discard</button></div><div class="recovery-category-list"></div><button type="button" class="recovery-restore" disabled>Restore selected categories</button></section>
      <p class="recovery-status" role="status" aria-live="polite"></p>`;
    const fileInput = root.querySelector('.recovery-file');
    const preview = root.querySelector('.recovery-preview');
    const status = root.querySelector('.recovery-status');
    let importedBackup = null;
    let safetySnapshot = null;
    const setStatus = (message, error = false) => {
      status.textContent = message;
      status.classList.toggle('is-error', error);
    };
    const clearPreview = () => {
      importedBackup = null;
      preview.hidden = true;
      root.querySelector('.recovery-category-list').replaceChildren();
      root.querySelector('.recovery-restore').disabled = true;
      setStatus('');
    };
    const showPreview = backup => {
      importedBackup = backup;
      const categories = root.querySelector('.recovery-category-list');
      categories.replaceChildren();
      const entries = Object.entries(backup.categories);
      entries.forEach(([name, value]) => {
        const label = document.createElement('label');
        label.className = 'recovery-category';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.category = name;
        const title = document.createElement('span');
        title.textContent = categoryLabels[name];
        const meta = document.createElement('small');
        meta.textContent = Array.isArray(value) ? `${value.length} item${value.length === 1 ? '' : 's'}` : 'Available';
        label.append(checkbox, title, meta);
        categories.append(label);
      });
      root.querySelector('.recovery-backup-meta').textContent = `Created ${backup.createdAt ? new Date(backup.createdAt).toLocaleString() : 'unknown date'} · ${entries.length} supported categories`;
      preview.hidden = false;
      root.querySelector('.recovery-restore').disabled = entries.length === 0;
      setStatus('Backup validated. Choose what to restore.');
    };
    root.querySelector('.recovery-export').addEventListener('click', () => {
      try {
        const backup = window.NexusStorage.exportSnapshot();
        download(backup);
        setStatus('Backup export started.');
      } catch (error) {
        setStatus(`Could not create backup: ${error.message}`, true);
      }
    });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      if (file.size > maxBackupBytes) {
        setStatus('Backup is too large. Maximum supported size is 20 MB.', true);
        return;
      }
      try {
        const contents = await file.text();
        showPreview(validate(JSON.parse(contents)));
      } catch (error) {
        setStatus(`Backup could not be imported: ${error.message}`, true);
      }
    });
    root.querySelector('.recovery-discard').addEventListener('click', clearPreview);
    root.querySelector('.recovery-restore').addEventListener('click', () => {
      if (!importedBackup) return;
      const selected = [...root.querySelectorAll('.recovery-category input:checked')].map(input => input.dataset.category);
      if (!selected.length) { setStatus('Select at least one category to restore.', true); return; }
      const categories = Object.fromEntries(selected.map(name => [name, importedBackup.categories[name]]));
      const categoryNames = selected.map(name => categoryLabels[name]).join(', ');
      if (!window.confirm(`Restore ${categoryNames}?\n\nNEXUS will download a safety backup of the current data first.`)) return;
      try {
        safetySnapshot = window.NexusStorage.exportSnapshot();
        download(safetySnapshot, 'nexus-safety-backup');
        window.NexusStorage.restoreSnapshot(categories);
        window.NexusApps.refreshAfterRestore?.();
        window.NexusWidgets.refresh?.();
        window.NexusWallpaper.updatePlayback();
        setStatus('Selected data restored. A safety backup download was also started.');
      } catch (error) {
        setStatus(`Restore failed: ${error.message}${safetySnapshot ? ' A safety backup was prepared before restoring.' : ''}`, true);
      }
    });
    return root;
  }
  window.NexusRecovery = Object.freeze({ create, validate, download });
})();
