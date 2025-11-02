'use client';

import { useState, useEffect } from 'react';
import { PlayerSetup } from '@/components/PlayerSetup';
import { GameSelector } from '@/components/GameSelector';
import { useWebSocketContext } from '@/providers/WebSocketProvider'; // Changed from useWebSocket

export default function Home() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const { player, isConnected } = useWebSocketContext(); // Changed from useWebSocket

  // Auto-advance when player is registered
  useEffect(() => {
    if (player) {
      setIsPlayerReady(true);
    }
  }, [player]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-6xl w-full min-h-[600px]">
        {!isPlayerReady ? (
          <PlayerSetup onReady={() => setIsPlayerReady(true)} />
        ) : (
          <GameSelector />
        )}
      </div>
    </main>
  );
}