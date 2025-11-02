// src/components/GameSelector.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Trophy, Crown, Grid3x3 } from 'lucide-react';

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

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Select a Game</h1>
        <p className="text-muted-foreground">Choose your adventure</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => (
          <Card 
            key={game.id}
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
            // MODIFIED: Use dynamic route for game pages
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
              <Button className="w-full" variant="outline">
                Play Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button 
          variant="ghost" 
          size="lg"
          onClick={() => router.push('/rankings')}
          className="gap-2"
        >
          <Trophy className="w-5 h-5" />
          View Rankings & Highscores
        </Button>
      </div>
    </div>
  );
}