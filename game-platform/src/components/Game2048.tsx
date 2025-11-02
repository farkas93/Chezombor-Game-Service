'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebSocketContext } from '@/providers/WebSocketProvider';
import { GameSession } from '@/types';
import { ArrowLeft, Trophy, ArrowUp, ArrowDown, ArrowLeftIcon, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Game2048Props {
  session: GameSession;
}

export function Game2048({ session }: Game2048Props) {
  const router = useRouter();
  const { makeMove, currentSession, player } = useWebSocketContext();
  const [boardKey, setBoardKey] = useState(0);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);

  const activeSession = currentSession || session;
  const board = activeSession?.state?.board || Array(4).fill(null).map(() => Array(4).fill(0));
  const score = activeSession?.state?.score || 0;
  const gameOver = activeSession?.state?.gameOver || false;
  const won = activeSession?.state?.won || false;

  // Force re-render when board changes
  useEffect(() => {
    if (activeSession?.state?.board) {
      setBoardKey(prev => prev + 1);
    }
  }, [JSON.stringify(activeSession?.state?.board)]);

  // Show dialog when game ends
  useEffect(() => {
    if (gameOver) {
      setShowGameOverDialog(true);
    }
  }, [gameOver]);

  const handleMove = useCallback((direction: string) => {
    if (gameOver) return;
    makeMove(activeSession.id, { direction });
  }, [gameOver, makeMove, activeSession.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: { [key: string]: string } = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        handleMove(keyMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]);

  const handleViewRankings = () => {
    setShowGameOverDialog(false);
    router.push('/rankings');
  };

  const handleBackToHome = () => {
    setShowGameOverDialog(false);
    router.push('/');
  };

  const getTileColor = (value: number): string => {
    const colors: { [key: number]: string } = {
      0: 'bg-slate-200',
      2: 'bg-slate-100 text-slate-800',
      4: 'bg-slate-200 text-slate-800',
      8: 'bg-orange-300 text-white',
      16: 'bg-orange-400 text-white',
      32: 'bg-orange-500 text-white',
      64: 'bg-orange-600 text-white',
      128: 'bg-yellow-400 text-white',
      256: 'bg-yellow-500 text-white',
      512: 'bg-yellow-600 text-white',
      1024: 'bg-yellow-700 text-white',
      2048: 'bg-yellow-800 text-white',
      4096: 'bg-red-500 text-white',
      8192: 'bg-red-600 text-white'
    };
    return colors[value] || 'bg-slate-900 text-white';
  };

  const getTileSize = (value: number): string => {
    if (value >= 1024) return 'text-2xl';
    if (value >= 128) return 'text-3xl';
    return 'text-4xl';
  };

  const getGameResult = () => {
    if (gameOver) {
      return {
        title: won ? 'You Won! 🎉' : 'Game Over!',
        description: won 
          ? `Congratulations! You reached 2048 with a score of ${score}!`
          : `Final Score: ${score}`,
        icon: <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-600" />
      };
    }
    return null;
  };

  const gameResult = getGameResult();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-2xl">🔢 2048</CardTitle>
            </div>
            <Badge className="text-2xl px-4 py-2">
              Score: {score}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-800">
              Use arrow keys or buttons below to move tiles. Combine tiles with the same number!
            </p>
          </div>

          {/* Game Board */}
          <div className="flex justify-center" key={boardKey}>
            <div className="inline-block bg-slate-400 p-4 rounded-lg shadow-2xl">
              <div className="grid grid-cols-4 gap-3">
                {board.map((row: number[], rowIdx: number) =>
                  row.map((value: number, colIdx: number) => (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className={`w-24 h-24 flex items-center justify-center rounded-lg font-bold transition-all duration-200 ${getTileColor(value)} ${getTileSize(value)}`}
                    >
                      {value > 0 ? value : ''}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-col items-center gap-2">
            <Button
              size="lg"
              onClick={() => handleMove('up')}
              disabled={gameOver}
              className="w-16 h-16"
            >
              <ArrowUp className="w-6 h-6" />
            </Button>
            <div className="flex gap-2">
              <Button
                size="lg"
                onClick={() => handleMove('left')}
                disabled={gameOver}
                className="w-16 h-16"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </Button>
              <Button
                size="lg"
                onClick={() => handleMove('down')}
                disabled={gameOver}
                className="w-16 h-16"
              >
                <ArrowDown className="w-6 h-6" />
              </Button>
              <Button
                size="lg"
                onClick={() => handleMove('right')}
                disabled={gameOver}
                className="w-16 h-16"
              >
                <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Win notification (shown while game continues) */}
          {won && !gameOver && (
            <div className="text-center p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <p className="font-bold text-lg">You reached 2048! 🎉</p>
              <p className="text-sm">Keep playing for a higher score!</p>
            </div>
          )}

          {/* High Score Info */}
          {!gameOver && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Your score will be saved to the leaderboard when the game ends!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Over Dialog */}
      <Dialog open={showGameOverDialog} onOpenChange={setShowGameOverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">{gameResult?.title}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            {gameResult?.icon}
            <DialogDescription className="text-lg">
              {gameResult?.description}
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleBackToHome} variant="default">
                Back to Home
              </Button>
              <Button onClick={handleViewRankings} variant="default" className="gap-2">
                <Trophy className="w-4 h-4" />
                Rankings
              </Button>
            </div>
            <Button onClick={() => setShowGameOverDialog(false)} variant="outline" className="w-full">
              Review Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}