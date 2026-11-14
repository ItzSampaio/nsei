(function () {
  'use strict';
  function create() {
    const root = document.createElement('div');
    root.className = 'calendar-app';
    root.innerHTML = '<header class="calendar-header"><div><p class="eyebrow">YOUR SCHEDULE</p><h2>Calendar</h2></div><div class="calendar-nav"><button class="month-prev" aria-label="Previous month">←</button><strong></strong><button class="month-next" aria-label="Next month">→</button></div></header><div class="calendar-grid"></div><section class="calendar-events"><div class="events-heading"><h3></h3><span></span></div><form class="event-form"><input class="event-title" maxlength="80" placeholder="Add an event..." aria-label="New event title" required><button type="submit">Add</button></form><div class="event-list"></div></section>';
    const now = new Date();
    let shownYear = now.getFullYear();
    let shownMonth = now.getMonth();
    let selectedDate = dateKey(now);
    let events = window.NexusStorage.getEvents();
    const grid = root.querySelector('.calendar-grid');
    const monthTitle = root.querySelector('.calendar-nav strong');
    const selectedTitle = root.querySelector('.events-heading h3');
    const eventCount = root.querySelector('.events-heading span');
    const eventList = root.querySelector('.event-list');
    function dateKey(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    function renderEvents() {
      const selected = new Date(`${selectedDate}T12:00:00`);
      selectedTitle.textContent = selected.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      const matching = events.filter(event => event.date === selectedDate);
      eventCount.textContent = `${matching.length} ${matching.length === 1 ? 'event' : 'events'}`;
      eventList.replaceChildren();
      if (!matching.length) {
        const empty = document.createElement('p'); empty.className = 'calendar-empty'; empty.textContent = 'Nothing planned. Add an event for this day.'; eventList.append(empty); return;
      }
      matching.forEach(event => {
        const row = document.createElement('div'); row.className = 'calendar-event';
        const name = document.createElement('span'); name.textContent = event.title;
        const remove = document.createElement('button'); remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${event.title}`); remove.textContent = '×';
        remove.addEventListener('click', () => {
          events = events.filter(item => item.id !== event.id);
          window.NexusStorage.saveEvents(events); render(); window.Nexus.toast('Event deleted.');
        });
        row.append(name, remove); eventList.append(row);
      });
    }
    function render() {
      monthTitle.textContent = new Date(shownYear, shownMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
      grid.replaceChildren();
      ['S','M','T','W','T','F','S'].forEach(day => {
        const label = document.createElement('span'); label.className = 'calendar-weekday'; label.textContent = day; grid.append(label);
      });
      const firstDay = new Date(shownYear, shownMonth, 1).getDay();
      const daysInMonth = new Date(shownYear, shownMonth + 1, 0).getDate();
      const today = dateKey(new Date());
      for (let index = 0; index < firstDay; index++) {
        const spacer = document.createElement('span'); spacer.className = 'calendar-spacer'; grid.append(spacer);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const key = dateKey(new Date(shownYear, shownMonth, day));
        const button = document.createElement('button');
        button.className = `calendar-day${key === selectedDate ? ' selected' : ''}${key === today ? ' today' : ''}${events.some(event => event.date === key) ? ' has-event' : ''}`;
        button.textContent = String(day);
        button.setAttribute('aria-label', new Date(shownYear, shownMonth, day).toLocaleDateString());
        button.addEventListener('click', () => { selectedDate = key; render(); });
        grid.append(button);
      }
      renderEvents();
    }
    root.querySelector('.month-prev').addEventListener('click', () => {
      shownMonth -= 1;
      if (shownMonth < 0) { shownMonth = 11; shownYear -= 1; }
      selectedDate = dateKey(new Date(shownYear, shownMonth, 1));
      render();
    });
    root.querySelector('.month-next').addEventListener('click', () => {
      shownMonth += 1;
      if (shownMonth > 11) { shownMonth = 0; shownYear += 1; }
      selectedDate = dateKey(new Date(shownYear, shownMonth, 1));
      render();
    });
    root.querySelector('.event-form').addEventListener('submit', event => {
      event.preventDefault();
      const input = root.querySelector('.event-title');
      const title = input.value.trim();
      if (!title) return;
      events.push({ id: `event-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, date: selectedDate, title });
      window.NexusStorage.saveEvents(events); input.value = ''; render(); window.Nexus.toast('Event added to your calendar.');
    });
    render();
    return root;
  }
  window.NexusCalendar = { create };
})();
