const CELL_TYPES = {
  INVALID: '-',
  EMPTY: 0,
  PEG: 1
};

const DIRECTIONS = [
  { dx: 0, dy: 2 }, { dx: 0, dy: -2 },
  { dx: 2, dy: 0 }, { dx: -2, dy: 0 }
];

/**
 * The Memento interface provides a way to retrieve the memento's metadata.
 */
class Memento {
  getState(){ throw new Error("Not implemented"); }
  getName() { throw new Error("Not implemented"); }
  getDate() { throw new Error("Not implemented"); }
}

/**
 * The Concrete Memento contains the structure to store the Originator's state.
 */
class ConcreteMemento extends Memento {
  constructor(state) {
    super();
    // Deep copy the state to ensure immutability
    this.state = JSON.parse(JSON.stringify(state));
    this.date = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  getState() { return this.state; }

  getName() {
    const pegCount = this.state.board.flat()
      .filter(v => v === CELL_TYPES.PEG).length;
    return `${this.date} / (${pegCount} pegs left)`;
  }

  getDate() { return this.date; }
}

/**
 * The Originator holds the game state and business logic.
 * It can save its state to a memento and restore from one.
 */
class Originator {
  constructor(layout) {
    this.initialLayout = layout;
    // Initial state setup
    this.state = {
      board: this.initialLayout.map(row => [...row]),
      selectedPeg: null
    };
  }

  /**
   * Saves the current state inside a memento.
   */
  save() { return new ConcreteMemento(this.state); }

  /**
   * Restores the Originator's state from a memento object.
   */
  restore(memento) {
    const savedState = memento.getState();
    this.state.board = savedState.board.map(row => [...row]);
    this.state.selectedPeg = savedState.selectedPeg ? {
      ...savedState.selectedPeg
    } : null;
  }

  /**
   * Resets the state to the initial layout.
   */
  restartGame() {
    this.state.board = this.initialLayout.map(row => [...row]);
    this.state.selectedPeg = null;
  }

  selectCell(r, c) {
    const cell = this.state.board[r][c];

    if (cell === CELL_TYPES.PEG) {
      this.state.selectedPeg = (
        this.state.selectedPeg?.r === r && this.state.selectedPeg?.c === c
      ) ? null : { r, c };
      return { type: 'SELECT' };
    }

    if (cell === CELL_TYPES.EMPTY && this.state.selectedPeg) {
      const moveResult = this.tryMove(
        this.state.selectedPeg.r, this.state.selectedPeg.c, r, c
      );
      if (moveResult) {
        this.state.selectedPeg = null;
        return { type: 'MOVE_SUCCESS' };
      }
    }

    return { type: 'NO_ACTION' };
  }

  tryMove(fr, fc, tr, tc) {
    const dr = tr - fr;
    const dc = tc - fc;

    const isValidDistance =
      (Math.abs(dr) === 2 && dc === 0) || (Math.abs(dc) === 2 && dr === 0);

    if (!isValidDistance) return false;

    const mr = fr + dr / 2;
    const mc = fc + dc / 2;

    if (this.state.board[mr][mc] !== CELL_TYPES.PEG) return false;

    // State modification
    this.state.board[fr][fc] = CELL_TYPES.EMPTY;
    this.state.board[mr][mc] = CELL_TYPES.EMPTY;
    this.state.board[tr][tc] = CELL_TYPES.PEG;

    return true;
  }

  checkGameState() {
    let pegs = 0;
    let possibleMoves = 0;
    const board = this.state.board;

    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (board[r][c] === CELL_TYPES.PEG) {
          pegs++;
          for (const { dx, dy } of DIRECTIONS) {
            const nr = r + dx, nc = c + dy;
            const mr = r + dx / 2, mc = c + dy / 2;
            if (
              board[nr]?.[nc] === CELL_TYPES.EMPTY &&
              board[mr]?.[mc] === CELL_TYPES.PEG
            ) {
              possibleMoves++;
            }
          }
        }
      }
    }

    return {
      isGameOver: pegs === 1 || possibleMoves === 0,
      isWin: pegs === 1,
      pegsRemaining: pegs
    };
  }
}

/**
 * The Caretaker works with mementos via the Memento interface.
 * It doesn't have access to the originator's internal state.
 */
class Caretaker {
  constructor(originator) {
    this.mementos = [];
    this.originator = originator;
  }

  backup() { this.mementos.push(this.originator.save()); }

  undo() {
    if (!this.mementos.length) return;
    const memento = this.mementos.pop();
    this.originator.restore(memento);
  }
}

/**
 * Handles the interaction between the User, Originator, and Caretaker.
 */
class UI {
  constructor(originator, caretaker) {
    this.originator = originator;
    this.caretaker = caretaker;
    this.gameStarted = false;
    this.timerInterval = null;
    this.startTime = null;

    this.elements = {
      board: document.getElementById("board"),
      startButton: document.getElementById("startButton"),
      undoButton: document.getElementById("undoButton"),
      tutorialButton: document.getElementById("tutorialButton"),
      stopButton: document.getElementById("stopButton"),
      message: document.getElementById("message"),
      timer: document.getElementById("timer"),
      overlay: document.getElementById("board-overlay")
    };

    this.initialUIState = {
      gameStarted: false,
      buttonText: this.elements.startButton.textContent,
      undoButtonDisplay: this.elements.undoButton.style.display,
      tutorialButtonDisplay: this.elements.tutorialButton.style.display,
      stopButtonDisplay: this.elements.stopButton.style.display,
      messageText: "",
      timerText: "00:00",
      overlayOpacity:
        this.elements.overlay ? this.elements.overlay.style.opacity : "1",
      controlsClass: document.querySelector(".controls").className
    };

    this.initEventListeners();
  }

  initEventListeners() {
    this.elements.startButton.onclick = () => this.handleStartRestart();
    this.elements.undoButton.onclick = () => this.handleUndo();
    this.elements.tutorialButton.onclick = () => this.handleTutorial();
    this.elements.stopButton.onclick = () => this.handleStop();
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "z") this.handleUndo();
    });
  }

  handleStartRestart() {
    if (this.gameStarted) {
      this.stopTimer();
      this.elements.message.textContent = "";
      this.elements.timer.textContent = "00:00";
    }
    this.startGame();
  }

  startGame() {
    this.gameStarted = true;
    this.originator.restartGame();
    this.caretaker.mementos = []; // Clear history on new game

    const controls = document.querySelector(".controls");
    controls.classList.add("grid");

    this.elements.startButton.textContent = "Reiniciar";
    this.elements.undoButton.style.display = "inline-block";
    this.elements.tutorialButton.style.display = "inline-block";
    this.elements.stopButton.style.display = "inline-block";

    if (this.elements.overlay) this.elements.overlay.style.opacity = "0";

    this.startTimer();
    this.render();
  }

  handleUndo() {
    this.caretaker.undo();
    this.render();
  }

  handleTutorial() {
    const tutorialModal = document.getElementById("tutorialModal");
    const closeTutorialButton = document.getElementById("close");

    tutorialModal.showModal();

    closeTutorialButton.onclick = () => {
      tutorialModal.close();
    };
  }

  handleStop() {
    this.resetUI();
  }

  /**
   * Resets the UI to its initial state without reloading the window.
   */
  resetUI() {
    this.stopTimer();
    this.gameStarted = this.initialUIState.gameStarted;
    this.elements.startButton.textContent = this.initialUIState.buttonText;
    this.elements.undoButton.style.display =
      this.initialUIState.undoButtonDisplay;
    this.elements.tutorialButton.style.display =
      this.initialUIState.tutorialButtonDisplay;
    this.elements.stopButton.style.display =
      this.initialUIState.stopButtonDisplay;
    this.elements.message.textContent = this.initialUIState.messageText;
    this.elements.timer.textContent = this.initialUIState.timerText;
    
    if (this.elements.overlay) {
      this.elements.overlay.style.opacity = this.initialUIState.overlayOpacity;
    }

    const controls = document.querySelector(".controls");
    controls.className = this.initialUIState.controlsClass;

    this.originator.restartGame();
    this.caretaker.mementos = [];
    this.render();
  }

  handleCellClick(r, c) {
    if (!this.gameStarted) return;

    const cell = this.originator.state.board[r][c];

    if (cell === CELL_TYPES.EMPTY && this.originator.state.selectedPeg)
      this.caretaker.backup();

    const result = this.originator.selectCell(r, c);
    
    if (result.type !== 'NO_ACTION') {
      this.render();

      if (result.type === 'MOVE_SUCCESS') this.checkGameStatus();
    }
  }

  checkGameStatus() {
    const status = this.originator.checkGameState();

    if (status.isGameOver) {
      this.stopTimer();
      this.gameStarted = false;
      this.elements.message.textContent = status.isWin 
        ? "Perfect! You won! 🎉" 
        : `Game Over. ${status.pegsRemaining} pegs left.`;
    } else {
      this.elements.message.textContent = "";
    }
  }

  startTimer() {
    clearInterval(this.timerInterval);
    this.startTime = Date.now();
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  stopTimer() { clearInterval(this.timerInterval); }

  updateTimer() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    this.elements.timer.textContent = `${mins}:${secs}`;
  }

  render() {
    const { board, selectedPeg } = this.originator.state;
    this.elements.board.innerHTML = "";

    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        const cellEl = document.createElement("div");
        cellEl.className = "cell";

        if (cell === CELL_TYPES.INVALID) {
          cellEl.classList.add("invalid");
        } else {
          const pegEl = document.createElement("div");
          pegEl.className = cell === CELL_TYPES.PEG ? "peg" : "empty";
          if (
            cell === CELL_TYPES.PEG &&
            selectedPeg?.r === r &&
            selectedPeg?.c === c
          ) {
            pegEl.classList.add("selected");
          }
          if (this.gameStarted) {
            pegEl.onclick = () => this.handleCellClick(r, c);
          }
          cellEl.appendChild(pegEl);
        }
        this.elements.board.appendChild(cellEl);
      });
    });
  }
}

const initialBoardLayout = [
  ['-','-', 1, 1, 1,'-','-'],
  ['-','-', 1, 1, 1,'-','-'],
  [ 1 , 1 , 1, 1, 1, 1 , 1 ],
  [ 1 , 1 , 1, 0, 1, 1 , 1 ],
  [ 1 , 1 , 1, 1, 1, 1 , 1 ],
  ['-','-', 1, 1, 1,'-','-'],
  ['-','-', 1, 1, 1,'-','-']
];

const originator = new Originator(initialBoardLayout);
const caretaker = new Caretaker(originator);
const gameUI = new UI(originator, caretaker);

gameUI.render();
