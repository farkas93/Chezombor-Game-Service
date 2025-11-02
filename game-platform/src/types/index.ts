export type GameType = 'chess' | 'go' | '2048';
export type PlayerType = 'human' | 'ai';
export type GameMode = 'pvp' | 'pvai';

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