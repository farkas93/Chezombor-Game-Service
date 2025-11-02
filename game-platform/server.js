// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { GameManager } = require('./src/lib/gameManager');
const { GameDatabase } = require('./src/lib/database');
const { EloSystem } = require('./src/lib/eloSystem');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const gameManager = new GameManager();
const db = new GameDatabase();
const eloSystem = new EloSystem();
const clients = new Map(); // Map to store connected clients and their player data

app.prepare().then(() => {
  console.log('[Server] Next.js app prepared successfully.');

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      // Let Next.js handle all non-WebSocket HTTP requests (pages, API routes, static assets)
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[Server] Error occurred handling HTTP request', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize WebSocketServer without immediately attaching it to the HTTP server
  // We will manually handle the 'upgrade' event to direct WebSocket connections.
  const wss = new WebSocketServer({ noServer: true });
  console.log('[Server] WebSocketServer initialized (awaiting upgrade events).');

  // Handle HTTP 'upgrade' requests for WebSocket connections
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url, true);
    console.log(`[Server] Received upgrade request for path: ${pathname}`);

    if (pathname === '/api/socket') {
      // If the path is for our WebSocket, handle the upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request); // Emit 'connection' event for the new WebSocket
        console.log('[Server] WebSocket connection upgraded successfully for /api/socket.');
      });
    } else {
      // For any other upgrade request, destroy the socket
      console.log(`[Server] Destroying socket for unhandled upgrade path: ${pathname}`);
      socket.destroy();
    }
  });

  // WebSocket server connection handling
  wss.on('connection', (ws) => {
    console.log('[Server] A client has established a WebSocket connection!');
    let playerId = null; // This will be set once the player registers

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[Server] Received WS message: Type='${message.type}', PlayerID='${playerId || 'unregistered'}'`);

        switch (message.type) {
          case 'register':
            playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const player = {
              id: playerId,
              name: message.payload.name,
              type: message.payload.type
            };

            db.registerPlayer(player.id, player.name, player.type);
            clients.set(playerId, { ws, player });

            ws.send(JSON.stringify({
              type: 'registered',
              payload: { playerId, player }
            }));
            console.log(`[Server] Player registered: ${player.name} (${playerId})`);
            break;

          case 'create_game':
            if (!playerId) { console.warn('[Server] Attempted create_game without playerId.'); return; }
            const clientCreate = clients.get(playerId);
            if (!clientCreate) { console.warn(`[Server] Client not found for playerId: ${playerId}`); return; }

            const sessionCreate = gameManager.createSession(
              message.payload.gameType,
              message.payload.mode,
              clientCreate.player
            );

            ws.send(JSON.stringify({
              type: 'game_created',
              payload: { session: sessionCreate }
            }));
            console.log(`[Server] Game created: ${sessionCreate.id} by ${clientCreate.player.name}`);
            break;

          case 'find_match':
            if (!playerId) { console.warn('[Server] Attempted find_match without playerId.'); return; }
            const matchClient = clients.get(playerId);
            if (!matchClient) { console.warn(`[Server] Client not found for playerId: ${playerId}`); return; }

            const matchedSession = gameManager.findMatch(
              message.payload.gameType,
              matchClient.player
            );

            if (matchedSession) {
              matchedSession.players.forEach(p => {
                const pc = clients.get(p.id);
                if (pc) {
                  pc.ws.send(JSON.stringify({
                    type: 'game_start',
                    payload: { session: matchedSession }
                  }));
                }
              });
              console.log(`[Server] Match found for ${matchClient.player.name}, session: ${matchedSession.id}`);
            } else {
              ws.send(JSON.stringify({
                type: 'waiting_for_opponent',
                payload: {}
              }));
              console.log(`[Server] ${matchClient.player.name} waiting for opponent in ${message.payload.gameType}`);
            }
            break;

          case 'move':
            if (!playerId) { console.warn('[Server] Attempted move without playerId.'); return; }
            const moveSession = gameManager.getSession(message.payload.sessionId);
            if (!moveSession) { console.warn(`[Server] Session not found for move: ${message.payload.sessionId}`); return; }

            const newState = processMove(
              moveSession.gameType,
              moveSession.state,
              message.payload.move
            );

            gameManager.updateGameState(message.payload.sessionId, newState);

            moveSession.players.forEach(p => {
              const pc = clients.get(p.id);
              if (pc) {
                pc.ws.send(JSON.stringify({
                  type: 'game_update',
                  payload: {
                    session: gameManager.getSession(message.payload.sessionId),
                    move: message.payload.move
                  }
                }));
              }
            });
            console.log(`[Server] Move processed for session ${moveSession.id}`);

            const gameResult = checkGameEnd(moveSession.gameType, newState);
            if (gameResult) {
              handleGameEnd(moveSession, gameResult);
              console.log(`[Server] Game ${moveSession.id} ended. Result:`, gameResult);
            }
            break;

          case 'join_game':
            if (!playerId) { console.warn('[Server] Attempted join_game without playerId.'); return; }
            const joinClient = clients.get(playerId);
            if (!joinClient) { console.warn(`[Server] Client not found for playerId: ${playerId}`); return; }

            const joinedSession = gameManager.joinSession(
              message.payload.sessionId,
              joinClient.player
            );

            if (joinedSession) {
              joinedSession.players.forEach(p => {
                const pc = clients.get(p.id);
                if (pc) {
                  pc.ws.send(JSON.stringify({
                    type: 'game_start',
                    payload: { session: joinedSession }
                  }));
                }
              });
              console.log(`[Server] Player ${joinClient.player.name} joined session ${joinedSession.id}`);
            } else {
              console.warn(`[Server] Failed to join session ${message.payload.sessionId} for player ${joinClient.player.name}`);
            }
            break;

          default:
            console.warn(`[Server] Unknown WS message type received: ${message.type}`);
        }
      } catch (error) {
        console.error('[Server] Error processing WebSocket message:', error, 'Raw data:', data.toString());
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format or server error.' } }));
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
      console.error(`[Server] WebSocket client error for ${playerId || 'unregistered'}:`, error);
    });
  });

  // --- Game Logic Helper Functions (Keep these as they were) ---

  function processMove(gameType, state, move) {
    // Game-specific move processing
    switch (gameType) {
      case 'chess':
        return processChessMove(state, move);
      case 'go':
        return processGoMove(state, move);
      case '2048':
        return process2048Move(state, move);
      default:
        return state;
    }
  }

  function processChessMove(state, move) {
    // MODIFIED: Use chess.js for proper move validation
    const { Chess } = require('chess.js');
    const chess = new Chess(state.fen);

    try {
      // Attempt to make the move
      const result = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q' // Default to queen promotion
      });

      if (result) {
        // Move was valid
        return {
          fen: chess.fen(),
          pgn: chess.pgn(),
          currentTurn: chess.turn() === 'w' ? 'white' : 'black',
          moveHistory: chess.history({ verbose: true }),
          checkmate: chess.isCheckmate(),
          check: chess.isCheck(),
          stalemate: chess.isStalemate(),
          draw: chess.isDraw(),
          winner: chess.isCheckmate() ? (chess.turn() === 'w' ? 'black' : 'white') : null
        };
      }
    } catch (error) {
      console.error('[Server] Invalid chess move:', error);
    }

    // If move was invalid, return current state unchanged
    return state;
  }

  function processGoMove(state, move) {
    const newState = { ...state };
    if (newState.board[move.row][move.col] === null) {
      newState.board[move.row][move.col] = state.currentTurn;
      newState.currentTurn = state.currentTurn === 'black' ? 'white' : 'black';
      newState.moveHistory.push(move);

      // Check for captures (simplified)
      checkCaptures(newState, move.row, move.col);
    }
    return newState;
  }

  function checkCaptures(state, row, col) {
    // Simplified capture logic - real Go requires flood fill algorithm
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const opponent = state.board[row][col] === 'black' ? 'white' : 'black';

    directions.forEach(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 19 && nc >= 0 && nc < 19) {
        if (state.board[nr][nc] === opponent) {
          if (!hasLiberties(state.board, nr, nc, opponent)) {
            removeGroup(state.board, nr, nc, opponent);
            state.captures[state.board[row][col]]++;
          }
        }
      }
    });
  }

  function hasLiberties(board, row, col, color) {
    // Simplified - real implementation needs flood fill
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    return directions.some(([dr, dc]) => {
      const nr = row + dr;
      const nc = col + dc;
      return nr >= 0 && nr < 19 && nc >= 0 && nc < 19 && board[nr][nc] === null;
    });
  }

  function removeGroup(board, row, col, color) {
    // Simplified removal
    board[row][col] = null;
  }

  function process2048Move(state, move) {
    const newState = { ...state };
    const direction = move.direction;

    let moved = false;

    // Simplified 2048 logic
    if (direction === 'left') {
      for (let i = 0; i < 4; i++) {
        moved = slideRow(newState.board[i]) || moved;
      }
    } else if (direction === 'right') {
      for (let i = 0; i < 4; i++) {
        newState.board[i].reverse();
        moved = slideRow(newState.board[i]) || moved;
        newState.board[i].reverse();
      }
    } else if (direction === 'up') {
      for (let j = 0; j < 4; j++) {
        const col = [newState.board[0][j], newState.board[1][j], newState.board[2][j], newState.board[3][j]];
        moved = slideRow(col) || moved;
        for (let i = 0; i < 4; i++) {
          newState.board[i][j] = col[i];
        }
      }
    } else if (direction === 'down') {
      for (let j = 0; j < 4; j++) {
        const col = [newState.board[0][j], newState.board[1][j], newState.board[2][j], newState.board[3][j]];
        col.reverse();
        moved = slideRow(col) || moved;
        col.reverse();
        for (let i = 0; i < 4; i++) {
          newState.board[i][j] = col[i];
        }
      }
    }

    if (moved) {
      addRandomTile(newState.board);
      newState.gameOver = !canMove(newState.board);
    }

    return newState;
  }

  function slideRow(row) {
    let moved = false;
    const nonZero = row.filter(x => x !== 0);

    for (let i = 0; i < nonZero.length - 1; i++) {
      if (nonZero[i] === nonZero[i + 1]) {
        nonZero[i] *= 2;
        nonZero.splice(i + 1, 1);
        moved = true;
      }
    }

    while (nonZero.length < 4) {
      nonZero.push(0);
    }

    for (let i = 0; i < 4; i++) {
      if (row[i] !== nonZero[i]) moved = true;
      row[i] = nonZero[i];
    }

    return moved;
  }

  function addRandomTile(board) {
    const empty = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (board[i][j] === 0) empty.push([i, j]);
      }
    }
    if (empty.length > 0) {
      const [row, col] = empty[Math.floor(Math.random() * empty.length)];
      board[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  function canMove(board) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (board[i][j] === 0) return true;
        if (j < 3 && board[i][j] === board[i][j + 1]) return true;
        if (i < 3 && board[i][j] === board[i + 1][j]) return true;
      }
    }
    return false;
  }

  function checkGameEnd(gameType, state) {
    switch (gameType) {
      case 'chess':
        // MODIFIED: Check chess.js game end conditions
        if (state.checkmate) {
          return { winner: state.winner };
        } else if (state.stalemate || state.draw) {
          return { winner: 'draw' };
        }
        return null;
      case 'go':
        return state.ended ? { winner: state.winner } : null;
      case '2048':
        return state.gameOver ? { score: state.score } : null;
      default:
        return null;
    }
  }

  function handleGameEnd(session, result) {
    if (session.gameType === '2048') {
      // Save highscore
      db.addHighScore(
        session.players[0].id,
        session.players[0].name,
        session.players[0].type,
        result.score
      );
    } else {
      // Update ELO ratings
      const [player1, player2] = session.players;
      const rating1 = db.getEloRating(player1.id, session.gameType);
      const rating2 = db.getEloRating(player2.id, session.gameType);

      let eloResult;
      if (result.winner === player1.id) {
        eloResult = 'a_wins';
      } else if (result.winner === player2.id) {
        eloResult = 'b_wins';
      } else {
        eloResult = 'draw';
      }

      const { newRatingA, newRatingB } = eloSystem.calculateNewRatings(
        rating1,
        rating2,
        eloResult
      );

      db.updateEloRating(
        player1.id,
        session.gameType,
        newRatingA,
        eloResult === 'a_wins' ? 'win' : eloResult === 'b_wins' ? 'loss' : 'draw'
      );

      db.updateEloRating(
        player2.id,
        session.gameType,
        newRatingB,
        eloResult === 'b_wins' ? 'win' : eloResult === 'a_wins' ? 'loss' : 'draw'
      );
    }

    // Notify players
    session.players.forEach(p => {
      const pc = clients.get(p.id);
      if (pc) {
        pc.ws.send(JSON.stringify({
          type: 'game_end',
          payload: { result }
        }));
      }
    });

    gameManager.endSession(session.id);
  }

  // Start the HTTP server (which will also handle WebSocket upgrades)
  server.listen(port, (err) => {
    if (err) {
      console.error('[Server] Failed to start HTTP server:', err);
      process.exit(1);
    }
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server expects connections on ws://${hostname}:${port}/api/socket`);
  });
}).catch((err) => {
  console.error('[Server] Failed to prepare Next.js app, exiting:', err);
  process.exit(1); // Exit if Next.js preparation fails
});