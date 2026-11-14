(function () {
  'use strict';
  const apps = [
    { id: 'terminal', name: 'Terminal', icon: 'terminal', description: 'Command line' },
    { id: 'explorer', name: 'File Explorer', icon: 'folder', description: 'Browse files' },
    { id: 'calculator', name: 'Calculator', icon: 'calc', description: 'Quick calculations' },
    { id: 'notes', name: 'Notes', icon: 'note', description: 'Your ideas' },
    { id: 'settings', name: 'Settings', icon: 'settings', description: 'Personalize NEXUS' },
    { id: 'about', name: 'About NEXUS', icon: 'info', description: 'System information' },
    { id: 'music', name: 'Music Player', icon: 'music', description: 'Play local audio' },
    { id: 'browser', name: 'Web Browser', icon: 'browser', description: 'Explore the web' },
    { id: 'monitor', name: 'System Monitor', icon: 'monitor', description: 'Live system telemetry' },
    { id: 'games', name: 'Games', icon: 'games', description: 'Play a quick game' },
    { id: 'calendar', name: 'Calendar', icon: 'calendar', description: 'Your events' },
    { id: 'gallery', name: 'Photo Gallery', icon: 'gallery', description: 'Browse local photos' },
    { id: 'paint', name: 'Paint Studio', icon: 'paint', description: 'Draw and create' },
    { id: 'time', name: 'Stopwatch & Timer', icon: 'time', description: 'Keep track of time' },
    { id: 'worldclock', name: 'World Clock', icon: 'worldclock', description: 'Time around the world' },
    { id: 'password', name: 'Password Generator', icon: 'password', description: 'Generate secure passwords' },
    { id: 'tasks', name: 'Task Manager', icon: 'tasks', description: 'Organize your work' },
    { id: 'recycle', name: 'Recycle Bin', icon: 'recycle', description: 'Restore deleted notes and tasks' }
  ];
  const accentColors = { violet: ['#9c7cff', '156, 124, 255'], blue: ['#58a6ff', '88, 166, 255'], cyan: ['#49d6d1', '73, 214, 209'], rose: ['#ff75a0', '255, 117, 160'], amber: ['#f2b95f', '242, 185, 95'] };
  const wallpapers = {
    nexus: "url('assets/wallpapers/nexus.svg')",
    aurora: 'radial-gradient(ellipse at 70% 22%,#39d8c566,transparent 35%),linear-gradient(145deg,#06151f,#174c61 45%,#22133f 78%,#090b17)',
    dusk: 'radial-gradient(ellipse at 70% 30%,#e9898066,transparent 38%),linear-gradient(145deg,#25113c,#602c68 45%,#19385b 100%)',
    midnight: 'radial-gradient(ellipse at 74% 27%,#465e9c55,transparent 36%),linear-gradient(145deg,#050811,#111a32 55%,#111326)',
    ocean: 'radial-gradient(ellipse at 68% 32%,#25c8dc66,transparent 38%),linear-gradient(145deg,#061b30,#103c62 55%,#071324)',
    ember: 'radial-gradient(ellipse at 68% 28%,#ff8b4666,transparent 38%),linear-gradient(145deg,#201025,#582642 52%,#11142a)',
    nebula: 'radial-gradient(ellipse at 25% 35%,#ed78d466,transparent 30%),radial-gradient(ellipse at 76% 65%,#5378ec77,transparent 38%),linear-gradient(145deg,#10102d,#1b1438 48%,#071825)',
    glacier: 'radial-gradient(ellipse at 65% 18%,#99f1f266,transparent 35%),radial-gradient(ellipse at 20% 85%,#3679ce66,transparent 40%),linear-gradient(145deg,#071723,#0f344d 55%,#111832)',
    prism: 'radial-gradient(ellipse at 80% 28%,#f3a5db55,transparent 30%),radial-gradient(ellipse at 35% 78%,#66d8d766,transparent 38%),linear-gradient(145deg,#111629,#241d43 55%,#0a1a2c)',
    solar: 'radial-gradient(ellipse at 70% 22%,#ffcf6d66,transparent 35%),radial-gradient(ellipse at 30% 78%,#ef6e8055,transparent 40%),linear-gradient(145deg,#241322,#4b273e 52%,#13152b)'
  };
  let currentSettings = window.NexusStorage.getSettings();
  let explorerPath = ['Home'];
  let explorerSelectedFile = null;
  let notes = window.NexusStorage.getNotes();
  let activeNoteId = null;

  function appIcon(app) { return `<span class="app-icon" data-app="${app.id}"><svg><use href="#i-${app.icon}"></use></svg></span>`; }
  function applySettings() {
    let [accent, rgb] = accentColors[currentSettings.accent] || accentColors.violet;
    if (currentSettings.accent === 'custom' && /^#[\da-f]{6}$/i.test(currentSettings.customAccent || '')) {
      accent = currentSettings.customAccent;
      rgb = [1, 3, 5].map(offset => parseInt(accent.slice(offset, offset + 2), 16)).join(', ');
    }
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-rgb', rgb);
    document.querySelector('.desktop').style.backgroundImage = wallpapers[currentSettings.wallpaper] || wallpapers.nexus;
    document.body.dataset.theme = currentSettings.theme || 'dark';
    document.documentElement.style.setProperty('--text', currentSettings.theme === 'light' ? '#191a2b' : '#f5f4fb');
    document.documentElement.style.setProperty('--muted', currentSettings.theme === 'light' ? '#65667a' : '#a4a4b9');
    document.documentElement.style.colorScheme = currentSettings.theme === 'light' ? 'light' : 'dark';
    document.getElementById('desktop-icons')?.classList.toggle('icons-hidden', currentSettings.showIcons === false);
    document.body.dataset.animations = currentSettings.animations === false ? 'off' : 'on';
    document.body.dataset.taskbarPosition = ['bottom','top','left','right'].includes(currentSettings.taskbarPosition) ? currentSettings.taskbarPosition : 'bottom';
    document.body.classList.toggle('is-muted', Boolean(currentSettings.muted));
    if (window.NexusSystem?.syncProfile) window.NexusSystem.syncProfile();
  }
  function saveSettings() { window.NexusStorage.saveSettings(currentSettings); applySettings(); }
  function setSetting(key, value) { currentSettings[key] = value; saveSettings(); }

  function createTerminal() {
    const node = document.createElement('div');
    node.className = 'terminal-app';
    node.innerHTML = '<div class="terminal-output" aria-live="polite"></div><form class="terminal-form"><span>guest@nexus:~$</span><input aria-label="Terminal command" autocomplete="off" spellcheck="false"></form>';
    window.NexusTerminal.mount(node);
    return node;
  }

  function evaluateScientificExpression(source, angleMode) {
    const text = source.replace(/[×]/g, '*').replace(/[÷]/g, '/').replace(/[−]/g, '-').replace(/π/g, 'pi');
    const tokens = [];
    let offset = 0;
    while (offset < text.length) {
      if (/\s/.test(text[offset])) { offset += 1; continue; }
      const number = text.slice(offset).match(/^(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?/);
      if (number) {
        const value = Number(number[0]);
        if (!Number.isFinite(value)) throw new Error('Invalid number.');
        tokens.push({ type: 'number', value });
        offset += number[0].length;
        continue;
      }
      const identifier = text.slice(offset).match(/^[a-zA-Z]+/);
      if (identifier) {
        tokens.push({ type: 'identifier', value: identifier[0].toLowerCase() });
        offset += identifier[0].length;
        continue;
      }
      if ('+-*/^!%(),'.includes(text[offset])) {
        tokens.push({ type: text[offset], value: text[offset] });
        offset += 1;
        continue;
      }
      throw new Error(`Unsupported character: ${text[offset]}`);
    }

    const functions = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'abs']);
    const joined = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const previous = tokens[index - 1];
      const current = tokens[index];
      const previousCanEnd = previous && (
        previous.type === 'number' ||
        previous.type === ')' ||
        previous.type === '!' ||
        previous.type === '%' ||
        (previous.type === 'identifier' && !functions.has(previous.value))
      );
      const currentCanStart = current && (
        current.type === 'number' ||
        current.type === '(' ||
        current.type === 'identifier'
      );
      const isFunctionCall = previous?.type === 'identifier' &&
        functions.has(previous.value) && current?.type === '(';
      if (previousCanEnd && currentCanStart && !isFunctionCall) {
        joined.push({ type: '*', value: '*' });
      }
      joined.push(current);
    }

    let cursor = 0;
    const angle = angleMode === 'DEG' ? Math.PI / 180 : 1;
    const inverseAngle = angleMode === 'DEG' ? 180 / Math.PI : 1;
    const factorial = (value) => {
      if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error('Factorial requires an integer from 0 to 170.');
      let product = 1;
      for (let item = 2; item <= value; item += 1) product *= item;
      return product;
    };
    const parsePrimary = () => {
      const token = joined[cursor++];
      if (!token) throw new Error('Incomplete expression.');
      if (token.type === 'number') return token.value;
      if (token.type === '+' || token.type === '-') {
        const value = parseExpression(3);
        return token.type === '-' ? -value : value;
      }
      if (token.type === '(') {
        const value = parseExpression(0);
        if (joined[cursor++]?.type !== ')') throw new Error('Missing closing parenthesis.');
        return value;
      }
      if (token.type === 'identifier') {
        if (token.value === 'pi') return Math.PI;
        if (token.value === 'e') return Math.E;
        if (!functions.has(token.value) || joined[cursor++]?.type !== '(') throw new Error(`Unknown function or constant: ${token.value}`);
        const args = [parseExpression(0)];
        while (joined[cursor]?.type === ',') {
          cursor += 1;
          args.push(parseExpression(0));
        }
        if (joined[cursor++]?.type !== ')') throw new Error('Missing closing parenthesis.');
        if (args.length !== 1) throw new Error('This function takes one argument.');
        const value = args[0];
        const result = {
          sin: () => Math.sin(value * angle),
          cos: () => Math.cos(value * angle),
          tan: () => Math.tan(value * angle),
          asin: () => Math.asin(value) * inverseAngle,
          acos: () => Math.acos(value) * inverseAngle,
          atan: () => Math.atan(value) * inverseAngle,
          ln: () => Math.log(value),
          log: () => Math.log10(value),
          sqrt: () => Math.sqrt(value),
          abs: () => Math.abs(value)
        }[token.value]();
        if (!Number.isFinite(result)) throw new Error('Math domain error.');
        return result;
      }
      throw new Error('Invalid expression.');
    };
    const parseExpression = (minimumPrecedence) => {
      let left = parsePrimary();
      while (cursor < joined.length) {
        const operator = joined[cursor];
        if (operator.type === '!') {
          cursor += 1;
          left = factorial(left);
          continue;
        }
        if (operator.type === '%') {
          cursor += 1;
          left /= 100;
          continue;
        }
        const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 }[operator.type] || 0;
        if (!precedence || precedence < minimumPrecedence) break;
        cursor += 1;
        const right = parseExpression(operator.type === '^' ? precedence : precedence + 1);
        if (operator.type === '+') left += right;
        else if (operator.type === '-') left -= right;
        else if (operator.type === '*') left *= right;
        else if (operator.type === '/') {
          if (right === 0) throw new Error('Cannot divide by zero.');
          left /= right;
        } else left = Math.pow(left, right);
      }
      if (!Number.isFinite(left)) throw new Error('Result is outside the supported numeric range.');
      return left;
    };
    if (!joined.length) throw new Error('Enter an expression.');
    const result = parseExpression(0);
    if (cursor !== joined.length) throw new Error('Unexpected input.');
    return result;
  }

  function formatFraction(value) {
    if (Number.isInteger(value)) return String(value);
    const sign = value < 0 ? -1 : 1;
    let numerator = Math.abs(value);
    let previousNumerator = 0;
    let currentNumerator = 1;
    let previousDenominator = 1;
    let currentDenominator = 0;
    let remainder = numerator;
    while (true) {
      const whole = Math.floor(remainder);
      const nextNumerator = whole * currentNumerator + previousNumerator;
      const nextDenominator = whole * currentDenominator + previousDenominator;
      if (nextDenominator > 100000 || Math.abs(value - nextNumerator / nextDenominator) < 1e-10) {
        if (nextDenominator <= 100000) {
          currentNumerator = nextNumerator;
          currentDenominator = nextDenominator;
        }
        break;
      }
      previousNumerator = currentNumerator;
      currentNumerator = nextNumerator;
      previousDenominator = currentDenominator;
      currentDenominator = nextDenominator;
      const fraction = remainder - whole;
      if (fraction < 1e-14) break;
      remainder = 1 / fraction;
    }
    return `${sign * currentNumerator}/${currentDenominator || 1}`;
  }

  window.NexusScientificMath = Object.freeze({
    evaluate: evaluateScientificExpression,
    formatFraction
  });

  function createCalculator() {
    const node = document.createElement('div');
    node.className = 'science-calculator';
    node.tabIndex = 0;
    node.innerHTML = `
      <section class="science-calc-main">
        <header class="science-calc-header"><div><span class="science-brand-dot"></span><strong>Scientific</strong></div><button class="calc-angle" type="button" aria-label="Angle mode">DEG</button></header>
        <div class="science-display">
          <div class="calc-expression" aria-label="Expression"></div>
          <div class="calc-result" aria-live="polite">0</div>
          <div class="calc-answer-mode">NEXUS · MATH ENGINE</div>
        </div>
        <div class="science-keypad"></div>
      </section>
      <aside class="science-history">
        <div class="science-history-heading"><span>HISTORY</span><button type="button" class="calc-clear-history">Clear</button></div>
        <div class="science-history-list"><p>Calculations appear here.</p></div>
      </aside>`;
    const grid = node.querySelector('.science-keypad');
    const display = node.querySelector('.calc-result');
    const expression = node.querySelector('.calc-expression');
    const historyList = node.querySelector('.science-history-list');
    const answerMode = node.querySelector('.calc-answer-mode');
    const angleButton = node.querySelector('.calc-angle');
    const keys = [
      ['AC','utility'], ['DEL','utility'], ['(', 'function'], [')','function'], ['÷','operator'],
      ['sin','function'], ['cos','function'], ['tan','function'], ['asin','function'], ['acos','function'],
      ['7',''], ['8',''], ['9',''], ['sqrt','function'], ['×','operator'],
      ['ln','function'], ['log','function'], ['!','function'], ['^','operator'], ['−','operator'],
      ['4',''], ['5',''], ['6',''], ['x²','function'], ['+','operator'],
      ['1',''], ['2',''], ['3',''], ['%','function'], ['=','equals'],
      ['±','utility'], ['0',''], ['.',''], ['π','constant'], ['e','constant'],
      ['atan','function'], ['1/x','function'], ['a/b','function'], ['=','equals-wide']
    ];
    let value = '';
    let answer = 0;
    let angleMode = 'DEG';
    let fractionMode = false;
    let replaceAfterResult = false;
    const history = [];
    const updateDisplay = (resultText = null) => {
      expression.textContent = value || '0';
      display.textContent = resultText ?? (value ? '' : '0');
      answerMode.textContent = fractionMode ? 'FRACTION RESULT' : 'NEXUS · MATH ENGINE';
    };
    const renderHistory = () => {
      historyList.replaceChildren();
      if (!history.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Calculations appear here.';
        historyList.append(empty);
        return;
      }
      history.slice().reverse().forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'science-history-item';
        const source = document.createElement('span');
        source.textContent = item.source;
        const result = document.createElement('strong');
        result.textContent = item.result;
        button.append(source, result);
        button.addEventListener('click', () => {
          value = item.source;
          answer = item.value;
          updateDisplay(item.result);
        });
        historyList.append(button);
      });
    };
    const press = (key) => {
      if (replaceAfterResult && (/^\d$/.test(key) || key === '.')) {
        value = '';
        replaceAfterResult = false;
      } else if (['+','−','×','÷','^'].includes(key)) {
        replaceAfterResult = false;
      }
      if (key === 'AC') { value = ''; updateDisplay('0'); return; }
      if (key === 'DEL') { value = value.slice(0, -1); updateDisplay(); return; }
      if (key === '±') {
        if (value) value = value.startsWith('-(') && value.endsWith(')') ? value.slice(2, -1) : `-(${value})`;
        updateDisplay();
        return;
      }
      if (key === 'a/b') {
        fractionMode = !fractionMode;
        if (value) {
          try {
            const result = evaluateScientificExpression(value, angleMode);
            updateDisplay(fractionMode ? formatFraction(result) : String(Number(result.toPrecision(12))));
          } catch { updateDisplay(); }
        } else updateDisplay();
        return;
      }
      if (key === 'DEG' || key === 'RAD') {
        angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
        angleButton.textContent = angleMode;
        return;
      }
      if (key === '=') {
        if (!value) return;
        try {
          answer = evaluateScientificExpression(value, angleMode);
          const result = fractionMode ? formatFraction(answer) : String(Number(answer.toPrecision(12)));
          history.push({ source: value, result, value: answer });
          history.splice(0, Math.max(0, history.length - 40));
          updateDisplay(result);
          renderHistory();
          value = String(Number(answer.toPrecision(12)));
          replaceAfterResult = true;
        } catch (error) {
          display.textContent = 'Error';
          answerMode.textContent = error.message;
        }
        return;
      }
      if (key === 'x²') value += '^2';
      else if (key === 'sqrt' || ['sin','cos','tan','asin','acos','atan','ln','log','abs'].includes(key)) {
        const hasOperand = /(?:\d|π|e|\)|!|%)$/.test(value);
        value = hasOperand ? `${key}(${value})` : `${value}${key}(`;
      }
      else if (key === '1/x') value = value ? `1/(${value})` : '1/(';
      else if (key === 'π') value += 'π';
      else if (key === 'Ans') value += String(Number(answer.toPrecision(12)));
      else value += key;
      updateDisplay();
    };
    keys.forEach(([key, style]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `science-key ${style}`.trim();
      button.textContent = key;
      button.setAttribute('aria-label', key === 'sqrt' ? 'Square root' : key);
      button.addEventListener('click', () => press(key));
      grid.append(button);
    });
    angleButton.addEventListener('click', () => press(angleMode));
    node.querySelector('.calc-clear-history').addEventListener('click', () => {
      history.length = 0;
      renderHistory();
    });
    node.addEventListener('pointerdown', () => node.focus({ preventScroll: true }));
    node.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key;
      if (/^\d$/.test(key) || ['.','(',')','+','-','*','/','^','%','!'].includes(key)) {
        event.preventDefault();
        press(({ '*': '×', '/': '÷', '-': '−' })[key] || key);
      } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        press('=');
      } else if (key === 'Backspace') {
        event.preventDefault();
        press('DEL');
      } else if (key === 'Escape') {
        event.preventDefault();
        press('AC');
      }
    });
    renderHistory();
    return node;
  }
  const fileSystem = {
    Home: [{ name: 'Documents', type: 'folder' }, { name: 'Downloads', type: 'folder' }, { name: 'Pictures', type: 'folder' }, { name: 'Welcome.txt', type: 'file', body: 'Welcome to NEXUS OS.\n\nThis simulated file system is a safe place to explore the desktop. Your notes and preferences are stored locally in this browser.' }, { name: 'System Info.txt', type: 'file', body: 'NEXUS OS 3.0.0 · Ultimate Edition\nA browser-native desktop experience.\nBuilt with HTML, CSS, and vanilla JavaScript.' }],
    Documents: [{ name: 'Getting Started.txt', type: 'file', body: 'Getting started with NEXUS OS\n\nOpen Settings to personalize your desktop. Use the launcher to find applications. Create notes to save your ideas in this browser.' }, { name: 'Ideas', type: 'folder' }],
    Downloads: [{ name: 'No downloads yet', type: 'file', body: 'Downloads you add to this simulated environment would appear here.' }],
    Pictures: [{ name: 'NEXUS Wallpaper.svg', type: 'file', body: 'This is the built-in NEXUS OS wallpaper. It lives in assets/wallpapers/nexus.svg in the project.' }],
    Ideas: [{ name: 'Project notes.txt', type: 'file', body: 'Your next big idea goes here.' }]
  };
  function createExplorer() {
    const node = document.createElement('div');
    node.className = 'explorer';
    node.innerHTML = '<div class="explorer-toolbar"><button class="explorer-back" aria-label="Go back">← Back</button><div class="explorer-path"></div></div><div class="explorer-content"></div>';
    const back = node.querySelector('.explorer-back');
    const path = node.querySelector('.explorer-path');
    const content = node.querySelector('.explorer-content');
    const render = () => {
      const folder = explorerPath[explorerPath.length - 1];
      path.textContent = `This PC  /  ${explorerPath.join(' / ')}`;
      back.disabled = explorerPath.length === 1;
      content.replaceChildren();
      if (explorerSelectedFile) {
        const detail = document.createElement('div');
        detail.className = 'file-detail';
        detail.innerHTML = `<span class="file-glyph"><svg><use href="#i-note"></use></svg></span><h3></h3><p></p><button class="primary-button">Back to files</button>`;
        detail.querySelector('h3').textContent = explorerSelectedFile.name;
        detail.querySelector('p').textContent = explorerSelectedFile.body;
        detail.querySelector('button').addEventListener('click', () => { explorerSelectedFile = null; render(); });
        content.append(detail); return;
      }
      const heading = document.createElement('h3');
      heading.textContent = folder === 'Home' ? 'Quick access' : folder;
      content.append(heading);
      const grid = document.createElement('div');
      grid.className = 'file-grid';
      (fileSystem[folder] || []).forEach(file => {
        const button = document.createElement('button');
        button.className = `file-item ${file.type === 'folder' ? 'folder' : ''}`;
        button.innerHTML = `<span class="file-glyph"><svg><use href="#i-${file.type === 'folder' ? 'folder' : 'note'}"></use></svg></span><span></span>`;
        button.querySelector('span:last-child').textContent = file.name;
        button.addEventListener('click', () => {
          if (file.type === 'folder') { explorerPath.push(file.name); explorerSelectedFile = null; }
          else explorerSelectedFile = file;
          render();
        });
        grid.append(button);
      });
      content.append(grid);
    };
    back.addEventListener('click', () => { if (explorerPath.length > 1) { explorerPath.pop(); explorerSelectedFile = null; render(); } });
    render();
    return node;
  }
  function createSettings() {
    const node = document.createElement('div');
    node.className = 'app-padding';
    node.innerHTML = '<h2 class="section-title">Personalize your space</h2><p class="section-subtitle">Make NEXUS feel like yours. Changes save automatically on this device.</p><div class="settings-layout"></div>';
    const layout = node.querySelector('.settings-layout');
    const group = (title, description, choices) => {
      const section = document.createElement('section');
      section.className = 'settings-group';
      section.innerHTML = '<h3></h3><p></p><div class="choice-row"></div>';
      section.querySelector('h3').textContent = title;
      section.querySelector('p').textContent = description;
      choices.forEach(choice => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `choice-chip ${choice.className || ''}`;
        button.dataset.value = choice.value;
        if (choice.color) button.innerHTML = `<span style="background:${choice.color}" aria-label="${choice.label}"></span>`;
        else button.textContent = choice.label;
        button.setAttribute('aria-label', choice.label);
        button.classList.toggle('selected', currentSettings[choice.key] === choice.value);
        button.addEventListener('click', () => {
          currentSettings[choice.key] = choice.value;
          section.querySelectorAll('.choice-chip').forEach(chip => chip.classList.toggle('selected', chip === button));
          saveSettings();
        });
        section.querySelector('.choice-row').append(button);
      });
      return section;
    };
    layout.append(group('Accent color', 'Choose a preset or set your own desktop accent.', Object.entries({ violet:'#9c7cff',blue:'#58a6ff',cyan:'#49d6d1',rose:'#ff75a0',amber:'#f2b95f' }).map(([value,color]) => ({ key:'accent',value,color,label:value,className:'color-chip' }))));
    const customAccent = document.createElement('section');
    customAccent.className = 'settings-group';
    customAccent.innerHTML = '<h3>Custom accent</h3><p>Choose any color for your interface highlights.</p><div class="custom-accent-row"><input type="color" aria-label="Custom accent color"><button class="choice-chip">Apply custom color</button></div>';
    customAccent.querySelector('input').value = /^#[\da-f]{6}$/i.test(currentSettings.customAccent || '') ? currentSettings.customAccent : '#9c7cff';
    customAccent.querySelector('button').classList.toggle('selected', currentSettings.accent === 'custom');
    customAccent.querySelector('button').addEventListener('click', () => {
      currentSettings.customAccent = customAccent.querySelector('input').value;
      currentSettings.accent = 'custom';
      saveSettings();
      customAccent.querySelector('button').classList.add('selected');
    });
    layout.append(customAccent);
    layout.append(group('Wallpaper', 'Set the mood for your workspace.', [{key:'wallpaper',value:'nexus',label:'Nexus'},{key:'wallpaper',value:'aurora',label:'Aurora'},{key:'wallpaper',value:'dusk',label:'Dusk'},{key:'wallpaper',value:'midnight',label:'Midnight'},{key:'wallpaper',value:'ocean',label:'Ocean'},{key:'wallpaper',value:'ember',label:'Ember'},{key:'wallpaper',value:'nebula',label:'Nebula'},{key:'wallpaper',value:'glacier',label:'Glacier'},{key:'wallpaper',value:'prism',label:'Prism'},{key:'wallpaper',value:'solar',label:'Solar'}]));
    layout.append(group('Appearance', 'Select your preferred desktop appearance.', [{key:'theme',value:'dark',label:'Dark'},{key:'theme',value:'light',label:'Light'}]));
    const profile = document.createElement('section');
    profile.className = 'settings-group';
    profile.innerHTML = '<h3>User profile</h3><p>Your name and avatar appear on the lock screen and system bar. Profile photos are resized and stored only in this browser.</p><label class="settings-field">Username<input class="settings-username" maxlength="24" value=""></label><label class="profile-photo-picker">Choose profile picture<input class="profile-photo-input" type="file" accept="image/*"></label><button class="profile-photo-remove" type="button">Remove profile picture</button><div class="avatar-choices" aria-label="Choose an avatar"></div>';
    const username = profile.querySelector('.settings-username');
    username.value = currentSettings.username || 'Guest';
    username.addEventListener('input', () => {
      currentSettings.username = username.value.trim().slice(0, 24) || 'Guest';
      saveSettings();
    });
    profile.querySelector('.profile-photo-input').addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const image = new Image();
      const source = URL.createObjectURL(file);
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160; canvas.height = 160;
        const context = canvas.getContext('2d');
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 160, 160);
        currentSettings.profileImage = canvas.toDataURL('image/jpeg', 0.78);
        URL.revokeObjectURL(source);
        saveSettings();
        window.Nexus.toast('Profile picture saved on this device.');
      };
      image.onerror = () => { URL.revokeObjectURL(source); window.Nexus.toast('That image could not be opened.'); };
      image.src = source;
      event.target.value = '';
    });
    profile.querySelector('.profile-photo-remove').addEventListener('click', () => {
      currentSettings.profileImage = '';
      saveSettings();
      window.Nexus.toast('Profile picture removed.');
    });
    const avatars = ['👩‍🚀','🧑‍🚀','👨‍🚀','🦊','🐼','🐱','🦉','🌙'];
    const avatarChoices = profile.querySelector('.avatar-choices');
    avatars.forEach(avatar => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = `avatar-choice${(currentSettings.avatar || '👩‍🚀') === avatar ? ' selected' : ''}`;
      button.textContent = avatar; button.setAttribute('aria-label', `Choose avatar ${avatar}`);
      button.addEventListener('click', () => {
        currentSettings.avatar = avatar;
        currentSettings.profileImage = '';
        avatarChoices.querySelectorAll('.avatar-choice').forEach(item => item.classList.toggle('selected', item === button));
        saveSettings();
      });
      avatarChoices.append(button);
    });
    layout.append(profile);
    const security = document.createElement('section');
    security.className = 'settings-group';
    security.innerHTML = '<h3>Lock screen PIN</h3><p>A convenience lock for this browser session; it is not device-level security. Leave blank to unlock without a PIN.</p><form class="pin-settings"><input type="password" inputmode="numeric" pattern="[0-9]{0,12}" maxlength="12" placeholder="Set a numeric PIN" aria-label="Set numeric PIN"><button class="choice-chip" type="submit">Save PIN</button></form>';
    security.querySelector('input').value = currentSettings.pin || '';
    security.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const value = security.querySelector('input').value;
      if (!/^\d{0,12}$/.test(value)) { window.Nexus.toast('Use up to 12 digits for your PIN.'); return; }
      currentSettings.pin = value;
      saveSettings();
      window.Nexus.toast(value ? 'Your local lock-screen PIN is saved.' : 'PIN removed. The lock screen will unlock without one.');
    });
    layout.append(security);
    const preferences = document.createElement('section');
    preferences.className = 'settings-group';
    preferences.innerHTML = '<h3>Startup and desktop</h3><p>Choose how NEXUS OS starts and which desktop controls are visible.</p><div class="settings-toggles"></div>';
    const toggles = preferences.querySelector('.settings-toggles');
    [
      ['bootAnimation', 'Show boot animation'],
      ['startupSound', 'Play startup sound'],
      ['showIcons', 'Show desktop icons'],
      ['animations', 'Enable interface animations']
    ].forEach(([key, label]) => {
      const row = document.createElement('label');
      row.className = 'settings-toggle';
      row.innerHTML = '<span></span><input type="checkbox">';
      row.querySelector('span').textContent = label;
      const input = row.querySelector('input');
      input.checked = Boolean(currentSettings[key]);
      input.addEventListener('change', () => setSetting(key, input.checked));
      toggles.append(row);
    });
    layout.append(preferences);
    const taskbar = document.createElement('section');
    taskbar.className = 'settings-group';
    taskbar.innerHTML = '<h3>Taskbar</h3><p>Choose its screen edge and the apps pinned beside the launcher.</p><div class="taskbar-position-choices"></div><div class="taskbar-pin-choices"></div>';
    const positions = taskbar.querySelector('.taskbar-position-choices');
    ['bottom','top','left','right'].forEach(position => {
      const button = document.createElement('button'); button.type = 'button';
      button.className = `choice-chip${(currentSettings.taskbarPosition || 'bottom') === position ? ' selected' : ''}`;
      button.textContent = position[0].toUpperCase() + position.slice(1);
      button.addEventListener('click', () => {
        currentSettings.taskbarPosition = position;
        positions.querySelectorAll('button').forEach(item => item.classList.toggle('selected', item === button));
        saveSettings();
      });
      positions.append(button);
    });
    const pinnedApps = Array.isArray(currentSettings.taskbarApps) ? currentSettings.taskbarApps : ['terminal','explorer','calculator','notes','settings','browser'];
    apps.forEach(app => {
      const label = document.createElement('label'); label.className = 'taskbar-pin-option';
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = pinnedApps.includes(app.id);
      input.addEventListener('change', () => {
        const next = new Set(Array.isArray(currentSettings.taskbarApps) ? currentSettings.taskbarApps : ['terminal','explorer','calculator','notes','settings','browser']);
        if (input.checked) next.add(app.id); else next.delete(app.id);
        currentSettings.taskbarApps = [...next];
        window.NexusStorage.saveSettings(currentSettings);
        renderShortcuts();
      });
      label.append(input, document.createTextNode(app.name)); taskbar.querySelector('.taskbar-pin-choices').append(label);
    });
    layout.append(taskbar);
    return node;
  }
  function makeId() { return `note-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
  function createNotes() {
    const node = document.createElement('div');
    node.className = 'notes-app';
    node.innerHTML = '<aside class="notes-sidebar"><div class="notes-sidebar-head"><span>MY NOTES</span><button aria-label="Create note"><svg><use href="#i-plus"></use></svg></button></div><div class="notes-list"></div></aside><section class="notes-editor"></section>';
    const list = node.querySelector('.notes-list');
    const editor = node.querySelector('.notes-editor');
    const persist = () => window.NexusStorage.saveNotes(notes);
    const render = () => {
      list.replaceChildren(); editor.replaceChildren();
      node.querySelector('.notes-sidebar-head button').onclick = () => {
        const note = { id: makeId(), title: '', body: '', updatedAt: Date.now() };
        notes.unshift(note); activeNoteId = note.id; persist(); render(); editor.querySelector('input').focus();
      };
      if (!notes.length) {
        const empty = document.createElement('div'); empty.className = 'notes-empty'; empty.textContent = 'No notes yet. Create one to capture an idea.'; editor.append(empty); return;
      }
      notes.forEach(note => {
        const button = document.createElement('button');
        button.className = `note-list-item ${note.id === activeNoteId ? 'active' : ''}`;
        button.innerHTML = '<strong></strong><span></span>';
        button.querySelector('strong').textContent = note.title || 'Untitled note';
        button.querySelector('span').textContent = note.body?.split('\n')[0] || 'No additional text';
        button.addEventListener('click', () => { activeNoteId = note.id; render(); });
        list.append(button);
      });
      let note = notes.find(item => item.id === activeNoteId);
      if (!note) { note = notes[0]; activeNoteId = note.id; }
      const title = document.createElement('input'); title.type = 'text'; title.maxLength = 100; title.placeholder = 'Untitled note'; title.value = note.title || ''; title.setAttribute('aria-label','Note title');
      const body = document.createElement('textarea'); body.maxLength = 20000; body.placeholder = 'Start writing...'; body.value = note.body || ''; body.setAttribute('aria-label','Note content');
      const footer = document.createElement('div'); footer.className = 'notes-editor-footer';
      const updated = document.createElement('span'); updated.textContent = `Saved locally · ${new Date(note.updatedAt || Date.now()).toLocaleString()}`;
      const remove = document.createElement('button'); remove.className = 'notes-delete'; remove.textContent = 'Delete note';
      const onEdit = () => {
        note.title = title.value; note.body = body.value; note.updatedAt = Date.now();
        updated.textContent = 'Saved locally · just now';
        persist();
        const activeTitle = list.querySelector('.active strong');
        const activeBody = list.querySelector('.active span');
        if (activeTitle) activeTitle.textContent = note.title || 'Untitled note';
        if (activeBody) activeBody.textContent = note.body.split('\n')[0] || 'No additional text';
      };
      title.addEventListener('input', onEdit); body.addEventListener('input', onEdit);
      remove.addEventListener('click', () => {
        window.NexusRecycle.trash('note', note);
        notes = notes.filter(item => item.id !== note.id); activeNoteId = notes[0]?.id || null; persist(); render();
        window.Nexus.toast('Note moved to Recycle Bin.');
      });
      footer.append(updated, remove); editor.append(title, body, footer);
    };
    render();
    const refresh = () => {
      notes = window.NexusStorage.getNotes();
      if (!notes.some(note => note.id === activeNoteId)) activeNoteId = notes[0]?.id || null;
      render();
    };
    window.addEventListener('nexus-notes-change', refresh);
    node._nexusCleanup = () => window.removeEventListener('nexus-notes-change', refresh);
    return node;
  }
  function createAbout() {
    const node = document.createElement('div');
    node.className = 'about-app';
    node.innerHTML = '<div class="about-hero"><div class="about-logo"><svg><use href="#i-grid"></use></svg></div><h2>NEXUS <span>OS</span></h2><p>A new perspective on your desktop.</p></div><p class="about-copy">NEXUS OS is a lightweight desktop environment built for the browser. Explore, personalize your space, and keep your ideas close — all running locally on your device.</p><div class="about-stats"><div>VERSION<strong>3.0.0 · ULTIMATE EDITION</strong></div><div>PLATFORM<strong>Web browser</strong></div><div>ENGINE<strong>Vanilla JavaScript</strong></div><div>STORAGE<strong>This device only</strong></div></div>';
    return node;
  }
  const makers = {
    terminal: createTerminal, calculator: createCalculator, explorer: createExplorer, settings: createSettings, notes: createNotes, about: createAbout,
    music: () => window.NexusMusic.create(), browser: () => window.NexusBrowser.create(), monitor: () => window.NexusMonitor.create(),
    games: () => window.NexusGames.create(), calendar: () => window.NexusCalendar.create(),
    gallery: () => window.NexusGallery.create(), paint: () => window.NexusPaint.create(),
    time: () => window.NexusTimeTools.create(), worldclock: () => window.NexusWorldClock.create(),
    password: () => window.NexusPassword.create(), tasks: () => window.NexusTasks.create(), recycle: () => window.NexusRecycle.create()
  };
  const windowSizes = {
    terminal:{width:580,height:390},     calculator:{width:760,height:740}, explorer:{width:590,height:410}, settings:{width:570,height:680},
    notes:{width:590,height:420}, about:{width:410,height:410}, music:{width:700,height:540}, browser:{width:850,height:620},
    monitor:{width:650,height:550}, games:{width:570,height:590}, calendar:{width:650,height:650},
    gallery:{width:820,height:620}, paint:{width:820,height:650}, time:{width:460,height:500}, worldclock:{width:560,height:620},
    password:{width:470,height:570}, tasks:{width:650,height:620}, recycle:{width:620,height:520}
  };
  function open(id) {
    const app = apps.find(item => item.id === id);
    const make = makers[id];
    if (!app || !make) return;
    window.NexusSystem?.playSound('open');
    currentSettings.recentApps = [id, ...(currentSettings.recentApps || []).filter(item => item !== id)].slice(0, 8);
    window.NexusStorage.saveSettings(currentSettings);
    if (window.NexusWindows.has(id)) {
      window.NexusWindows.open(id, app.name, app.icon);
      updateRecentApps();
      return;
    }
    if (id === 'explorer') { explorerPath = ['Home']; explorerSelectedFile = null; }
    if (id === 'notes') { notes = window.NexusStorage.getNotes(); activeNoteId = notes[0]?.id || null; }
    if (id === 'recycle') notes = window.NexusStorage.getNotes();
    window.NexusWindows.open(app.id, app.name, app.icon, make(), { size: windowSizes[id] });
    updateRecentApps();
  }
  function onClose(id) {
    const app = document.querySelector(`[data-window-id="${id}"] .window-content > *`);
    if (id === 'terminal') window.NexusTerminal?.unmount();
    if (id === 'music') window.NexusMusic?.onClose();
    app?._nexusCleanup?.();
  }
  function updateRecentApps() {
    const section = document.getElementById('launcher-recent-section');
    const container = document.getElementById('launcher-recent');
    if (!section || !container) return;
    container.replaceChildren();
    const ids = (currentSettings.recentApps || []).slice(0, 4);
    section.hidden = ids.length === 0;
    ids.forEach(id => {
      const app = apps.find(item => item.id === id);
      if (!app) return;
      const button = document.createElement('button');
      button.className = 'launcher-item'; button.dataset.appName = `${app.name} ${app.description}`.toLowerCase();
      button.innerHTML = `${appIcon(app)}<span></span>`; button.querySelector('span').textContent = app.name;
      button.addEventListener('click', () => { open(id); window.Nexus.closeLauncher(); });
      container.append(button);
    });
  }
  function renderShortcuts() {
    const desktop = document.getElementById('desktop-icons');
    const pinned = document.getElementById('taskbar-pinned');
    const launcher = document.getElementById('launcher-grid');
    const recents = document.getElementById('launcher-recent');
    [desktop,pinned,launcher,recents].forEach(element => element.replaceChildren());
    const configuredPins = currentSettings.taskbarApps;
    const pinnedApps = Array.isArray(configuredPins) ? configuredPins : ['terminal','explorer','calculator','notes','settings','browser'];
    const makeLauncherButton = app => {
      const launchButton = document.createElement('button');
      launchButton.className = 'launcher-item'; launchButton.dataset.appName = `${app.name} ${app.description}`.toLowerCase();
      launchButton.innerHTML = `${appIcon(app)}<span></span>`;
      launchButton.querySelector('span').textContent = app.name;
      launchButton.addEventListener('click', () => { open(app.id); window.Nexus.closeLauncher(); });
      return launchButton;
    };
    const recentIds = (currentSettings.recentApps || []).filter(id => apps.some(app => app.id === id)).slice(0, 4);
    document.getElementById('launcher-recent-section').hidden = recentIds.length === 0;
    recentIds.forEach(id => {
      const app = apps.find(item => item.id === id);
      if (app) recents.append(makeLauncherButton(app));
    });
    apps.forEach(app => {
      const desktopButton = document.createElement('button');
      desktopButton.className = 'desktop-icon'; desktopButton.setAttribute('aria-label',`Open ${app.name}`);
      desktopButton.draggable = true;
      desktopButton.dataset.desktopApp = app.id;
      desktopButton.dataset.appName = app.name.toLowerCase();
      desktopButton.innerHTML = `${appIcon(app)}<span class="desktop-icon-label"></span>`;
      desktopButton.querySelector('.desktop-icon-label').textContent = app.name;
      desktopButton.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          event.preventDefault();
          desktopButton.classList.toggle('selected');
          return;
        }
        open(app.id);
      }); desktop.append(desktopButton);
      const savedPosition = currentSettings.iconPositions?.[app.id];
      if (savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) {
        desktopButton.style.position = 'absolute';
        desktopButton.style.left = `${savedPosition.x}px`;
        desktopButton.style.top = `${savedPosition.y}px`;
      }

      if (pinnedApps.includes(app.id)) {
        const taskButton = document.createElement('button');
        taskButton.className = 'taskbar-app'; taskButton.title = app.name; taskButton.setAttribute('aria-label',`Open ${app.name}`);
        taskButton.innerHTML = appIcon(app); taskButton.addEventListener('click', () => open(app.id)); pinned.append(taskButton);
      }

      launcher.append(makeLauncherButton(app));
    });
  }
  window.NexusApps = {
    open, renderShortcuts, onClose, applySettings,
    getSettings: () => ({ ...currentSettings }),
    getSetting: key => currentSettings[key],
    updateSetting: setSetting
  };
  applySettings();
})();
