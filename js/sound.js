(function () {
  'use strict';
  let last = 0;
  document.addEventListener('pointerdown', event => {
    const target = event.target.closest('button, input[type="range"], select');
    if (!target || target.disabled || Date.now() - last < 45) return;
    last = Date.now();
    window.NexusSystem?.playSound('click');
  }, { passive: true });
  document.addEventListener('keydown', event => {
    if (!['Enter', ' ', 'Escape'].includes(event.key) || event.target.matches('input, textarea')) return;
    window.NexusSystem?.playSound(event.key === 'Escape' ? 'alert' : 'click');
  });
})();
