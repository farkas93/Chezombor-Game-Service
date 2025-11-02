'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Trophy, Crown } from 'lucide-react';
import { useWebSocketContext } from '@/providers/WebSocketProvider';

const games = [
  {
    id: 'chess',
    title: 'Chess',
    icon: '♟️',
    description: 'Classic strategy board game',
    players: '2 Players',
    hasElo: true,
    color: 'from-amber-500 to-orange-500'
  },
  {
    id: 'go',
    title: 'Go',
    icon: '⚫',
    description: 'Ancient game of territory',
    players: '2 Players',
    hasElo: true,
    color: 'from-slate-500 to-gray-700'
  },
  {
    id: '2048',
    title: '2048',
    icon: '🔢',
    description: 'Addictive puzzle game',
    players: '1 Player',
    hasElo: false,
    color: 'from-cyan-500 to-blue-500'
  }
];

export function GameSelector() {
  const router = useRouter();
  const { player } = useWebSocketContext();

  return (
    <div className="space-y-8">
      {/* Header with Rankings button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            Welcome, {player?.name || 'Player'}! 👋
          </h1>
          <p className="text-muted-foreground">Choose a game to play</p>
        </div>
        <Button
          onClick={() => router.push('/rankings')}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <Trophy className="w-5 h-5" />
          Rankings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => (
          <Card 
            key={game.id}
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            onClick={() => router.push(`/game/${game.id}`)}
          >
            <CardHeader>
              <div className={`text-6xl text-center mb-4 p-6 rounded-lg bg-gradient-to-br ${game.color}`}>
                {game.icon}
              </div>
              <CardTitle className="text-center text-2xl">{game.title}</CardTitle>
              <CardDescription className="text-center">
                {game.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-center gap-2">
                <Badge variant="secondary">{game.players}</Badge>
                {game.hasElo && (
                  <Badge variant="outline" className="gap-1">
                    <Crown className="w-3 h-3" />
                    ELO Ranked
                  </Badge>
                )}
              </div>
              <Button className="w-full">
                Play Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}