import { GameConnection } from "./Gameconnection.js";

document.addEventListener("DOMContentLoaded", () => {
  const BOARD_SIZE = 8;
  const PLAYER = {
    BLACK: 0,
    WHITE: 1
  };
  
  let board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  let currentPlayer = PLAYER.BLACK;
  let gameConnection = null;
  let localPlayer = null;
  let isConnected = false;

  // Cache DOM elements
  const gameContainer = document.querySelector('.game-container');
  const squares = document.querySelectorAll('.square');
  const blackScoreElement = document.getElementById('black-score');
  const whiteScoreElement = document.getElementById('white-score');
  const turnIndicatorElement = document.getElementById('turn-indicator');

  const menu = createGameMenu();
  document.body.insertBefore(menu, gameContainer);

  initializeBoardFromDOM();
  setupEventListeners();

  function createGameMenu() {
    const menu = document.createElement('div');
    menu.style.margin = '20px';
    
    const createBtn = document.createElement('button');
    createBtn.textContent = 'Create Game';
    createBtn.style.marginRight = '10px';
    
    const joinBtn = document.createElement('button');
    joinBtn.textContent = 'Join Game';
    
    menu.appendChild(createBtn);
    menu.appendChild(joinBtn);
    
    createBtn.addEventListener('click', handleCreateGame);
    joinBtn.addEventListener('click', handleJoinGame);
    
    return menu;
  }

  function initializeBoardFromDOM() {
    squares.forEach(square => {
      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      const disc = square.querySelector('.disc');
      
      if (disc) {
        board[row][col] = disc.classList.contains('black') ? PLAYER.BLACK : PLAYER.WHITE;
      }
    });
  }

  /**
   * Set up event listeners for game squares
   */
  function setupEventListeners() {
    squares.forEach(square => {
      square.addEventListener('click', () => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        handleMoveAttempt(row, col);
      });
    });
  }

  async function handleCreateGame() {
    try {
      gameConnection = new GameConnection();
      await gameConnection.initialize();
      const roomId = await gameConnection.createRoom();
      localPlayer = PLAYER.BLACK;
      
      alert(`Room created! Share this ID with your opponent: ${roomId}`);
      
      gameConnection.onOpponentConnected = () => {
        isConnected = true;
        menu.style.display = 'none';
        gameConnection.sendData({ type: 'init', board, currentPlayer });
        renderBoard();
        highlightValidMoves();
      };

      gameConnection.onDataReceived = handleNetworkData;
    } catch (error) {
      alert('Error creating room: ' + error.message);
    }
  }

  async function handleJoinGame() {
    const roomId = prompt('Enter room ID:');
    if (!roomId) return;

    try {
      gameConnection = new GameConnection();
      await gameConnection.initialize();
      await gameConnection.joinRoom(roomId);
      
      localPlayer = PLAYER.WHITE;
      isConnected = true;
      menu.style.display = 'none';
      
      gameConnection.onDataReceived = handleNetworkData;
      alert('Joined room. Waiting for game start...');
    } catch (error) {
      alert('Error joining room: ' + error.message);
    }
  }

  function handleNetworkData(data) {
    switch(data.type) {
      case 'init':
      case 'move':
        board = data.board;
        currentPlayer = data.currentPlayer;
        renderBoard();
        checkTurn();
        break;
    }
  }

  function handleMoveAttempt(row, col) {
    if (!isConnected) {
      alert('Not connected to opponent!');
      return;
    }
    
    if (currentPlayer !== localPlayer) {
      return;
    }

    if (isValidMove(row, col, currentPlayer)) {
      makeMove(row, col);
      gameConnection.sendData({ type: 'move', board, currentPlayer });
    }
  }

  function checkTurn() {
    if (checkGameOver()) return;
    
    if (currentPlayer === localPlayer) {
      highlightValidMoves();
    } else {
      clearValidMoveHighlights();
    }
    
    updateStatusBar();
  }

  function clearValidMoveHighlights() {
    document.querySelectorAll('.square').forEach(s => 
      s.classList.remove('valid-move')
    );
  }

  function checkGameOver() {
    const blackMoves = getValidMoves(PLAYER.BLACK).length;
    const whiteMoves = getValidMoves(PLAYER.WHITE).length;
    
    if (blackMoves === 0 && whiteMoves === 0) {
      endGame();
      return true;
    }
    
    return false;
  }

  function renderBoard() {
    squares.forEach(square => {
      square.innerHTML = "";
      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      
      if (board[row][col] !== null) {
        const disc = document.createElement("div");
        disc.className = `disc ${board[row][col] === PLAYER.BLACK ? 'black' : 'white'}`;
        square.appendChild(disc);
      }
    });

    updateStatusBar();
  }

  function updateStatusBar() {
    const blackCount = document.querySelectorAll('.disc.black').length;
    const whiteCount = document.querySelectorAll('.disc.white').length;

    blackScoreElement.textContent = blackCount;
    whiteScoreElement.textContent = whiteCount;
    turnIndicatorElement.textContent = 
      currentPlayer === PLAYER.BLACK ? "Black's turn" : "White's turn";
  }

  function isValidMove(row, col, player) {
    if (board[row][col] !== null) return false;
    
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    return directions.some(([dx, dy]) => {
      let r = row + dx;
      let c = col + dy;
      let hasOpponentDisc = false;
      
      // Look for opponent's discs in this direction
      while (isInBounds(r, c) && board[r][c] !== null && board[r][c] !== player) {
        hasOpponentDisc = true;
        r += dx;
        c += dy;
      }
      
      return hasOpponentDisc && isInBounds(r, c) && board[r][c] === player;
    });
  }

  function isInBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function getValidMoves(player) {
    const validMoves = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (isValidMove(row, col, player)) {
          validMoves.push([row, col]);
        }
      }
    }
    
    return validMoves;
  }

  function highlightValidMoves() {
    clearValidMoveHighlights();
    
    getValidMoves(currentPlayer).forEach(([row, col]) => {
      document.querySelector(`.square[data-row='${row}'][data-col='${col}']`)
        .classList.add("valid-move");
    });
  }

  function makeMove(row, col) {
    board[row][col] = currentPlayer;
    
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dx, dy] of directions) {
      let r = row + dx;
      let c = col + dy;
      let discsToFlip = [];
      
      while (isInBounds(r, c) && board[r][c] !== null && board[r][c] !== currentPlayer) {
        discsToFlip.push([r, c]);
        r += dx;
        c += dy;
      }
      
      if (isInBounds(r, c) && board[r][c] === currentPlayer) {
        discsToFlip.forEach(([flipRow, flipCol]) => {
          board[flipRow][flipCol] = currentPlayer;
        });
      }
    }
    
    switchTurn();
    renderBoard();
  }

  function switchTurn() {
    currentPlayer = 1 - currentPlayer;
    let validMoves = getValidMoves(currentPlayer);
    
    if (validMoves.length === 0) {
      currentPlayer = 1 - currentPlayer;
      validMoves = getValidMoves(currentPlayer);
      
      if (validMoves.length === 0) {
        endGame();
      }
    }
  }

  function endGame() {
    const blackCount = document.querySelectorAll('.disc.black').length;
    const whiteCount = document.querySelectorAll('.disc.white').length;
    
    let message = `Game Over!\nBlack: ${blackCount}, White: ${whiteCount}\n`;
    
    if (blackCount > whiteCount) {
      message += "Black wins!";
    } else if (whiteCount > blackCount) {
      message += "White wins!";
    } else {
      message += "It's a tie!";
    }
    
    alert(message);
  }
});