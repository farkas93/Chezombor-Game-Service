// src/hooks/useWebSocket.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketClient } from '@/lib/websocketClient';
import { Player, GameSession, GameType, GameMode } from '@/types';

export function useWebSocket() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  
  // ADDED: Use ref to track if listeners are set up
  const listenersSetup = useRef(false);

  useEffect(() => {
    // ADDED: Prevent duplicate listener setup
    if (listenersSetup.current) return;
    listenersSetup.current = true;

    const unsubscribeConnection = websocketClient.onConnectionStatusChange((connected) => {
      setIsConnected(connected);
    });

    const unsubscribeRegistered = websocketClient.onMessage('registered', (payload) => {
      setPlayer(payload.player);
    });

    const unsubscribeGameCreated = websocketClient.onMessage('game_created', (payload) => {
      setCurrentSession(payload.session);
      setWaitingForOpponent(false);
    });

    const unsubscribeGameStart = websocketClient.onMessage('game_start', (payload) => {
      setCurrentSession(payload.session);
      setWaitingForOpponent(false);
    });

    const unsubscribeGameUpdate = websocketClient.onMessage('game_update', (payload) => {
      setCurrentSession(payload.session);
    });

    const unsubscribeWaiting = websocketClient.onMessage('waiting_for_opponent', () => {
      setWaitingForOpponent(true);
    });

    const unsubscribeGameEnd = websocketClient.onMessage('game_end', (payload) => {
      setCurrentSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          state: payload.session?.state || prev.state
        };
      });
    });

    return () => {
      listenersSetup.current = false;
      unsubscribeConnection();
      unsubscribeRegistered();
      unsubscribeGameCreated();
      unsubscribeGameStart();
      unsubscribeGameUpdate();
      unsubscribeWaiting();
      unsubscribeGameEnd();
    };
  }, []); // CHANGED: Empty dependency array

  const registerPlayer = useCallback((name: string, type: 'human' | 'ai') => {
    websocketClient.sendMessage({
      type: 'register',
      payload: { name, type },
    });
  }, []);

  const createGame = useCallback((gameType: GameType, mode: GameMode, player2Name?: string) => {
    websocketClient.sendMessage({
      type: 'create_game',
      payload: { gameType, mode, player2Name },
    });
  }, []);

  const findMatch = useCallback((gameType: GameType) => {
    websocketClient.sendMessage({
      type: 'find_match',
      payload: { gameType },
    });
  }, []);

  const makeMove = useCallback((sessionId: string, move: any) => {
    websocketClient.sendMessage({
      type: 'move',
      payload: { sessionId, move },
    });
  }, []);

  return {
    player,
    currentSession,
    isConnected,
    waitingForOpponent,
    registerPlayer,
    createGame,
    findMatch,
    makeMove,
  };
}