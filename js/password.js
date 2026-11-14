(function () {
  'use strict';
  function create() {
    const root = document.createElement('div');
    root.className = 'password-app';
    root.innerHTML = '<header><p class="eyebrow">GENERATED ON THIS DEVICE</p><h2>Password Generator</h2><p class="section-subtitle">Create a strong random password. Nothing is sent or saved.</p></header><label class="password-length">Length <strong>20</strong><input type="range" min="8" max="64" value="20"></label><div class="password-options"><label><input type="checkbox" data-set="upper" checked> Uppercase letters</label><label><input type="checkbox" data-set="lower" checked> Lowercase letters</label><label><input type="checkbox" data-set="numbers" checked> Numbers</label><label><input type="checkbox" data-set="symbols" checked> Symbols</label></div><div class="password-output"><input type="text" readonly aria-label="Generated password"><button class="password-copy" type="button">Copy</button></div><div class="password-strength"><span></span><strong></strong></div><button class="password-generate" type="button">Generate password</button><p class="password-feedback" aria-live="polite"></p>';
    const length = root.querySelector('input[type="range"]');
    const output = root.querySelector('.password-output input');
    const feedback = root.querySelector('.password-feedback');
    const choices = { upper:'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower:'abcdefghijklmnopqrstuvwxyz', numbers:'0123456789', symbols:'!@#$%^&*()-_=+[]{};:,.?' };
    function secureIndex(max) {
      if (!window.crypto?.getRandomValues) throw new Error('Secure random number generation is not available in this browser.');
      const range = 0x100000000;
      const cutoff = range - range % max;
      const number = new Uint32Array(1);
      do { window.crypto.getRandomValues(number); } while (number[0] >= cutoff);
      return number[0] % max;
    }
    function generate() {
      const active = Object.entries(choices).filter(([key]) => root.querySelector(`[data-set="${key}"]`).checked).map(([, chars]) => chars);
      if (!active.length) { output.value = ''; feedback.textContent = 'Select at least one character type.'; return; }
      try {
        const lengthValue = Number(length.value);
        const all = active.join('');
        const chars = active.map(charset => charset[secureIndex(charset.length)]);
        while (chars.length < lengthValue) chars.push(all[secureIndex(all.length)]);
        for (let index = chars.length - 1; index > 0; index--) {
          const swap = secureIndex(index + 1);
          [chars[index], chars[swap]] = [chars[swap], chars[index]];
        }
        output.value = chars.join('');
        feedback.textContent = 'Generated securely in your browser.';
        const strength = root.querySelector('.password-strength');
        strength.dataset.level = lengthValue >= 24 && active.length >= 3 ? 'strong' : lengthValue >= 14 && active.length >= 2 ? 'good' : 'fair';
        strength.querySelector('strong').textContent = strength.dataset.level === 'strong' ? 'Very strong' : strength.dataset.level === 'good' ? 'Strong' : 'Fair';
      } catch (error) {
        output.value = ''; feedback.textContent = error.message; window.Nexus.toast(error.message);
      }
    }
    length.addEventListener('input', () => { root.querySelector('.password-length strong').textContent = length.value; });
    root.querySelector('.password-generate').addEventListener('click', generate);
    root.querySelector('.password-copy').addEventListener('click', async () => {
      if (!output.value) { feedback.textContent = 'Generate a password before copying.'; return; }
      try {
        await navigator.clipboard.writeText(output.value);
        feedback.textContent = 'Password copied to clipboard.';
      } catch {
        output.focus(); output.select();
        const copied = document.execCommand('copy');
        feedback.textContent = copied ? 'Password copied to clipboard.' : 'Clipboard access was denied. Select and copy the password manually.';
      }
    });
    generate();
    return root;
  }
  window.NexusPassword = { create };
})();
