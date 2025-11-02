'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Bot, ArrowLeft, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWebSocketContext } from '@/providers/WebSocketProvider'; 
import { GameType } from '@/types';

interface ModeSelectorProps {
  gameType: GameType;
}

export function ModeSelector({ gameType }: ModeSelectorProps) {
  const router = useRouter();
  const { createGame } = useWebSocketContext(); 

  // MODIFIED: Handle local PvP
  const handleLocalPvP = () => {
    createGame(gameType, 'local'); // Create a local game session
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
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={handleLocalPvP}>
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-center">Local Multiplayer</CardTitle>
              <CardDescription className="text-center">
                Play with a friend on the same device (hot-seat)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                Start Local Game
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
              {is2048 ? 'Beat your high score' : 'Play against computer opponent (Coming Soon)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg" variant="secondary" disabled={!is2048}>
              {is2048 ? 'Start Game' : 'Coming Soon'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}