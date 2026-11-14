(function () {
  'use strict';
  const places = [
    { zone: 'Pacific/Honolulu', city: 'Honolulu', region: 'Hawaii, USA' },
    { zone: 'America/Los_Angeles', city: 'Los Angeles', region: 'Pacific, USA' },
    { zone: 'America/Denver', city: 'Denver', region: 'Mountain, USA' },
    { zone: 'America/Chicago', city: 'Chicago', region: 'Central, USA' },
    { zone: 'America/New_York', city: 'New York', region: 'Eastern, USA' },
    { zone: 'America/Sao_Paulo', city: 'São Paulo', region: 'Brazil' },
    { zone: 'Europe/London', city: 'London', region: 'United Kingdom' },
    { zone: 'Europe/Paris', city: 'Paris', region: 'France' },
    { zone: 'Europe/Istanbul', city: 'Istanbul', region: 'Türkiye' },
    { zone: 'Africa/Cairo', city: 'Cairo', region: 'Egypt' },
    { zone: 'Asia/Dubai', city: 'Dubai', region: 'United Arab Emirates' },
    { zone: 'Asia/Kolkata', city: 'Mumbai', region: 'India' },
    { zone: 'Asia/Bangkok', city: 'Bangkok', region: 'Thailand' },
    { zone: 'Asia/Singapore', city: 'Singapore', region: 'Singapore' },
    { zone: 'Asia/Shanghai', city: 'Shanghai', region: 'China' },
    { zone: 'Asia/Tokyo', city: 'Tokyo', region: 'Japan' },
    { zone: 'Australia/Sydney', city: 'Sydney', region: 'Australia' },
    { zone: 'Pacific/Auckland', city: 'Auckland', region: 'New Zealand' }
  ];
  function create() {
    const root = document.createElement('div');
    root.className = 'world-clock-app';
    root.innerHTML = '<header class="world-header"><div><p class="eyebrow">TIME WITHOUT BORDERS</p><h2>World Clock</h2></div><div class="world-local"><span>Your local time</span><strong></strong><small></small></div></header><form class="world-add"><select aria-label="Choose a city"></select><button type="submit">Add city</button></form><div class="world-city-list"></div>';
    const select = root.querySelector('select');
    const list = root.querySelector('.world-city-list');
    const localClock = root.querySelector('.world-local strong');
    const localDate = root.querySelector('.world-local small');
    const citySelect = root.querySelector('.world-add select');
    let cities = window.NexusApps.getSetting('worldCities') || ['America/New_York','Europe/London','Asia/Tokyo','Australia/Sydney'];
    places.forEach(place => {
      const option = document.createElement('option');
      option.value = place.zone; option.textContent = `${place.city} · ${place.region}`; select.append(option);
    });
    function update() {
      const now = new Date();
      localClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      localDate.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      list.replaceChildren();
      cities.forEach(zone => {
        const place = places.find(item => item.zone === zone);
        if (!place) return;
        const card = document.createElement('article');
        card.className = 'world-city-card';
        const details = document.createElement('div');
        details.innerHTML = '<strong></strong><span></span>';
        details.querySelector('strong').textContent = place.city;
        details.querySelector('span').textContent = `${place.region} · ${new Intl.DateTimeFormat([], { timeZone: zone, timeZoneName: 'short' }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || zone}`;
        const time = document.createElement('time');
        time.textContent = now.toLocaleTimeString([], { timeZone: zone, hour: '2-digit', minute: '2-digit' });
        time.dateTime = now.toISOString();
        const day = document.createElement('small');
        day.textContent = now.toLocaleDateString([], { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric' });
        const remove = document.createElement('button');
        remove.type = 'button'; remove.setAttribute('aria-label', `Remove ${place.city}`); remove.textContent = '×';
        remove.addEventListener('click', () => {
          cities = cities.filter(item => item !== zone);
          window.NexusApps.updateSetting('worldCities', cities);
          update();
        });
        card.append(details, time, day, remove); list.append(card);
      });
    }
    root.querySelector('.world-add').addEventListener('submit', event => {
      event.preventDefault();
      if (cities.includes(select.value)) { window.Nexus.toast('That city is already on your clock.'); return; }
      cities = [...cities, select.value];
      window.NexusApps.updateSetting('worldCities', cities);
      update();
    });
    update();
    const timer = window.setInterval(update, 1000);
    root._nexusCleanup = () => window.clearInterval(timer);
    return root;
  }
  window.NexusWorldClock = { create };
})();
