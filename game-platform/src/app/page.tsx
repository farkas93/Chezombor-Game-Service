'use client';

import { useState } from 'react';
import { PlayerSetup } from '@/components/PlayerSetup';
import { GameSelector } from '@/components/GameSelector';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Home() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const { player, isConnected } = useWebSocket();

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