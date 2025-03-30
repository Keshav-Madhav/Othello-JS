document.addEventListener("DOMContentLoaded", () => {
  const boardSize = 8;
  let board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
  let currentPlayer = 0; // 0 for Black, 1 for White

  // Initial setup
  board[3][3] = 1;
  board[3][4] = 0;
  board[4][3] = 0;
  board[4][4] = 1;

  function renderBoard() {
      document.querySelectorAll(".square").forEach(square => {
          square.innerHTML = "";
          const row = parseInt(square.dataset.row);
          const col = parseInt(square.dataset.col);
          
          if (board[row][col] !== null) {
              const disc = document.createElement("div");
              disc.classList.add("disc", board[row][col] === 0 ? "black" : "white");
              square.appendChild(disc);
          }
      });

      updateStatusBar(currentPlayer);
  }

  function updateStatusBar(currentPlayer) {
    const blackCount = document.querySelectorAll('.disc.black').length;
    const whiteCount = document.querySelectorAll('.disc.white').length;

    document.getElementById('black-score').textContent = blackCount;
    document.getElementById('white-score').textContent = whiteCount;

    document.getElementById('turn-indicator').textContent = currentPlayer === 0 ? "Black's turn" : "White's turn";
}


  function isValidMove(row, col, player) {
      if (board[row][col] !== null) return false;
      let valid = false;
      
      const directions = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],         [0, 1],
          [1, -1], [1, 0], [1, 1]
      ];
      
      for (const [dx, dy] of directions) {
          let r = row + dx;
          let c = col + dy;
          let flipped = false;
          
          while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] !== null && board[r][c] !== player) {
              r += dx;
              c += dy;
              flipped = true;
          }
          
          if (flipped && r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
              valid = true;
          }
      }
      return valid;
  }

  function getValidMoves(player) {
      let validMoves = [];
      for (let row = 0; row < boardSize; row++) {
          for (let col = 0; col < boardSize; col++) {
              if (isValidMove(row, col, player)) {
                  validMoves.push([row, col]);
              }
          }
      }
      return validMoves;
  }

  function highlightValidMoves() {
      document.querySelectorAll(".square").forEach(square => square.classList.remove("valid-move"));
      getValidMoves(currentPlayer).forEach(([row, col]) => {
          document.querySelector(`.square[data-row='${row}'][data-col='${col}']`).classList.add("valid-move");
      });
  }

  function makeMove(row, col) {
      if (!isValidMove(row, col, currentPlayer)) return;
      
      board[row][col] = currentPlayer;
      
      const directions = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],         [0, 1],
          [1, -1], [1, 0], [1, 1]
      ];
      
      for (const [dx, dy] of directions) {
          let r = row + dx;
          let c = col + dy;
          let path = [];
          
          while (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] !== null && board[r][c] !== currentPlayer) {
              path.push([r, c]);
              r += dx;
              c += dy;
          }
          
          if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === currentPlayer) {
              path.forEach(([pr, pc]) => board[pr][pc] = currentPlayer);
          }
      }
      
      renderBoard();
      switchTurn();
  }

  function switchTurn() {
      currentPlayer = 1 - currentPlayer;
      let validMoves = getValidMoves(currentPlayer);
      
      if (validMoves.length === 0) {
          currentPlayer = 1 - currentPlayer;
          validMoves = getValidMoves(currentPlayer);
          
          if (validMoves.length === 0) {
              endGame();
              return;
          }
      }
      
      renderBoard();
      highlightValidMoves();
      updateStatusBar(currentPlayer);
  }

  function endGame() {
      alert("Game over! No more valid moves.");
  }

  document.querySelectorAll(".square").forEach(square => {
      square.addEventListener("click", () => {
          const row = parseInt(square.dataset.row);
          const col = parseInt(square.dataset.col);
          makeMove(row, col);
      });
  });

  renderBoard();
  highlightValidMoves();
});
