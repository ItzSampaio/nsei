(function () {
  'use strict';
  function create() {
    const root = document.createElement('div');
    root.className = 'monitor-app';
    root.innerHTML = `
      <header class="monitor-header"><div><p class="eyebrow">LIVE TELEMETRY</p><h2>System Monitor</h2></div><span class="monitor-live"><i></i> LIVE</span></header>
      <div class="monitor-clock"><span>LOCAL SYSTEM TIME</span><strong></strong><small></small></div>
      <div class="monitor-cards">
        <section class="monitor-card"><div class="monitor-card-head"><span>CPU LOAD</span><strong class="cpu-number"></strong></div><canvas class="cpu-chart" aria-label="Simulated CPU usage graph"></canvas><small>Simulated activity · illustrative only</small></section>
        <section class="monitor-card"><div class="monitor-card-head"><span>MEMORY</span><strong class="ram-number"></strong></div><canvas class="ram-chart" aria-label="Simulated RAM usage graph"></canvas><small>Simulated activity · illustrative only</small></section>
      </div>
      <div class="browser-memory"><div><span class="memory-pulse"></span><span>Browser-reported memory</span></div><strong></strong><small>Available only in some browsers</small></div>
      <div class="monitor-note">CPU and RAM charts are simulated and do not represent actual device performance.</div>`;
    const history = { cpu: Array.from({ length: 28 }, () => 25 + Math.random() * 35), ram: Array.from({ length: 28 }, () => 45 + Math.random() * 22) };
    const clock = root.querySelector('.monitor-clock strong');
    const date = root.querySelector('.monitor-clock small');
    const memory = root.querySelector('.browser-memory strong');
    let timer;
    let frame;
    function draw(canvas, values, color) {
      const width = Math.max(100, canvas.clientWidth);
      const height = Math.max(45, canvas.clientHeight);
      const ratio = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      }
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.strokeStyle = 'rgba(255,255,255,.07)';
      context.lineWidth = 1;
      for (let y = 12; y < height; y += 16) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
      const points = values.map((value, index) => ({ x: index * width / (values.length - 1), y: height - 4 - value / 100 * (height - 10) }));
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, `${color}66`); gradient.addColorStop(1, color);
      context.beginPath();
      points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.strokeStyle = gradient; context.lineWidth = 2; context.stroke();
      context.lineTo(width, height); context.lineTo(0, height); context.closePath();
      context.fillStyle = `${color}18`; context.fill();
    }
    function refresh() {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      date.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const cpu = Math.round(14 + Math.random() * 68);
      const ram = Math.round(34 + Math.random() * 54);
      root.querySelector('.cpu-number').textContent = `${cpu}%`;
      root.querySelector('.ram-number').textContent = `${ram}%`;
      history.cpu.push(cpu); history.cpu.shift(); history.ram.push(ram); history.ram.shift();
      draw(root.querySelector('.cpu-chart'), history.cpu, '#9c7cff');
      draw(root.querySelector('.ram-chart'), history.ram, '#55d6c2');
      const reported = performance.memory;
      memory.textContent = reported ? `${(reported.usedJSHeapSize / 1048576).toFixed(0)} MB / ${(reported.jsHeapSizeLimit / 1048576).toFixed(0)} MB` : 'Not exposed by this browser';
    }
    function schedule() {
      if (timer) window.clearInterval(timer);
      if (frame) window.cancelAnimationFrame(frame);
      refresh();
      timer = window.setInterval(refresh, 1500);
      frame = window.requestAnimationFrame(() => { if (root.isConnected) draw(root.querySelector('.cpu-chart'), history.cpu, '#9c7cff'); });
    }
    window.addEventListener('resize', schedule);
    root._nexusCleanup = () => { window.clearInterval(timer); window.cancelAnimationFrame(frame); window.removeEventListener('resize', schedule); };
    schedule();
    return root;
  }
  window.NexusMonitor = { create };
})();
