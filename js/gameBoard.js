import { BOARD_SIZE, PLAYER } from './constants.js';

export class GameBoard {
  constructor() {
    this.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    this.initializeBoard();
  }

  initializeBoard() {
    // Set up initial pieces
    this.board[3][3] = PLAYER.WHITE;
    this.board[3][4] = PLAYER.BLACK;
    this.board[4][3] = PLAYER.BLACK;
    this.board[4][4] = PLAYER.WHITE;
  }

  isValidMove(row, col, player) {
    if (this.board[row][col] !== null) return false;
    
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    return directions.some(([dx, dy]) => {
      let r = row + dx;
      let c = col + dy;
      let hasOpponentDisc = false;
      
      while (this.isInBounds(r, c) && this.board[r][c] !== null && this.board[r][c] !== player) {
        hasOpponentDisc = true;
        r += dx;
        c += dy;
      }
      
      return hasOpponentDisc && this.isInBounds(r, c) && this.board[r][c] === player;
    });
  }

  isInBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  getValidMoves(player) {
    const validMoves = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (this.isValidMove(row, col, player)) {
          validMoves.push([row, col]);
        }
      }
    }
    
    return validMoves;
  }

  makeMove(row, col, player) {
    const flippedSquares = [];
    this.board[row][col] = player;
    
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dx, dy] of directions) {
      let r = row + dx;
      let c = col + dy;
      let currentFlip = [];
      
      while (this.isInBounds(r, c) && this.board[r][c] !== null && this.board[r][c] !== player) {
        currentFlip.push([r, c]);
        r += dx;
        c += dy;
      }
      
      if (this.isInBounds(r, c) && this.board[r][c] === player) {
        flippedSquares.push(...currentFlip);
        currentFlip.forEach(([flipRow, flipCol]) => {
          this.board[flipRow][flipCol] = player;
        });
      }
    }
    
    return {
      flippedSquares,
      lastMove: [row, col]
    };
  }

  countDiscs(player) {
    let count = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (this.board[row][col] === player) {
          count++;
        }
      }
    }
    return count;
  }

  checkGameOver() {
    return this.getValidMoves(PLAYER.BLACK).length === 0 && 
           this.getValidMoves(PLAYER.WHITE).length === 0;
  }

  getBoardState() {
    return this.board.map(row => [...row]);
  }

  setBoardState(newBoard) {
    this.board = newBoard.map(row => [...row]);
  }
}