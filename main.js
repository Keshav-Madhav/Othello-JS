import { GameConnection } from "./GameConnection.js";

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
  let isComputerGame = false;
  let computerDifficulty = 1; // 1: easy, 2: medium, 3: hard

  const POSITION_WEIGHTS = [
    [100, -20, 10, 5, 5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [10, -2, 1, 1, 1, 1, -2, 10],
    [5, -2, 1, 1, 1, 1, -2, 5],
    [5, -2, 1, 1, 1, 1, -2, 5],
    [10, -2, 1, 1, 1, 1, -2, 10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10, 5, 5, 10, -20, 100]
  ];

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
  const aiControls = document.getElementById('ai-controls');
  const playComputerEasy = document.getElementById('play-computer-easy');
  const playComputerMedium = document.getElementById('play-computer-medium');
  const playComputerHard = document.getElementById('play-computer-hard');
  const roomIdContainer = document.getElementById('room-id-container');
  const roomIdText = document.getElementById('room-id-text');
  const copyRoomIdBtn = document.getElementById('copy-room-id');
  const joinRoomContainer = document.getElementById('join-room-container');
  const roomIdInput = document.getElementById('room-id-input');
  const connectBtn = document.getElementById('connect-btn');
  const statusMessage = document.getElementById('status-message');
  const connectionPanel = document.querySelector('.connection-panel');
  const PlayerColorDisplay = document.getElementById('player-color-display');
  const playerDisc = document.getElementById('player-disc');

  initializeBoardFromDOM();
  setupEventListeners();
  checkUrlForMatchId();

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
    playComputerEasy.addEventListener('click', () => {
      computerDifficulty = 1;
      handlePlayComputer();
    });
    playComputerMedium.addEventListener('click', () => {
      computerDifficulty = 2;
      handlePlayComputer();
    });
    playComputerHard.addEventListener('click', () => {
      computerDifficulty = 3;
      handlePlayComputer();
    });
  }

  async function handleCreateGame() {
    console.log("Creating game...");
    createGameBtn.disabled = true;
    joinGameBtn.disabled = true;
    aiControls.classList.add('hidden');
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
        PlayerColorDisplay.classList.remove('hidden');
        playerDisc.className = 'black';
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

  function handlePlayComputer() {
    console.log("Starting game against computer...");
    createGameBtn.disabled = true;
    joinGameBtn.disabled = true;
    playComputerEasy.disabled = true;
    playComputerMedium.disabled = true;
    playComputerHard.disabled = true;
    
    isComputerGame = true;
    localPlayer = PLAYER.BLACK;
    isConnected = true;
    
    connectionPanel.classList.add('hidden');
    PlayerColorDisplay.classList.remove('hidden');
    playerDisc.className = 'black';
    
    renderBoard();
    highlightValidMoves();
    updateStatus("Game against computer started. You are Black.");
  }

  function handleJoinGame() {
    createGameBtn.disabled = true;
    joinGameBtn.disabled = true;
    aiControls.classList.add('hidden');
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
      PlayerColorDisplay.classList.remove('hidden');
      playerDisc.className = 'white';
      
      gameConnection.onDataReceived = handleNetworkData;
      updateStatus("Connected! Waiting for game data...");
    } catch (error) {
      updateStatus(`Error joining room: ${error.message}`, true);
      connectBtn.disabled = false;
    }
  }

  function checkUrlForMatchId() {
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('match_id');
    
    if (matchId) {
      console.log(`Found match_id in URL: ${matchId}`);
      roomIdInput.value = matchId;
      createGameBtn.disabled = true;
      joinGameBtn.disabled = true;
      aiControls.classList.add('hidden');
      joinRoomContainer.classList.remove('hidden');
      
      // Attempt to connect automatically
      handleConnect();
    }
  }

  function copyRoomId() {
    const roomId = roomIdText.textContent;
    navigator.clipboard.writeText(`https://keshav-madhav.github.io/Othello-JS?match_id=${roomId}`)
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
    
    if (currentPlayer !== localPlayer && !isComputerGame) {
      return;
    }

    if (isValidMove(row, col, currentPlayer)) {
      makeMove(row, col);
      
      if (isComputerGame) {
        setTimeout(() => {
          if (currentPlayer !== localPlayer && !checkGameOver()) {
            makeComputerMove();
          }
        }, 500);
      } else {
        // For multiplayer games, send the move to the opponent
        gameConnection.sendData({ type: 'move', board, currentPlayer });
      }
    }
  }

  function makeComputerMove() {
    const validMoves = getValidMoves(currentPlayer);
    if (validMoves.length === 0) {
      switchTurn();
      return;
    }

    let chosenMove;
    
    if (computerDifficulty === 1) {
      // Easy - random move with slight preference for non-edge moves
      const innerMoves = validMoves.filter(([r, c]) => 
        r > 0 && r < 7 && c > 0 && c < 7
      );
      
      if (innerMoves.length > 0 && Math.random() > 0.3) {
        chosenMove = innerMoves[Math.floor(Math.random() * innerMoves.length)];
      } else {
        chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      }
    } 
    else if (computerDifficulty === 2) {
      // Medium - strategic position preference with some randomization
      const weightedMoves = validMoves.map(move => {
        const [row, col] = move;
        let weight = 1;
        
        // Prefer corners strongly
        if ((row === 0 || row === 7) && (col === 0 || col === 7)) {
          weight += 10;
        }
        // Avoid squares adjacent to corners if corner is empty
        else if ((row <= 1 && col <= 1 && board[0][0] === null) ||
                (row <= 1 && col >= 6 && board[0][7] === null) ||
                (row >= 6 && col <= 1 && board[7][0] === null) ||
                (row >= 6 && col >= 6 && board[7][7] === null)) {
          weight -= 5;
        }
        // Prefer edges, but not those adjacent to empty corners
        else if (row === 0 || row === 7 || col === 0 || col === 7) {
          // Check if this edge piece is adjacent to an empty corner
          const isAdjacentToEmptyCorner = 
            (row === 0 && col === 1 && board[0][0] === null) ||
            (row === 0 && col === 6 && board[0][7] === null) ||
            (row === 1 && col === 0 && board[0][0] === null) ||
            (row === 1 && col === 7 && board[0][7] === null) ||
            (row === 6 && col === 0 && board[7][0] === null) ||
            (row === 6 && col === 7 && board[7][7] === null) ||
            (row === 7 && col === 1 && board[7][0] === null) ||
            (row === 7 && col === 6 && board[7][7] === null);
            
          if (!isAdjacentToEmptyCorner) {
            weight += 3;
          }
        }
        
        // Add some randomness
        weight += Math.random() * 0.5;
        
        return { move, weight };
      });
      
      // Sort by weight and pick the highest
      weightedMoves.sort((a, b) => b.weight - a.weight);
      chosenMove = weightedMoves[0].move;
    } 
    else {
      // Hard - advanced positional strategy with board evaluation
      chosenMove = findBestMove(validMoves, 3); // Depth 3 minimax search
    }

    makeMove(chosenMove[0], chosenMove[1]);
  }

  function evaluateBoard(boardState, player) {
    let score = 0;
    const opponent = 1 - player;
    
    // Count pieces and evaluate positional advantage
    let playerCount = 0;
    let opponentCount = 0;
    let playerMobility = 0;
    let opponentMobility = 0;
    let playerPositionalScore = 0;
    let opponentPositionalScore = 0;
    
    // Clone the board for simulation
    const simulatedBoard = boardState.map(row => [...row]);
    
    // Evaluate position scores and count pieces
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (simulatedBoard[row][col] === player) {
          playerCount++;
          playerPositionalScore += POSITION_WEIGHTS[row][col];
        } else if (simulatedBoard[row][col] === opponent) {
          opponentCount++;
          opponentPositionalScore += POSITION_WEIGHTS[row][col];
        }
      }
    }
    
    // Calculate mobility (number of valid moves)
    playerMobility = getValidMovesForBoardState(simulatedBoard, player).length;
    opponentMobility = getValidMovesForBoardState(simulatedBoard, opponent).length;
    
    // Early game: focus on mobility and position
    if (playerCount + opponentCount < 20) {
      score = (playerPositionalScore - opponentPositionalScore) * 3 + 
              (playerMobility - opponentMobility) * 10;
    }
    // Mid game: balance between position, mobility and disc count
    else if (playerCount + opponentCount < 40) {
      score = (playerPositionalScore - opponentPositionalScore) * 2 + 
              (playerMobility - opponentMobility) * 5 +
              (playerCount - opponentCount) * 1;
    }
    // End game: focus on disc count with position still important
    else {
      score = (playerPositionalScore - opponentPositionalScore) * 1 + 
              (playerCount - opponentCount) * 3;
    }
    
    // Corner control is always critical
    const corners = [
      [0, 0], [0, 7], [7, 0], [7, 7]
    ];
    
    for (const [row, col] of corners) {
      if (simulatedBoard[row][col] === player) {
        score += 25;
      } else if (simulatedBoard[row][col] === opponent) {
        score -= 25;
      }
    }
    
    return score;
  }

  // Minimax algorithm with alpha-beta pruning for hard AI
  function minimax(boardState, depth, alpha, beta, maximizingPlayer, currentPlayerInSim) {
    // Base case: terminal node or depth limit reached
    if (depth === 0) {
      return evaluateBoard(boardState, currentPlayer);
    }
    
    const validMoves = getValidMovesForBoardState(boardState, currentPlayerInSim);
    
    // If no valid moves, pass turn to opponent
    if (validMoves.length === 0) {
      const nextPlayer = 1 - currentPlayerInSim;
      const nextValidMoves = getValidMovesForBoardState(boardState, nextPlayer);
      
      // If opponent also has no moves, game is over
      if (nextValidMoves.length === 0) {
        // Return final score
        const playerCount = countDiscsOnBoard(boardState, currentPlayer);
        const opponentCount = countDiscsOnBoard(boardState, 1 - currentPlayer);
        return playerCount > opponentCount ? 1000 : (playerCount < opponentCount ? -1000 : 0);
      }
      
      // Pass turn and continue minimax
      return minimax(boardState, depth - 1, alpha, beta, !maximizingPlayer, nextPlayer);
    }
    
    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const [row, col] of validMoves) {
        // Simulate move
        const newBoard = simulateMove(boardState, row, col, currentPlayerInSim);
        const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, 1 - currentPlayerInSim);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const [row, col] of validMoves) {
        // Simulate move
        const newBoard = simulateMove(boardState, row, col, currentPlayerInSim);
        const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, 1 - currentPlayerInSim);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minEval;
    }
  }

  // Function to find the best move using minimax
  function findBestMove(validMoves, depth) {
    let bestScore = -Infinity;
    let bestMove = validMoves[0];
    
    for (const [row, col] of validMoves) {
      // Simulate this move
      const simulatedBoard = simulateMove([...board.map(row => [...row])], row, col, currentPlayer);
      // Evaluate with minimax
      const score = minimax(simulatedBoard, depth - 1, -Infinity, Infinity, false, 1 - currentPlayer);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = [row, col];
      }
    }
    
    return bestMove;
  }

  // Simulate a move without changing the actual board
  function simulateMove(boardState, row, col, player) {
    const newBoard = boardState.map(r => [...r]);
    newBoard[row][col] = player;
    
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dx, dy] of directions) {
      let r = row + dx;
      let c = col + dy;
      let discsToFlip = [];
      
      while (isInBounds(r, c) && newBoard[r][c] !== null && newBoard[r][c] !== player) {
        discsToFlip.push([r, c]);
        r += dx;
        c += dy;
      }
      
      if (isInBounds(r, c) && newBoard[r][c] === player) {
        discsToFlip.forEach(([flipRow, flipCol]) => {
          newBoard[flipRow][flipCol] = player;
        });
      }
    }
    
    return newBoard;
  }

  // Get valid moves for a board state without affecting the game
  function getValidMovesForBoardState(boardState, player) {
    const validMoves = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (isValidMoveOnBoard(boardState, row, col, player)) {
          validMoves.push([row, col]);
        }
      }
    }
    
    return validMoves;
  }

  // Check if a move is valid on a given board state
  function isValidMoveOnBoard(boardState, row, col, player) {
    if (boardState[row][col] !== null) return false;
    
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    return directions.some(([dx, dy]) => {
      let r = row + dx;
      let c = col + dy;
      let hasOpponentDisc = false;
      
      while (isInBounds(r, c) && boardState[r][c] !== null && boardState[r][c] !== player) {
        hasOpponentDisc = true;
        r += dx;
        c += dy;
      }
      
      return hasOpponentDisc && isInBounds(r, c) && boardState[r][c] === player;
    });
  }

  function countDiscsOnBoard(boardState, player) {
    let count = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (boardState[row][col] === player) {
          count++;
        }
      }
    }
    return count;
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
    checkTurn();
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

    renderBoard();
    checkTurn();
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
    aiControls.classList.remove('hidden');
    playComputerEasy.disabled = false;
    playComputerMedium.disabled = false;
    playComputerHard.disabled = false;
    connectBtn.disabled = false;
    statusMessage.textContent = "";
    statusMessage.classList.remove('error');
    PlayerColorDisplay.classList.add('hidden');
    playerDisc.className = 'disc';
    
    // Reset game state
    isConnected = false;
    isComputerGame = false;
    gameConnection = null;
    
    // Render the board
    renderBoard();
  }
});