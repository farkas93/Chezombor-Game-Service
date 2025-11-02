// src/app/game/[gameType]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { ModeSelector } from '@/components/ModeSelector';
import { ChessBoard } from '@/components/ChessBoard';
import { GoBoard } from '@/components/GoBoard';
import { Game2048 } from '@/components/Game2048';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { GameType } from '@/types';
import { useParams, useRouter } from 'next/navigation'; // Import useParams and useRouter

export default function GamePage() {
  const params = useParams(); // Get dynamic parameters
  const router = useRouter();
  const gameType = params.gameType as GameType; // Access gameType from params

  const [showBoard, setShowBoard] = useState(false);
  const { currentSession, waitingForOpponent } = useWebSocket();

  useEffect(() => {
    // Basic validation for gameType
    if (!gameType || !['chess', 'go', '2048'].includes(gameType)) {
      router.push('/'); // Redirect to home if gameType is invalid
    }
  }, [gameType, router]);

  useEffect(() => {
    if (currentSession) {
      setShowBoard(true);
    }
  }, [currentSession]);

  if (!gameType || !['chess', 'go', '2048'].includes(gameType)) {
    return null; // Don't render anything if gameType is invalid, useEffect will redirect
  }

  if (waitingForOpponent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center p-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
            <h2 className="text-2xl font-bold">Finding opponent...</h2>
            <p className="text-muted-foreground">Please wait while we match you with a player</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showBoard && currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 p-4">
        {gameType === 'chess' && <ChessBoard session={currentSession} />}
        {gameType === 'go' && <GoBoard session={currentSession} />}
        {gameType === '2048' && <Game2048 session={currentSession} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-6xl w-full">
        <ModeSelector gameType={gameType as 'chess' | 'go' | '2048'} />
      </div>
    </div>
  );
}