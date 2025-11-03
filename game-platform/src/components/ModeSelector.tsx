'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users, Bot, ArrowLeft, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWebSocketContext } from '@/providers/WebSocketProvider'; 
import { GameType } from '@/types';

interface ModeSelectorProps {
  gameType: GameType;
}

export function ModeSelector({ gameType }: ModeSelectorProps) {
  const router = useRouter();
  const { createGame, findMatch, player } = useWebSocketContext(); // ADDED: findMatch
  const [showLocalDialog, setShowLocalDialog] = useState(false);
  const [player2Name, setPlayer2Name] = useState('');

  const handleLocalPvP = () => {
    setShowLocalDialog(true);
  };

  const handleStartLocal = () => {
    if (!player2Name.trim()) {
      alert('Please enter Player 2 name');
      return;
    }
    
    // Store player 2 name in session storage for the game to use
    sessionStorage.setItem('player2Name', player2Name);
    
    createGame(gameType, 'local', player2Name);
    setShowLocalDialog(false);
  };

  // CHANGED: Use findMatch for online multiplayer (including AI bots)
  const handleOnlineMultiplayer = () => {
    findMatch(gameType);
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* ADDED: Online Multiplayer Card */}
        {!is2048 && (
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={handleOnlineMultiplayer}>
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-center">Online Multiplayer</CardTitle>
              <CardDescription className="text-center">
                Play against other players or AI bots online
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                Find Match
              </Button>
            </CardContent>
          </Card>
        )}

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
              <Button className="w-full" size="lg" variant="secondary">
                Start Local Game
              </Button>
            </CardContent>
          </Card>
        )}

        {/* CHANGED: Solo/2048 mode */}
        <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={is2048 ? handleSolo : undefined}>
          <CardHeader>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-center">
              {is2048 ? 'Solo Play' : 'Practice vs AI'}
            </CardTitle>
            <CardDescription className="text-center">
              {is2048 ? 'Beat your high score' : 'Play against built-in AI (Coming Soon)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              size="lg" 
              variant="outline" 
              disabled={!is2048}
            >
              {is2048 ? 'Start Game' : 'Coming Soon'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Local Game Dialog */}
      <Dialog open={showLocalDialog} onOpenChange={setShowLocalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">Local Multiplayer Setup</DialogTitle>
            <DialogDescription>
              Enter the name for Player 2
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Player 1</label>
              <Input value={player?.name || 'Player 1'} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Player 2</label>
              <Input
                placeholder="Enter Player 2 name"
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartLocal()}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowLocalDialog(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleStartLocal} className="flex-1">
              Start Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}