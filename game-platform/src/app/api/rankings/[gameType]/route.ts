//src/app/api/rankings/[gameType]
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameType: string }> }
) {
  const { gameType } = await params;
  const db = getDatabase();

  try {
    if (gameType === 'chess' || gameType === 'go') {
      const rankings = db.getEloRankings(gameType, 50);
      return NextResponse.json(rankings);
    } else if (gameType === '2048') {
      const highscores = db.getHighScores(50);
      return NextResponse.json(highscores);
    } else {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] Error fetching rankings:', error);
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
  }
}