'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const activeSession = currentSession || session;
  const isLocalGame = activeSession.mode === 'local';

  const board = activeSession?.state?.board || Array(19).fill(null).map(() => Array(19).fill(null));
  const currentTurn = activeSession?.state?.currentTurn || 'black';
  const captures = activeSession?.state?.captures || { black: 0, white: 0 };
  const moveHistory = activeSession?.state?.moveHistory || [];

  const myColor = isLocalGame ? currentTurn : (activeSession.players[0]?.id === player?.id ? 'black' : 'white');
  const isMyTurn = isLocalGame || currentTurn === myColor;

  // ADDED: Get player names
  const player1 = activeSession.players[0];
  const player2 = activeSession.players[1];
  const blackPlayer = player1;
  const whitePlayer = player2;

  // ADDED: Get current player name
  const currentPlayerName = currentTurn === 'black' ? blackPlayer?.name : whitePlayer?.name;

  // Force re-render when board state changes
  useEffect(() => {
    if (activeSession?.state?.board) {
      setBoardKey(prev => prev + 1);
    }
  }, [JSON.stringify(activeSession?.state?.board)]);

  // Show game over dialog when game ends
  useEffect(() => {
    if (activeSession?.state?.ended) {
      setShowGameOverDialog(true);
    } else if (activeSession?.state && isMyTurn) {
      const hasLegalMoves = checkForLegalMoves();
      if (!hasLegalMoves && !activeSession.state.ended) {
        setShowPassPrompt(true);
      }
    }
  }, [activeSession?.state?.ended, activeSession?.state, isMyTurn]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [moveHistory.length]);

  const checkForLegalMoves = (): boolean => {
    if (!board) return false;

    for (let row = 0; row < 19; row++) {
      for (let col = 0; col < 19; col++) {
        if (board[row][col] === null) {
          return true;
        }
      }
    }
    return false;
  };

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
    setShowPassPrompt(false);
  };

  const handlePass = () => {
    if (!isMyTurn) return;
    makeMove(activeSession.id, { pass: true });
    setShowPassPrompt(false);
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
              className={`w-7 h-7 rounded-full shadow-lg ${stone === 'black'
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
              className={`w-7 h-7 rounded-full opacity-50 ${myColor === 'black'
                  ? 'bg-slate-900'
                  : 'bg-white border-2 border-slate-300'
                }`}
            />
          </div>
        )}
      </div>
    );
  };

  // ADDED: Format move for display
  const formatMove = (move: any, index: number) => {
    if (move.pass) {
      return 'Pass';
    }
    const col = String.fromCharCode(65 + move.col); // A-S
    const row = 19 - move.row; // 1-19 (inverted)
    return `${col}${row}`;
  };

  // ADDED: Get player name for move
  const getPlayerNameForMove = (move: any) => {
    return move.color === 'black' ? blackPlayer?.name : whitePlayer?.name;
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
      <div className="flex gap-4 max-w-7xl w-full">
        {/* Main Game Board */}
        <Card className="flex-1">
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
              </div>
              <div>
                {/* CHANGED: Show player name instead of "Your Turn" */}
                <Badge className={isMyTurn ? "bg-green-500" : "bg-gray-500"}>
                  {currentPlayerName}'s Turn
                </Badge>
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

            {/* Pass Button */}
            <div className="flex justify-center">
              <Button
                onClick={handlePass}
                disabled={!isMyTurn || activeSession?.state?.ended}
                variant={showPassPrompt ? "default" : "outline"}
                size="lg"
                className={`min-w-[200px] ${showPassPrompt ? 'animate-pulse bg-orange-500 hover:bg-orange-600' : ''}`}
              >
                {showPassPrompt ? '⚠️ No Legal Moves - Must Pass' : 'Pass'}
              </Button>
            </div>

            {/* Game Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-100 rounded-lg p-4">
                <h3 className="font-semibold mb-2">⚫ {blackPlayer?.name || 'Black'}</h3>
                <p className="text-sm text-muted-foreground">
                  Captures: {captures.black}
                </p>
              </div>
              <div className="bg-slate-100 rounded-lg p-4">
                <h3 className="font-semibold mb-2">⚪ {whitePlayer?.name || 'White'}</h3>
                <p className="text-sm text-muted-foreground">
                  Captures: {captures.white}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ADDED: Move History Sidebar */}
        <Card className="w-80">
          <CardHeader>
            <CardTitle className="text-lg">Move History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4" ref={scrollAreaRef}>
              {moveHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No moves yet
                </p>
              ) : (
                <div className="space-y-2">
                  {moveHistory.map((move: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <Badge variant={move.color === 'black' ? 'default' : 'secondary'} className="w-6 h-6 p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span className={`font-semibold ${move.color === 'black' ? 'text-slate-900' : 'text-slate-600'}`}>
                        {move.color === 'black' ? '⚫' : '⚪'}
                      </span>
                      <span className="text-sm font-medium flex-1">
                        {getPlayerNameForMove(move)}
                      </span>
                      <span className="text-sm font-mono text-slate-600">
                        {formatMove(move, index)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Pass Prompt Dialog */}
      <Dialog open={showPassPrompt && isMyTurn} onOpenChange={setShowPassPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">No Legal Moves Available</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <DialogDescription className="text-lg mb-4">
              You have no legal moves available. You must pass your turn.
            </DialogDescription>
            <Button onClick={handlePass} size="lg" className="w-full">
              Pass Turn
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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