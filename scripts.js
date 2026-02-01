const CELL_TYPES = { INVALID: '-', EMPTY: 0, PEG: 1 };
const DIRECTIONS = [
  { dx: 0, dy: 2 }, { dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: -2, dy: 0 }
];

class ConcreteMemento {
  constructor(state) {
    this.state = JSON.parse(JSON.stringify(state));
    this.date = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  getState() { return this.state; }

  getName() { return `${this.date}`; }

  getDate() { return this.date; }
}

class Originator {
  constructor(layout) {
    this.initialLayout = layout;
    this.reset();
  }

  reset() {
    this.state = {
      board: this.initialLayout.map(row => [...row]),
      selectedPeg: null
    };
  }

  save() { return new ConcreteMemento(this.state); }

  restore(memento) {
    const { board, selectedPeg } = memento.getState();
    this.state = {
      board: board.map(row => [...row]),
      selectedPeg: selectedPeg ? { ...selectedPeg } : null
    };
  }

  selectCell(r, c) {
    const cell = this.state.board[r][c];

    if (cell === CELL_TYPES.PEG) {
      this.state.selectedPeg = (
        this.state.selectedPeg?.r === r &&
        this.state.selectedPeg?.c === c
      ) ? null : { r, c };
      return 'SELECT';
    }

    if (
      cell === CELL_TYPES.EMPTY &&
      this.state.selectedPeg &&
      this.tryMove(this.state.selectedPeg.r, this.state.selectedPeg.c, r, c)
    ) {
      this.state.selectedPeg = null;
      return 'MOVE';
    }

    return null;
  }

  tryMove(fr, fc, tr, tc) {
    const dr = tr - fr;
    const dc = tc - fc;

    if (!((Math.abs(dr) === 2 && dc === 0) || (Math.abs(dc) === 2 && dr === 0)))
      return false;

    const mr = fr + dr / 2;
    const mc = fc + dc / 2;

    if (this.state.board[mr][mc] !== CELL_TYPES.PEG) return false;

    this.state.board[fr][fc] = CELL_TYPES.EMPTY;
    this.state.board[mr][mc] = CELL_TYPES.EMPTY;
    this.state.board[tr][tc] = CELL_TYPES.PEG;

    return true;
  }

  checkGameState() {
    let pegs = 0;
    let moves = 0;

    this.state.board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell !== CELL_TYPES.PEG) return;

        pegs++;

        DIRECTIONS.forEach(({ dx, dy }) => {
          if (
            this.state.board[r + dx]?.[c + dy] === CELL_TYPES.EMPTY &&
            this.state.board[r + dx / 2]?.[c + dy / 2] === CELL_TYPES.PEG
          ) moves++;
        });
      });
    });

    return { isOver: pegs === 1 || moves === 0, isWin: pegs === 1, pegs };
  }
}

class Caretaker {
  constructor(originator) {
    this.originator = originator;
    this.mementos = [];
  }

  backup() { this.mementos.push(this.originator.save()); }

  undo() {
    if (!this.mementos.length) return false;
    this.originator.restore(this.mementos.pop());
    return true;
  }

  clear() { this.mementos = []; }

  showHistory() {
    console.log('Caretaker: Here\'s the list of mementos:');
    this.mementos.forEach(m => console.log(m.getName()));
  }
}

class GameUI {
  constructor(originator, caretaker) {
    this.originator = originator;
    this.caretaker = caretaker;
    this.gameStarted = false;
    this.startTime = null;
    this.timerInterval = null;
    this.cacheElements();
    this.attachListeners();
    this.setUI('idle');
  }

  cacheElements() {
    this.el = {
      startBtn: document.getElementById('startButton'),
      restartBtn: document.getElementById('restartButton'),
      undoBtn: document.getElementById('undoButton'),
      tutorialBtn: document.getElementById('tutorialButton'),
      stopBtn: document.getElementById('stopButton'),
      message: document.getElementById('message'),
      timer: document.getElementById('timer'),
      overlay: document.getElementById('board-overlay'),
      board: document.getElementById('board'),
      controls: document.querySelector('.controls')
    };

    this.initialTimer = this.el.timer.textContent;
    this.initialMessage = this.el.message.textContent;
  }

  attachListeners() {
    document.removeEventListener('keydown', this.keyHandler);

    this.keyHandler = (e) => {
      if (e.ctrlKey && e.key === 'z') this.handleUndo();
    };

    document.addEventListener('keydown', this.keyHandler);

    this.el.startBtn.onclick = () =>
      this.gameStarted ? this.resetUI() : this.startGame();
    this.el.restartBtn.onclick = () => this.handleRestart();
    this.el.undoBtn.onclick = () => this.handleUndo();
    this.el.tutorialBtn.onclick = () => this.handleTutorial();
    this.el.stopBtn.onclick = () => this.handleStop();
  }

  setUI(state) {
    const playing = state === 'playing';

    this.el.startBtn.style.display = playing ? 'none' : 'inline-block';

    [
      this.el.restartBtn, this.el.undoBtn, this.el.tutorialBtn, this.el.stopBtn
    ].forEach(btn => btn.style.display = playing ? 'inline-block' : 'none');

    this.el.controls.classList.toggle('grid', playing);
    this.el.overlay.style.opacity = playing ? '0' : '1';
  }

  startTimer() {
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => {
      const t = Math.floor((Date.now() - this.startTime) / 1000);
      const m = String((t / 60) | 0).padStart(2, '0');
      const s = String(t % 60).padStart(2, '0');
      this.el.timer.textContent = `${m}:${s}`;
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  resetTimer() {
    this.stopTimer();
    this.startTime = null;
    this.el.timer.textContent = this.initialTimer;
  }

  resetGameState() {
    this.gameStarted = false;
    this.originator.reset();
    this.caretaker.clear();
  }

  startGame() {
    this.resetTimer();
    this.resetGameState();
    this.gameStarted = true;
    this.el.message.textContent = this.initialMessage;
    this.setUI('playing');
    this.startTimer();
    this.render();
  }

  resetUI() {
    this.resetTimer();
    this.resetGameState();
    this.el.message.textContent = this.initialMessage;
    this.setUI('idle');
    this.render();
  }

  handleRestart() {
    this.resetUI();
    this.startGame();
  }

  handleStop() { this.resetUI(); }

  handleUndo() { if (this.caretaker.undo()) this.render(); }

  handleTutorial() {
    const modal = document.getElementById('tutorialModal');
    modal.showModal();
    document.getElementById('close').onclick = () => modal.close();
  }

  handleCellClick(r, c) {
    if (!this.gameStarted) return;

    if (
      this.originator.state.board[r][c] === CELL_TYPES.EMPTY &&
      this.originator.state.selectedPeg
    ) this.caretaker.backup();

    const result = this.originator.selectCell(r, c);

    if (result) {
      this.render();

      if (result === 'MOVE') {
        const { isOver, isWin, pegs } = this.originator.checkGameState();

        if (isOver) {
          this.gameStarted = false;
          this.stopTimer();
          this.setUI('idle');
          this.el.message.textContent =
            isWin ? 'Você venceu! 🎉' : `Fim de jogo. ${pegs} peças faltando.`;
        }
      }
    }
  }

  render() {
    const { board, selectedPeg } = this.originator.state;
    this.el.board.innerHTML = '';

    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        const cellEl = document.createElement('div');
        cellEl.className =
          cell === CELL_TYPES.INVALID ? 'cell invalid' : 'cell';

        if (cell !== CELL_TYPES.INVALID) {
          const pegEl = document.createElement('div');

          pegEl.className =
            (cell === CELL_TYPES.PEG ? 'peg' : 'empty') +
            (
              cell === CELL_TYPES.PEG &&
              selectedPeg?.r === r &&
              selectedPeg?.c === c ? ' selected' : ''
            );

          if (this.gameStarted)
            pegEl.onclick = () => this.handleCellClick(r, c);

          cellEl.appendChild(pegEl);
        }

        this.el.board.appendChild(cellEl);
      });
    });
  }
}

const layout = [
  ['-','-', 1, 1, 1,'-','-'],
  ['-','-', 1, 1, 1,'-','-'],
  [ 1 , 1 , 1, 1, 1, 1 , 1 ],
  [ 1 , 1 , 1, 0, 1, 1 , 1 ],
  [ 1 , 1 , 1, 1, 1, 1 , 1 ],
  ['-','-', 1, 1, 1,'-','-'],
  ['-','-', 1, 1, 1,'-','-']
];

const originator = new Originator(layout);
const caretaker = new Caretaker(originator);
const gameUI = new GameUI(originator, caretaker);
gameUI.render();
