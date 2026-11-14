(function () {
  'use strict';
  const banner = [
    ' _   _ _____  _______ _   _ ____',
    '| \\ | | ____|/ / ____| | | / ___|',
    '|  \\| |  _| / /|  _| | | | \\___ \\',
    '| |\\  | |__ / / | |___| |_| |___) |',
    '|_| \\_|_____/_/ |_____|\\___/|____/',
    '',
    'Welcome to NEXUS Terminal. Type "help" to see available commands.'
  ].join('\n');
  let output;
  let form;
  let input;
  function currentUser() {
    const name = window.NexusApps?.getSetting('username') || 'Guest';
    return String(name).trim().toLowerCase().replace(/\s+/g, '-') || 'guest';
  }
  function line(text, className = '') {
    const row = document.createElement('div');
    row.className = `terminal-line ${className}`.trim();
    row.textContent = text;
    output.append(row);
    output.scrollTop = output.scrollHeight;
  }
  function run(raw) {
    const value = raw.trim();
    if (!value) return;
    line(`${currentUser()}@nexus:~$ ${value}`, 'command');
    const command = value.toLowerCase().split(/\s+/)[0];
    const handlers = {
      help: () => line([
        'Available commands:',
        '  help      Show this command list',
        '  about     Learn about NEXUS OS',
        '  date      Show the current date and time',
        '  whoami    Display the current user',
        '  neofetch  Show system information',
        '  clear     Clear the terminal'
      ].join('\n')),
      about: () => line('NEXUS OS 3.0.0 (ULTIMATE EDITION)\nA browser-based desktop environment built with HTML, CSS, and vanilla JavaScript.', 'success'),
      date: () => line(new Date().toString()),
      whoami: () => line(currentUser()),
      neofetch: () => line([
        `       .---.       ${currentUser()}@nexus`,
        '      /     \\      ----------------',
        '     |  N X  |     OS: NEXUS OS 3.0.0',
        '      \\     /      Browser: ' + navigator.userAgent.split(') ')[0].split(' (')[0],
        '       `---`       Shell: NEXUS Terminal',
        '                    Theme: ' + (window.NexusStorage.getSettings().theme || 'dark')
      ].join('\n'), 'success'),
      clear: () => output.replaceChildren()
    };
    if (handlers[command]) handlers[command]();
    else line(`Command not found: ${command}. Type "help" for available commands.`, 'error');
  }
  window.NexusTerminal = {
    mount(root) {
      output = root.querySelector('.terminal-output');
      form = root.querySelector('.terminal-form');
      input = root.querySelector('input');
      root.querySelector('.terminal-form span').textContent = `${currentUser()}@nexus:~$`;
      line(banner, 'success');
      form.addEventListener('submit', event => { event.preventDefault(); run(input.value); input.value = ''; input.focus(); });
      root.addEventListener('pointerdown', event => { if (!event.target.closest('button')) input.focus(); });
      input.focus();
    },
    unmount() { output = null; form = null; input = null; }
  };
})();
