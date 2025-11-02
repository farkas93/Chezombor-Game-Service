'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GameSession } from '@/types';
import { ArrowLeft, Crown, Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';

interface ChessBoardProps {
  session: GameSession;
}

export function ChessBoard({ session }: ChessBoardProps) {
  const router = useRouter();
  const { makeMove, player, currentSession } = useWebSocket();
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [chess] = useState(() => new Chess());

  // Update chess instance when session state changes
  useEffect(() => {
    if (currentSession?.state?.fen) {
      chess.load(currentSession.state.fen);
    }
  }, [currentSession?.state?.fen, chess]);

  const handleSquareClick = (square: string) => {
    const piece = chess.get(square as any);
    
    // If a square is already selected, try to move
    if (selectedSquare) {
      if (possibleMoves.includes(square)) {
        // Make the move
        makeMove(session.id, {
          from: selectedSquare,
          to: square
        });
        setSelectedSquare(null);
        setPossibleMoves([]);
      } else if (piece && piece.color === chess.turn()) {
        // Select a different piece
        setSelectedSquare(square);
        const moves = chess.moves({ square: square as any, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
      } else {
        // Deselect
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    } else if (piece && piece.color === chess.turn()) {
      // Select a piece
      setSelectedSquare(square);
      const moves = chess.moves({ square: square as any, verbose: true });
      setPossibleMoves(moves.map(m => m.to));
    }
  };

  const renderSquare = (row: number, col: number) => {
    const file = String.fromCharCode(97 + col); // a-h
    const rank = 8 - row; // 8-1
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

  const myColor = session.players[0]?.id === player?.id ? 'white' : 'black';
  const isMyTurn = currentSession?.state?.currentTurn === myColor;

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
              {currentSession?.state?.check && (
                <Badge variant="destructive">Check!</Badge>
              )}
              {currentSession?.state?.checkmate && (
                <Badge className="bg-red-600">Checkmate!</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Player Info */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant={myColor === 'white' ? 'default' : 'secondary'}>
                {myColor === 'white' ? '♔' : '♚'} You
              </Badge>
              <span className="text-sm text-muted-foreground">
                Playing as {myColor}
              </span>
            </div>
            <div>
              {isMyTurn ? (
                <Badge className="bg-green-500">Your Turn</Badge>
              ) : (
                <Badge variant="secondary">Opponent's Turn</Badge>
              )}
            </div>
          </div>

          {/* Chess Board */}
          <div className="flex justify-center">
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
              {currentSession?.state?.moveHistory?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {currentSession.state.moveHistory.map((move: any, idx: number) => (
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

          {/* Game Status */}
          {currentSession?.state?.checkmate && (
            <div className="text-center p-4 bg-amber-100 rounded-lg">
              <Crown className="w-8 h-8 mx-auto mb-2 text-amber-600" />
              <p className="font-bold text-lg">
                {currentSession.state.winner === myColor ? 'You Won!' : 'You Lost'}
              </p>
              <Button className="mt-4" onClick={() => router.push('/')}>
                Back to Home
              </Button>
            </div>
          )}

          {(currentSession?.state?.stalemate || currentSession?.state?.draw) && (
            <div className="text-center p-4 bg-slate-100 rounded-lg">
              <Flag className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-bold text-lg">Draw!</p>
              <Button className="mt-4" onClick={() => router.push('/')}>
                Back to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}