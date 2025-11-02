import { Chess } from 'chess.js';

export interface ChessState {
  fen: string;
  pgn: string;
  currentTurn: 'white' | 'black';
  moveHistory: any[];
  checkmate: boolean;
  check: boolean;
  stalemate: boolean;
  draw: boolean;
  winner: 'white' | 'black' | 'draw' | null;
}

export class ChessGame {
  static createInitialState(): ChessState {
    const chess = new Chess();
    return {
      fen: chess.fen(),
      pgn: '',
      currentTurn: 'white',
      moveHistory: [],
      checkmate: false,
      check: false,
      stalemate: false,
      draw: false,
      winner: null,
    };
  }

  static processMove(state: ChessState, move: { from: string; to: string; promotion?: string }): ChessState {
    const chess = new Chess(state.fen);
    
    try {
      const result = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });

      if (result) {
        return {
          fen: chess.fen(),
          pgn: chess.pgn(),
          currentTurn: chess.turn() === 'w' ? 'white' : 'black',
          moveHistory: chess.history({ verbose: true }),
          checkmate: chess.isCheckmate(),
          check: chess.isCheck(),
          stalemate: chess.isStalemate(),
          draw: chess.isDraw(),
          winner: chess.isCheckmate() ? (chess.turn() === 'w' ? 'black' : 'white') : null,
        };
      }
    } catch (e) {
      console.warn('[Chess] Invalid move attempted:', move);
    }
    
    return state;
  }

  static checkGameEnd(state: ChessState): { winner: 'white' | 'black' | 'draw' } | null {
    if (state.checkmate) {
      return { winner: state.winner as 'white' | 'black' };
    }
    if (state.stalemate || state.draw) {
      return { winner: 'draw' };
    }
    return null;
  }
}