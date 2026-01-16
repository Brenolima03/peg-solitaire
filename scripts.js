const initialBoardLayout = [
  ['-','-', 1, 1, 1,'-','-'],
  ['-','-', 1, 1, 1,'-','-'],
  [ 1 , 1 , 1, 1, 1, 1 , 1 ],
  [ 1 , 1 , 1, 0, 1, 1 , 1 ],
  [ 1 , 1 , 1, 1, 1, 1 , 1 ],
  ['-','-', 1, 1, 1,'-','-'],
  ['-','-', 1, 1, 1,'-','-']
];

let board = [];
let selectedPeg = null;
let gameOver = false;
let gameStarted = false;
let startTime = null;
let timerInterval = null;

function initBoardState() {
  board = initialBoardLayout.map(r => [...r]);
}

function handleActionButton() {
  const btn = document.getElementById('actionButton');
  if (!gameStarted) {
    gameStarted = true;
    btn.textContent = "Restart";
    document.getElementById('board-overlay').style.opacity = "0";
    startTimer();
    initBoardState();
    renderBoard();
  } else {
    restartGame();
  }
}

function startTimer() {
  clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

function stopTimer() {
  clearInterval(timerInterval);
}

function restartGame() {
  selectedPeg = null;
  gameOver = false;
  document.getElementById("message").textContent = "";
  document.getElementById('timer').textContent = "00:00";
  startTimer();
  initBoardState();
  renderBoard();
}

function handleCellClick(i, j) {
  if (gameOver || !gameStarted) return;

  const cellValue = board[i][j];

  if (cellValue === 1) {
    if (selectedPeg && selectedPeg.x === i && selectedPeg.y === j) {
      selectedPeg = null;
    } else {
      selectedPeg = {x: i, y: j};
    }
  } 
  else if (cellValue === 0 && selectedPeg) {
    if (tryMove(selectedPeg.x, selectedPeg.y, i, j)) {
      selectedPeg = null;
      checkGameState();
    }
  }

  renderBoard();
}

function tryMove(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (
    !((Math.abs(dx) === 2 && dy === 0) || (Math.abs(dy) === 2 && dx === 0))
  ) return false;

  const midX = fromX + dx / 2;
  const midY = fromY + dy / 2;

  if (board[midX][midY] !== 1) return false;

  board[fromX][fromY] = 0;
  board[midX][midY] = 0;
  board[toX][toY] = 1;
  return true;
}

function renderBoard() {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";

  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      const cellContainer = document.createElement("div");
      cellContainer.className = "cell";

      const val = board[i][j];
      if (val === '-') {
        cellContainer.classList.add("invalid");
      } else {
        const element = document.createElement("div");
        if (val === 1) {
          element.className = "peg";
          if (selectedPeg && selectedPeg.x === i && selectedPeg.y === j) {
            element.classList.add("selected");
          }
        } else {
          element.className = "empty";
        }

        // Only add click listener if game is started
        if (gameStarted) {
          element.onclick = () => handleCellClick(i, j);
        }

        cellContainer.appendChild(element);
      }

      boardDiv.appendChild(cellContainer);
    }
  }
}

function checkGameState() {
  let pegCount = 0;
  let possibleMoves = 0;
  const rows = board.length;
  const cols = board[0].length;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i][j] === 1) {
        pegCount++;
        const directions = [[0,2], [0,-2], [2,0], [-2,0]];
        for (const [dx, dy] of directions) {
          const nx = i + dx;
          const ny = j + dy;
          const mx = i + dx/2;
          const my = j + dy/2;
          if (
            nx >= 0 && nx < rows && ny >= 0 && ny < cols && 
            board[nx][ny] === 0 && board[mx][my] === 1
          ) {
            possibleMoves++;
          }
        }
      }
    }
  }

  const messageDiv = document.getElementById("message");
  if (pegCount === 1) {
    gameOver = true;
    stopTimer();
    messageDiv.textContent = "Perfect! You won! 🎉";
    messageDiv.style.color = "#2ed573";
  } else if (possibleMoves === 0) {
    gameOver = true;
    stopTimer();
    messageDiv.textContent = `Game Over. ${pegCount} pegs left.`;
    messageDiv.style.color = "#ff4757";
  } else {
    messageDiv.textContent = "";
  }
}

initBoardState();
renderBoard();
