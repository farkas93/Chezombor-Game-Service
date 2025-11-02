'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'; // Add this import
import { useWebSocketContext } from '@/providers/WebSocketProvider'; 
import { GameSession } from '@/types';
import { ArrowLeft, Crown, Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';

interface ChessBoardProps {
  session: GameSession;
}

export function ChessBoard({ session }: ChessBoardProps) {
  const router = useRouter();
  const { makeMove, player, currentSession } = useWebSocketContext(); 
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [chess] = useState(() => new Chess());
  const [boardKey, setBoardKey] = useState(0);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false); // Add this

  const activeSession = currentSession || session;
  const isLocalGame = activeSession.mode === 'local';

  // Update chess instance when session state changes
  useEffect(() => {
    if (activeSession?.state?.fen) {
      try {
        chess.load(activeSession.state.fen);
        setBoardKey(prev => prev + 1);
      } catch (error) {
        console.error('[ChessBoard] Error loading FEN:', error);
      }
    }
  }, [activeSession?.state?.fen, chess]);

  // ADDED: Show dialog when game ends
  useEffect(() => {
    if (activeSession?.state?.checkmate || activeSession?.state?.stalemate || activeSession?.state?.draw) {
      setShowGameOverDialog(true);
    }
  }, [activeSession?.state?.checkmate, activeSession?.state?.stalemate, activeSession?.state?.draw]);

  const handleSquareClick = (square: string) => {
    const piece = chess.get(square as any);
    
    if (selectedSquare) {
      if (possibleMoves.includes(square)) {
        makeMove(activeSession.id, {
          from: selectedSquare,
          to: square
        });
        
        setSelectedSquare(null);
        setPossibleMoves([]);
      } else if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
        const moves = chess.moves({ square: square as any, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
      } else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    } else if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const moves = chess.moves({ square: square as any, verbose: true });
      setPossibleMoves(moves.map(m => m.to));
    }
  };

  const renderSquare = (row: number, col: number) => {
    const file = String.fromCharCode(97 + col);
    const rank = 8 - row;
    const square = `${file}${rank}`;
    const piece = chess.get(square as any);
    
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare === square;
    const isPossibleMove = possibleMoves.includes(square);
    
    let bgColor = isLight ? 'bg-amber-100' : 'bg-amber-700';
    if (isSelected) {
      bgColor = 'bg-yellow-400';
    } else if (isPossibleMove) {
      bgColor = isLight ? 'bg-green-200' : 'bg-green-600';
    }

    return (
      <div
        key={square}
        className={`w-16 h-16 flex items-center justify-center cursor-pointer text-4xl ${bgColor} hover:opacity-80 transition-opacity`}
        onClick={() => handleSquareClick(square)}
      >
        {piece && getPieceSymbol(piece.type, piece.color)}
      </div>
    );
  };

  const getPieceSymbol = (type: string, color: string): string => {
    const pieces: { [key: string]: { [key: string]: string } } = {
      k: { w: '♔', b: '♚' },
      q: { w: '♕', b: '♛' },
      r: { w: '♖', b: '♜' },
      b: { w: '♗', b: '♝' },
      n: { w: '♘', b: '♞' },
      p: { w: '♙', b: '♟' }
    };
    return pieces[type]?.[color] || '';
  };

  const currentTurnColor = activeSession?.state?.currentTurn || 'white';
  const myColor = isLocalGame ? null : (activeSession.players[0]?.id === player?.id ? 'white' : 'black');

  // ADDED: Get game result for dialog
  const getGameResult = () => {
    if (activeSession?.state?.checkmate) {
      const winner = activeSession.state.winner;
      if (isLocalGame) {
        return {
          title: 'Checkmate!',
          description: `${winner === 'white' ? '♔ White' : '♚ Black'} wins!`,
          icon: <Crown className="w-16 h-16 mx-auto mb-4 text-amber-600" />
        };
      } else {
        const didIWin = winner === myColor;
        return {
          title: didIWin ? 'Victory!' : 'Defeat',
          description: didIWin ? 'Checkmate! You won!' : 'Checkmate! You lost.',
          icon: <Crown className="w-16 h-16 mx-auto mb-4 text-amber-600" />
        };
      }
    } else if (activeSession?.state?.stalemate || activeSession?.state?.draw) {
      return {
        title: 'Draw',
        description: activeSession?.state?.stalemate ? 'Stalemate!' : 'Draw by repetition or insufficient material.',
        icon: <Flag className="w-16 h-16 mx-auto mb-4 text-slate-600" />
      };
    }
    return null;
  };

  const gameResult = getGameResult();

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
            <div className="flex gap-2">
              {activeSession?.state?.check && (
                <Badge variant="destructive">Check!</Badge>
              )}
              {activeSession?.state?.checkmate && (
                <Badge className="bg-red-600">Checkmate!</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Player Info */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
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
              <Badge className={currentTurnColor === 'white' ? 'bg-slate-100 text-slate-900' : 'bg-slate-900'}>
                {currentTurnColor === 'white' ? '♔ White' : '♚ Black'} to move
              </Badge>
            </div>
          </div>

          {/* Chess Board */}
          <div className="flex justify-center" key={boardKey}>
            <div className="inline-block border-4 border-slate-800 rounded-lg overflow-hidden shadow-2xl">
              {Array.from({ length: 8 }).map((_, row) => (
                <div key={row} className="flex">
                  {Array.from({ length: 8 }).map((_, col) => renderSquare(row, col))}
                </div>
              ))}
            </div>
          </div>

          {/* Move History */}
          <div className="bg-slate-100 rounded-lg p-4 max-h-32 overflow-y-auto">
            <h3 className="font-semibold mb-2">Move History</h3>
            <div className="text-sm text-muted-foreground">
              {activeSession?.state?.moveHistory?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {activeSession.state.moveHistory.map((move: any, idx: number) => (
                    <div key={idx}>
                      {Math.floor(idx / 2) + 1}. {move.san}
                    </div>
                  ))}
                </div>
              ) : (
                'No moves yet'
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADDED: Game Over Dialog */}
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
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/')} variant="default">
              Back to Home
            </Button>
            <Button onClick={() => setShowGameOverDialog(false)} variant="outline">
              Review Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}