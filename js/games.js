(function () {
  'use strict';
  function create() {
    const root = document.createElement('div');
    root.className = 'games-app';
    root.innerHTML = '<div class="games-heading"><div><p class="eyebrow">PLAY A LITTLE</p><h2>Games</h2></div></div><section class="games-hub"><button class="game-choice" data-game="snake"><span class="game-art snake-art">〰</span><strong>Snake</strong><small>Collect, grow, survive</small></button><button class="game-choice" data-game="tictactoe"><span class="game-art tic-art">×○</span><strong>Tic-Tac-Toe</strong><small>Challenge a friend</small></button></section><section class="game-stage" hidden></section>';
    const hub = root.querySelector('.games-hub');
    const stage = root.querySelector('.game-stage');
    let snakeTimer = null;
    function stopSnake() { if (snakeTimer) window.clearInterval(snakeTimer); snakeTimer = null; }
    function showHub() { stopSnake(); stage.hidden = true; stage.replaceChildren(); hub.hidden = false; }
    function startSnake() {
      hub.hidden = true; stage.hidden = false;
      stage.innerHTML = '<div class="game-bar"><button class="game-back">← Games</button><strong>Snake</strong><span>Score <b class="snake-score">0</b></span></div><div class="snake-board" tabindex="0" aria-label="Snake game board"></div><div class="game-actions"><button class="game-action snake-start">New game</button><div class="snake-arrows"><button data-dir="up">↑</button><button data-dir="left">←</button><button data-dir="down">↓</button><button data-dir="right">→</button></div></div><p class="game-hint">Use arrow keys or buttons. Avoid the edges and your tail.</p>';
      const board = stage.querySelector('.snake-board');
      const score = stage.querySelector('.snake-score');
      let snake, food, direction, nextDirection, points, running;
      const size = 16;
      const randomFood = () => {
        let candidate;
        do { candidate = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) }; }
        while (snake.some(part => part.x === candidate.x && part.y === candidate.y));
        return candidate;
      };
      const render = () => {
        board.replaceChildren();
        const cells = document.createDocumentFragment();
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const cell = document.createElement('span');
          cell.className = `snake-cell${snake.some(part => part.x === x && part.y === y) ? ' snake-part' : ''}${snake[0].x === x && snake[0].y === y ? ' snake-head' : ''}${food.x === x && food.y === y ? ' snake-food' : ''}`;
          cells.append(cell);
        }
        board.append(cells);
      };
      const end = message => {
        running = false; stopSnake();
        const overlay = document.createElement('div');
        overlay.className = 'snake-overlay';
        overlay.innerHTML = '<strong></strong><span></span>';
        overlay.querySelector('strong').textContent = message;
        overlay.querySelector('span').textContent = `Score: ${points} · Press New game to play again`;
        board.append(overlay);
      };
      const tick = () => {
        if (!running) return;
        direction = nextDirection;
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
        const ate = head.x === food.x && head.y === food.y;
        if (head.x < 0 || head.x >= size || head.y < 0 || head.y >= size || snake.slice(0, ate ? snake.length : -1).some(part => part.x === head.x && part.y === head.y)) { end('Game over'); return; }
        snake.unshift(head);
        if (ate) { points += 10; score.textContent = String(points); food = randomFood(); }
        else snake.pop();
        render();
      };
      const start = () => {
        stopSnake();
        snake = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }];
        food = { x: 11, y: 8 }; direction = { x: 1, y: 0 }; nextDirection = { x: 1, y: 0 }; points = 0; running = true;
        score.textContent = '0'; render(); board.focus();
        snakeTimer = window.setInterval(tick, 145);
      };
      const steer = name => {
        const candidate = { up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0} }[name];
        if (candidate && candidate.x !== -direction.x && candidate.y !== -direction.y) nextDirection = candidate;
      };
      stage.querySelector('.game-back').addEventListener('click', showHub);
      stage.querySelector('.snake-start').addEventListener('click', start);
      stage.querySelectorAll('.snake-arrows button').forEach(button => button.addEventListener('click', () => steer(button.dataset.dir)));
      board.addEventListener('keydown', event => {
        const keys = { ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right' };
        if (keys[event.key]) { event.preventDefault(); steer(keys[event.key]); }
      });
      start();
    }
    function startTicTacToe() {
      hub.hidden = true; stage.hidden = false;
      stage.innerHTML = '<div class="game-bar"><button class="game-back">← Games</button><strong>Tic-Tac-Toe</strong><span class="tic-status">X to play</span></div><div class="tic-board"></div><div class="game-actions"><button class="game-action tic-reset">New game</button></div><p class="game-hint">Take turns with a friend on the same screen.</p>';
      const board = stage.querySelector('.tic-board');
      const status = stage.querySelector('.tic-status');
      let cells = Array(9).fill('');
      let current = 'X';
      let finished = false;
      const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      const render = () => {
        board.replaceChildren();
        cells.forEach((value, index) => {
          const button = document.createElement('button');
          button.className = `tic-cell ${value ? `tic-${value.toLowerCase()}` : ''}`;
          button.setAttribute('aria-label', `Square ${index + 1}${value ? `, ${value}` : ', empty'}`);
          button.textContent = value;
          button.disabled = Boolean(value) || finished;
          button.addEventListener('click', () => play(index));
          board.append(button);
        });
      };
      const play = index => {
        if (cells[index] || finished) return;
        cells[index] = current;
        const winner = wins.find(combo => combo.every(position => cells[position] === current));
        if (winner) {
          finished = true; status.textContent = `${current} wins!`;
          winner.forEach(position => board.children[position].classList.add('tic-winner'));
        } else if (cells.every(Boolean)) { finished = true; status.textContent = 'It is a draw'; }
        else { current = current === 'X' ? 'O' : 'X'; status.textContent = `${current} to play`; }
        render();
        if (winner) winner.forEach(position => board.children[position].classList.add('tic-winner'));
      };
      stage.querySelector('.game-back').addEventListener('click', showHub);
      stage.querySelector('.tic-reset').addEventListener('click', () => startTicTacToe());
      render();
    }
    root.querySelectorAll('.game-choice').forEach(button => button.addEventListener('click', () => button.dataset.game === 'snake' ? startSnake() : startTicTacToe()));
    root._nexusCleanup = stopSnake;
    return root;
  }
  window.NexusGames = { create };
})();
