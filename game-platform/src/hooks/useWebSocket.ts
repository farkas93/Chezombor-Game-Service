// src/hooks/useWebSocket.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Player, GameSession } from '@/types';
import { websocketClient } from '@/lib/websocketClient'; // Import our new client

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  useEffect(() => {
    // This effect subscribes the component to the websocketClient's events
    // and cleans up the subscriptions when the component unmounts.
    const unsubs: (() => void)[] = [];

    unsubs.push(websocketClient.onConnectionStatusChange(setIsConnected));

    unsubs.push(websocketClient.onMessage('registered', (payload) => setPlayer(payload.player)));
    unsubs.push(websocketClient.onMessage('game_created', (payload) => setCurrentSession(payload.session)));
    unsubs.push(websocketClient.onMessage('game_start', (payload) => {
      setCurrentSession(payload.session);
      setWaitingForOpponent(false);
    }));
    unsubs.push(websocketClient.onMessage('game_update', (payload) => setCurrentSession(payload.session)));
    unsubs.push(websocketClient.onMessage('waiting_for_opponent', () => setWaitingForOpponent(true)));
    unsubs.push(websocketClient.onMessage('game_end', () => setCurrentSession(null)));

    // Return a cleanup function that unsubscribes from all events
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  // The action functions now just call the client's sendMessage method
  const registerPlayer = useCallback((name: string, type: 'human' | 'ai') => {
    websocketClient.sendMessage({ type: 'register', payload: { name, type } });
  }, []);

  const createGame = useCallback((gameType: string, mode: string) => {
    websocketClient.sendMessage({ type: 'create_game', payload: { gameType, mode } });
  }, []);

  const makeMove = useCallback((sessionId: string, move: any) => {
    console.log('[useWebSocket] makeMove called with:', { sessionId, move }); // Add this
    websocketClient.sendMessage({ type: 'move', payload: { sessionId, move } });
  }, []);

  // No change to findMatch, but let's include it for completeness
  const findMatch = useCallback((gameType: string) => {
    websocketClient.sendMessage({ type: 'find_match', payload: { gameType } });
  }, []);

  return {
    isConnected,
    player,
    currentSession,
    waitingForOpponent,
    registerPlayer,
    createGame,
    makeMove,
    findMatch, // Added findMatch back
  };
}