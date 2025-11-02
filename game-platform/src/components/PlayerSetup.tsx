'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWebSocketContext } from '@/providers/WebSocketProvider'; 
import { User, Bot, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlayerSetupProps {
  onReady: () => void;
}

export function PlayerSetup({ onReady }: PlayerSetupProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'human' | 'ai'>('human');
  const { registerPlayer, player, isConnected } = useWebSocketContext(); 
  const router = useRouter();

  const handleStart = () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    registerPlayer(name, type);
    
    // Wait for registration confirmation
    const checkInterval = setInterval(() => {
      if (player) {
        clearInterval(checkInterval);
        onReady();
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkInterval), 5000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
            🎮 Multi-Game Platform
          </CardTitle>
          <CardDescription>
            Play Chess, Go, and 2048 with friends or AI
          </CardDescription>
          <Button
            onClick={() => router.push('/rankings')}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Trophy className="w-5 h-5" />
            Rankings
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="player-name" className="text-sm font-medium">
              Your Name
            </label>
            <Input
              id="player-name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="player-type" className="text-sm font-medium">
              Player Type
            </label>
            <Select value={type} onValueChange={(v) => setType(v as 'human' | 'ai')}>
              <SelectTrigger id="player-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="human">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Human Player
                  </div>
                </SelectItem>
                <SelectItem value="ai">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    AI Player
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleStart} 
            className="w-full"
            disabled={!isConnected}
          >
            {isConnected ? 'Start Playing' : 'Connecting...'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}