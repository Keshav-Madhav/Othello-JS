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
  const squares = document.querySelectorAll('.square');
  const blackScoreElement = document.getElementById('black-score');
  const whiteScoreElement = document.getElementById('white-score');
  const turnIndicatorElement = document.getElementById('turn-indicator');
  const gameOverModal = document.getElementById('game-over-modal');
  const finalBlackScore = document.getElementById('final-black-score');
  const finalWhiteScore = document.getElementById('final-white-score');
  const winnerText = document.getElementById('winner-text');
  const newGameBtn = document.getElementById('new-game-btn');
  
  // Connection panel elements
  const createGameBtn = document.getElementById('create-game-btn');
  const joinGameBtn = document.getElementById('join-game-btn');
  const roomIdContainer = document.getElementById('room-id-container');
  const roomIdText = document.getElementById('room-id-text');
  const copyRoomIdBtn = document.getElementById('copy-room-id');
  const joinRoomContainer = document.getElementById('join-room-container');
  const roomIdInput = document.getElementById('room-id-input');
  const connectBtn = document.getElementById('connect-btn');
  const statusMessage = document.getElementById('status-message');
  const connectionPanel = document.querySelector('.connection-panel');

  initializeBoardFromDOM();
  setupEventListeners();

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

  function setupEventListeners() {
    // Game board event listeners
    squares.forEach(square => {
      square.addEventListener('click', () => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        handleMoveAttempt(row, col);
      });
    });

    // Connection panel event listeners
    createGameBtn.addEventListener('click', handleCreateGame);
    joinGameBtn.addEventListener('click', handleJoinGame);
    connectBtn.addEventListener('click', handleConnect);
    copyRoomIdBtn.addEventListener('click', copyRoomId);
    newGameBtn.addEventListener('click', resetGame);
  }

  async function handleCreateGame() {
    console.log("Creating game...");
    createGameBtn.disabled = true;
    joinGameBtn.disabled = true;
    updateStatus("Creating game...");
    
    try {
      gameConnection = new GameConnection();
      await gameConnection.initialize();
      const roomId = await gameConnection.createRoom();
      localPlayer = PLAYER.BLACK;
      
      roomIdText.textContent = roomId;
      roomIdContainer.classList.remove('hidden');
      updateStatus("Waiting for opponent to join...");
      
      gameConnection.onOpponentConnected = () => {
        isConnected = true;
        connectionPanel.classList.add('hidden');
        gameConnection.sendData({ type: 'init', board, currentPlayer });
        renderBoard();
        highlightValidMoves();
        updateStatus("Opponent connected! Game started.");
      };

      gameConnection.onDataReceived = handleNetworkData;
    } catch (error) {
      updateStatus(`Error creating room: ${error.message}`, true);
      createGameBtn.disabled = false;
      joinGameBtn.disabled = false;
    }
  }

  function handleJoinGame() {
    createGameBtn.disabled = true;
    joinGameBtn.disabled = true;
    joinRoomContainer.classList.remove('hidden');
  }

  async function handleConnect() {
    const roomId = roomIdInput.value.trim();
    if (!roomId) {
      updateStatus("Please enter a room ID", true);
      return;
    }

    updateStatus("Connecting to game...");
    connectBtn.disabled = true;
    
    try {
      gameConnection = new GameConnection();
      await gameConnection.initialize();
      await gameConnection.joinRoom(roomId);
      
      localPlayer = PLAYER.WHITE;
      isConnected = true;
      connectionPanel.classList.add('hidden');
      
      gameConnection.onDataReceived = handleNetworkData;
      updateStatus("Connected! Waiting for game data...");
    } catch (error) {
      updateStatus(`Error joining room: ${error.message}`, true);
      connectBtn.disabled = false;
    }
  }

  function copyRoomId() {
    const roomId = roomIdText.textContent;
    navigator.clipboard.writeText(roomId)
      .then(() => {
        updateStatus("Room ID copied to clipboard!");
      })
      .catch(err => {
        updateStatus("Failed to copy room ID", true);
      });
  }

  function updateStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle('error', isError);
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
      updateStatus("Not connected to opponent!", true);
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
    const blackCount = countDiscs(PLAYER.BLACK);
    const whiteCount = countDiscs(PLAYER.WHITE);

    blackScoreElement.textContent = blackCount;
    whiteScoreElement.textContent = whiteCount;
    turnIndicatorElement.textContent = 
      currentPlayer === PLAYER.BLACK ? "Black's turn" : "White's turn";
  }

  function countDiscs(player) {
    let count = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col] === player) {
          count++;
        }
      }
    }
    return count;
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
    const blackCount = countDiscs(PLAYER.BLACK);
    const whiteCount = countDiscs(PLAYER.WHITE);
    
    finalBlackScore.textContent = blackCount;
    finalWhiteScore.textContent = whiteCount;
    
    if (blackCount > whiteCount) {
      winnerText.textContent = "Black wins!";
    } else if (whiteCount > blackCount) {
      winnerText.textContent = "White wins!";
    } else {
      winnerText.textContent = "It's a tie!";
    }
    
    gameOverModal.classList.remove('hidden');
  }

  function resetGame() {
    // Reset the board to initial state
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    board[3][3] = PLAYER.WHITE;
    board[3][4] = PLAYER.BLACK;
    board[4][3] = PLAYER.BLACK;
    board[4][4] = PLAYER.WHITE;
    
    currentPlayer = PLAYER.BLACK;
    
    // Hide the game over modal
    gameOverModal.classList.add('hidden');
    
    // Reset connection panel
    connectionPanel.classList.remove('hidden');
    roomIdContainer.classList.add('hidden');
    joinRoomContainer.classList.add('hidden');
    createGameBtn.disabled = false;
    joinGameBtn.disabled = false;
    connectBtn.disabled = false;
    statusMessage.textContent = "";
    
    // Reset connection status
    isConnected = false;
    gameConnection = null;
    
    // Render the board
    renderBoard();
  }
});