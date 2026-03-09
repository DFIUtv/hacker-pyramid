#!/usr/bin/env node
/**
 * Hacker Pyramid - Game Server
 *
 * WebSocket server managing the Pyramid state machine.
 * 2 teams of 2 compete: clue-giver describes words, guesser guesses.
 * Winner's Circle bonus round reverses the mechanic.
 *
 * Usage: node server.js [port]
 * Default port: 3008
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = parseInt(process.argv[2] || '3008', 10);
const CONTENT_DIR = path.join(__dirname, '..', 'content');

// --- Load content ---
let categories = [];
let winnerCircleSets = [];

function loadContent() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'categories.json'), 'utf8'));
    categories = data.categories || [];
    console.log(`Loaded ${categories.length} main game categories`);
  } catch (e) {
    console.error('Failed to load categories.json:', e.message);
  }
  try {
    const data = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'winners-circle.json'), 'utf8'));
    winnerCircleSets = data.sets || [];
    console.log(`Loaded ${winnerCircleSets.length} Winner's Circle sets`);
  } catch (e) {
    console.error('Failed to load winners-circle.json:', e.message);
  }
}

loadContent();

// --- MIME types ---
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let filePath = req.url === '/' ? '/host.html' : req.url;
  filePath = filePath.split('?')[0];

  // API: content stats
  if (filePath === '/api/content') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      categories: categories.length,
      winnerCircleSets: winnerCircleSets.length,
      byDifficulty: {
        easy: categories.filter(c => c.difficulty === 'easy').length,
        medium: categories.filter(c => c.difficulty === 'medium').length,
        hard: categories.filter(c => c.difficulty === 'hard').length,
      },
    }));
    return;
  }

  // API: categories list
  if (filePath === '/api/categories') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ categories, winnerCircleSets }));
    return;
  }

  // Serve static files from web/
  const ALLOWED_EXTS = new Set(['.html', '.css', '.js', '.png', '.svg']);
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\))+/, '');
  const fullPath = path.join(__dirname, normalizedPath);
  const fullPathResolved = path.resolve(fullPath);
  const webDirResolved = path.resolve(__dirname);

  if (!fullPathResolved.startsWith(webDirResolved + path.sep) && fullPathResolved !== webDirResolved) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const relPath = path.relative(webDirResolved, fullPathResolved);
  if (relPath === 'server.js' || relPath === 'package.json' || relPath === 'package-lock.json' || relPath.startsWith('node_modules')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(fullPath);
  if (!ALLOWED_EXTS.has(ext)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

// --- Game State ---

function createGameState() {
  return {
    phase: 'lobby',
    // Teams: [{ id, name, players: [{ id, name, role }], score }]
    teams: [],
    // Current game number (1 or 2)
    gameNumber: 1,
    // Main game state
    mainGame: {
      categories: [],        // 6 selected categories [{name, words, difficulty, played}]
      currentCategory: null,  // index into categories
      currentWordIndex: 0,    // which word we're on (0-6)
      wordsRevealed: [],      // booleans for which words guesser sees
      wordResults: [],        // 'correct' | 'pass' | 'illegal' | null
      timerRunning: false,
      timeRemaining: 30,
      activeTeam: 0,          // which team is playing (0 or 1)
      clueGiver: null,        // player id of clue-giver
      guesser: null,          // player id of guesser
      categoryPicks: 0,       // how many categories played so far
      scores: [0, 0],         // per-game scores
    },
    // Winner's Circle state
    winnersCircle: {
      set: null,              // selected WC set
      categories: [],         // 6 categories [{name, tier, examples, status}]
      currentCategory: null,  // index
      timerRunning: false,
      timeRemaining: 60,
      team: null,             // winning team index
      clueGiver: null,
      guesser: null,
      solved: [],             // indices of solved categories
      skipped: [],            // indices of skipped (to return to)
      illegal: [],            // indices of illegal-clue categories
      score: 0,
      doublePoints: false,    // true if second WC trip
    },
    // Used category names to avoid repeats
    usedCategories: [],
    usedWCSets: [],
  };
}

let game = createGameState();

// --- Timers ---
let mainTimer = null;
let wcTimer = null;

function startMainTimer() {
  if (mainTimer) clearInterval(mainTimer);
  game.mainGame.timerRunning = true;
  mainTimer = setInterval(() => {
    if (game.mainGame.timeRemaining > 0) {
      game.mainGame.timeRemaining--;
      if (game.mainGame.timeRemaining <= 0) {
        game.mainGame.timerRunning = false;
        clearInterval(mainTimer);
        mainTimer = null;
        game.phase = 'category_result';
        // Score the category
        const correct = game.mainGame.wordResults.filter(r => r === 'correct').length;
        game.mainGame.scores[game.mainGame.activeTeam] += correct;
      }
      sendState();
    }
  }, 1000);
}

function stopMainTimer() {
  if (mainTimer) {
    clearInterval(mainTimer);
    mainTimer = null;
  }
  game.mainGame.timerRunning = false;
}

function startWCTimer() {
  if (wcTimer) clearInterval(wcTimer);
  game.winnersCircle.timerRunning = true;
  wcTimer = setInterval(() => {
    if (game.winnersCircle.timeRemaining > 0) {
      game.winnersCircle.timeRemaining--;
      if (game.winnersCircle.timeRemaining <= 0) {
        game.winnersCircle.timerRunning = false;
        clearInterval(wcTimer);
        wcTimer = null;
        game.phase = 'wc_complete';
      }
      sendState();
    }
  }, 1000);
}

function stopWCTimer() {
  if (wcTimer) {
    clearInterval(wcTimer);
    wcTimer = null;
  }
  game.winnersCircle.timerRunning = false;
}

// --- WebSocket Server ---

const wss = new WebSocketServer({ server });
const clients = new Map(); // ws -> { role, playerId, teamIndex }

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const [ws] of clients) {
    if (ws.readyState === 1) ws.send(data);
  }
}

function sendTo(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function sendState() {
  for (const [ws, info] of clients) {
    if (ws.readyState !== 1) continue;
    const state = sanitizeState(game, info);
    ws.send(JSON.stringify({ type: 'game-state', state }));
  }
}

function sanitizeState(g, clientInfo) {
  const s = {
    phase: g.phase,
    gameNumber: g.gameNumber,
    teams: g.teams.map(t => ({
      id: t.id,
      name: t.name,
      players: t.players,
      score: t.score,
    })),
  };

  // Main game
  s.mainGame = {
    categories: g.mainGame.categories.map(c => ({
      name: c.name,
      difficulty: c.difficulty,
      played: c.played,
      wordCount: c.words ? c.words.length : 0,
    })),
    currentCategory: g.mainGame.currentCategory,
    currentWordIndex: g.mainGame.currentWordIndex,
    wordResults: g.mainGame.wordResults,
    timerRunning: g.mainGame.timerRunning,
    timeRemaining: g.mainGame.timeRemaining,
    activeTeam: g.mainGame.activeTeam,
    clueGiver: g.mainGame.clueGiver,
    guesser: g.mainGame.guesser,
    categoryPicks: g.mainGame.categoryPicks,
    scores: g.mainGame.scores,
  };

  // Host and clue-giver see the words
  const cat = g.mainGame.categories[g.mainGame.currentCategory];
  if (cat && cat.words) {
    if (clientInfo.role === 'host' || clientInfo.role === 'board') {
      s.mainGame.words = cat.words;
    } else if (clientInfo.role === 'clue-giver') {
      s.mainGame.words = cat.words;
    } else {
      // Guesser and spectators don't see words
      s.mainGame.words = cat.words.map((w, i) =>
        g.mainGame.wordResults[i] === 'correct' ? w : '???'
      );
    }
  }

  // Winner's Circle
  s.winnersCircle = {
    categories: g.winnersCircle.categories.map((c, i) => {
      const base = {
        name: (clientInfo.role === 'host' || clientInfo.role === 'board' ||
               clientInfo.role === 'clue-giver' ||
               g.winnersCircle.solved.includes(i) ||
               g.winnersCircle.illegal.includes(i)) ? c.name : '???',
        tier: c.tier,
        status: g.winnersCircle.solved.includes(i) ? 'solved' :
                g.winnersCircle.illegal.includes(i) ? 'illegal' : 'pending',
      };
      // Host and clue-giver see examples
      if (clientInfo.role === 'host' || clientInfo.role === 'clue-giver') {
        base.examples = c.examples;
      }
      return base;
    }),
    currentCategory: g.winnersCircle.currentCategory,
    timerRunning: g.winnersCircle.timerRunning,
    timeRemaining: g.winnersCircle.timeRemaining,
    team: g.winnersCircle.team,
    clueGiver: g.winnersCircle.clueGiver,
    guesser: g.winnersCircle.guesser,
    solved: g.winnersCircle.solved,
    skipped: g.winnersCircle.skipped,
    illegal: g.winnersCircle.illegal,
    score: g.winnersCircle.score,
    doublePoints: g.winnersCircle.doublePoints,
  };

  // Content stats for host
  if (clientInfo.role === 'host') {
    s.availableCategories = categories.map(c => ({
      name: c.name,
      difficulty: c.difficulty,
    }));
    s.availableWCSets = winnerCircleSets.map(s => s.name);
  }

  return s;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let teamIdCounter = 0;

// --- Message Handlers ---

function handleMessage(ws, msg) {
  const info = clients.get(ws);
  if (!info) return;

  switch (msg.type) {
    // --- Registration ---
    case 'register-host':
      info.role = 'host';
      sendTo(ws, { type: 'game-state', state: sanitizeState(game, info) });
      break;

    case 'register-board':
      info.role = 'board';
      sendTo(ws, { type: 'game-state', state: sanitizeState(game, info) });
      break;

    case 'register-player': {
      info.role = 'player';
      sendTo(ws, { type: 'registered', role: 'player' });
      sendTo(ws, { type: 'game-state', state: sanitizeState(game, info) });
      break;
    }

    // --- Host: Team Management ---
    case 'add-team': {
      if (info.role !== 'host') return;
      if (game.teams.length >= 2) return;
      const id = ++teamIdCounter;
      const name = (msg.name || `Team ${id}`).slice(0, 30);
      game.teams.push({ id, name, players: [], score: 0 });
      sendState();
      break;
    }

    case 'add-player-to-team': {
      if (info.role !== 'host') return;
      const team = game.teams.find(t => t.id === msg.teamId);
      if (!team || team.players.length >= 2) return;
      const pName = (msg.playerName || 'Player').slice(0, 30);
      team.players.push({ id: Date.now() + Math.random(), name: pName, role: null });
      sendState();
      break;
    }

    case 'remove-team': {
      if (info.role !== 'host') return;
      game.teams = game.teams.filter(t => t.id !== msg.teamId);
      sendState();
      break;
    }

    case 'rename-team': {
      if (info.role !== 'host') return;
      const t = game.teams.find(t => t.id === msg.teamId);
      if (t) t.name = (msg.name || t.name).slice(0, 30);
      sendState();
      break;
    }

    case 'set-player-role': {
      if (info.role !== 'host') return;
      const team = game.teams.find(t => t.id === msg.teamId);
      if (!team) return;
      const player = team.players.find(p => p.id === msg.playerId);
      if (!player) return;
      player.role = msg.role; // 'clue-giver' or 'guesser'
      sendState();
      break;
    }

    // --- Host: Game Setup ---
    case 'select-categories': {
      if (info.role !== 'host') return;
      // msg.categoryNames = array of 6 category names
      const selected = (msg.categoryNames || []).slice(0, 6);
      game.mainGame.categories = selected.map(name => {
        const cat = categories.find(c => c.name === name);
        return cat ? { name: cat.name, words: [...cat.words], difficulty: cat.difficulty, played: false } :
          { name, words: [], difficulty: 'unknown', played: false };
      });
      sendState();
      break;
    }

    case 'random-categories': {
      if (info.role !== 'host') return;
      // Pick 6 random unused categories, balanced by difficulty
      let available = categories.filter(c => !game.usedCategories.includes(c.name));
      if (available.length < 6) {
        game.usedCategories = [];
        available = [...categories];
      }
      shuffleArray(available);
      // Try to get 2 easy, 2 medium, 2 hard
      const easy = available.filter(c => c.difficulty === 'easy');
      const medium = available.filter(c => c.difficulty === 'medium');
      const hard = available.filter(c => c.difficulty === 'hard');
      const picked = [];
      [easy, medium, hard].forEach(pool => {
        const count = Math.min(2, pool.length);
        for (let i = 0; i < count && picked.length < 6; i++) {
          picked.push(pool[i]);
        }
      });
      // Fill remainder from any pool
      while (picked.length < 6 && available.length > 0) {
        const c = available.find(a => !picked.includes(a));
        if (c) picked.push(c);
        else break;
      }
      shuffleArray(picked);
      game.mainGame.categories = picked.map(c => ({
        name: c.name, words: [...c.words], difficulty: c.difficulty, played: false,
      }));
      sendState();
      break;
    }

    case 'start-game': {
      if (info.role !== 'host') return;
      if (game.teams.length < 2) {
        sendTo(ws, { type: 'error', message: 'Need 2 teams' });
        return;
      }
      if (game.mainGame.categories.length < 6) {
        sendTo(ws, { type: 'error', message: 'Need 6 categories selected' });
        return;
      }
      game.mainGame.scores = [0, 0];
      game.mainGame.categoryPicks = 0;
      game.mainGame.activeTeam = 0;
      game.phase = 'category_select';
      sendState();
      break;
    }

    // --- Host: Main Game ---
    case 'pick-category': {
      if (info.role !== 'host') return;
      const idx = msg.categoryIndex;
      if (idx < 0 || idx >= game.mainGame.categories.length) return;
      if (game.mainGame.categories[idx].played) return;
      game.mainGame.currentCategory = idx;
      game.mainGame.currentWordIndex = 0;
      game.mainGame.wordResults = new Array(game.mainGame.categories[idx].words.length).fill(null);
      game.mainGame.timeRemaining = 30;
      game.mainGame.timerRunning = false;
      game.mainGame.categories[idx].played = true;

      // Set clue-giver and guesser based on category picks
      const teamIdx = game.mainGame.activeTeam;
      const team = game.teams[teamIdx];
      if (team && team.players.length >= 2) {
        const picks = game.mainGame.categoryPicks;
        // Categories 1-2: player[0] gives, 3-4: player[1] gives, 5-6: host choice
        if (picks < 2) {
          game.mainGame.clueGiver = team.players[0].id;
          game.mainGame.guesser = team.players[1].id;
        } else if (picks < 4) {
          game.mainGame.clueGiver = team.players[1].id;
          game.mainGame.guesser = team.players[0].id;
        }
        // 5-6: keep current assignment (host sets with set-roles)
      }

      game.phase = 'category_ready';
      sendState();
      break;
    }

    case 'set-roles': {
      if (info.role !== 'host') return;
      game.mainGame.clueGiver = msg.clueGiver;
      game.mainGame.guesser = msg.guesser;
      sendState();
      break;
    }

    case 'start-timer': {
      if (info.role !== 'host') return;
      if (game.phase === 'category_ready' || game.phase === 'playing') {
        game.phase = 'playing';
        startMainTimer();
        sendState();
      }
      break;
    }

    case 'pause-timer': {
      if (info.role !== 'host') return;
      stopMainTimer();
      sendState();
      break;
    }

    case 'judge-word': {
      if (info.role !== 'host') return;
      if (game.phase !== 'playing') return;
      const wi = msg.wordIndex !== undefined ? msg.wordIndex : game.mainGame.currentWordIndex;
      if (wi < 0 || wi >= game.mainGame.wordResults.length) return;

      game.mainGame.wordResults[wi] = msg.result; // 'correct', 'pass', 'illegal'

      // Auto-advance to next unjudged word
      let next = -1;
      for (let i = 0; i < game.mainGame.wordResults.length; i++) {
        if (game.mainGame.wordResults[i] === null) {
          next = i;
          break;
        }
      }

      if (next >= 0) {
        game.mainGame.currentWordIndex = next;
      } else {
        // All words judged, end the round
        stopMainTimer();
        const correct = game.mainGame.wordResults.filter(r => r === 'correct').length;
        game.mainGame.scores[game.mainGame.activeTeam] += correct;
        game.phase = 'category_result';
      }
      sendState();
      break;
    }

    case 'end-category': {
      if (info.role !== 'host') return;
      // Force end current category
      stopMainTimer();
      const correct = game.mainGame.wordResults.filter(r => r === 'correct').length;
      game.mainGame.scores[game.mainGame.activeTeam] += correct;
      game.mainGame.categoryPicks++;
      game.usedCategories.push(game.mainGame.categories[game.mainGame.currentCategory]?.name);

      if (game.mainGame.categoryPicks >= 6) {
        // Game over, tally scores
        game.teams[0].score += game.mainGame.scores[0];
        game.teams[1].score += game.mainGame.scores[1];
        game.phase = 'game_end';
      } else {
        // Alternate teams every category
        game.mainGame.activeTeam = game.mainGame.categoryPicks % 2 === 0 ? 0 : 1;
        game.phase = 'category_select';
      }
      sendState();
      break;
    }

    case 'next-category': {
      if (info.role !== 'host') return;
      game.mainGame.categoryPicks++;
      game.usedCategories.push(game.mainGame.categories[game.mainGame.currentCategory]?.name);

      if (game.mainGame.categoryPicks >= 6) {
        game.teams[0].score += game.mainGame.scores[0];
        game.teams[1].score += game.mainGame.scores[1];
        game.phase = 'game_end';
      } else {
        game.mainGame.activeTeam = game.mainGame.categoryPicks % 2 === 0 ? 0 : 1;
        game.phase = 'category_select';
      }
      sendState();
      break;
    }

    // --- Host: Winner's Circle ---
    case 'start-winners-circle': {
      if (info.role !== 'host') return;
      // Pick a WC set
      let setName = msg.setName;
      let wcSet;
      if (setName) {
        wcSet = winnerCircleSets.find(s => s.name === setName);
      }
      if (!wcSet) {
        // Pick random unused set
        const available = winnerCircleSets.filter(s => !game.usedWCSets.includes(s.name));
        wcSet = available.length > 0 ? available[Math.floor(Math.random() * available.length)] :
          winnerCircleSets[Math.floor(Math.random() * winnerCircleSets.length)];
      }
      if (!wcSet) {
        sendTo(ws, { type: 'error', message: 'No Winner\'s Circle sets available' });
        return;
      }

      game.usedWCSets.push(wcSet.name);

      // Determine winning team (higher game score)
      const winnerTeam = msg.teamIndex !== undefined ? msg.teamIndex :
        (game.mainGame.scores[0] >= game.mainGame.scores[1] ? 0 : 1);

      game.winnersCircle = {
        set: wcSet.name,
        categories: wcSet.categories.map(c => ({
          name: c.name,
          tier: c.tier,
          examples: c.examples || [],
        })),
        currentCategory: 0,
        timerRunning: false,
        timeRemaining: 60,
        team: winnerTeam,
        clueGiver: msg.clueGiver || null,
        guesser: msg.guesser || null,
        solved: [],
        skipped: [],
        illegal: [],
        score: 0,
        doublePoints: game.gameNumber > 1,
      };

      game.phase = 'wc_setup';
      sendState();
      break;
    }

    case 'set-wc-roles': {
      if (info.role !== 'host') return;
      game.winnersCircle.clueGiver = msg.clueGiver;
      game.winnersCircle.guesser = msg.guesser;
      sendState();
      break;
    }

    case 'start-wc-timer': {
      if (info.role !== 'host') return;
      game.phase = 'wc_playing';
      startWCTimer();
      sendState();
      break;
    }

    case 'pause-wc-timer': {
      if (info.role !== 'host') return;
      stopWCTimer();
      sendState();
      break;
    }

    case 'wc-judge': {
      if (info.role !== 'host') return;
      if (game.phase !== 'wc_playing') return;
      const ci = game.winnersCircle.currentCategory;

      if (msg.result === 'correct') {
        game.winnersCircle.solved.push(ci);
        const tier = game.winnersCircle.categories[ci]?.tier;
        const points = tier === 'bottom' ? 100 : tier === 'middle' ? 250 : 500;
        game.winnersCircle.score += points;

        // Check for grand prize (all 6)
        if (game.winnersCircle.solved.length === 6) {
          game.winnersCircle.score += 2000;
          stopWCTimer();
          game.phase = 'wc_complete';
          sendState();
          break;
        }
      } else if (msg.result === 'skip') {
        game.winnersCircle.skipped.push(ci);
      } else if (msg.result === 'illegal') {
        game.winnersCircle.illegal.push(ci);
      }

      // Move to next available category
      advanceWCCategory();
      sendState();
      break;
    }

    case 'wc-select-category': {
      if (info.role !== 'host') return;
      if (game.phase !== 'wc_playing') return;
      const idx = msg.categoryIndex;
      if (idx >= 0 && idx < game.winnersCircle.categories.length &&
          !game.winnersCircle.solved.includes(idx) &&
          !game.winnersCircle.illegal.includes(idx)) {
        game.winnersCircle.currentCategory = idx;
        // Remove from skipped if was there
        game.winnersCircle.skipped = game.winnersCircle.skipped.filter(i => i !== idx);
        sendState();
      }
      break;
    }

    // --- Host: Score Adjustments ---
    case 'adjust-score': {
      if (info.role !== 'host') return;
      const team = game.teams.find(t => t.id === msg.teamId);
      if (team) {
        team.score += (msg.amount || 0);
        sendState();
      }
      break;
    }

    case 'adjust-game-score': {
      if (info.role !== 'host') return;
      if (msg.teamIndex === 0 || msg.teamIndex === 1) {
        game.mainGame.scores[msg.teamIndex] += (msg.amount || 0);
        sendState();
      }
      break;
    }

    // --- Host: Game Flow ---
    case 'new-game': {
      if (info.role !== 'host') return;
      // Start game 2 with fresh categories
      game.gameNumber++;
      game.mainGame.categories = [];
      game.mainGame.currentCategory = null;
      game.mainGame.currentWordIndex = 0;
      game.mainGame.wordResults = [];
      game.mainGame.timerRunning = false;
      game.mainGame.timeRemaining = 30;
      game.mainGame.categoryPicks = 0;
      game.mainGame.scores = [0, 0];
      game.phase = 'category_select';
      sendState();
      break;
    }

    case 'reset-game': {
      if (info.role !== 'host') return;
      stopMainTimer();
      stopWCTimer();
      const teams = game.teams.map(t => ({ ...t, score: 0, players: t.players.map(p => ({ ...p })) }));
      game = createGameState();
      game.teams = teams;
      sendState();
      break;
    }

    case 'full-reset': {
      if (info.role !== 'host') return;
      stopMainTimer();
      stopWCTimer();
      game = createGameState();
      teamIdCounter = 0;
      sendState();
      break;
    }

    case 'end-game': {
      if (info.role !== 'host') return;
      stopMainTimer();
      stopWCTimer();
      game.phase = 'game_over';
      sendState();
      break;
    }

    // --- Player: Mark correct (from guesser buzzer) ---
    case 'buzz-correct': {
      if (info.role !== 'player') return;
      // Forward to host for judging
      broadcast({ type: 'player-buzz', playerId: info.playerId });
      break;
    }
  }
}

function advanceWCCategory() {
  const wc = game.winnersCircle;
  const total = wc.categories.length;

  // Find next available category
  for (let i = 1; i <= total; i++) {
    const idx = (wc.currentCategory + i) % total;
    if (!wc.solved.includes(idx) && !wc.illegal.includes(idx)) {
      wc.currentCategory = idx;
      return;
    }
  }

  // Check skipped
  if (wc.skipped.length > 0) {
    wc.currentCategory = wc.skipped.shift();
    return;
  }

  // All done
  stopWCTimer();
  game.phase = 'wc_complete';
}

// --- WebSocket Connection Handling ---

wss.on('connection', (ws) => {
  clients.set(ws, { role: null, playerId: null, teamIndex: null });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`Hacker Pyramid server on http://localhost:${PORT}`);
  console.log(`  Host console:   http://localhost:${PORT}/host.html`);
  console.log(`  Audience board:  http://localhost:${PORT}/board.html`);
  console.log(`  Player view:     http://localhost:${PORT}/player.html`);
});
