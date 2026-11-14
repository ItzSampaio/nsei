(function () {
  'use strict';
  const HOME_URL = 'https://www.google.com';

  function create() {
    const root = document.createElement('div');
    root.className = 'browser-app';
    const desktopBrowser = Boolean(window.nexusDesktop && typeof window.nexusDesktop.openNativeBrowser === 'function');
    root.classList.toggle('browser-app-native', desktopBrowser);
    root.innerHTML = `
      <form class="browser-toolbar">
        <button type="button" class="browser-back" aria-label="Back">←</button>
        <button type="button" class="browser-forward" aria-label="Forward">→</button>
        <button type="button" class="browser-refresh" aria-label="Refresh"><svg><use href="#i-refresh"></use></svg></button>
        <div class="browser-address-wrap"><svg><use href="#i-lock"></use></svg><input class="browser-address" type="text" aria-label="Website address" placeholder="Search Google or enter a website address"></div>
        <button class="browser-go" type="submit">Go</button>
      </form>
      ${desktopBrowser
        ? `<div class="browser-desktop-card">
            <div class="browser-orb"><svg><use href="#i-browser"></use></svg></div>
            <p class="eyebrow">NEXUS DESKTOP BROWSER</p>
            <h2>Browse the web in a secure Chromium window</h2>
            <p>Websites run in an isolated browser surface, separate from the NEXUS OS interface. Tabs, bookmarks, history, and downloads are managed there.</p>
            <div class="browser-shortcuts"><button data-url="https://www.google.com" type="button">Google</button><button data-url="https://www.wikipedia.org" type="button">Wikipedia</button><button data-url="https://developer.mozilla.org" type="button">MDN Web Docs</button></div>
            <button type="button" class="browser-launch">Open NEXUS Browser</button>
          </div>`
        : `<div class="browser-tip"><strong>Some sites block embedded browsing.</strong> If a page does not load, use <button class="browser-external" type="button">Open in a new tab ↗</button>.</div>
          <div class="browser-frame-wrap"><div class="browser-welcome"><div class="browser-orb"><svg><use href="#i-browser"></use></svg></div><h2>Your window to the web</h2><p>Enter a website address above. Some sites may prevent display inside an embedded browser.</p><div class="browser-shortcuts"><button data-url="https://example.com" type="button">Example</button><button data-url="https://www.wikipedia.org" type="button">Wikipedia</button><button data-url="https://developer.mozilla.org" type="button">MDN Web Docs</button></div></div><iframe title="Web page" sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts" referrerpolicy="no-referrer" hidden></iframe></div>`}`;

    const form = root.querySelector('.browser-toolbar');
    const address = root.querySelector('.browser-address');
    let frame = root.querySelector('iframe');
    const back = root.querySelector('.browser-back');
    const forward = root.querySelector('.browser-forward');
    let currentUrl = '';
    const history = [];
    let position = -1;

    function normalize(value) {
      const raw = value.trim();
      if (!raw) return HOME_URL;
      if (/^https?:\/\//i.test(raw)) {
        try {
          const url = new URL(raw);
          return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
        } catch {
          return null;
        }
      }
      if (/^(localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(?:\/.*)?$/i.test(raw)) return `https://${raw}`;
      return `https://www.google.com/search?q=${encodeURIComponent(raw)}`;
    }

    function updateButtons() {
      back.disabled = position <= 0;
      forward.disabled = position >= history.length - 1;
    }

    function navigate(value, addHistory) {
      const url = normalize(value);
      if (!url) {
        window.Nexus.toast('Enter a valid website address or search query.');
        return;
      }
      address.value = url;
      currentUrl = url;
      if (addHistory) {
        history.splice(position + 1);
        history.push(url);
        position = history.length - 1;
      }
      updateButtons();
      if (desktopBrowser) {
        window.nexusDesktop.openNativeBrowser(url).catch(error => window.Nexus.toast(error.message));
        return;
      }
      root.querySelector('.browser-welcome').hidden = true;
      frame.hidden = false;
      frame.src = url;
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      navigate(address.value, true);
    });
    root.querySelector('.browser-launch')?.addEventListener('click', () => navigate(address.value || HOME_URL, false));
    back.addEventListener('click', () => {
      if (position <= 0) return;
      position -= 1;
      navigate(history[position], false);
      updateButtons();
    });
    forward.addEventListener('click', () => {
      if (position >= history.length - 1) return;
      position += 1;
      navigate(history[position], false);
      updateButtons();
    });
    root.querySelector('.browser-refresh').addEventListener('click', () => {
      if (desktopBrowser) {
        if (currentUrl) navigate(currentUrl, false);
      } else if (currentUrl) {
        frame.src = currentUrl;
      }
    });
    root.querySelector('.browser-external')?.addEventListener('click', () => {
      if (!currentUrl) return;
      if (window.nexusDesktop && typeof window.nexusDesktop.openExternalBrowser === 'function') {
        window.nexusDesktop.openExternalBrowser(currentUrl).catch(error => window.Nexus.toast(error.message));
        return;
      }
      window.open(currentUrl, '_blank', 'noopener,noreferrer');
    });
    root.querySelectorAll('.browser-shortcuts button').forEach(button => {
      button.addEventListener('click', () => {
        address.value = button.dataset.url;
        navigate(button.dataset.url, true);
      });
    });
    updateButtons();
    return root;
  }

  window.NexusBrowser = { create };
})();
