// src/components/ChessBoard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebSocketContext } from '@/providers/WebSocketProvider';
import { GameSession } from '@/types';
import { useRouter } from 'next/navigation';

interface ChessBoardProps {
  session: GameSession;
}

export function ChessBoard({ session }: ChessBoardProps) {
  const router = useRouter();
  const { makeMove, player, currentSession } = useWebSocketContext();
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [chess] = useState(() => new Chess());
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);

  const activeSession = currentSession || session;
  const isLocalGame = activeSession.mode === 'local';

  const myColor = isLocalGame 
    ? activeSession.state.currentTurn 
    : (activeSession.players[0]?.id === player?.id ? 'white' : 'black');
  const isMyTurn = isLocalGame || activeSession.state.currentTurn === myColor;

  useEffect(() => {
    if (activeSession?.state?.fen) {
      chess.load(activeSession.state.fen);
    }
  }, [activeSession?.state?.fen, chess]);

  useEffect(() => {
    if (activeSession?.state?.checkmate || activeSession?.state?.stalemate || activeSession?.state?.draw) {
      setShowGameOverDialog(true);
    }
  }, [activeSession?.state?.checkmate, activeSession?.state?.stalemate, activeSession?.state?.draw]);

  const handleViewRankings = () => {
    setShowGameOverDialog(false);
    router.push('/rankings');
  };

  const handleBackToHome = () => {
    setShowGameOverDialog(false);
    router.push('/');
  };

  const handleSquareClick = (square: string) => {
    if (!isMyTurn) return;

    if (selectedSquare) {
      const possibleMoves = chess.moves({ square: selectedSquare as Square, verbose: true });
      if (possibleMoves.some(m => m.to === square)) {
        makeMove(activeSession.id, {
          from: selectedSquare,
          to: square
        });
        setSelectedSquare(null);
      } else {
        setSelectedSquare(square);
      }
    } else {
      setSelectedSquare(square);
    }
  };

  const renderSquare = (square: string, piece: any) => {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    const isLight = (file + rank) % 2 === 0;
    const isSelected = selectedSquare === square;

    // FIXED: Get possible moves as strings, not Square types
    const possibleMoves = selectedSquare
      ? chess.moves({ square: selectedSquare as Square, verbose: true }).map(m => m.to as string)
      : [];
    const isPossibleMove = possibleMoves.includes(square);

    return (
      <div
        key={square}
        className={`
          w-16 h-16 flex items-center justify-center cursor-pointer relative
          ${isLight ? 'bg-amber-100' : 'bg-amber-700'}
          ${isSelected ? 'ring-4 ring-blue-500' : ''}
          ${isPossibleMove ? 'ring-2 ring-green-400' : ''}
        `}
        onClick={() => handleSquareClick(square)}
      >
        {piece && (
          <span className="text-5xl select-none">
            {getPieceSymbol(piece)}
          </span>
        )}
        {isPossibleMove && !piece && (
          <div className="absolute w-4 h-4 bg-green-400 rounded-full opacity-50" />
        )}
      </div>
    );
  };

  const getPieceSymbol = (piece: any) => {
    const symbols: Record<string, string> = {
      'wp': '♙', 'wn': '♘', 'wb': '♗', 'wr': '♖', 'wq': '♕', 'wk': '♔',
      'bp': '♟', 'bn': '♞', 'bb': '♝', 'br': '♜', 'bq': '♛', 'bk': '♚',
    };
    return symbols[`${piece.color}${piece.type}`] || '';
  };

  const getGameResult = () => {
    if (activeSession?.state?.checkmate) {
      const winner = activeSession.state.currentTurn === 'white' ? 'Black' : 'White';
      if (isLocalGame) {
        return {
          title: 'Checkmate!',
          description: `${winner} wins by checkmate!`,
          icon: <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-600" />
        };
      } else {
        const didIWin = (winner.toLowerCase() === myColor);
        return {
          title: didIWin ? 'Victory!' : 'Defeat',
          description: didIWin ? 'You won by checkmate!' : 'You lost by checkmate.',
          icon: <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-600" />
        };
      }
    } else if (activeSession?.state?.stalemate) {
      return {
        title: 'Stalemate',
        description: 'The game is a draw by stalemate.',
        icon: <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
      };
    } else if (activeSession?.state?.draw) {
      return {
        title: 'Draw',
        description: 'The game ended in a draw.',
        icon: <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
      };
    }
    return null;
  };

  const gameResult = getGameResult();

  const board = chess.board();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-4xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-2xl">♟️ Chess</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {isLocalGame ? (
                <Badge variant="outline">
                  Local Game - Pass & Play
                </Badge>
              ) : (
                <>
                  <Badge variant={myColor === 'white' ? 'default' : 'secondary'}>
                    {myColor === 'white' ? '♔' : '♚'} You
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Playing as {myColor}
                  </span>
                </>
              )}
            </div>
            <div>
              {isMyTurn ? (
                <Badge className="bg-green-500">Your Turn</Badge>
              ) : (
                <Badge variant="secondary">Opponent's Turn</Badge>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="inline-block border-4 border-amber-900 rounded-lg overflow-hidden shadow-2xl">
              {board.map((row, i) => (
                <div key={i} className="flex">
                  {row.map((piece, j) => {
                    const file = String.fromCharCode(97 + j);
                    const rank = (8 - i).toString();
                    const square = file + rank;
                    return renderSquare(square, piece);
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-100 rounded-lg p-4">
              <h3 className="font-semibold mb-2">♔ White</h3>
              <p className="text-sm text-muted-foreground">
                {activeSession.players[0]?.name || 'Player 1'}
              </p>
            </div>
            <div className="bg-slate-100 rounded-lg p-4">
              <h3 className="font-semibold mb-2">♚ Black</h3>
              <p className="text-sm text-muted-foreground">
                {activeSession.players[1]?.name || 'Player 2'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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