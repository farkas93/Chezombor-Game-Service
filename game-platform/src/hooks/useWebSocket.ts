'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, Player, GameSession } from '@/types';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Map<string, (payload: any) => void>>(new Map());

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        console.log('Received message:', message);

        // Handle common messages
        switch (message.type) {
          case 'registered':
            setPlayer(message.payload.player);
            break;
          case 'game_created':
            setCurrentSession(message.payload.session);
            break;
          case 'game_start':
            setCurrentSession(message.payload.session);
            setWaitingForOpponent(false);
            break;
          case 'game_update':
            setCurrentSession(message.payload.session);
            break;
          case 'waiting_for_opponent':
            setWaitingForOpponent(true);
            break;
          case 'game_end':
            setCurrentSession(null);
            break;
        }

        // Call custom handlers
        const handler = messageHandlers.current.get(message.type);
        if (handler) {
          handler(message.payload);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const registerPlayer = useCallback((name: string, type: 'human' | 'ai') => {
    sendMessage({
      type: 'register',
      payload: { name, type }
    });
  }, [sendMessage]);

  const createGame = useCallback((gameType: string, mode: string) => {
    sendMessage({
      type: 'create_game',
      payload: { gameType, mode }
    });
  }, [sendMessage]);

  const findMatch = useCallback((gameType: string) => {
    sendMessage({
      type: 'find_match',
      payload: { gameType }
    });
  }, [sendMessage]);

  const makeMove = useCallback((sessionId: string, move: any) => {
    sendMessage({
      type: 'move',
      payload: { sessionId, move }
    });
  }, [sendMessage]);

  const onMessage = useCallback((type: string, handler: (payload: any) => void) => {
    messageHandlers.current.set(type, handler);
    return () => {
      messageHandlers.current.delete(type);
    };
  }, []);

  return {
    isConnected,
    player,
    currentSession,
    waitingForOpponent,
    registerPlayer,
    createGame,
    findMatch,
    makeMove,
    sendMessage,
    onMessage
  };
}