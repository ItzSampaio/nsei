(function () {
  'use strict';
  function create() {
    const root = document.createElement('div');
    root.className = 'time-tools-app';
    root.innerHTML = `<header class="time-tools-header"><div><p class="eyebrow">KEEP YOUR MOMENTUM</p><h2>Stopwatch & Timer</h2></div></header><nav class="time-tabs"><button class="selected" data-mode="stopwatch">Stopwatch</button><button data-mode="timer">Countdown</button></nav><section class="time-panel stopwatch-panel"><div class="time-digits">00:00<span>.00</span></div><div class="time-actions"><button class="time-start">Start</button><button class="time-reset">Reset</button></div><div class="lap-list"></div></section><section class="time-panel timer-panel" hidden><div class="timer-digits">00:00</div><div class="timer-fields"><label>Minutes<input class="timer-minutes" type="number" min="0" max="999" value="5"></label><label>Seconds<input class="timer-seconds" type="number" min="0" max="59" value="0"></label></div><div class="time-actions"><button class="timer-start">Start timer</button><button class="timer-reset">Reset</button></div><p class="timer-hint">You'll get an on-screen notification when time is up.</p></section>`;
    const tabs = root.querySelectorAll('.time-tabs button');
    const stopwatchDigits = root.querySelector('.stopwatch-panel .time-digits');
    const timerDigits = root.querySelector('.timer-digits');
    let stopwatchTimer = null;
    let timerInterval = null;
    let elapsed = 0;
    let startedAt = 0;
    let remaining = 0;
    let timerEndsAt = 0;
    function formatStopwatch(milliseconds) {
      const centiseconds = Math.floor(milliseconds / 10) % 100;
      const seconds = Math.floor(milliseconds / 1000) % 60;
      const minutes = Math.floor(milliseconds / 60000);
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}<span>.${String(centiseconds).padStart(2, '0')}</span>`;
    }
    const formatTimer = milliseconds => {
      const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
      return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    };
    const refreshStopwatch = () => { stopwatchDigits.innerHTML = formatStopwatch(elapsed + Date.now() - startedAt); };
    root.querySelector('.time-start').addEventListener('click', event => {
      if (stopwatchTimer) {
        elapsed += Date.now() - startedAt;
        window.clearInterval(stopwatchTimer); stopwatchTimer = null;
        event.currentTarget.textContent = 'Start';
      } else {
        startedAt = Date.now();
        stopwatchTimer = window.setInterval(refreshStopwatch, 33);
        event.currentTarget.textContent = 'Pause';
      }
      refreshStopwatch();
    });
    root.querySelector('.time-reset').addEventListener('click', () => {
      window.clearInterval(stopwatchTimer); stopwatchTimer = null; elapsed = 0;
      root.querySelector('.time-start').textContent = 'Start'; stopwatchDigits.innerHTML = formatStopwatch(0); root.querySelector('.lap-list').replaceChildren();
    });
    const startTimer = root.querySelector('.timer-start');
    const resetTimer = () => {
      window.clearInterval(timerInterval); timerInterval = null; remaining = 0;
      timerDigits.textContent = '00:00'; startTimer.textContent = 'Start timer';
    };
    startTimer.addEventListener('click', () => {
      if (timerInterval) {
        remaining = Math.max(0, timerEndsAt - Date.now());
        window.clearInterval(timerInterval); timerInterval = null; startTimer.textContent = 'Resume';
        timerDigits.textContent = formatTimer(remaining);
        return;
      }
      if (!remaining) {
        const minutes = Number(root.querySelector('.timer-minutes').value);
        const seconds = Number(root.querySelector('.timer-seconds').value);
        if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || minutes > 999 || seconds < 0 || seconds > 59 || minutes * 60 + seconds === 0) {
          window.Nexus.toast('Set a timer duration greater than zero.');
          return;
        }
        remaining = (minutes * 60 + seconds) * 1000;
      }
      timerEndsAt = Date.now() + remaining;
      startTimer.textContent = 'Pause';
      const tick = () => {
        remaining = Math.max(0, timerEndsAt - Date.now());
        timerDigits.textContent = formatTimer(remaining);
        if (!remaining) {
          window.clearInterval(timerInterval); timerInterval = null; startTimer.textContent = 'Start timer';
          window.NexusSystem.notify('Timer finished', 'Your countdown has completed.');
          window.NexusSystem.playSound('alert');
          window.Nexus.toast('Timer finished.');
        }
      };
      tick();
      timerInterval = window.setInterval(tick, 200);
    });
    root.querySelector('.timer-reset').addEventListener('click', resetTimer);
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(item => item.classList.toggle('selected', item === tab));
      root.querySelector('.stopwatch-panel').hidden = tab.dataset.mode !== 'stopwatch';
      root.querySelector('.timer-panel').hidden = tab.dataset.mode !== 'timer';
    }));
    root._nexusCleanup = () => { window.clearInterval(stopwatchTimer); window.clearInterval(timerInterval); };
    return root;
  }
  window.NexusTimeTools = { create };
})();
