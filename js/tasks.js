(function () {
  'use strict';
  const priorities = ['Low', 'Normal', 'High', 'Urgent'];
  function create() {
    const root = document.createElement('div');
    root.className = 'tasks-app';
    root.innerHTML = '<header class="tasks-header"><div><p class="eyebrow">YOUR FOCUS, IN ONE PLACE</p><h2>Task Manager</h2></div><div class="task-summary"></div></header><form class="task-form"><input class="task-name" maxlength="120" placeholder="What needs to get done?" aria-label="Task title" required><select class="task-priority" aria-label="Task priority"><option>Normal</option><option>Low</option><option>High</option><option>Urgent</option></select><button type="submit">Add task</button></form><div class="task-filters"><button class="selected" data-filter="all">All</button><button data-filter="active">Active</button><button data-filter="completed">Completed</button><select aria-label="Filter by priority"><option value="all">All priorities</option><option>Urgent</option><option>High</option><option>Normal</option><option>Low</option></select></div><div class="task-list"></div><div class="task-empty" hidden>No tasks here. Add a task above to get started.</div>';
    let tasks = window.NexusStorage.getTasks();
    let stateFilter = 'all';
    let priorityFilter = 'all';
    const list = root.querySelector('.task-list');
    function render() {
      list.replaceChildren();
      const visible = tasks.filter(task => (stateFilter === 'all' || (stateFilter === 'completed') === task.completed) && (priorityFilter === 'all' || task.priority === priorityFilter));
      root.querySelector('.task-empty').hidden = visible.length > 0;
      root.querySelector('.task-summary').textContent = `${tasks.filter(task => !task.completed).length} remaining`;
      visible.forEach(task => {
        const row = document.createElement('article');
        row.className = `task-row ${task.completed ? 'completed' : ''} priority-${task.priority.toLowerCase()}`;
        const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.completed;
        check.setAttribute('aria-label', `Mark ${task.title} ${task.completed ? 'active' : 'complete'}`);
        check.addEventListener('change', () => {
          task.completed = check.checked; task.updatedAt = Date.now();
          window.NexusStorage.saveTasks(tasks); render();
        });
        const title = document.createElement('span'); title.className = 'task-title'; title.textContent = task.title;
        const priority = document.createElement('select'); priority.className = 'task-row-priority'; priority.setAttribute('aria-label', `Priority for ${task.title}`);
        priorities.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; priority.append(option); });
        priority.value = priorities.includes(task.priority) ? task.priority : 'Normal';
        priority.addEventListener('change', () => {
          task.priority = priority.value; task.updatedAt = Date.now(); window.NexusStorage.saveTasks(tasks); render();
        });
        const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'task-edit'; edit.textContent = 'Edit'; edit.setAttribute('aria-label', `Edit ${task.title}`);
        edit.addEventListener('click', () => {
          const updated = window.prompt('Edit task', task.title);
          if (updated === null) return;
          if (!updated.trim()) { window.Nexus.toast('A task needs a title.'); return; }
          task.title = updated.trim().slice(0, 120); task.updatedAt = Date.now(); window.NexusStorage.saveTasks(tasks); render();
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'task-delete'; remove.textContent = '×'; remove.setAttribute('aria-label', `Delete ${task.title}`);
        remove.addEventListener('click', () => {
          window.NexusRecycle.trash('task', task);
          tasks = tasks.filter(item => item.id !== task.id);
          window.NexusStorage.saveTasks(tasks); render();
          window.Nexus.toast('Task moved to Recycle Bin.');
        });
        row.append(check, title, priority, edit, remove); list.append(row);
      });
    }
    root.querySelector('.task-form').addEventListener('submit', event => {
      event.preventDefault();
      const input = root.querySelector('.task-name');
      const title = input.value.trim();
      if (!title) return;
      tasks.unshift({ id: `task-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, title, priority: root.querySelector('.task-priority').value, completed: false, createdAt: Date.now(), updatedAt: Date.now() });
      window.NexusStorage.saveTasks(tasks); input.value = ''; input.focus(); render();
    });
    root.querySelectorAll('.task-filters button').forEach(button => button.addEventListener('click', () => {
      stateFilter = button.dataset.filter;
      root.querySelectorAll('.task-filters button').forEach(item => item.classList.toggle('selected', item === button));
      render();
    }));
    root.querySelector('.task-filters select').addEventListener('change', event => { priorityFilter = event.target.value; render(); });
    const refresh = () => { tasks = window.NexusStorage.getTasks(); render(); };
    window.addEventListener('nexus-tasks-change', refresh);
    root._nexusCleanup = () => window.removeEventListener('nexus-tasks-change', refresh);
    render();
    return root;
  }
  window.NexusTasks = { create };
})();
