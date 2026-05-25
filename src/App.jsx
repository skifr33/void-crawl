import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 24, H = 24, TS = 14;

const DECKS = {
  1: { name: 'DOCKING RING',  biofog: false },
  2: { name: 'CREW QUARTERS', biofog: false },
  3: { name: 'MEDICAL BAY',   biofog: true  },
};

const ENEMY_DEFS = {
  shambler:          { name: 'SHAMBLER',          hp: 4,  atk: 3, decks: [1,2,3] },
  drone_sentry:      { name: 'DRONE SENTRY',      hp: 3,  atk: 4, decks: [1,2,3], ranged: true },
  void_hound:        { name: 'VOID HOUND',        hp: 5,  atk: 5, decks: [1,2,3] },
  augment_berserker: { name: 'AUGMENT BERSERKER', hp: 8,  atk: 6, decks: [2,3] },
  phantom_echo:      { name: 'PHANTOM ECHO',      hp: 6,  atk: 7, decks: [3], phase: true },
};

const ENEMY_CHAR = {
  shambler: 'S', drone_sentry: 'D', void_hound: 'V',
  augment_berserker: 'A', phantom_echo: 'P',
};

const PORTAL_TABLE = [
  'HULL BREACH — lose 3 HP',
  'SIGNAL SCRAMBLE — next roll is Signal Lost',
  'VOID SURGE — all enemies +2 ATK this room',
  'POWER DRAIN — lose 2 Power Cells',
  'TEMPORAL SLIP — skip next action',
  'FRAGMENT RAIN — gain 1 Corrupted Fragment',
  'ECHO BREACH — Phantom Echo materialises',
  'STATIC FLOOD — fog resets in last room',
  'SHARD SCATTER — gain 2 Data Shards',
  'CRITICAL UPLINK — next roll auto-succeeds',
  'HULL BREACH — lose 3 HP',
  'POWER DRAIN — lose 2 Power Cells',
  'FRAGMENT RAIN — gain 1 Corrupted Fragment',
  'SIGNAL SCRAMBLE — next roll is Signal Lost',
  'VOID SURGE — enemies agitated',
  'SHARD SCATTER — gain 2 Data Shards',
  'STATIC FLOOD — fog resets in last room',
  'TEMPORAL SLIP — skip next action',
  'ECHO BREACH — Phantom Echo materialises',
  'CRITICAL UPLINK — next roll auto-succeeds',
];

// ─── Dice ─────────────────────────────────────────────────────────────────────

const d20 = () => Math.floor(Math.random() * 20) + 1;
const d6  = () => Math.floor(Math.random() * 6)  + 1;

function roll2D20(forceResult) {
  if (forceResult === 'CRITICAL_UPLINK') return { a: 20, b: 20, result: 'CRITICAL_UPLINK' };
  if (forceResult === 'SIGNAL_LOST')     return { a: 5,  b: 5,  result: 'SIGNAL_LOST' };
  const a = d20(), b = d20();
  const result = (a >= 12 && b >= 12) ? 'CRITICAL_UPLINK'
               : (a >= 12 || b >= 12) ? 'STATIC_PASS'
               : 'SIGNAL_LOST';
  return { a, b, result };
}

function digitSum(n) {
  let s = n;
  while (s >= 10) s = String(s).split('').reduce((a, c) => a + +c, 0);
  return s;
}

// ─── Map Generation ───────────────────────────────────────────────────────────

const makeTile = (type = 'wall') => ({ type, fog: 'DARK' });

function carveRoom(grid, x, y, w, h) {
  for (let ry = y; ry < y + h && ry < H - 1; ry++)
    for (let rx = x; rx < x + w && rx < W - 1; rx++)
      if (ry > 0 && rx > 0) grid[ry][rx] = makeTile('floor');
}

function carveCorridor(grid, x1, y1, x2, y2) {
  let x = x1, y = y1;
  while (x !== x2) {
    if (y > 0 && y < H-1 && x > 0 && x < W-1) grid[y][x] = makeTile('floor');
    x += x < x2 ? 1 : -1;
  }
  while (y !== y2) {
    if (y > 0 && y < H-1 && x > 0 && x < W-1) grid[y][x] = makeTile('floor');
    y += y < y2 ? 1 : -1;
  }
}

function generateMap(deck) {
  const grid = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => makeTile('wall'))
  );
  const rooms = [];
  const target = 9 + Math.floor(Math.random() * 4);

  for (let attempts = 0; attempts < target * 15 && rooms.length < target; attempts++) {
    let r1 = d20(), r2 = d20();
    if (r1 === r2) { r1 = d20(); r2 = d20(); }
    const rw = Math.max(3, 2 + digitSum(r1 + r2));
    const rh = Math.max(3, 2 + digitSum(r1));
    const rx = 1 + Math.floor(Math.random() * (W - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (H - rh - 2));

    const overlaps = rooms.some(r =>
      rx < r.x + r.w + 2 && rx + rw + 2 > r.x &&
      ry < r.y + r.h + 2 && ry + rh + 2 > r.y
    );
    if (!overlaps) {
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
      carveRoom(grid, rx, ry, rw, rh);
    }
  }

  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    carveCorridor(
      grid,
      a.x + Math.floor(a.w / 2), a.y + Math.floor(a.h / 2),
      b.x + Math.floor(b.w / 2), b.y + Math.floor(b.h / 2)
    );
  }

  // Portal in last room center
  const last = rooms[rooms.length - 1];
  const portalPos = { x: last.x + Math.floor(last.w / 2), y: last.y + Math.floor(last.h / 2) };
  grid[portalPos.y][portalPos.x] = makeTile('portal');

  // Player start in first room
  const first = rooms[0];
  const startPos = { x: first.x + 1, y: first.y + 1 };

  // Spawn enemies
  const deckTypes = Object.entries(ENEMY_DEFS)
    .filter(([, e]) => e.decks.includes(deck))
    .map(([key, def]) => ({ key, ...def }));

  const enemies = [];
  rooms.slice(1, -1).forEach((room, i) => {
    if (Math.random() > 0.65) return;
    const def = deckTypes[Math.floor(Math.random() * deckTypes.length)];
    const ex = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
    const ey = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
    enemies.push({ id: `e${i}`, ...def, maxHp: def.hp, pos: { x: ex, y: ey }, alive: true });
  });

  return { grid, rooms, startPos, portalPos, enemies };
}

// ─── Fog of War ───────────────────────────────────────────────────────────────

function revealFog(grid, pos, radius = 4) {
  return grid.map((row, y) =>
    row.map((tile, x) => {
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist > radius) return tile.fog === 'LIT' ? { ...tile, fog: 'DIM' } : tile;
      const newFog = dist <= radius / 2 ? 'LIT' : 'DIM';
      if (tile.fog === newFog || (tile.fog === 'LIT' && newFog === 'DIM')) return tile;
      return { ...tile, fog: newFog };
    })
  );
}

// ─── Initial State ────────────────────────────────────────────────────────────

function makePlayer() {
  return { hp: 20, maxHp: 20, powerCells: 12, dataShards: 0, corruptedFragments: 0, phaseStepUsed: false };
}

function buildState(deck, player) {
  const { grid, rooms, startPos, portalPos, enemies } = generateMap(deck);
  return {
    phase: 'EXPLORE',
    deck,
    grid: revealFog(grid, startPos),
    rooms,
    player: player ?? makePlayer(),
    playerPos: startPos,
    portalPos,
    enemies,
    combat: null,
    activeEnemy: null,
    log: [`DECK ${deck}: ${DECKS[deck].name} — BREACH INITIATED`],
    rollResult: null,
    portalRoll: null,
    screenShake: false,
    glitch: false,
    forceNext: null,
    hallOfHeads: JSON.parse(localStorage.getItem('void-hall') || '[]'),
  };
}

// ─── Movement / Collision ─────────────────────────────────────────────────────

function walkable(grid, enemies, pos) {
  const { x, y } = pos;
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  const t = grid[y]?.[x];
  if (!t || t.type === 'wall') return false;
  if (enemies.some(e => e.alive && e.pos.x === x && e.pos.y === y)) return false;
  return true;
}

// ─── Enemy AI ─────────────────────────────────────────────────────────────────

function stepEnemies(state) {
  const { grid, enemies, playerPos } = state;
  const moved = enemies.map(e => {
    if (!e.alive) return e;
    const fog = grid[e.pos.y]?.[e.pos.x]?.fog;
    if (fog === 'DARK') return e;
    const dx = playerPos.x - e.pos.x, dy = playerPos.y - e.pos.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist > 9 || dist === 0) return e;

    const sx = dx !== 0 ? (dx > 0 ? 1 : -1) : 0;
    const sy = dy !== 0 ? (dy > 0 ? 1 : -1) : 0;
    for (const np of [
      { x: e.pos.x + sx, y: e.pos.y },
      { x: e.pos.x, y: e.pos.y + sy },
      { x: e.pos.x + sx, y: e.pos.y + sy },
    ]) {
      if (np.x < 0 || np.x >= W || np.y < 0 || np.y >= H) continue;
      if (grid[np.y][np.x]?.type === 'wall') continue;
      if (enemies.some(o => o.alive && o.id !== e.id && o.pos.x === np.x && o.pos.y === np.y)) continue;
      if (np.x === playerPos.x && np.y === playerPos.y) return e; // stop adjacent
      return { ...e, pos: np };
    }
    return e;
  });
  return { ...state, enemies: moved };
}

// ─── Combat ───────────────────────────────────────────────────────────────────

function startCombat(state, enemy) {
  const init = d20();
  const playerFirst = init >= 10;
  const base = {
    ...state,
    phase: 'COMBAT',
    activeEnemy: enemy,
    combat: {
      turn: playerFirst ? 'PLAYER' : 'ENEMY',
      round: 1,
      coverActive: false,
      log: [`⚔ ${enemy.name} — ${playerFirst ? 'YOU MOVE FIRST' : 'ENEMY MOVES FIRST'} [${init}]`],
    },
    log: [...state.log, `COMBAT: ${enemy.name}`],
    screenShake: false,
    glitch: false,
  };
  // Enemy won initiative — resolve their opening attack immediately
  if (!playerFirst) return enemyAttack(base);
  return base;
}

function playerAttack(state) {
  const rawRoll = roll2D20(state.forceNext);
  let roll = rawRoll;
  let newPlayer = { ...state.player };

  // Phase Step: Ghost Operative upgrades first Signal Lost → Static Pass
  if (roll.result === 'SIGNAL_LOST' && !newPlayer.phaseStepUsed) {
    roll = { ...roll, result: 'STATIC_PASS' };
    newPlayer = { ...newPlayer, phaseStepUsed: true };
  }

  let dmg = 0, clog = [], glitch = false, screenShake = false;

  if (roll.result === 'CRITICAL_UPLINK') {
    dmg = d6() + 4;
    clog.push(`CRITICAL UPLINK [${roll.a}/${roll.b}] — ${dmg} DMG`);
    screenShake = true;
  } else if (roll.result === 'STATIC_PASS') {
    dmg = d6();
    clog.push(`STATIC PASS [${roll.a}/${roll.b}] — ${dmg} DMG`);
  } else {
    clog.push(`SIGNAL LOST [${roll.a}/${roll.b}] — MISS`);
    glitch = true;
  }

  const enemy = { ...state.activeEnemy, hp: Math.max(0, state.activeEnemy.hp - dmg) };
  const dead = enemy.hp <= 0;
  if (dead) { clog.push(`${enemy.name} ELIMINATED — +1 SHARD`); enemy.alive = false; screenShake = true; }

  const enemies = state.enemies.map(e => e.id === enemy.id ? enemy : e);
  if (dead) newPlayer = { ...newPlayer, dataShards: newPlayer.dataShards + 1 };

  const base = {
    ...state,
    enemies,
    player: newPlayer,
    rollResult: roll,
    glitch,
    screenShake,
    forceNext: null,
    combat: state.combat ? {
      ...state.combat,
      log: [...state.combat.log, ...clog],
    } : null,
    log: [...state.log, ...clog],
  };

  if (dead) return { ...base, phase: 'EXPLORE', activeEnemy: null, combat: null };
  // Return with turn still 'PLAYER' — doCombatAction will call enemyAttack immediately
  return { ...base, activeEnemy: enemy };
}

// enemyAttack: always resolves to turn:'PLAYER' or phase:'DEAD'. Never leaves turn:'ENEMY'.
function enemyAttack(state) {
  const enemy = state.activeEnemy;
  if (!enemy) return state; // safety: no active enemy, stay put

  const combatLog = state.combat?.log ?? [];
  const roll = d20();
  const hit = roll >= 10;
  let dmg = 0, clog = [], screenShake = false;

  if (hit) {
    dmg = Math.ceil(enemy.atk / 2) + (roll >= 18 ? 2 : 0);
    if (state.combat?.coverActive) dmg = Math.max(0, dmg - 2);
    clog.push(`${enemy.name} [${roll}] — ${dmg} DMG${state.combat?.coverActive ? ' (COVER)' : ''}`);
    screenShake = true;
  } else {
    clog.push(`${enemy.name} [${roll}] — MISS`);
  }

  const newHp = Math.max(0, state.player.hp - dmg);
  const dead = newHp <= 0;
  const newPlayer = { ...state.player, hp: newHp };

  const next = {
    ...state,
    player: newPlayer,
    screenShake,
    combat: {
      ...(state.combat ?? {}),
      turn: 'PLAYER',
      round: (state.combat?.round ?? 1) + 1,
      coverActive: false,
      log: [...combatLog, ...clog],
    },
    log: [...state.log, ...clog],
  };

  if (dead) return { ...next, phase: 'DEAD', log: [...next.log, 'SIGNAL TERMINATED'] };
  return next;
}

function doCombatAction(state, action) {
  if (state.phase !== 'COMBAT' || state.combat?.turn !== 'PLAYER') return state;

  const combatLog = state.combat.log ?? [];

  if (action === 'ATTACK') {
    const afterAttack = playerAttack(state);
    // If combat is still live, resolve enemy counter immediately
    if (afterAttack.phase === 'COMBAT') return enemyAttack(afterAttack);
    return afterAttack;
  }

  if (action === 'DODGE') {
    const roll = d20();
    const evaded = roll >= 12;
    const clog = evaded ? [`DODGE [${roll}] — EVADED`] : [`DODGE [${roll}] — EXPOSED`];
    const withLog = { ...state, combat: { ...state.combat, log: [...combatLog, ...clog] } };
    // Dodge success: enemy whiffs, player keeps their turn
    if (evaded) return withLog;
    // Dodge fail: enemy gets a free hit
    return enemyAttack(withLog);
  }

  if (action === 'COVER') {
    const withCover = {
      ...state,
      combat: { ...state.combat, coverActive: true, log: [...combatLog, 'COVER TAKEN — next hit -2 DMG'] },
    };
    return enemyAttack(withCover);
  }

  if (action === 'JAM') {
    const roll = d20();
    const ok = roll >= 15;
    const clog = ok
      ? [`JAM [${roll}] — ${state.activeEnemy?.name} STUNNED`]
      : [`JAM [${roll}] — FAILED`];
    const withJam = { ...state, combat: { ...state.combat, log: [...combatLog, ...clog] } };
    // Jam success: enemy stunned, player keeps turn
    if (ok) return withJam;
    // Jam fail: enemy retaliates
    return enemyAttack(withJam);
  }

  return state;
}

// ─── Portal ───────────────────────────────────────────────────────────────────

function enterPortal(state) {
  const roll = d20();
  const consequence = PORTAL_TABLE[roll - 1];
  let p = { ...state.player };

  if (consequence.includes('lose 3 HP'))           p.hp = Math.max(0, p.hp - 3);
  if (consequence.includes('lose 2 Power Cells'))  p.powerCells = Math.max(0, p.powerCells - 2);
  if (consequence.includes('gain 1 Corrupted'))    p.corruptedFragments++;
  if (consequence.includes('gain 2 Data'))         p.dataShards += 2;

  let forceNext = null;
  if (consequence.includes('next roll auto-succeeds'))   forceNext = 'CRITICAL_UPLINK';
  if (consequence.includes('next roll is Signal Lost'))  forceNext = 'SIGNAL_LOST';

  let enemies = state.enemies;
  if (consequence.includes('Phantom Echo materialises')) {
    enemies = [...enemies, {
      id: `echo_${Date.now()}`, key: 'phantom_echo',
      ...ENEMY_DEFS.phantom_echo, maxHp: ENEMY_DEFS.phantom_echo.hp,
      pos: { x: Math.min(W-2, state.playerPos.x + 2), y: state.playerPos.y },
      alive: true,
    }];
  }

  return {
    ...state, player: p, enemies, forceNext,
    portalRoll: { roll, consequence },
    phase: p.hp <= 0 ? 'DEAD' : 'PORTAL',
    log: [...state.log, `VOID PORTAL [${roll}] — ${consequence}`],
  };
}

// ─── Quick Save / Load ────────────────────────────────────────────────────────

const SAVE_KEY = 'void-crawl-qs';

function saveGame(state) {
  const payload = {
    phase: state.phase,
    deck: state.deck,
    grid: state.grid,
    player: state.player,
    playerPos: state.playerPos,
    portalPos: state.portalPos,
    enemies: state.enemies,
    combat: state.combat,
    activeEnemy: state.activeEnemy,
    log: state.log.slice(-20),
    rollResult: state.rollResult,
    portalRoll: state.portalRoll,
    forceNext: state.forceNext,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return {
      ...JSON.parse(raw),
      hallOfHeads: JSON.parse(localStorage.getItem('void-hall') || '[]'),
      screenShake: false,
      glitch: false,
    };
  } catch {
    return null;
  }
}

// ─── Hall of Heads ────────────────────────────────────────────────────────────

function enshrine(state) {
  const entry = {
    date: new Date().toLocaleDateString(),
    deck: state.deck,
    hp: state.player.hp,
    shards: state.player.dataShards,
    fragments: state.player.corruptedFragments,
    kills: state.enemies.filter(e => !e.alive).length,
  };
  const hall = [...state.hallOfHeads, entry];
  localStorage.setItem('void-hall', JSON.stringify(hall));
  return { ...state, hallOfHeads: hall, phase: 'HALL' };
}

// ─── Canvas Drawing ───────────────────────────────────────────────────────────

const C = {
  wallLit:   '#223322', wallDim:   '#0d1a0d',
  floorLit:  '#0d2b0d', floorDim:  '#081508',
  portalLit: '#2d0060', playerCol: '#39ff14',
  enemyCol:  '#ff3914',
};

function drawFrame(canvas, state, t) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { grid, playerPos, enemies, deck } = state;
  const biofog = DECKS[deck]?.biofog;

  ctx.fillStyle = '#020402';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${TS - 2}px 'VT323', monospace`;
  ctx.textBaseline = 'top';

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tile = grid[y][x];
      if (tile.fog === 'DARK') continue;
      const px = x * TS, py = y * TS;
      const lit = tile.fog === 'LIT';

      if (tile.type === 'portal') {
        const pulse = Math.sin(t * 0.003) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(${Math.floor(150 + pulse * 100)}, 0, ${Math.floor(180 + pulse * 75)}, 1)`;
        ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = `rgba(200, 0, 255, ${0.6 + pulse * 0.4})`;
        ctx.fillText('◉', px + 1, py);
      } else if (tile.type === 'wall') {
        ctx.fillStyle = lit ? C.wallLit : C.wallDim;
        ctx.fillRect(px, py, TS, TS);
      } else {
        ctx.fillStyle = lit ? C.floorLit : C.floorDim;
        ctx.fillRect(px, py, TS, TS);
        if (lit) {
          ctx.fillStyle = '#1a4d1a';
          ctx.fillText('·', px + 2, py + 1);
        }
      }

      if (biofog && lit) {
        ctx.fillStyle = 'rgba(0,255,80,0.07)';
        ctx.fillRect(px, py, TS, TS);
      }
    }
  }

  // Enemies
  enemies.forEach(e => {
    if (!e.alive) return;
    const fog = grid[e.pos.y]?.[e.pos.x]?.fog;
    if (!fog || fog === 'DARK') return;
    const flicker = Math.sin(t * 0.005 + e.pos.x * 1.7) > 0.2;
    if (!flicker) return;
    ctx.fillStyle = C.enemyCol;
    ctx.fillText(ENEMY_CHAR[e.key] || '?', e.pos.x * TS + 1, e.pos.y * TS);
  });

  // Player
  const pulse = Math.sin(t * 0.008) * 0.25 + 0.75;
  ctx.fillStyle = `rgba(57, 255, 20, ${pulse})`;
  ctx.fillText('@', playerPos.x * TS + 1, playerPos.y * TS);

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let sy = 0; sy < canvas.height; sy += 2) ctx.fillRect(0, sy, canvas.width, 1);

  // Glitch
  if (state.glitch) {
    for (let i = 0; i < 4; i++) {
      const sy = Math.floor(Math.random() * canvas.height);
      const sh = 3 + Math.floor(Math.random() * 6);
      try {
        const slice = ctx.getImageData(0, sy, canvas.width, sh);
        ctx.putImageData(slice, (Math.random() - 0.5) * 18, sy);
      } catch (_) {}
    }
    ctx.fillStyle = 'rgba(255,0,60,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState(() => buildState(1, null));
  const [hasSave, setHasSave] = useState(() => !!localStorage.getItem(SAVE_KEY));
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const tRef      = useRef(0);
  const stateRef  = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const loop = t => {
      tRef.current = t;
      drawFrame(canvasRef.current, stateRef.current, t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const move = useCallback((dir) => {
    setState(s => {
      if (s.phase !== 'EXPLORE') return s;
      const nx = s.playerPos.x + dir.x, ny = s.playerPos.y + dir.y;

      const bump = s.enemies.find(e => e.alive && e.pos.x === nx && e.pos.y === ny);
      if (bump) return startCombat(s, bump);
      if (!walkable(s.grid, s.enemies, { x: nx, y: ny })) return s;

      const newPos = { x: nx, y: ny };
      const tile = s.grid[ny][nx];
      const newGrid = revealFog(s.grid, newPos);

      if (tile.type === 'portal') {
        return enterPortal({ ...s, playerPos: newPos, grid: newGrid });
      }

      return stepEnemies({ ...s, playerPos: newPos, grid: newGrid, screenShake: false, glitch: false });
    });
  }, []);

  useEffect(() => {
    const onKey = e => {
      const map = {
        ArrowUp:'N', ArrowDown:'S', ArrowLeft:'W', ArrowRight:'E',
        w:'N', s:'S', a:'W', d:'E', k:'N', j:'S', h:'W', l:'E',
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      const DIRS = { N:{x:0,y:-1}, S:{x:0,y:1}, W:{x:-1,y:0}, E:{x:1,y:0} };
      move(DIRS[dir]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const touchStart = useRef(null);
  const onTouchStart = e => { touchStart.current = e.touches[0]; };
  const onTouchEnd   = e => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.clientX;
    const dy = e.changedTouches[0].clientY - touchStart.current.clientY;
    touchStart.current = null;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) > Math.abs(dy)) move({ x: dx > 0 ? 1 : -1, y: 0 });
    else                              move({ x: 0, y: dy > 0 ? 1 : -1 });
  };

  const combat = action => setState(s => doCombatAction(s, action));

  const advanceDeck = () => setState(s => {
    if (s.deck >= 3) return enshrine(s);
    const next = buildState(s.deck + 1, { ...s.player, phaseStepUsed: false });
    return { ...next, hallOfHeads: s.hallOfHeads };
  });

  const restart = () => setState(buildState(1, null));

  const quickSave = () => {
    saveGame(state);
    setHasSave(true);
  };

  const quickLoad = () => {
    const s = loadGame();
    if (s) setState(s);
  };

  const { player, phase, log, combat: cbt, activeEnemy, deck, hallOfHeads } = state;
  const deckInfo = DECKS[deck];
  const contacts = state.enemies.filter(e => e.alive).length;

  const S = {
    app: {
      display:'flex', flexDirection:'column', alignItems:'center',
      minHeight:'100vh', background:'#020402', color:'#39ff14',
      fontFamily:"'VT323','Courier New',monospace", fontSize:'16px', padding:'6px',
    },
    header: {
      width:'100%', maxWidth:`${W*TS}px`,
      display:'flex', justifyContent:'space-between',
      padding:'3px 0', borderBottom:'1px solid #1a4d1a', marginBottom:'4px', fontSize:'13px',
    },
    canvasWrap: {
      position:'relative',
      animation: state.screenShake ? 'shake 0.25s ease' : 'none',
    },
    canvas: { display:'block', border:'1px solid #1a4d1a', imageRendering:'pixelated' },
    hud: {
      width:'100%', maxWidth:`${W*TS}px`,
      display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
      gap:'4px', marginTop:'5px', fontSize:'13px',
    },
    stat: { background:'#050a05', border:'1px solid #1a4d1a', padding:'3px 6px', textAlign:'center' },
    bar: (val, max, col) => ({
      background:'#0a0a0a', height:'3px', marginTop:'2px',
      position:'relative', overflow:'hidden',
    }),
    barFill: (val, max, col) => ({
      background: col, height:'100%', width:`${Math.max(0,(val/max)*100)}%`, transition:'width 0.2s',
    }),
    logBox: {
      width:'100%', maxWidth:`${W*TS}px`, height:'56px', overflowY:'auto',
      background:'#050a05', border:'1px solid #1a4d1a', padding:'3px 6px',
      marginTop:'5px', fontSize:'12px',
    },
    dpad: {
      display:'grid',
      gridTemplateAreas:`". up ." "left . right" ". down ."`,
      gridTemplateColumns:'44px 44px 44px', gridTemplateRows:'44px 44px 44px',
      gap:'3px', marginTop:'6px',
    },
    dpBtn: area => ({
      gridArea:area, background:'#050a05', border:'1px solid #1a4d1a',
      color:'#39ff14', fontSize:'18px', cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
    }),
    combatPanel: {
      width:'100%', maxWidth:`${W*TS}px`,
      background:'#050a05', border:'1px solid #ff3914', padding:'8px', marginTop:'5px',
    },
    cBtn: {
      background:'#0a0500', border:'1px solid #39ff14', color:'#39ff14',
      fontFamily:"'VT323',monospace", fontSize:'16px',
      padding:'5px 10px', cursor:'pointer', margin:'2px', minWidth:'72px',
    },
    overlay: {
      position:'fixed', inset:0, background:'rgba(2,4,2,0.93)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      zIndex:100, fontFamily:"'VT323',monospace", color:'#39ff14', textAlign:'center', padding:'20px',
    },
    oBtn: {
      background:'#050a05', border:'1px solid #39ff14', color:'#39ff14',
      fontFamily:"'VT323',monospace", fontSize:'20px',
      padding:'10px 24px', cursor:'pointer', marginTop:'16px',
    },
  };

  return (
    <div style={S.app} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translate(0,0)}
          25%{transform:translate(-3px,2px)}
          50%{transform:translate(3px,-2px)}
          75%{transform:translate(-2px,3px)}
        }
        button:active{opacity:0.7}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#020402}
        ::-webkit-scrollbar-thumb{background:#1a4d1a}
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <span>DECK {deck}: {deckInfo.name}</span>
        <span style={{color: contacts > 0 ? '#ff3914' : '#39ff14'}}>
          {contacts > 0 ? `☠ ${contacts} CONTACTS` : '✓ CLEAR'}
        </span>
        <span style={{fontSize:'11px'}}>GHOST OP</span>
      </div>

      {/* Canvas */}
      <div style={S.canvasWrap}>
        <canvas ref={canvasRef} width={W*TS} height={H*TS} style={S.canvas} />
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}/>
      </div>

      {/* HUD */}
      <div style={S.hud}>
        <div style={S.stat}>
          <div>HP {player.hp}/{player.maxHp}</div>
          <div style={S.bar()}>
            <div style={S.barFill(player.hp, player.maxHp, player.hp > 8 ? '#39ff14' : '#ff3914')} />
          </div>
        </div>
        <div style={S.stat}>⚡ {player.powerCells} CELLS</div>
        <div style={S.stat}>◈ {player.dataShards} SHARDS</div>
      </div>

      {!player.phaseStepUsed && phase === 'EXPLORE' && (
        <div style={{
          maxWidth:`${W*TS}px`, width:'100%', marginTop:'4px', fontSize:'11px',
          color:'#39ccff', border:'1px solid #1a3344', background:'#020408',
          padding:'2px 6px', textAlign:'center',
        }}>
          PHASE STEP READY — Signal Lost → Static Pass (1×/deck)
        </div>
      )}

      {/* Combat panel */}
      {phase === 'COMBAT' && activeEnemy && (
        <div style={S.combatPanel}>
          <div style={{color:'#ff3914', marginBottom:'4px'}}>
            ⚔ {activeEnemy.name} — {activeEnemy.hp}/{activeEnemy.maxHp} HP
            <div style={S.bar()}>
              <div style={S.barFill(activeEnemy.hp, activeEnemy.maxHp, '#ff3914')} />
            </div>
          </div>
          <div style={{fontSize:'11px', color:'#888', marginBottom:'5px', minHeight:'28px'}}>
            {cbt?.log.slice(-2).map((l,i) => <div key={i}>{l}</div>)}
          </div>
          <div>
            <button style={S.cBtn} onClick={() => combat('ATTACK')}>ATTACK</button>
            <button style={S.cBtn} onClick={() => combat('DODGE')}>DODGE</button>
            <button style={S.cBtn} onClick={() => combat('COVER')}>COVER</button>
            <button style={S.cBtn} onClick={() => combat('JAM')}>JAM</button>
          </div>
        </div>
      )}

      {/* D-pad */}
      {phase === 'EXPLORE' && (
        <div style={S.dpad}>
          <button style={S.dpBtn('up')}    onClick={() => move({x:0,y:-1})}>▲</button>
          <button style={S.dpBtn('left')}  onClick={() => move({x:-1,y:0})}>◀</button>
          <button style={S.dpBtn('right')} onClick={() => move({x:1,y:0})}>▶</button>
          <button style={S.dpBtn('down')}  onClick={() => move({x:0,y:1})}>▼</button>
        </div>
      )}

      {/* Log */}
      <div style={S.logBox}>
        {log.slice(-10).map((l, i) => <div key={i} style={{color: l.includes('DEAD')||l.includes('TERMINATED') ? '#ff3914' : '#39ff14'}}>{l}</div>)}
      </div>

      {/* Quick Save / Load */}
      <div style={{
        width:'100%', maxWidth:`${W*TS}px`, display:'flex', gap:'4px', marginTop:'4px',
      }}>
        <button style={{
          ...S.cBtn, flex:1, fontSize:'13px', padding:'4px',
          opacity: ['DEAD','HALL'].includes(phase) ? 0.35 : 1,
          cursor: ['DEAD','HALL'].includes(phase) ? 'default' : 'pointer',
        }} onClick={quickSave} disabled={['DEAD','HALL'].includes(phase)}>
          QUICK SAVE
        </button>
        <button style={{
          ...S.cBtn, flex:1, fontSize:'13px', padding:'4px',
          borderColor: hasSave ? '#39ff14' : '#1a4d1a',
          color: hasSave ? '#39ff14' : '#1a4d1a',
          cursor: hasSave ? 'pointer' : 'default',
        }} onClick={quickLoad} disabled={!hasSave}>
          QUICK LOAD{hasSave ? '' : ' —'}
        </button>
      </div>

      {/* ── Overlays ── */}
      {phase === 'PORTAL' && state.portalRoll && (
        <div style={S.overlay}>
          <div style={{fontSize:'40px', color:'#cc00ff', marginBottom:'12px'}}>◉</div>
          <div style={{fontSize:'28px', marginBottom:'6px'}}>VOID PORTAL</div>
          <div style={{fontSize:'22px', color:'#888', marginBottom:'6px'}}>D20: {state.portalRoll.roll}</div>
          <div style={{fontSize:'18px', color:'#cc00ff', marginBottom:'20px', maxWidth:'300px'}}>
            {state.portalRoll.consequence}
          </div>
          <button style={{...S.oBtn, color:'#cc00ff', borderColor:'#cc00ff'}} onClick={advanceDeck}>
            {deck < 3 ? `DESCEND TO DECK ${deck+1}` : 'ENSHRINE OPERATIVE'}
          </button>
        </div>
      )}

      {phase === 'DEAD' && (
        <div style={S.overlay}>
          <div style={{fontSize:'56px', color:'#ff3914', marginBottom:'12px'}}>☠</div>
          <div style={{fontSize:'32px', marginBottom:'8px', color:'#ff3914'}}>SIGNAL TERMINATED</div>
          <div style={{fontSize:'16px', color:'#555', marginBottom:'8px'}}>
            DECK {deck} — {state.enemies.filter(e=>!e.alive).length} CONTACTS NEUTRALISED
          </div>
          <div style={{fontSize:'14px', color:'#333', marginBottom:'24px'}}>
            HP {player.hp} | SHARDS {player.dataShards}
          </div>
          <button style={S.oBtn} onClick={restart}>NEW OPERATIVE</button>
        </div>
      )}

      {phase === 'HALL' && (
        <div style={S.overlay}>
          <div style={{fontSize:'36px', marginBottom:'12px'}}>☠ HALL OF HEADS</div>
          <div style={{
            maxHeight:'280px', overflowY:'auto', width:'100%', maxWidth:'360px',
            border:'1px solid #1a4d1a',
          }}>
            {hallOfHeads.length === 0
              ? <div style={{padding:'16px', color:'#333'}}>NO OPERATIVES ENSHRINED</div>
              : [...hallOfHeads].reverse().map((h, i) => (
                  <div key={i} style={{
                    borderBottom:'1px solid #1a4d1a', padding:'8px',
                    textAlign:'left', fontSize:'13px',
                  }}>
                    <div style={{color:'#39ff14'}}>DECK {h.deck} CLEARED — {h.date}</div>
                    <div style={{color:'#555', fontSize:'12px'}}>
                      HP {h.hp} · SHARDS {h.shards} · KILLS {h.kills}
                    </div>
                  </div>
                ))
            }
          </div>
          <button style={S.oBtn} onClick={restart}>NEW OPERATIVE</button>
        </div>
      )}
    </div>
  );
}
