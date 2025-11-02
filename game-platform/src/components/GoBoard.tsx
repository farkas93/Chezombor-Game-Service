'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebSocketContext } from '@/providers/WebSocketProvider';
import { GameSession } from '@/types';
import { useRouter } from 'next/navigation';

interface GoBoardProps {
  session: GameSession;
}

export function GoBoard({ session }: GoBoardProps) {
  const router = useRouter();
  const { makeMove, player, currentSession } = useWebSocketContext();
  const [hoveredSquare, setHoveredSquare] = useState<{ row: number; col: number } | null>(null);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  const activeSession = currentSession || session;
  const isLocalGame = activeSession.mode === 'local';

  const board = activeSession?.state?.board || Array(19).fill(null).map(() => Array(19).fill(null));
  const currentTurn = activeSession?.state?.currentTurn || 'black';
  const captures = activeSession?.state?.captures || { black: 0, white: 0 };

  const myColor = isLocalGame ? currentTurn : (activeSession.players[0]?.id === player?.id ? 'black' : 'white');
  const isMyTurn = isLocalGame || currentTurn === myColor;

  // Force re-render when board state changes by serializing it
  useEffect(() => {
    if (activeSession?.state?.board) {
      setBoardKey(prev => prev + 1);
    }
  }, [JSON.stringify(activeSession?.state?.board)]); // Serialize board for comparison

  // Show game over dialog when game ends
  useEffect(() => {
    if (activeSession?.state?.ended) {
      setShowGameOverDialog(true);
    }
  }, [activeSession?.state?.ended]);

  const handleViewRankings = () => {
    setShowGameOverDialog(false);
    router.push('/rankings');
  };

  const handleBackToHome = () => {
    setShowGameOverDialog(false);
    router.push('/');
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!isMyTurn) return;
    if (board[row][col] !== null) return;

    makeMove(activeSession.id, { row, col });
  };

  const isStarPoint = (row: number, col: number): boolean => {
    const starPoints = [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15]
    ];
    return starPoints.some(([r, c]) => r === row && c === col);
  };

  const renderIntersection = (row: number, col: number) => {
    const stone = board[row][col];
    const isHovered = hoveredSquare?.row === row && hoveredSquare?.col === col;

    return (
      <div
        key={`${row}-${col}`}
        className="relative w-8 h-8 cursor-pointer"
        onClick={() => handleSquareClick(row, col)}
        onMouseEnter={() => setHoveredSquare({ row, col })}
        onMouseLeave={() => setHoveredSquare(null)}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-full h-px bg-slate-800" />
          <div className="absolute w-px h-full bg-slate-800" />
        </div>

        {/* Star points */}
        {isStarPoint(row, col) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-slate-800 rounded-full" />
          </div>
        )}

        {/* Stone */}
        {stone && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-7 h-7 rounded-full shadow-lg ${
                stone === 'black' 
                  ? 'bg-slate-900' 
                  : 'bg-white border-2 border-slate-300'
              }`}
            />
          </div>
        )}

        {/* Hover preview */}
        {!stone && isHovered && isMyTurn && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-7 h-7 rounded-full opacity-50 ${
                myColor === 'black' 
                  ? 'bg-slate-900' 
                  : 'bg-white border-2 border-slate-300'
              }`}
            />
          </div>
        )}
      </div>
    );
  };

  const getGameResult = () => {
    if (activeSession?.state?.ended) {
      const winner = activeSession.state.winner;
      if (isLocalGame) {
        return {
          title: 'Game Over!',
          description: `${winner === 'black' ? '⚫ Black' : '⚪ White'} wins!`,
          icon: <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-600" />
        };
      } else {
        const didIWin = winner === myColor;
        return {
          title: didIWin ? 'Victory!' : 'Defeat',
          description: didIWin ? 'You won!' : 'You lost.',
          icon: <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-600" />
        };
      }
    }
    return null;
  };

  const gameResult = getGameResult();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-5xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-2xl">⚫ Go (囲碁)</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Player Info */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isLocalGame ? (
                  <Badge variant="outline">
                    Local Game - Pass & Play
                  </Badge>
                ) : (
                  <>
                    <Badge variant={myColor === 'black' ? 'default' : 'secondary'}>
                      {myColor === 'black' ? '⚫' : '⚪'} You
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Playing as {myColor}
                    </span>
                  </>
                )}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Captures:</span> {captures[myColor]}
              </div>
            </div>
            <div>
              {isMyTurn ? (
                <Badge className="bg-green-500">Your Turn</Badge>
              ) : (
                <Badge variant="secondary">Opponent's Turn</Badge>
              )}
            </div>
          </div>

          {/* Go Board */}
          <div className="flex justify-center" key={boardKey}>
            <div className="inline-block bg-amber-600 p-4 rounded-lg shadow-2xl">
              <div className="bg-amber-500 p-2 rounded">
                {Array.from({ length: 19 }).map((_, row) => (
                  <div key={row} className="flex">
                    {Array.from({ length: 19 }).map((_, col) => renderIntersection(row, col))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-100 rounded-lg p-4">
              <h3 className="font-semibold mb-2">⚫ Black</h3>
              <p className="text-sm text-muted-foreground">
                Captures: {captures.black}
              </p>
            </div>
            <div className="bg-slate-100 rounded-lg p-4">
              <h3 className="font-semibold mb-2">⚪ White</h3>
              <p className="text-sm text-muted-foreground">
                Captures: {captures.white}
              </p>
            </div>
          </div>
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