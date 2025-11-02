import Database from 'better-sqlite3';
import { EloRating, HighScore, PlayerType } from '@/types';

export class GameDatabase {
  private db: Database.Database;

  constructor(filename: string = process.env.DATABASE_PATH || 'games.db') {
    this.db = new Database(filename);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS elo_ratings (
        player_id TEXT,
        game_type TEXT,
        rating INTEGER DEFAULT 1200,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        PRIMARY KEY (player_id, game_type),
        FOREIGN KEY (player_id) REFERENCES players(id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS highscores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT,
        player_name TEXT,
        player_type TEXT,
        score INTEGER,
        date TEXT,
        FOREIGN KEY (player_id) REFERENCES players(id)
      )
    `);
  }

  registerPlayer(id: string, name: string, type: PlayerType) {
    // Check if a player with this name already exists
    const existingPlayer = this.db.prepare('SELECT id FROM players WHERE name = ?').get(name) as { id: string } | undefined;

    if (existingPlayer) {
      // Player name exists, just return the existing ID (don't insert)
      return existingPlayer.id;
    }

    // New player, insert normally
    const stmt = this.db.prepare('INSERT INTO players (id, name, type) VALUES (?, ?, ?)');
    stmt.run(id, name, type);
    return id;
  }

  // ADDED: New method to get player by name
  getPlayerByName(name: string): { id: string; name: string; type: PlayerType } | undefined {
    const stmt = this.db.prepare('SELECT id, name, type FROM players WHERE name = ?');
    return stmt.get(name) as { id: string; name: string; type: PlayerType } | undefined;
  }
  getEloRating(playerId: string, gameType: 'chess' | 'go'): number {
    const stmt = this.db.prepare('SELECT rating FROM elo_ratings WHERE player_id = ? AND game_type = ?');
    const result = stmt.get(playerId, gameType) as { rating: number } | undefined;
    return result?.rating || 1200;
  }

  updateEloRating(
    playerId: string,
    gameType: 'chess' | 'go',
    newRating: number,
    result: 'win' | 'loss' | 'draw'
  ) {
    const stmt = this.db.prepare(`
      INSERT INTO elo_ratings (player_id, game_type, rating, wins, losses, draws)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id, game_type) DO UPDATE SET
        rating = ?,
        wins = wins + ?,
        losses = losses + ?,
        draws = draws + ?
    `);

    const win = result === 'win' ? 1 : 0;
    const loss = result === 'loss' ? 1 : 0;
    const draw = result === 'draw' ? 1 : 0;

    stmt.run(playerId, gameType, newRating, win, loss, draw, newRating, win, loss, draw);
  }

  getEloRankings(gameType: 'chess' | 'go', limit: number = 50): EloRating[] {
    const stmt = this.db.prepare(`
      SELECT p.id as playerId, p.name as playerName, e.game_type as gameType,
             e.rating, e.wins, e.losses, e.draws
      FROM elo_ratings e
      JOIN players p ON e.player_id = p.id
      WHERE e.game_type = ?
      ORDER BY e.rating DESC
      LIMIT ?
    `);
    return stmt.all(gameType, limit) as EloRating[];
  }

  addHighScore(playerId: string, playerName: string, playerType: PlayerType, score: number) {
    const stmt = this.db.prepare(
      'INSERT INTO highscores (player_id, player_name, player_type, score, date) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(playerId, playerName, playerType, score, new Date().toISOString());
  }

  getHighScores(limit: number = 50): HighScore[] {
    const stmt = this.db.prepare(`
      SELECT player_id as playerId, player_name as playerName, 
             player_type as playerType, score, date
      FROM highscores
      ORDER BY score DESC
      LIMIT ?
    `);
    return stmt.all(limit).map((row: any) => ({
      ...row,
      date: new Date(row.date)
    })) as HighScore[];
  }
}

// Export singleton instance
let dbInstance: GameDatabase | null = null;

export function getDatabase(): GameDatabase {
  if (!dbInstance) {
    dbInstance = new GameDatabase();
  }
  return dbInstance;
}