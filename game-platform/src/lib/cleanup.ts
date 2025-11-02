import { GameDatabase } from './database';
import Database from 'better-sqlite3';

export function cleanupDatabase(db: GameDatabase) {
  const rawDb = (db as any).db as Database.Database;

  // Find duplicates
  const duplicates = rawDb.prepare(`
    SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM players 
    GROUP BY name 
    HAVING count > 1
  `).all() as { name: string; count: number; ids: string }[];

  if (duplicates.length === 0) {
    console.log('[Cleanup] No duplicate players found.');
    return;
  }

  console.log(`[Cleanup] Found ${duplicates.length} duplicate player name(s), merging...`);

  duplicates.forEach(({ name }) => {
    const players = rawDb.prepare(`
      SELECT id, type FROM players WHERE name = ? ORDER BY id ASC
    `).all(name) as { id: string; type: string }[];

    if (players.length <= 1) return;

    const keepId = players[0].id;
    const keepType = players[0].type;
    const removeIds = players.slice(1).map(p => p.id);

    // Merge ELO ratings
    const gameTypes = ['chess', 'go'];
    gameTypes.forEach(gameType => {
      const ratings = rawDb.prepare(`
        SELECT rating, wins, losses, draws 
        FROM elo_ratings 
        WHERE player_id IN (${players.map(() => '?').join(',')}) AND game_type = ?
      `).all(...players.map(p => p.id), gameType) as { rating: number; wins: number; losses: number; draws: number }[];

      if (ratings.length > 0) {
        const maxRating = Math.max(...ratings.map(r => r.rating));
        const totalWins = ratings.reduce((sum, r) => sum + r.wins, 0);
        const totalLosses = ratings.reduce((sum, r) => sum + r.losses, 0);
        const totalDraws = ratings.reduce((sum, r) => sum + r.draws, 0);

        rawDb.prepare(`
          INSERT INTO elo_ratings (player_id, game_type, rating, wins, losses, draws)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(player_id, game_type) DO UPDATE SET
            rating = ?,
            wins = ?,
            losses = ?,
            draws = ?
        `).run(keepId, gameType, maxRating, totalWins, totalLosses, totalDraws, 
               maxRating, totalWins, totalLosses, totalDraws);

        removeIds.forEach(removeId => {
          rawDb.prepare(`DELETE FROM elo_ratings WHERE player_id = ? AND game_type = ?`)
            .run(removeId, gameType);
        });
      }
    });

    // Reassign highscores
    rawDb.prepare(`
      UPDATE highscores 
      SET player_id = ?, player_name = ?, player_type = ?
      WHERE player_id IN (${removeIds.map(() => '?').join(',')})
    `).run(keepId, name, keepType, ...removeIds);

    // Delete duplicates
    removeIds.forEach(removeId => {
      rawDb.prepare(`DELETE FROM players WHERE id = ?`).run(removeId);
    });

    console.log(`[Cleanup] Merged duplicates for "${name}"`);
  });

  console.log('[Cleanup] Database cleanup complete.');
}