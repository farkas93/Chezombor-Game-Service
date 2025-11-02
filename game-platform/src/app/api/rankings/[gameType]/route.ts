// src/app/api/rankings/[gameType]/route.ts
import { getDatabase } from '@/lib/database';
import { NextResponse } from 'next/server';
import { GameType } from '@/types'; // Import GameType

export async function GET(
  request: Request,
  { params }: { params: { gameType: GameType } } // Use GameType for type safety
) {
  try {
    const gameType = params.gameType;
    const db = getDatabase();

    if (gameType === 'chess' || gameType === 'go') {
      const rankings = db.getEloRankings(gameType);
      return NextResponse.json(rankings);
    } else if (gameType === '2048') {
      const highscores = db.getHighScores();
      return NextResponse.json(highscores);
    } else {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
  }
}