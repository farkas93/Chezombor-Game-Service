'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebSocketContext } from '@/providers/WebSocketProvider'; s
import { GameSession } from '@/types';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GoBoardProps {
    session: GameSession;
}

export function GoBoard({ session }: GoBoardProps) {
    const router = useRouter();
    const { makeMove, player, currentSession } = useWebSocketContext(); 
    const [hoveredSquare, setHoveredSquare] = useState<{ row: number; col: number } | null>(null);

    const board = currentSession?.state?.board || Array(19).fill(null).map(() => Array(19).fill(null));
    const currentTurn = currentSession?.state?.currentTurn || 'black';
    const captures = currentSession?.state?.captures || { black: 0, white: 0 };

    const isLocalGame = session.mode === 'local';

    const myColor = isLocalGame ? currentTurn : (session.players[0]?.id === player?.id ? 'black' : 'white');
    const isMyTurn = isLocalGame || currentTurn === myColor;


    const handleSquareClick = (row: number, col: number) => {
        if (!isMyTurn) return;
        if (board[row][col] !== null) return; // Square already occupied

        makeMove(session.id, { row, col });
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

                {/* Star points (handicap positions) */}
                {isStarPoint(row, col) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-slate-800 rounded-full" />
                    </div>
                )}

                {/* Stone */}
                {stone && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            className={`w-7 h-7 rounded-full shadow-lg ${stone === 'black' ? 'bg-slate-900' : 'bg-white border-2 border-slate-300'
                                }`}
                        />
                    </div>
                )}

                {/* Hover preview */}
                {!stone && isHovered && isMyTurn && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            className={`w-7 h-7 rounded-full opacity-50 ${myColor === 'black' ? 'bg-slate-900' : 'bg-white border-2 border-slate-300'
                                }`}
                        />
                    </div>
                )}
            </div>
        );
    };

    const isStarPoint = (row: number, col: number): boolean => {
        const starPoints = [
            [3, 3], [3, 9], [3, 15],
            [9, 3], [9, 9], [9, 15],
            [15, 3], [15, 9], [15, 15]
        ];
        return starPoints.some(([r, c]) => r === row && c === col);
    };

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
                    <div className="flex justify-center">
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

                    {/* Game End */}
                    {currentSession?.state?.ended && (
                        <div className="text-center p-4 bg-amber-100 rounded-lg">
                            <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                            <p className="font-bold text-lg">
                                {currentSession.state.winner === myColor ? 'You Won!' : 'You Lost'}
                            </p>
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