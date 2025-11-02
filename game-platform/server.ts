import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Chess } from 'chess.js';

// Assuming your local modules are exported correctly
import { GameManager } from './src/lib/gameManager';
import { getDatabase } from './src/lib/database';
import { EloSystem } from './src/lib/eloSystem';
import { Player, GameSession, WSMessage, GameType, GameMode, PlayerType } from './src/types/index'; // Assuming types are exported from '@/index/index.ts' or '@/index.ts'

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const gameManager = new GameManager();
const db = getDatabase();
const eloSystem = new EloSystem();

// A type-safe map to store connected clients
const clients = new Map<string, { ws: WebSocket; player: Player }>();

app.prepare().then(() => {
  console.log('[Server] Next.js app prepared successfully.');

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
      // --- THIS IS THE FIX ---
      // For any other path (like Next.js HMR), do nothing.
      // Destroying the socket here breaks the development server.
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
            const newPlayerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const player: Player = {
              id: newPlayerId,
              name: message.payload.name,
              type: message.payload.type,
            };

            db.registerPlayer(player.id, player.name, player.type);
            clients.set(newPlayerId, { ws, player });
            playerId = newPlayerId; // Assign playerId after successful registration

            ws.send(JSON.stringify({
              type: 'registered',
              payload: { player },
            }));
            console.log(`[Server] Player registered: ${player.name} (${player.id})`);
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
            
            // For local games, add a dummy second player immediately
            if (message.payload.mode === 'local') {
                const localOpponent: Player = {
                    id: `${playerId}_local_opponent`,
                    name: 'Local Opponent',
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
              // Notify both players that the match has started
              matchedSession.players.forEach(p => {
                const opponentClient = clients.get(p.id);
                opponentClient?.ws.send(JSON.stringify({
                  type: 'game_start',
                  payload: { session: matchedSession },
                }));
              });
              console.log(`[Server] Match found for ${client.player.name}, session: ${matchedSession.id}`);
            } else {
              // Notify the player they are waiting
              ws.send(JSON.stringify({ type: 'waiting_for_opponent' }));
              console.log(`[Server] ${client.player.name} is waiting for an opponent in ${message.payload.gameType}`);
            }
            break;
          }

          case 'move': {
            const session = gameManager.getSession(message.payload.sessionId);
            if (!session) return;

            const newState = processMove(
              session.gameType,
              session.state,
              message.payload.move
            );
            gameManager.updateGameState(session.id, newState);

            const updatedSession = gameManager.getSession(session.id);

            // Notify all players in the session of the update
            updatedSession?.players.forEach(p => {
              // For local games, only the primary player has a real websocket connection
              const client = clients.get(p.id);
              client?.ws.send(JSON.stringify({
                type: 'game_update',
                payload: { session: updatedSession },
              }));
            });

            // Check for game end conditions
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

  // --- Game Logic Helper Functions ---

  function processMove(gameType: GameType, state: any, move: any): any {
    switch (gameType) {
      case 'chess':
        return processChessMove(state, move);
      // Add other game move processors here
      default:
        return state;
    }
  }

  function processChessMove(state: any, move: { from: string; to: string; promotion?: string }) {
    const chess = new Chess(state.fen);
    try {
      const result = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });

      if (result) {
        return {
          fen: chess.fen(),
          pgn: chess.pgn(),
          currentTurn: chess.turn() === 'w' ? 'white' : 'black',
          moveHistory: chess.history({ verbose: true }),
          checkmate: chess.isCheckmate(),
          check: chess.isCheck(),
          stalemate: chess.isStalemate(),
          draw: chess.isDraw(),
          winner: chess.isCheckmate() ? (chess.turn() === 'w' ? 'black' : 'white') : null,
        };
      }
    } catch (e) {
      console.warn('[Server] Invalid chess move attempted:', move);
    }
    return state; // Return original state if move is invalid
  }

  function checkGameEnd(gameType: GameType, state: any): any | null {
    if (gameType === 'chess') {
      if (state.checkmate) return { winner: state.winner };
      if (state.stalemate || state.draw) return { winner: 'draw' };
    }
    // Add other game end conditions here
    return null;
  }

  function handleGameEnd(session: GameSession, result: any) {
    if (session.mode !== 'local' && (session.gameType === 'chess' || session.gameType === 'go')) {
        const [player1, player2] = session.players;
        if (!player1 || !player2) return;

        const rating1 = db.getEloRating(player1.id, session.gameType);
        const rating2 = db.getEloRating(player2.id, session.gameType);

        let eloResult: 'a_wins' | 'b_wins' | 'draw';
        if (result.winner === 'white') { // Assuming player1 is white
            eloResult = 'a_wins';
        } else if (result.winner === 'black') { // Assuming player2 is black
            eloResult = 'b_wins';
        } else {
            eloResult = 'draw';
        }

        const { newRatingA, newRatingB } = eloSystem.calculateNewRatings(rating1, rating2, eloResult);

        db.updateEloRating(player1.id, session.gameType, newRatingA, eloResult === 'a_wins' ? 'win' : (eloResult === 'b_wins' ? 'loss' : 'draw'));
        db.updateEloRating(player2.id, session.gameType, newRatingB, eloResult === 'b_wins' ? 'win' : (eloResult === 'a_wins' ? 'loss' : 'draw'));
    }

    session.players.forEach(p => {
      const client = clients.get(p.id);
      client?.ws.send(JSON.stringify({
        type: 'game_end',
        payload: { result },
      }));
    });

    gameManager.endSession(session.id);
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server running on ws://${hostname}:${port}${gameSocketPath}`);
  });
}).catch((err) => {
    console.error('[Server] Failed to prepare Next.js app:', err);
    process.exit(1);
});