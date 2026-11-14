(function () {
  'use strict';
  function notifyChange(type) {
    window.dispatchEvent(new CustomEvent(`nexus-${type}-change`));
  }
  function trash(type, item) {
    const bin = window.NexusStorage.getRecycleBin();
    bin.push({ id: `trash-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type, item, deletedAt: Date.now() });
    window.NexusStorage.saveRecycleBin(bin);
    notifyChange('recycle');
  }
  function create() {
    const root = document.createElement('div');
    root.className = 'recycle-app';
    root.innerHTML = '<header class="recycle-header"><div><p class="eyebrow">RECOVER BEFORE YOU EMPTY</p><h2>Recycle Bin</h2></div><button class="recycle-empty">Empty bin</button></header><div class="recycle-list"></div><div class="recycle-empty-state" hidden><div class="recycle-icon">↻</div><strong>Nothing in the bin</strong><span>Deleted notes and tasks will appear here.</span></div>';
    const list = root.querySelector('.recycle-list');
    function render() {
      const items = window.NexusStorage.getRecycleBin();
      list.replaceChildren();
      root.querySelector('.recycle-empty-state').hidden = items.length > 0;
      root.querySelector('.recycle-empty').disabled = items.length === 0;
      items.slice().reverse().forEach(entry => {
        const row = document.createElement('article');
        row.className = 'recycle-row';
        const info = document.createElement('div'); info.className = 'recycle-info';
        const title = document.createElement('strong'); title.textContent = entry.item.title || 'Untitled note';
        const meta = document.createElement('span'); meta.textContent = `${entry.type === 'note' ? 'Note' : 'Task'} · deleted ${new Date(entry.deletedAt).toLocaleString()}`;
        info.append(title, meta);
        const restore = document.createElement('button'); restore.type = 'button'; restore.textContent = 'Restore';
        restore.addEventListener('click', () => {
          const bin = window.NexusStorage.getRecycleBin().filter(item => item.id !== entry.id);
          if (entry.type === 'note') {
            const notes = window.NexusStorage.getNotes();
            notes.unshift(entry.item); window.NexusStorage.saveNotes(notes);
            notifyChange('notes');
          } else if (entry.type === 'task') {
            const tasks = window.NexusStorage.getTasks();
            tasks.unshift(entry.item); window.NexusStorage.saveTasks(tasks);
            notifyChange('tasks');
          }
          window.NexusStorage.saveRecycleBin(bin); notifyChange('recycle'); render(); window.Nexus.toast('Item restored.');
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'recycle-delete'; remove.textContent = 'Delete forever';
        remove.addEventListener('click', () => {
          window.NexusStorage.saveRecycleBin(window.NexusStorage.getRecycleBin().filter(item => item.id !== entry.id));
          notifyChange('recycle');
          render();
        });
        row.append(info, restore, remove); list.append(row);
      });
    }
    root.querySelector('.recycle-empty').addEventListener('click', () => {
      if (!window.confirm('Permanently delete all items in the Recycle Bin?')) return;
      window.NexusStorage.saveRecycleBin([]);
      notifyChange('recycle');
      render();
    });
    const refresh = () => render();
    window.addEventListener('nexus-recycle-change', refresh);
    root._nexusCleanup = () => window.removeEventListener('nexus-recycle-change', refresh);
    render();
    return root;
  }
  window.NexusRecycle = { create, trash };
})();
