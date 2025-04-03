import { BOARD_SIZE, POSITION_WEIGHTS } from './constants.js';

export class AIPlayer {
  constructor(difficulty = 1) {
    this.difficulty = difficulty;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }

  getMove(boardState, currentPlayer) {
    const validMoves = this.getValidMovesForBoardState(boardState, currentPlayer);
    if (validMoves.length === 0) return null;

    switch(this.difficulty) {
      case 1: return this.getEasyMove(validMoves);
      case 2: return this.getMediumMove(validMoves, boardState, currentPlayer);
      case 3: return this.getHardMove(validMoves, boardState, currentPlayer);
      default: return validMoves[0];
    }
  }

  getEasyMove(validMoves) {
    // Random move with slight preference for non-edge moves
    const innerMoves = validMoves.filter(([r, c]) => 
      r > 0 && r < 7 && c > 0 && c < 7
    );
    
    if (innerMoves.length > 0 && Math.random() > 0.3) {
      return innerMoves[Math.floor(Math.random() * innerMoves.length)];
    }
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  getMediumMove(validMoves, boardState, currentPlayer) {
    const weightedMoves = validMoves.map(move => {
      const [row, col] = move;
      let weight = 1;
      
      // Prefer corners strongly
      if ((row === 0 || row === 7) && (col === 0 || col === 7)) {
        weight += 10;
      }
      // Avoid squares adjacent to corners if corner is empty
      else if ((row <= 1 && col <= 1 && boardState[0][0] === null) ||
              (row <= 1 && col >= 6 && boardState[0][7] === null) ||
              (row >= 6 && col <= 1 && boardState[7][0] === null) ||
              (row >= 6 && col >= 6 && boardState[7][7] === null)) {
        weight -= 5;
      }
      // Prefer edges, but not those adjacent to empty corners
      else if (row === 0 || row === 7 || col === 0 || col === 7) {
        const isAdjacentToEmptyCorner = 
          (row === 0 && col === 1 && boardState[0][0] === null) ||
          (row === 0 && col === 6 && boardState[0][7] === null) ||
          (row === 1 && col === 0 && boardState[0][0] === null) ||
          (row === 1 && col === 7 && boardState[0][7] === null) ||
          (row === 6 && col === 0 && boardState[7][0] === null) ||
          (row === 6 && col === 7 && boardState[7][7] === null) ||
          (row === 7 && col === 1 && boardState[7][0] === null) ||
          (row === 7 && col === 6 && boardState[7][7] === null);
          
        if (!isAdjacentToEmptyCorner) {
          weight += 3;
        }
      }
      
      weight += Math.random() * 0.5;
      return { move, weight };
    });
    
    weightedMoves.sort((a, b) => b.weight - a.weight);
    return weightedMoves[0].move;
  }

  getHardMove(validMoves, boardState, currentPlayer) {
    return this.findBestMove(validMoves, boardState, currentPlayer, 3);
  }

  findBestMove(validMoves, boardState, currentPlayer, depth) {
    let bestScore = -Infinity;
    let bestMove = validMoves[0];
    
    for (const [row, col] of validMoves) {
      const simulatedBoard = this.simulateMove([...boardState.map(row => [...row])], row, col, currentPlayer);
      const score = this.minimax(simulatedBoard, depth - 1, -Infinity, Infinity, false, 1 - currentPlayer);
      
      if (score > bestScore) {
        bestScore = score;
        bestMove = [row, col];
      }
    }
    
    return bestMove;
  }

  minimax(boardState, depth, alpha, beta, maximizingPlayer, currentPlayerInSim) {
    if (depth === 0) {
      return this.evaluateBoard(boardState, currentPlayerInSim);
    }
    
    const validMoves = this.getValidMovesForBoardState(boardState, currentPlayerInSim);
    
    if (validMoves.length === 0) {
      const nextPlayer = 1 - currentPlayerInSim;
      const nextValidMoves = this.getValidMovesForBoardState(boardState, nextPlayer);
      
      if (nextValidMoves.length === 0) {
        const playerCount = this.countDiscsOnBoard(boardState, currentPlayerInSim);
        const opponentCount = this.countDiscsOnBoard(boardState, 1 - currentPlayerInSim);
        return playerCount > opponentCount ? 1000 : (playerCount < opponentCount ? -1000 : 0);
      }
      
      return this.minimax(boardState, depth - 1, alpha, beta, !maximizingPlayer, nextPlayer);
    }
    
    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const [row, col] of validMoves) {
        const newBoard = this.simulateMove(boardState, row, col, currentPlayerInSim);
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, false, 1 - currentPlayerInSim);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const [row, col] of validMoves) {
        const newBoard = this.simulateMove(boardState, row, col, currentPlayerInSim);
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, true, 1 - currentPlayerInSim);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  evaluateBoard(boardState, player) {
    let score = 0;
    const opponent = 1 - player;
    let playerCount = 0;
    let opponentCount = 0;
    let playerMobility = 0;
    let opponentMobility = 0;
    let playerPositionalScore = 0;
    let opponentPositionalScore = 0;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (boardState[row][col] === player) {
          playerCount++;
          playerPositionalScore += POSITION_WEIGHTS[row][col];
        } else if (boardState[row][col] === opponent) {
          opponentCount++;
          opponentPositionalScore += POSITION_WEIGHTS[row][col];
        }
      }
    }
    
    playerMobility = this.getValidMovesForBoardState(boardState, player).length;
    opponentMobility = this.getValidMovesForBoardState(boardState, opponent).length;
    
    if (playerCount + opponentCount < 20) {
      score = (playerPositionalScore - opponentPositionalScore) * 3 + 
              (playerMobility - opponentMobility) * 10;
    }
    else if (playerCount + opponentCount < 40) {
      score = (playerPositionalScore - opponentPositionalScore) * 2 + 
              (playerMobility - opponentMobility) * 5 +
              (playerCount - opponentCount) * 1;
    }
    else {
      score = (playerPositionalScore - opponentPositionalScore) * 1 + 
              (playerCount - opponentCount) * 3;
    }
    
    const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
    for (const [row, col] of corners) {
      if (boardState[row][col] === player) score += 25;
      else if (boardState[row][col] === opponent) score -= 25;
    }
    
    return score;
  }

  simulateMove(boardState, row, col, player) {
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
      
      while (this.isInBounds(r, c) && newBoard[r][c] !== null && newBoard[r][c] !== player) {
        discsToFlip.push([r, c]);
        r += dx;
        c += dy;
      }
      
      if (this.isInBounds(r, c) && newBoard[r][c] === player) {
        discsToFlip.forEach(([flipRow, flipCol]) => {
          newBoard[flipRow][flipCol] = player;
        });
      }
    }
    
    return newBoard;
  }

  getValidMovesForBoardState(boardState, player) {
    const validMoves = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (this.isValidMoveOnBoard(boardState, row, col, player)) {
          validMoves.push([row, col]);
        }
      }
    }
    
    return validMoves;
  }

  isValidMoveOnBoard(boardState, row, col, player) {
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
      
      while (this.isInBounds(r, c) && boardState[r][c] !== null && boardState[r][c] !== player) {
        hasOpponentDisc = true;
        r += dx;
        c += dy;
      }
      
      return hasOpponentDisc && this.isInBounds(r, c) && boardState[r][c] === player;
    });
  }

  isInBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  countDiscsOnBoard(boardState, player) {
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
}