// src/components/ModeSelector.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Bot, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';
import { GameType } from '@/types'; // Import GameType

interface ModeSelectorProps {
  gameType: GameType; // Use GameType for type safety
}

export function ModeSelector({ gameType }: ModeSelectorProps) {
  const router = useRouter();
  const { createGame, findMatch } = useWebSocket();

  const handlePvP = () => {
    findMatch(gameType);
  };

  const handlePvAI = () => {
    createGame(gameType, 'pvai');
  };

  const handleSolo = () => {
    createGame(gameType, 'pvai');
  };

  const gameTitle = gameType.toUpperCase();
  const is2048 = gameType === '2048';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-4xl font-bold">{gameTitle}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {!is2048 && (
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={handlePvP}>
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-center">Player vs Player</CardTitle>
              <CardDescription className="text-center">
                Challenge another human player
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                Find Match
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={is2048 ? handleSolo : handlePvAI}>
          <CardHeader>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-center">
              {is2048 ? 'Solo Play' : 'Player vs AI'}
            </CardTitle>
            <CardDescription className="text-center">
              {is2048 ? 'Beat your high score' : 'Play against computer opponent'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" variant="secondary">
              {is2048 ? 'Start Game' : 'Play vs AI'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}