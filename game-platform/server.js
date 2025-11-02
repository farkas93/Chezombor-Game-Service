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
const clients = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const wss = new WebSocketServer({ server, path: '/api/socket' });

  wss.on('connection', (ws) => {
    let playerId = null;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
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
            break;

          case 'create_game':
            if (!playerId) return;
            const client = clients.get(playerId);
            if (!client) return;

            const session = gameManager.createSession(
              message.payload.gameType,
              message.payload.mode,
              client.player
            );

            ws.send(JSON.stringify({
              type: 'game_created',
              payload: { session }
            }));
            break;

          case 'find_match':
            if (!playerId) return;
            const matchClient = clients.get(playerId);
            if (!matchClient) return;

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
            } else {
              ws.send(JSON.stringify({
                type: 'waiting_for_opponent',
                payload: {}
              }));
            }
            break;

          case 'move':
            const moveSession = gameManager.getSession(message.payload.sessionId);
            if (!moveSession) return;

            // Process move based on game type
            const newState = processMove(
              moveSession.gameType,
              moveSession.state,
              message.payload.move
            );
            
            gameManager.updateGameState(message.payload.sessionId, newState);

            // Broadcast to all players
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

            // Check for game end
            const gameResult = checkGameEnd(moveSession.gameType, newState);
            if (gameResult) {
              handleGameEnd(moveSession, gameResult);
            }
            break;

          case 'join_game':
            if (!playerId) return;
            const joinClient = clients.get(playerId);
            if (!joinClient) return;

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
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket error:', error);
      }
    });

    ws.on('close', () => {
      if (playerId) {
        clients.delete(playerId);
      }
    });
  });

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
    // Simplified chess move (you'd use chess.js library in production)
    const newState = { ...state };
    if (move.from && move.to) {
      const piece = newState.board[move.from.row][move.from.col];
      newState.board[move.from.row][move.from.col] = ' ';
      newState.board[move.to.row][move.to.col] = piece;
      newState.currentTurn = state.currentTurn === 'white' ? 'black' : 'white';
      newState.moveHistory.push(move);
    }
    return newState;
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
    const directions = [[0,1], [1,0], [0,-1], [-1,0]];
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
    const directions = [[0,1], [1,0], [0,-1], [-1,0]];
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
        // Simplified - check for checkmate
        return state.checkmate ? { winner: state.winner } : null;
      case 'go':
        // Simplified - check for pass/resign
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

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});