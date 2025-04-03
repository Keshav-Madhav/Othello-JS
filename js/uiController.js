import { PLAYER } from './constants.js';

export class UIController {
  constructor() {
    this.cacheDOMElements();
    this.setupEventListeners();
  }

  cacheDOMElements() {
    this.squares = document.querySelectorAll('.square');
    this.blackScoreElement = document.getElementById('black-score');
    this.whiteScoreElement = document.getElementById('white-score');
    this.turnIndicatorElement = document.getElementById('turn-indicator');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.finalBlackScore = document.getElementById('final-black-score');
    this.finalWhiteScore = document.getElementById('final-white-score');
    this.winnerText = document.getElementById('winner-text');
    this.newGameBtn = document.getElementById('new-game-btn');
    
    // Connection panel elements
    this.createGameBtn = document.getElementById('create-game-btn');
    this.joinGameBtn = document.getElementById('join-game-btn');
    this.aiControls = document.getElementById('ai-controls');
    this.playComputerEasy = document.getElementById('play-computer-easy');
    this.playComputerMedium = document.getElementById('play-computer-medium');
    this.playComputerHard = document.getElementById('play-computer-hard');
    this.roomIdContainer = document.getElementById('room-id-container');
    this.roomIdText = document.getElementById('room-id-text');
    this.copyRoomIdBtn = document.getElementById('copy-room-id');
    this.joinRoomContainer = document.getElementById('join-room-container');
    this.roomIdInput = document.getElementById('room-id-input');
    this.connectBtn = document.getElementById('connect-btn');
    this.statusMessage = document.getElementById('status-message');
    this.connectionPanel = document.querySelector('.connection-panel');
    this.PlayerColorDisplay = document.getElementById('player-color-display');
    this.playerDisc = document.getElementById('player-disc');
  }

  setupEventListeners() {
    this.newGameBtn.addEventListener('click', () => this.onNewGameRequested());
    this.createGameBtn.addEventListener('click', () => this.onCreateGameRequested());
    this.joinGameBtn.addEventListener('click', () => this.onJoinGameRequested());
    this.connectBtn.addEventListener('click', () => this.onConnectRequested());
    this.copyRoomIdBtn.addEventListener('click', () => this.onCopyRoomIdRequested());
    this.playComputerEasy.addEventListener('click', () => this.onPlayComputerRequested(1));
    this.playComputerMedium.addEventListener('click', () => this.onPlayComputerRequested(2));
    this.playComputerHard.addEventListener('click', () => this.onPlayComputerRequested(3));
  }

  initializeBoardFromDOM(board) {
    this.squares.forEach(square => {
      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      const disc = square.querySelector('.disc');
      
      if (disc) {
        board[row][col] = disc.classList.contains('black') ? PLAYER.BLACK : PLAYER.WHITE;
      }
    });
  }

  renderBoard(board) {
    this.squares.forEach(square => {
      square.innerHTML = "";
      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);
      
      if (board[row][col] !== null) {
        const disc = document.createElement("div");
        disc.className = `disc ${board[row][col] === PLAYER.BLACK ? 'black' : 'white'}`;
        square.appendChild(disc);
      }
    });
  }

  updateStatusBar(blackCount, whiteCount, currentPlayer) {
    this.blackScoreElement.textContent = blackCount;
    this.whiteScoreElement.textContent = whiteCount;
    this.turnIndicatorElement.textContent = 
      currentPlayer === PLAYER.BLACK ? "Black's turn" : "White's turn";
  }

  highlightValidMoves(validMoves) {
    this.clearValidMoveHighlights();
    
    validMoves.forEach(([row, col]) => {
      document.querySelector(`.square[data-row='${row}'][data-col='${col}']`)
        .classList.add("valid-move");
    });
  }

  highlightFlippedSquares(flippedSquares) {
    this.clearFlipHighlights();
    
    flippedSquares.forEach(([row, col]) => {
      const square = document.querySelector(`.square[data-row='${row}'][data-col='${col}']`);
      if (square) {
        square.classList.add('has-flipped');
      }
    });
  }

  highlightPreviousMove(row, col) {
    this.clearPreviousMoveHighlight();
    
    const square = document.querySelector(`.square[data-row='${row}'][data-col='${col}']`);
    if (square) {
      square.classList.add('prev-move');
    }
  }

  clearValidMoveHighlights() {
    this.squares.forEach(square => {
      square.classList.remove("valid-move");
    });
  }

  clearFlipHighlights() {
    document.querySelectorAll('.has-flipped').forEach(el => {
      el.classList.remove('has-flipped');
    });
  }

  clearPreviousMoveHighlight() {
    document.querySelectorAll('.prev-move').forEach(el => {
      el.classList.remove('prev-move');
    });
  }

  showGameOver(blackCount, whiteCount) {
    this.finalBlackScore.textContent = blackCount;
    this.finalWhiteScore.textContent = whiteCount;
    
    if (blackCount > whiteCount) {
      this.winnerText.textContent = "Black wins!";
    } else if (whiteCount > blackCount) {
      this.winnerText.textContent = "White wins!";
    } else {
      this.winnerText.textContent = "It's a tie!";
    }
    
    this.gameOverModal.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverModal.classList.add('hidden');
  }

  updateStatus(message, isError = false) {
    this.statusMessage.textContent = message;
    this.statusMessage.classList.toggle('error', isError);
  }

  showConnectionPanel() {
    this.connectionPanel.classList.remove('hidden');
    this.roomIdContainer.classList.add('hidden');
    this.joinRoomContainer.classList.add('hidden');
    this.createGameBtn.disabled = false;
    this.joinGameBtn.disabled = false;
    this.aiControls.classList.remove('hidden');
    this.playComputerEasy.disabled = false;
    this.playComputerMedium.disabled = false;
    this.playComputerHard.disabled = false;
    this.connectBtn.disabled = false;
    this.statusMessage.textContent = "";
    this.statusMessage.classList.remove('error');
    this.PlayerColorDisplay.classList.add('hidden');
    this.playerDisc.className = 'disc';
  }

  showPlayerColor(player) {
    this.PlayerColorDisplay.classList.remove('hidden');
    this.playerDisc.className = player === PLAYER.BLACK ? 'black' : 'white';
  }

  // Event handler callbacks (to be set by GameManager)
  setEventHandlers({
    onNewGameRequested,
    onCreateGameRequested,
    onJoinGameRequested,
    onConnectRequested,
    onCopyRoomIdRequested,
    onPlayComputerRequested,
    onSquareClicked
  }) {
    this.onNewGameRequested = onNewGameRequested;
    this.onCreateGameRequested = onCreateGameRequested;
    this.onJoinGameRequested = onJoinGameRequested;
    this.onConnectRequested = onConnectRequested;
    this.onCopyRoomIdRequested = onCopyRoomIdRequested;
    this.onPlayComputerRequested = onPlayComputerRequested;
    
    // Set up square click handlers
    this.squares.forEach(square => {
      square.addEventListener('click', () => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        onSquareClicked(row, col);
      });
    });
  }
}