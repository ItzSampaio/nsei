(function () {
  'use strict';
  function create() {
    const root = document.createElement('div');
    root.className = 'paint-app';
    root.innerHTML = `<header class="paint-toolbar"><div class="paint-tools"><label class="paint-color-label" title="Brush color"><input class="paint-color" type="color" value="#9c7cff"><span>Color</span></label><label class="paint-size-label">Size <input class="paint-size" type="range" min="1" max="48" value="8"><strong>8</strong></label><button class="paint-eraser" type="button">Eraser</button><button class="paint-undo" type="button" aria-label="Undo">↶ Undo</button><button class="paint-redo" type="button" aria-label="Redo">↷ Redo</button></div><div class="paint-actions"><button class="paint-clear" type="button">Clear</button><button class="paint-download" type="button">Download PNG</button></div></header><div class="paint-canvas-wrap"><canvas aria-label="Drawing canvas"></canvas></div><footer class="paint-footer">Draw with your pointer, mouse, or finger. Your sketch stays in this session until downloaded.</footer>`;
    const canvas = root.querySelector('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const color = root.querySelector('.paint-color');
    const size = root.querySelector('.paint-size');
    const undoButton = root.querySelector('.paint-undo');
    const redoButton = root.querySelector('.paint-redo');
    const wrap = root.querySelector('.paint-canvas-wrap');
    let drawing = false;
    let erasing = false;
    let previous = null;
    let history = [];
    let index = -1;
    const limit = 30;
    function snapshot() {
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      history = history.slice(0, index + 1);
      history.push(image);
      if (history.length > limit) history.shift();
      index = history.length - 1;
      updateHistoryButtons();
    }
    function updateHistoryButtons() {
      undoButton.disabled = index <= 0;
      redoButton.disabled = index >= history.length - 1;
    }
    function resizeCanvas() {
      if (!wrap.clientWidth || !wrap.clientHeight) return;
      const width = Math.max(1, Math.floor(wrap.clientWidth));
      const height = Math.max(1, Math.floor(wrap.clientHeight));
      if (canvas.width === width && canvas.height === height) return;
      const previousCanvas = document.createElement('canvas');
      previousCanvas.width = canvas.width; previousCanvas.height = canvas.height;
      previousCanvas.getContext('2d').drawImage(canvas, 0, 0);
      canvas.width = width; canvas.height = height;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      if (previousCanvas.width && previousCanvas.height) context.drawImage(previousCanvas, 0, 0, width, height);
      history = []; index = -1; snapshot();
    }
    const coordinates = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    canvas.addEventListener('pointerdown', event => {
      event.preventDefault();
      drawing = true;
      previous = coordinates(event);
      canvas.setPointerCapture(event.pointerId);
      context.beginPath(); context.arc(previous.x, previous.y, Number(size.value) / 2, 0, Math.PI * 2);
      context.fillStyle = erasing ? '#ffffff' : color.value; context.fill();
    });
    canvas.addEventListener('pointermove', event => {
      if (!drawing) return;
      const point = coordinates(event);
      context.beginPath(); context.moveTo(previous.x, previous.y); context.lineTo(point.x, point.y);
      context.lineWidth = Number(size.value); context.lineCap = 'round'; context.lineJoin = 'round';
      context.strokeStyle = erasing ? '#ffffff' : color.value; context.stroke();
      previous = point;
    });
    canvas.addEventListener('pointerup', () => { if (drawing) snapshot(); drawing = false; previous = null; });
    canvas.addEventListener('pointercancel', () => { drawing = false; previous = null; });
    root.querySelector('.paint-size').addEventListener('input', () => { root.querySelector('.paint-size-label strong').textContent = size.value; });
    root.querySelector('.paint-eraser').addEventListener('click', event => {
      erasing = !erasing;
      event.currentTarget.classList.toggle('selected', erasing);
      event.currentTarget.textContent = erasing ? 'Eraser on' : 'Eraser';
    });
    undoButton.addEventListener('click', () => { if (index > 0) { index -= 1; context.putImageData(history[index], 0, 0); updateHistoryButtons(); } });
    redoButton.addEventListener('click', () => { if (index < history.length - 1) { index += 1; context.putImageData(history[index], 0, 0); updateHistoryButtons(); } });
    root.querySelector('.paint-clear').addEventListener('click', () => {
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); snapshot();
    });
    root.querySelector('.paint-download').addEventListener('click', () => {
      canvas.toBlob(blob => {
        if (!blob) { window.Nexus.toast('Could not export this drawing.'); return; }
        const link = document.createElement('a');
        link.download = `nexus-drawing-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = URL.createObjectURL(blob); link.click();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      }, 'image/png');
    });
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(wrap);
    root._nexusMount = resizeCanvas;
    requestAnimationFrame(() => requestAnimationFrame(resizeCanvas));
    root._nexusCleanup = () => observer.disconnect();
    return root;
  }
  window.NexusPaint = { create };
})();
