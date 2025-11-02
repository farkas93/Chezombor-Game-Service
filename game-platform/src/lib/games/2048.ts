export interface Game2048State {
  board: number[][];
  score: number;
  gameOver: boolean;
  won: boolean;
  moved: boolean;
}

export class Game2048 {
  private static BOARD_SIZE = 4;

  static createInitialState(): Game2048State {
    const board = this.createEmptyBoard();
    this.addRandomTile(board);
    this.addRandomTile(board);

    return {
      board,
      score: 0,
      gameOver: false,
      won: false,
      moved: false,
    };
  }

  private static createEmptyBoard(): number[][] {
    return Array(this.BOARD_SIZE).fill(null).map(() => Array(this.BOARD_SIZE).fill(0));
  }

  static processMove(state: Game2048State, move: { direction: string }): Game2048State {
    if (state.gameOver) {
      return state;
    }

    const { direction } = move;
    
    // Deep copy the board
    const newBoard = state.board.map(row => [...row]);
    let scoreGained = 0;
    let moved = false;

    // Process the move based on direction
    if (direction === 'left') {
      for (let row = 0; row < this.BOARD_SIZE; row++) {
        const result = this.slideAndMerge(newBoard[row]);
        newBoard[row] = result.line;
        scoreGained += result.score;
        if (result.moved) moved = true;
      }
    } else if (direction === 'right') {
      for (let row = 0; row < this.BOARD_SIZE; row++) {
        const reversed = [...newBoard[row]].reverse();
        const result = this.slideAndMerge(reversed);
        newBoard[row] = result.line.reverse();
        scoreGained += result.score;
        if (result.moved) moved = true;
      }
    } else if (direction === 'up') {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const column = newBoard.map(row => row[col]);
        const result = this.slideAndMerge(column);
        for (let row = 0; row < this.BOARD_SIZE; row++) {
          newBoard[row][col] = result.line[row];
        }
        scoreGained += result.score;
        if (result.moved) moved = true;
      }
    } else if (direction === 'down') {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const column = newBoard.map(row => row[col]);
        const reversed = [...column].reverse();
        const result = this.slideAndMerge(reversed);
        const finalColumn = result.line.reverse();
        for (let row = 0; row < this.BOARD_SIZE; row++) {
          newBoard[row][col] = finalColumn[row];
        }
        scoreGained += result.score;
        if (result.moved) moved = true;
      }
    }

    // If nothing moved, return original state
    if (!moved) {
      return state;
    }

    // Add new tile after successful move
    this.addRandomTile(newBoard);

    const newScore = state.score + scoreGained;
    const won = state.won || this.hasWon(newBoard);
    const gameOver = this.isGameOver(newBoard);

    return {
      board: newBoard,
      score: newScore,
      gameOver,
      won,
      moved: true,
    };
  }

  private static slideAndMerge(line: number[]): { line: number[]; score: number; moved: boolean } {
    const original = [...line];
    
    // Remove zeros and get non-zero values
    const nonZero = line.filter(val => val !== 0);
    
    // Merge adjacent equal values
    const merged: number[] = [];
    let score = 0;
    let i = 0;
    
    while (i < nonZero.length) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        // Merge the two tiles
        const mergedValue = nonZero[i] * 2;
        merged.push(mergedValue);
        score += mergedValue;
        i += 2; // Skip both tiles
      } else {
        // No merge, just add the tile
        merged.push(nonZero[i]);
        i += 1;
      }
    }
    
    // Pad with zeros to maintain size
    while (merged.length < this.BOARD_SIZE) {
      merged.push(0);
    }
    
    // Check if anything changed
    const moved = !original.every((val, idx) => val === merged[idx]);
    
    return { line: merged, score, moved };
  }

  private static addRandomTile(board: number[][]): void {
    const emptyCells: [number, number][] = [];

    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (board[row][col] === 0) {
          emptyCells.push([row, col]);
        }
      }
    }

    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      board[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  private static hasWon(board: number[][]): boolean {
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (board[row][col] === 2048) {
          return true;
        }
      }
    }
    return false;
  }

  private static isGameOver(board: number[][]): boolean {
    // Check for empty cells
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (board[row][col] === 0) {
          return false;
        }
      }
    }

    // Check for possible merges horizontally
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE - 1; col++) {
        if (board[row][col] === board[row][col + 1]) {
          return false;
        }
      }
    }

    // Check for possible merges vertically
    for (let col = 0; col < this.BOARD_SIZE; col++) {
      for (let row = 0; row < this.BOARD_SIZE - 1; row++) {
        if (board[row][col] === board[row + 1][col]) {
          return false;
        }
      }
    }

    return true;
  }

  static checkGameEnd(state: Game2048State): { score: number; won: boolean } | null {
    if (state.gameOver) {
      return { score: state.score, won: state.won };
    }
    return null;
  }
}