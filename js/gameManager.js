import { GameBoard } from './gameBoard.js';
import { AIPlayer } from './aiPlayer.js';
import { UIController } from './uiController.js';
import { GameConnection } from './GameConnection.js';
import { PLAYER } from './constants.js';

export class GameManager {
  constructor() {
    this.board = new GameBoard();
    this.ui = new UIController();
    this.ai = new AIPlayer();
    this.gameConnection = null;
    
    this.currentPlayer = PLAYER.BLACK;
    this.localPlayer = null;
    this.isConnected = false;
    this.isComputerGame = false;
    this.computerDifficulty = 1;
    
    this.setupEventHandlers();
    this.checkUrlForMatchId();
  }

  setupEventHandlers() {
    this.ui.setEventHandlers({
      onNewGameRequested: () => this.resetGame(),
      onCreateGameRequested: () => this.handleCreateGame(),
      onJoinGameRequested: () => this.handleJoinGame(),
      onConnectRequested: () => this.handleConnect(),
      onCopyRoomIdRequested: () => this.copyRoomId(),
      onPlayComputerRequested: (difficulty) => this.handlePlayComputer(difficulty),
      onSquareClicked: (row, col) => this.handleMoveAttempt(row, col)
    });
  }

  checkUrlForMatchId() {
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('match_id');
    
    if (matchId) {
      this.ui.roomIdInput.value = matchId;
      this.ui.createGameBtn.disabled = true;
      this.ui.joinGameBtn.disabled = true;
      this.ui.aiControls.classList.add('hidden');
      this.ui.joinRoomContainer.classList.remove('hidden');
      this.handleConnect();
    }
  }

  async handleCreateGame() {
    this.ui.updateStatus("Creating game...");
    this.ui.createGameBtn.disabled = true;
    this.ui.joinGameBtn.disabled = true;
    this.ui.aiControls.classList.add('hidden');
    
    try {
      this.gameConnection = new GameConnection();
      await this.gameConnection.initialize();
      const roomId = await this.gameConnection.createRoom();
      this.localPlayer = PLAYER.BLACK;
      
      this.ui.roomIdText.textContent = roomId;
      this.ui.roomIdContainer.classList.remove('hidden');
      this.ui.updateStatus("Waiting for opponent to join...");
      
      this.gameConnection.onOpponentConnected = () => {
        this.isConnected = true;
        this.ui.connectionPanel.classList.add('hidden');
        this.ui.showPlayerColor(this.localPlayer);
        this.gameConnection.sendData({ 
          type: 'init', 
          currentPlayer: this.currentPlayer 
        });
        this.updateGameView();
        this.ui.updateStatus("Opponent connected! Game started.");
      };

      this.gameConnection.onDataReceived = (data) => this.handleNetworkData(data);
    } catch (error) {
      this.ui.updateStatus(`Error creating room: ${error.message}`, true);
      this.ui.createGameBtn.disabled = false;
      this.ui.joinGameBtn.disabled = false;
    }
  }

  handlePlayComputer(difficulty) {
    this.computerDifficulty = difficulty;
    this.ai.setDifficulty(difficulty);
    this.isComputerGame = true;
    this.localPlayer = PLAYER.BLACK;
    this.isConnected = true;
    
    this.ui.connectionPanel.classList.add('hidden');
    this.ui.showPlayerColor(this.localPlayer);
    
    this.updateGameView();
    this.ui.updateStatus(`Game against computer started (difficulty: ${difficulty}). You are Black.`);
  }

  handleJoinGame() {
    this.ui.createGameBtn.disabled = true;
    this.ui.joinGameBtn.disabled = true;
    this.ui.aiControls.classList.add('hidden');
    this.ui.joinRoomContainer.classList.remove('hidden');
  }

  async handleConnect() {
    const roomId = this.ui.roomIdInput.value.trim();
    if (!roomId) {
      this.ui.updateStatus("Please enter a room ID", true);
      return;
    }

    this.ui.updateStatus("Connecting to game...");
    this.ui.connectBtn.disabled = true;
    
    try {
      this.gameConnection = new GameConnection();
      await this.gameConnection.initialize();
      await this.gameConnection.joinRoom(roomId);
      
      this.localPlayer = PLAYER.WHITE;
      this.isConnected = true;
      this.ui.connectionPanel.classList.add('hidden');
      this.ui.showPlayerColor(this.localPlayer);
      
      this.gameConnection.onDataReceived = (data) => this.handleNetworkData(data);
      this.ui.updateStatus("Connected! Waiting for game data...");
    } catch (error) {
      this.ui.updateStatus(`Error joining room: ${error.message}`, true);
      this.ui.connectBtn.disabled = false;
    }
  }

  copyRoomId() {
    const roomId = this.ui.roomIdText.textContent;
    navigator.clipboard.writeText(`https://keshav-madhav.github.io/Othello-JS?match_id=${roomId}`)
      .then(() => {
        this.ui.updateStatus("Room ID copied to clipboard!");
      })
      .catch(err => {
        this.ui.updateStatus("Failed to copy room ID", true);
      });
  }

  handleNetworkData(data) {
    switch(data.type) {
      case 'init':
        this.currentPlayer = data.currentPlayer;
        this.updateGameView();
        break;
      case 'move':
        this.processReceivedMove(data.row, data.col, data.flippedSquares);
        break;
    }
  }

  processReceivedMove(row, col, flippedSquares) {
    if (this.board.isValidMove(row, col, this.currentPlayer)) {
      this.board.makeMove(row, col, this.currentPlayer, flippedSquares);
      this.ui.highlightFlippedSquares(flippedSquares);
      this.ui.highlightPreviousMove(row, col);
      this.switchTurn();
      this.updateGameView();
    }
  }

  handleMoveAttempt(row, col) {
    if (!this.isConnected) {
      this.ui.updateStatus("Not connected to opponent!", true);
      return;
    }
    
    if (this.currentPlayer !== this.localPlayer && !this.isComputerGame) {
      return;
    }

    if (this.board.isValidMove(row, col, this.currentPlayer)) {
      const moveResult = this.board.makeMove(row, col, this.currentPlayer);
      
      this.ui.highlightFlippedSquares(moveResult.flippedSquares);
      this.ui.highlightPreviousMove(row, col);
      this.switchTurn();
      this.updateGameView();
      
      if (this.isComputerGame) {
        setTimeout(() => {
          if (this.currentPlayer !== this.localPlayer && !this.board.checkGameOver()) {
            this.makeComputerMove();
          }
        }, Math.floor(Math.random() * 600) + 200);
      } else {
        this.gameConnection.sendData({ 
          type: 'move',
          row: row,
          col: col,
          flippedSquares: moveResult.flippedSquares,
          currentPlayer: this.currentPlayer
        });
      }
    }
  }

  makeComputerMove() {
    const move = this.ai.getMove(this.board.getBoardState(), this.currentPlayer);
    if (move) {
      const [row, col] = move;
      const moveResult = this.board.makeMove(row, col, this.currentPlayer);
      
      this.ui.highlightFlippedSquares(moveResult.flippedSquares);
      this.ui.highlightPreviousMove(row, col);
      this.switchTurn();
      this.updateGameView();
    } else {
      this.switchTurn();
    }
  }

  switchTurn() {
    this.currentPlayer = 1 - this.currentPlayer;
    let validMoves = this.board.getValidMoves(this.currentPlayer);
    
    if (validMoves.length === 0) {
      this.currentPlayer = 1 - this.currentPlayer;
      validMoves = this.board.getValidMoves(this.currentPlayer);
      
      if (validMoves.length === 0) {
        this.endGame();
      }
    }

    this.updateGameView();
  }

  updateGameView() {
    const blackCount = this.board.countDiscs(PLAYER.BLACK);
    const whiteCount = this.board.countDiscs(PLAYER.WHITE);
    
    this.ui.renderBoard(this.board.getBoardState());
    this.ui.updateStatusBar(blackCount, whiteCount, this.currentPlayer);
    
    if (this.board.checkGameOver()) {
      this.endGame();
      return;
    }
    
    if (this.currentPlayer === this.localPlayer) {
      const validMoves = this.board.getValidMoves(this.currentPlayer);
      this.ui.highlightValidMoves(validMoves);
    } else {
      this.ui.clearValidMoveHighlights();
    }
  }

  endGame() {
    const blackCount = this.board.countDiscs(PLAYER.BLACK);
    const whiteCount = this.board.countDiscs(PLAYER.WHITE);
    this.ui.showGameOver(blackCount, whiteCount);
  }

  resetGame() {
    this.board = new GameBoard();
    this.currentPlayer = PLAYER.BLACK;
    this.ui.hideGameOver();
    this.ui.showConnectionPanel();
    this.isConnected = false;
    this.isComputerGame = false;
    this.gameConnection = null;
    this.updateGameView();
  }
}