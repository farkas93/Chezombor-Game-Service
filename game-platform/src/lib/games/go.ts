// src/lib/games/go.ts
import { GoMove } from '@/types';

export interface GoState {
  board: (string | null)[][];
  currentTurn: 'black' | 'white';
  captures: { black: number; white: number };
  moveHistory: GoMove[];
  passCount: number;
  ended: boolean;
  winner: 'black' | 'white' | 'draw' | null;
  lastMove: { row: number; col: number } | null;
  koPoint: { row: number; col: number } | null;
}

export class GoGame {
  private static BOARD_SIZE = 19;

  static createInitialState(): GoState {
    return {
      board: Array(this.BOARD_SIZE).fill(null).map(() => Array(this.BOARD_SIZE).fill(null)),
      currentTurn: 'black',
      captures: { black: 0, white: 0 },
      moveHistory: [],
      passCount: 0,
      ended: false,
      winner: null,
      lastMove: null,
      koPoint: null,
    };
  }
  static hasLegalMoves(state: GoState): boolean {
    const size = this.BOARD_SIZE;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (this.isValidMove(state, row, col)) {
          return true;
        }
      }
    }

    return false;
  }


  static processMove(state: GoState, move: { row?: number; col?: number; pass?: boolean }): GoState {
    // Handle pass
    if (move.pass) {
      return this.processPass(state);
    }

    const { row, col } = move;
    if (row === undefined || col === undefined) {
      console.warn('[Go] Invalid move: row or col undefined');
      return state;
    }

    // Validate move
    if (!this.isValidMove(state, row, col)) {
      console.warn('[Go] Invalid move attempted:', move);
      return state;
    }

    // Deep copy state
    const newBoard = state.board.map(r => [...r]);
    const currentTurn = state.currentTurn;
    const opponentColor = currentTurn === 'black' ? 'white' : 'black';
    const nextTurn: 'black' | 'white' = currentTurn === 'black' ? 'white' : 'black'; // ADDED: Explicit type

    // Place stone
    newBoard[row][col] = currentTurn;

    // Check for captures - ONLY adjacent opponent groups
    let newCaptures = { ...state.captures };
    let capturedStones: [number, number][] = [];

    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    directions.forEach(([dr, dc]) => {
      const adjRow = row + dr;
      const adjCol = col + dc;

      if (this.isInBounds(adjRow, adjCol) && newBoard[adjRow][adjCol] === opponentColor) {
        const group = this.getGroup(newBoard, adjRow, adjCol, opponentColor);
        if (!this.hasLiberties(newBoard, group)) {
          group.forEach(([r, c]) => {
            newBoard[r][c] = null;
            capturedStones.push([r, c]);
          });
          newCaptures[currentTurn] += group.length;
        }
      }
    });

    // Check for suicide
    const placedStoneGroup = this.getGroup(newBoard, row, col, currentTurn);
    if (!this.hasLiberties(newBoard, placedStoneGroup) && capturedStones.length === 0) {
      console.warn('[Go] Suicide move attempted');
      return state;
    }

    // Ko rule
    let newKoPoint: { row: number; col: number } | null = null;
    if (capturedStones.length === 1 && placedStoneGroup.length === 1) {
      const [capturedRow, capturedCol] = capturedStones[0];
      newKoPoint = { row: capturedRow, col: capturedCol };
    }

    // FIXED: Use nextTurn variable with explicit type
    const newState: GoState = {
      board: newBoard,
      currentTurn: nextTurn,
      captures: newCaptures,
      moveHistory: [...state.moveHistory, { row, col, color: currentTurn }],
      passCount: 0,
      ended: false,
      winner: null,
      lastMove: { row, col },
      koPoint: newKoPoint,
    };

    // Check for automatic win conditions
    const autoWin = this.checkAutoWin(newState);
    if (autoWin) {
      return {
        ...newState,
        ended: true,
        winner: autoWin.winner
      };
    }

    return newState;
  }

  // Also update processPass method with explicit types:
  private static processPass(state: GoState): GoState {
    const newPassCount = state.passCount + 1;
    const nextTurn: 'black' | 'white' = state.currentTurn === 'black' ? 'white' : 'black'; // ADDED: Explicit type

    console.log(`[Go] Player ${state.currentTurn} passed. Pass count: ${newPassCount}`);

    // Game ends when both players pass consecutively
    if (newPassCount >= 2) {
      const winner = this.calculateWinner(state);
      console.log(`[Go] Game ended by double pass. Winner: ${winner}`);

      return {
        ...state,
        passCount: newPassCount,
        ended: true,
        winner,
        currentTurn: nextTurn,
        moveHistory: [...state.moveHistory, {
          row: -1,
          col: -1,
          color: state.currentTurn,
          pass: true
        }],
      };
    }

    return {
      ...state,
      passCount: newPassCount,
      currentTurn: nextTurn,
      moveHistory: [...state.moveHistory, {
        row: -1,
        col: -1,
        color: state.currentTurn,
        pass: true
      }],
    };
  }

  private static hasLivingStones(state: GoState, color: 'black' | 'white'): boolean {
    const checked = new Set<string>();

    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const key = `${row},${col}`;
        if (checked.has(key)) continue;

        if (state.board[row][col] === color) {
          const group = this.getGroup(state.board, row, col, color);
          group.forEach(([r, c]) => checked.add(`${r},${c}`));

          // If this group has liberties, player has living stones
          if (this.hasLiberties(state.board, group)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private static hasAnyLegalMoves(state: GoState, color: 'black' | 'white'): boolean {
    // Temporarily set the turn to check moves
    const testState = { ...state, currentTurn: color };

    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (this.isValidMove(testState, row, col)) {
          return true;
        }
      }
    }

    return false;
  }

  private static checkAutoWin(state: GoState): { winner: 'black' | 'white' | 'draw' } | null {
    // ADDED: Don't check for auto-win in the first few moves
    if (state.moveHistory.length < 10) {
      return null; // Need at least 10 moves before checking auto-win
    }

    // 1. Check if opponent has no stones left on board
    let blackStones = 0;
    let whiteStones = 0;

    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (state.board[row][col] === 'black') blackStones++;
        if (state.board[row][col] === 'white') whiteStones++;
      }
    }

    // Only check if player has NO stones at all (complete elimination)
    if (blackStones === 0 && whiteStones > 0) {
      console.log('[Go] Auto-win: White wins - Black has no stones');
      return { winner: 'white' };
    }
    if (whiteStones === 0 && blackStones > 0) {
      console.log('[Go] Auto-win: Black wins - White has no stones');
      return { winner: 'black' };
    }

    // 2. Check if board is completely filled
    let emptySpaces = 0;
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (state.board[row][col] === null) emptySpaces++;
      }
    }

    if (emptySpaces === 0) {
      console.log('[Go] Board completely filled - scoring game');
      const winner = this.calculateWinner(state);
      return { winner };
    }

    return null;
  }

  private static isValidMove(state: GoState, row: number, col: number): boolean {
    if (!this.isInBounds(row, col)) {
      return false;
    }

    if (state.board[row][col] !== null) {
      return false;
    }

    if (state.koPoint && state.koPoint.row === row && state.koPoint.col === col) {
      return false;
    }

    // Create test board
    const testBoard = state.board.map(r => [...r]);
    testBoard[row][col] = state.currentTurn;

    // Check if move captures opponent stones (makes it legal even if suicide)
    const opponentColor = state.currentTurn === 'black' ? 'white' : 'black';
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
      const adjRow = row + dr;
      const adjCol = col + dc;

      if (this.isInBounds(adjRow, adjCol) && testBoard[adjRow][adjCol] === opponentColor) {
        const opponentGroup = this.getGroup(testBoard, adjRow, adjCol, opponentColor);
        if (!this.hasLiberties(testBoard, opponentGroup)) {
          return true; // Legal - captures opponent
        }
      }
    }

    // Check if placed stone has liberties (not suicide)
    const placedGroup = this.getGroup(testBoard, row, col, state.currentTurn);
    return this.hasLiberties(testBoard, placedGroup);
  }

  private static isInBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.BOARD_SIZE && col >= 0 && col < this.BOARD_SIZE;
  }

  private static getGroup(board: (string | null)[][], row: number, col: number, color: string): [number, number][] {
    const group: [number, number][] = [];
    const visited = new Set<string>();
    const stack: [number, number][] = [[row, col]];

    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (!this.isInBounds(r, c)) continue;
      if (board[r][c] !== color) continue;

      group.push([r, c]);

      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }

    return group;
  }

  private static hasLiberties(board: (string | null)[][], group: [number, number][]): boolean {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [row, col] of group) {
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;

        if (this.isInBounds(newRow, newCol) && board[newRow][newCol] === null) {
          return true;
        }
      }
    }

    return false;
  }

  private static calculateWinner(state: GoState): 'black' | 'white' | 'draw' {
    // Calculate territory using simple area counting
    const territory = this.calculateTerritory(state.board);

    // Score = territory + captures + komi (6.5 for white)
    const komi = 6.5;
    const blackScore = territory.black + state.captures.black;
    const whiteScore = territory.white + state.captures.white + komi;

    console.log(`[Go] Final Score - Black: ${blackScore}, White: ${whiteScore}`);

    if (blackScore > whiteScore) {
      return 'black';
    } else if (whiteScore > blackScore) {
      return 'white';
    } else {
      return 'draw';
    }
  }

  private static calculateTerritory(board: (string | null)[][]): { black: number; white: number } {
    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // Count stones on board
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if (board[row][col] === 'black') {
          blackTerritory++;
        } else if (board[row][col] === 'white') {
          whiteTerritory++;
        }
      }
    }

    // Find empty regions and determine ownership
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const key = `${row},${col}`;
        if (board[row][col] === null && !visited.has(key)) {
          const region = this.getEmptyRegion(board, row, col, visited);
          const owner = this.determineRegionOwner(board, region);

          if (owner === 'black') {
            blackTerritory += region.length;
          } else if (owner === 'white') {
            whiteTerritory += region.length;
          }
          // If owner is null, it's neutral territory (dame)
        }
      }
    }

    return { black: blackTerritory, white: whiteTerritory };
  }

  private static getEmptyRegion(
    board: (string | null)[][],
    row: number,
    col: number,
    visited: Set<string>
  ): [number, number][] {
    const region: [number, number][] = [];
    const stack: [number, number][] = [[row, col]];

    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;

      if (visited.has(key)) continue;
      if (!this.isInBounds(r, c)) continue;
      if (board[r][c] !== null) continue;

      visited.add(key);
      region.push([r, c]);

      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }

    return region;
  }

  private static determineRegionOwner(
    board: (string | null)[][],
    region: [number, number][]
  ): 'black' | 'white' | null {
    const adjacentColors = new Set<string>();
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [row, col] of region) {
      for (const [dr, dc] of directions) {
        const adjRow = row + dr;
        const adjCol = col + dc;

        if (this.isInBounds(adjRow, adjCol)) {
          const color = board[adjRow][adjCol];
          if (color !== null) {
            adjacentColors.add(color);
          }
        }
      }
    }

    // If region touches only one color, it belongs to that color
    if (adjacentColors.size === 1) {
      return Array.from(adjacentColors)[0] as 'black' | 'white';
    }

    // If it touches both colors or no colors, it's neutral
    return null;
  }

  static checkGameEnd(state: GoState): { winner: 'black' | 'white' | 'draw' } | null {
    if (state.ended && state.winner) {
      return { winner: state.winner };
    }
    return null;
  }
}