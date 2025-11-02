import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { cleanupDatabase } from './src/lib/cleanup';

import { GameManager } from './src/lib/gameManager';
import { getDatabase } from './src/lib/database';
import { EloSystem } from './src/lib/eloSystem';
import { ChessGame } from './src/lib/games/chess';
import { GoGame } from './src/lib/games/go';
import { Game2048 } from './src/lib/games/2048';
import { Player, GameSession, WSMessage, GameType, GameMode, PlayerType } from './src/types/index';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const gameManager = new GameManager();
const db = getDatabase();
const eloSystem = new EloSystem();

const clients = new Map<string, { ws: WebSocket; player: Player }>();

app.prepare().then(() => {
  console.log('[Server] Next.js app prepared successfully.');
  
  try {
    console.log('[Server] Running database cleanup...');
    cleanupDatabase(db);
  } catch (error) {
    console.error('[Server] Error during database cleanup:', error);
    // Don't exit - continue with server startup
  }
  
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[Server] Error handling HTTP request', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  console.log('[Server] WebSocketServer initialized (awaiting upgrade events).');

  const gameSocketPath = '/api/socket';

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const pathname = request.url ? parse(request.url).pathname : undefined;
    console.log(`[Server] Received upgrade request for path: ${pathname}`);

    if (pathname === gameSocketPath) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
        console.log(`[Server] WebSocket connection upgraded successfully for ${gameSocketPath}.`);
      });
    } else {
      console.log(`[Server] Ignoring upgrade for unhandled path: ${pathname}`);
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[Server] A client has established a WebSocket connection!');
    let playerId: string | null = null;

    ws.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        console.log(`[Server] Received WS message: Type='${message.type}', PlayerID='${playerId || 'unregistered'}'`);

        switch (message.type) {
          case 'register': {
            const playerName = message.payload.name || 'Ready Player 1';

            // MODIFIED: Check if player already exists by name
            const existingPlayer = db.getPlayerByName(playerName);

            let player: Player;
            if (existingPlayer) {
              // Use existing player data
              player = {
                id: existingPlayer.id,
                name: existingPlayer.name,
                type: existingPlayer.type,
              };
              playerId = existingPlayer.id;
              console.log(`[Server] Existing player reconnected: ${player.name} (${player.id})`);
            } else {
              // Create new player
              const newPlayerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              player = {
                id: newPlayerId,
                name: playerName,
                type: message.payload.type,
              };
              db.registerPlayer(player.id, player.name, player.type);
              playerId = newPlayerId;
              console.log(`[Server] New player registered: ${player.name} (${player.id})`);
            }

            clients.set(playerId, { ws, player });

            ws.send(JSON.stringify({
              type: 'registered',
              payload: { player },
            }));
            break;
          }

          case 'create_game': {
            if (!playerId) return;
            const client = clients.get(playerId);
            if (!client) return;

            const session = gameManager.createSession(
              message.payload.gameType,
              message.payload.mode,
              client.player
            );

            if (message.payload.mode === 'local') {
              const player2Name = message.payload.player2Name || 'Ready Player 2'; // CHANGED: Default
              const localOpponent: Player = {
                id: `${playerId}_local_opponent`,
                name: player2Name,
                type: 'human'
              };
              session.players.push(localOpponent);
            }

            ws.send(JSON.stringify({
              type: 'game_created',
              payload: { session },
            }));
            console.log(`[Server] Game created: ${session.id} by ${client.player.name} (mode: ${message.payload.mode})`);
            break;
          }

          case 'find_match': {
            if (!playerId) return;
            const client = clients.get(playerId);
            if (!client) return;

            const matchedSession = gameManager.findMatch(
              message.payload.gameType,
              client.player
            );

            if (matchedSession) {
              matchedSession.players.forEach(p => {
                const opponentClient = clients.get(p.id);
                opponentClient?.ws.send(JSON.stringify({
                  type: 'game_start',
                  payload: { session: matchedSession },
                }));
              });
              console.log(`[Server] Match found for ${client.player.name}, session: ${matchedSession.id}`);
            } else {
              ws.send(JSON.stringify({ type: 'waiting_for_opponent' }));
              console.log(`[Server] ${client.player.name} is waiting for an opponent in ${message.payload.gameType}`);
            }
            break;
          }

          case 'move': {
            const session = gameManager.getSession(message.payload.sessionId);
            if (!session) return;

            // MODIFIED: Use game-specific logic
            const newState = processMove(
              session.gameType,
              session.state,
              message.payload.move
            );
            gameManager.updateGameState(session.id, newState);

            const updatedSession = gameManager.getSession(session.id);

            updatedSession?.players.forEach(p => {
              const client = clients.get(p.id);
              client?.ws.send(JSON.stringify({
                type: 'game_update',
                payload: { session: updatedSession },
              }));
            });

            // MODIFIED: Use game-specific end check
            const gameResult = checkGameEnd(session.gameType, newState);
            if (gameResult) {
              handleGameEnd(session, gameResult);
              console.log(`[Server] Game ${session.id} ended. Result:`, gameResult);
            }
            break;
          }

          default:
            console.warn(`[Server] Unknown WS message type received: ${message.type}`);
        }
      } catch (error) {
        console.error('[Server] Error processing WebSocket message:', error);
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message or server error.' } }));
      }
    });

    ws.on('close', () => {
      if (playerId) {
        clients.delete(playerId);
        console.log(`[Server] Player ${playerId} disconnected.`);
      } else {
        console.log('[Server] Unregistered client disconnected.');
      }
    });

    ws.on('error', (error) => {
      console.error(`[Server] WebSocket error for ${playerId || 'unregistered'}:`, error);
    });
  });

  function processMove(gameType: GameType, state: any, move: any): any {
    switch (gameType) {
      case 'chess':
        return ChessGame.processMove(state, move);
      case 'go':
        return GoGame.processMove(state, move);
      case '2048':  // ADDED
        return Game2048.processMove(state, move);
      default:
        return state;
    }
  }

  function checkGameEnd(gameType: GameType, state: any): any | null {
    switch (gameType) {
      case 'chess':
        return ChessGame.checkGameEnd(state);
      case 'go':
        return GoGame.checkGameEnd(state);
      case '2048':
        return Game2048.checkGameEnd(state);
      default:
        return null;
    }
  }

  function handleGameEnd(session: GameSession, result: any) {
    // MODIFIED: Removed the mode check - save ELO for all chess/go games
    if (session.gameType === 'chess' || session.gameType === 'go') {
      const [player1, player2] = session.players;
      if (!player1 || !player2) return;

      // ADDED: Register player2 if not already in database (for local games)
      db.registerPlayer(player2.id, player2.name, player2.type);

      const rating1 = db.getEloRating(player1.id, session.gameType);
      const rating2 = db.getEloRating(player2.id, session.gameType);

      let eloResult: 'a_wins' | 'b_wins' | 'draw';
      if (result.winner === 'white' || result.winner === 'black') {
        const player1Color = session.gameType === 'chess' ? 'white' : 'black';
        eloResult = result.winner === player1Color ? 'a_wins' : 'b_wins';
      } else {
        eloResult = 'draw';
      }

      const { newRatingA, newRatingB } = eloSystem.calculateNewRatings(rating1, rating2, eloResult);

      db.updateEloRating(player1.id, session.gameType, newRatingA, eloResult === 'a_wins' ? 'win' : (eloResult === 'b_wins' ? 'loss' : 'draw'));
      db.updateEloRating(player2.id, session.gameType, newRatingB, eloResult === 'b_wins' ? 'win' : (eloResult === 'a_wins' ? 'loss' : 'draw'));

      console.log(`[Server] ELO updated - ${player1.name}: ${newRatingA}, ${player2.name}: ${newRatingB}`);
    }

    // MODIFIED: Send game_end with result payload
    session.players.forEach(p => {
      const client = clients.get(p.id);
      client?.ws.send(JSON.stringify({
        type: 'game_end',
        payload: { result, session },
      }));
    });
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server running on ws://${hostname}:${port}${gameSocketPath}`);
  });
}).catch((err) => {
  console.error('[Server] Failed to prepare Next.js app:', err);
  process.exit(1);
});