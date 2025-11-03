// src/types/index.ts

export type GameType = 'chess' | 'go' | '2048';
export type PlayerType = 'human' | 'ai';
export type GameMode = 'pvp' | 'pvai' | 'local';

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  elo?: number;
}

export interface GameSession {
  id: string;
  gameType: GameType;
  mode: GameMode;
  players: Player[];
  state: any;
  createdAt: Date;
}

export interface ChessState {
  fen: string;
  pgn: string;
  currentTurn: 'white' | 'black';
  moveHistory: any[];
  checkmate: boolean;
  check: boolean;
  stalemate: boolean;
  draw: boolean;
  winner: string | null;
}

// ADDED: Chess move type
export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}

// ADDED: Go move type
export interface GoMove {
  row: number;
  col: number;
  color: 'black' | 'white';
  pass?: boolean;
}

// ADDED: 2048 move type
export interface Move2048 {
  direction: 'up' | 'down' | 'left' | 'right';
}

// ADDED: Union type for all moves
export type GameMove = ChessMove | GoMove | Move2048;

export interface EloRating {
  playerId: string;
  playerName: string;
  gameType: 'chess' | 'go';
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface HighScore {
  playerId: string;
  playerName: string;
  playerType: PlayerType;
  score: number;
  date: Date;
}

export interface WSMessage {
  type: 'register' | 'create_game' | 'join_game' | 'move' | 'game_update' | 'game_end' | 'find_match' | 'registered' | 'game_created' | 'game_start' | 'waiting_for_opponent';
  payload: any;
}