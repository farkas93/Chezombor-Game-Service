import { v4 as uuidv4 } from 'uuid';
import { GameSession, GameType, GameMode, Player } from '@/types';
import { Chess } from 'chess.js'; // ADDED: Import chess.js

export class GameManager {
  private sessions: Map<string, GameSession> = new Map();
  private waitingPlayers: Map<GameType, Player[]> = new Map();

  createSession(gameType: GameType, mode: GameMode, player: Player): GameSession {
    const session: GameSession = {
      id: uuidv4(),
      gameType,
      mode,
      players: [player],
      state: this.initGameState(gameType),
      createdAt: new Date()
    };

    this.sessions.set(session.id, session);
    return session;
  }

  joinSession(sessionId: string, player: Player): GameSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.players.length >= 2) {
      return null;
    }

    session.players.push(player);
    return session;
  }

  addToWaitingList(gameType: GameType, player: Player) {
    if (!this.waitingPlayers.has(gameType)) {
      this.waitingPlayers.set(gameType, []);
    }
    this.waitingPlayers.get(gameType)!.push(player);
  }

  findMatch(gameType: GameType, player: Player): GameSession | null {
    const waiting = this.waitingPlayers.get(gameType);
    if (!waiting || waiting.length === 0) {
      this.addToWaitingList(gameType, player);
      return null;
    }

    const opponent = waiting.shift()!;
    const session = this.createSession(gameType, 'pvp', opponent);
    session.players.push(player);
    return session;
  }

  getSession(sessionId: string): GameSession | undefined {
    return this.sessions.get(sessionId);
  }

  updateGameState(sessionId: string, state: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = state;
    }
  }

  endSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  private initGameState(gameType: GameType): any {
    switch (gameType) {
      case 'chess':
        return this.initChessState();
      case 'go':
        return this.initGoState();
      case '2048':
        return this.init2048State();
    }
  }

  private initChessState() {
    // MODIFIED: Use chess.js for proper game state
    const chess = new Chess();
    return {
      fen: chess.fen(), // FEN string represents the board state
      pgn: chess.pgn(), // PGN for move history
      currentTurn: 'white',
      moveHistory: [],
      checkmate: false,
      check: false,
      stalemate: false,
      draw: false,
      winner: null
    };
  }

  private initGoState() {
    return {
      board: Array(19).fill(null).map(() => Array(19).fill(null)),
      currentTurn: 'black',
      captures: { black: 0, white: 0 },
      moveHistory: [],
      ended: false,
      winner: null
    };
  }

  private init2048State() {
    const board = Array(4).fill(null).map(() => Array(4).fill(0));
    this.addRandomTile(board);
    this.addRandomTile(board);
    return {
      board,
      score: 0,
      gameOver: false
    };
  }

  private addRandomTile(board: number[][]) {
    const empty: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (board[i][j] === 0) empty.push([i, j]);
      }
    }
    if (empty.length > 0) {
      const [row, col] = empty[Math.floor(Math.random() * empty.length)];
      board[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  }
}