// src/hooks/useWebSocket.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Player, GameSession } from '@/types';
import { websocketClient } from '@/lib/websocketClient';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  useEffect(() => {
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
    
    // MODIFIED: Don't clear session on game_end, just update it with the final state
    unsubs.push(websocketClient.onMessage('game_end', (payload) => {
      console.log('[useWebSocket] Game ended:', payload);
      // Keep the session so the board can show the final state and game over dialog
      // The session will be cleared when user navigates away
    }));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  const registerPlayer = useCallback((name: string, type: 'human' | 'ai') => {
    websocketClient.sendMessage({ type: 'register', payload: { name, type } });
  }, []);

  const createGame = useCallback((gameType: string, mode: string) => {
    websocketClient.sendMessage({ type: 'create_game', payload: { gameType, mode } });
  }, []);

  const makeMove = useCallback((sessionId: string, move: any) => {
    websocketClient.sendMessage({ type: 'move', payload: { sessionId, move } });
  }, []);

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
    findMatch,
  };
}