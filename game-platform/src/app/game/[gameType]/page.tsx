//src/app/game/[gameType]
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ModeSelector } from '@/components/ModeSelector';
import { ChessBoard } from '@/components/ChessBoard';
import { GoBoard } from '@/components/GoBoard';
import { Game2048 } from '@/components/Game2048';
import { useWebSocketContext } from '@/providers/WebSocketProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { GameType } from '@/types';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameType = params?.gameType as GameType;
  
  const [showBoard, setShowBoard] = useState(false);
  const { currentSession, waitingForOpponent } = useWebSocketContext(); 

  // Debug logging
  useEffect(() => {
    console.log('[GamePage] Params:', params);
    console.log('[GamePage] GameType:', gameType);
    console.log('[GamePage] CurrentSession:', currentSession);
    console.log('[GamePage] WaitingForOpponent:', waitingForOpponent);
  }, [params, gameType, currentSession, waitingForOpponent]);

  useEffect(() => {
    // Redirect if no game type specified or invalid
    if (!gameType || !['chess', 'go', '2048'].includes(gameType)) {
      console.log('[GamePage] Invalid gameType, redirecting to home');
      router.push('/');
    }
  }, [gameType, router]);

  useEffect(() => {
    if (currentSession) {
      console.log('[GamePage] Session detected, showing board');
      setShowBoard(true);
    }
  }, [currentSession]);

  // Show loading while validating
  if (!gameType || !['chess', 'go', '2048'].includes(gameType)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center p-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
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

  // Default: Show mode selector
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-6xl w-full">
        <ModeSelector gameType={gameType} />
      </div>
    </div>
  );
}