// Engine for "Art of War at Sea" — an age-of-sail naval wargame in the spirit
// of the 1987 Broderbund original.
//
// Three layers, one state object:
//   map     — top-down strategic sea. Fleets sail with (and against) the wind;
//             ports repair, shoals hurt. Opposing ships meeting starts a battle.
//   battle  — the "zoom": ships in a tactical arena. Broadsides fire from the
//             port or starboard side, aimed at hull or rigging. Ships that
//             collide (or are ordered to board) go to...
//   board   — swordsmen and musketeers fight it out on deck; the winner takes
//             the other ship.
//
// Capture or sink the enemy flagship (the "moving flag") to win.
//
// Pure logic: no DOM, no timers. `step` and the order functions mutate the
// state they are given. Ship stats are our own approximations — the original
// manual's numbers aren't public.

export const WORLD = { w: 800, h: 500 };
export const CONTACT_RANGE = 45; // map distance at which opposing ships clash
export const ENGAGE_RADIUS = 160; // map distance from the clash that joins the battle
export const BATTLE_SCALE = 3; // arena units per map unit
export const BOARD_RANGE = 14; // arena distance at which a boarding order connects
export const BREAK_CONTACT_DIST = 340; // arena distance at which the fleets have escaped
export const GUN_ARC = 0.55; // radians either side of the beam a broadside can reach
export const TACK_ANGLE = 0.85; // radians off the wind a ship can hold when beating upwind
export const HULL_DAMAGE = 5;
export const SAIL_DAMAGE = 6;

const SHOT_TTL = 0.8;
const ARRIVE_DIST = 5;
const AI_INTERVAL = 1.5;
const DISENGAGE_COOLDOWN = 10;
const BATTLE_END_COOLDOWN = 8;

export const SPECS = {
  frigate: {
    label: 'Frigate', mapSpeed: 6, speed: 14, turn: 0.7,
    hull: 60, sail: 40, guns: 4, crew: 12, range: 130, reload: 5, length: 20, beam: 6,
  },
  line: {
    label: 'Ship of the Line', mapSpeed: 4.2, speed: 10, turn: 0.45,
    hull: 130, sail: 70, guns: 9, crew: 26, range: 150, reload: 7, length: 26, beam: 8,
  },
  flagship: {
    label: 'Flagship', mapSpeed: 4.8, speed: 11, turn: 0.5,
    hull: 160, sail: 80, guns: 11, crew: 32, range: 155, reload: 7, length: 28, beam: 8.5,
  },
};

export const UNIT = {
  sword: { hp: 10, speed: 24, reach: 9, dmg: 4, hit: 0.7, cooldown: 0.8 },
  musket: {
    hp: 7, speed: 15, reach: 7, dmg: 2, hit: 0.6, cooldown: 1.2,
    range: 150, shotDmg: 7, shotHit: 0.5, shotCooldown: 3.5, closeIn: 60,
  },
};

// Compass points are where the wind blows FROM. Screen coordinates (y down),
// so north is -PI/2.
export const COMPASS = {
  N: -Math.PI / 2, NE: -Math.PI / 4, E: 0, SE: Math.PI / 4,
  S: Math.PI / 2, SW: (Math.PI * 3) / 4, W: Math.PI, NW: -(Math.PI * 3) / 4,
};
export const WIND_STRENGTHS = { light: 0.7, moderate: 1, strong: 1.25 };

export const SCENARIOS = {
  pirates: {
    name: 'Pirate Waters',
    opponent: 'Blackbeard',
    blurb: 'Four frigates apiece among the cays and shoals. Fast, close work.',
    windFrom: 'N',
    strength: 'moderate',
    fleets: {
      player: ['flagship', 'frigate', 'frigate', 'frigate'],
      enemy: ['flagship', 'frigate', 'frigate', 'frigate'],
    },
    islands: [
      { x: 400, y: 250, r: 45 }, { x: 250, y: 110, r: 25 }, { x: 560, y: 395, r: 30 },
      { x: 270, y: 410, r: 22 }, { x: 540, y: 100, r: 22 },
    ],
    shoals: [{ x: 330, y: 330, r: 50 }, { x: 480, y: 175, r: 50 }],
    ports: {
      player: { x: 45, y: 455, name: 'Port Haven' },
      enemy: { x: 755, y: 455, name: "Blackbeard's Cove" },
    },
  },
  straits: {
    name: 'The Narrow Strait',
    opponent: 'John Paul Jones',
    blurb: 'An island chain splits the sea. Mind the wind — and the gaps.',
    windFrom: 'W',
    strength: 'moderate',
    fleets: {
      player: ['flagship', 'line', 'frigate', 'frigate'],
      enemy: ['flagship', 'line', 'frigate', 'frigate'],
    },
    islands: [
      { x: 400, y: 60, r: 50 }, { x: 400, y: 200, r: 35 },
      { x: 400, y: 330, r: 40 }, { x: 400, y: 460, r: 45 },
    ],
    shoals: [{ x: 400, y: 262, r: 22 }],
    ports: {
      player: { x: 45, y: 60, name: 'Fort Anchor' },
      enemy: { x: 755, y: 455, name: 'Harbour Reach' },
    },
  },
  armada: {
    name: 'The Armada',
    opponent: 'Duke of Medina Sidonia',
    blurb: 'Their great ships of the line are slow and heavy. Your frigates are not.',
    windFrom: 'SW',
    strength: 'moderate',
    fleets: {
      player: ['flagship', 'line', 'frigate', 'frigate', 'frigate'],
      enemy: ['flagship', 'line', 'line', 'line', 'frigate'],
    },
    islands: [{ x: 400, y: 120, r: 30 }, { x: 400, y: 380, r: 30 }],
    shoals: [{ x: 300, y: 250, r: 45 }, { x: 520, y: 250, r: 45 }],
    ports: {
      player: { x: 45, y: 455, name: 'Plymouth' },
      enemy: { x: 755, y: 455, name: 'Lisbon' },
    },
  },
};

const NAMES = {
  player: ['Resolute', 'Swift', 'Falcon', 'Hawk', 'Intrepid', 'Vigilant', 'Gannet'],
  enemy: ['Revenge', 'Corsair', 'Fury', 'Dagger', 'Leviathan', 'Marauder', 'Serpent'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function turnToward(current, target, maxTurn) {
  const diff = normalizeAngle(target - current);
  return normalizeAngle(current + (Math.abs(diff) <= maxTurn ? diff : Math.sign(diff) * maxTurn));
}

function note(state, msg) {
  state.log.push(msg);
  if (state.log.length > 80) state.log.shift();
}

export function windFromLabel(dir) {
  const from = normalizeAngle(dir + Math.PI);
  let best = 'N';
  let bestDiff = Infinity;
  for (const [label, ang] of Object.entries(COMPASS)) {
    const d = Math.abs(normalizeAngle(from - ang));
    if (d < bestDiff) { best = label; bestDiff = d; }
  }
  return best;
}

// ── Sailing ───────────────────────────────────────────────────────────────────

// Speed multiplier by angle between the ship's heading and the direction the
// wind blows toward: 0 = running dead downwind, PI = sailing straight into it.
const WIND_TABLE = [
  [0, 0.8], [Math.PI * 0.5, 1], [Math.PI * 0.67, 0.75], [Math.PI * 0.8, 0.4], [Math.PI, 0.1],
];

export function windFactor(heading, windDir) {
  const a = Math.abs(normalizeAngle(heading - windDir));
  for (let i = 1; i < WIND_TABLE.length; i++) {
    const [a1, f1] = WIND_TABLE[i];
    if (a <= a1) {
      const [a0, f0] = WIND_TABLE[i - 1];
      return f0 + ((f1 - f0) * (a - a0)) / (a1 - a0);
    }
  }
  return WIND_TABLE[WIND_TABLE.length - 1][1];
}

// A ship can't sail straight at the wind. If `want` points into the no-go
// cone, return the closer of the two close-hauled headings (tacking), sticking
// with the current one unless the other is clearly better.
export function bestHeading(want, windDir, current) {
  const a = Math.abs(normalizeAngle(want - windDir));
  if (a < Math.PI - TACK_ANGLE) return want;
  const up = windDir + Math.PI;
  const c1 = normalizeAngle(up + TACK_ANGLE);
  const c2 = normalizeAngle(up - TACK_ANGLE);
  const d1 = Math.abs(normalizeAngle(want - c1));
  const d2 = Math.abs(normalizeAngle(want - c2));
  if (current !== undefined && Math.abs(d1 - d2) < 0.5) {
    // Hold whichever tack the ship is already on (positive = the c1 side of the wind).
    const side = normalizeAngle(current - up);
    if (Math.abs(side) > 0.02) return side > 0 ? c1 : c2;
  }
  return d1 <= d2 ? c1 : c2;
}

function sailFactor(ship) {
  return 0.3 + 0.7 * (ship.sail / ship.maxSail);
}

// scale: 'mapSpeed' for the strategic map, 'speed' for the battle arena.
export function shipSpeed(state, ship, heading = ship.heading, scale = 'speed') {
  return SPECS[ship.kind][scale] * windFactor(heading, state.wind.dir) * state.wind.strength * ship.sails * sailFactor(ship);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

function makeShip(state, side, kind, x, y, name) {
  const spec = SPECS[kind];
  return {
    id: state.nextId++, side, kind, name,
    x, y, heading: side === 'player' ? 0 : Math.PI,
    hull: spec.hull, maxHull: spec.hull,
    sail: spec.sail, maxSail: spec.sail,
    crew: spec.crew, maxCrew: spec.crew,
    sails: 1, // 0 furled, 0.5 half, 1 full
    dest: null, route: [],
    auto: side === 'enemy', // battle: a helmsman steers and fires for the ship. Yours start in your hands.
    aim: 'hull',
    sunk: false, cool: 0, aiTimer: 0, b: null,
  };
}

function placeFleet(state, side, kinds, names) {
  const escorts = kinds.length - 1;
  kinds.forEach((kind, i) => {
    let x;
    let y;
    if (i === 0) {
      x = side === 'player' ? 50 : WORLD.w - 50;
      y = WORLD.h / 2;
    } else {
      x = side === 'player' ? 105 + (i % 2) * 25 : WORLD.w - 105 - (i % 2) * 25;
      y = WORLD.h / 2 + (i - 1 - (escorts - 1) / 2) * 60;
    }
    state.ships.push(makeShip(state, side, kind, x, y, names[i % names.length]));
  });
}

export function createScenario(id, opts = {}) {
  const sc = SCENARIOS[id];
  const from = opts.windFrom ?? sc.windFrom;
  const strength = opts.windStrength ?? sc.strength;
  const state = {
    mode: 'map',
    time: 0,
    scenario: id,
    wind: { dir: normalizeAngle(COMPASS[from] + Math.PI), strength: WIND_STRENGTHS[strength] },
    hostile: opts.hostile ?? true,
    ships: [],
    islands: sc.islands.map((i) => ({ ...i })),
    shoals: sc.shoals.map((s) => ({ ...s })),
    ports: [
      { ...sc.ports.player, side: 'player' },
      { ...sc.ports.enemy, side: 'enemy' },
    ],
    shots: [],
    log: [`${sc.name} — you face ${sc.opponent}. Plot your courses, then press Execute.`],
    nextId: 1,
    battle: null,
    boarding: null,
    winner: null,
  };
  placeFleet(state, 'player', sc.fleets.player, NAMES.player);
  placeFleet(state, 'enemy', sc.fleets.enemy, NAMES.enemy);
  return state;
}

export function getShip(state, id) {
  return state.ships.find((s) => s.id === id);
}

export function alive(state, side) {
  return state.ships.filter((s) => !s.sunk && (!side || s.side === side));
}

export function battleShips(state) {
  if (!state.battle) return [];
  return state.battle.ids.map((id) => getShip(state, id)).filter((s) => s && !s.sunk && s.b);
}

// ── Orders ────────────────────────────────────────────────────────────────────

export function orderMove(state, id, point, append = false) {
  const ship = getShip(state, id);
  if (!ship || ship.sunk || state.mode !== 'map') return false;
  const p = { x: clamp(point.x, 5, WORLD.w - 5), y: clamp(point.y, 5, WORLD.h - 5) };
  if (append && ship.dest) ship.route.push(p);
  else setCourse(state, ship, p);
  return true;
}

export function clearCourse(state, id) {
  const ship = getShip(state, id);
  if (!ship) return;
  ship.dest = null;
  ship.route = [];
}

export function setSails(state, id, level) {
  const ship = getShip(state, id);
  if (ship && !ship.sunk) ship.sails = level;
}

export function setAim(state, id, aim) {
  const ship = getShip(state, id);
  if (ship) ship.aim = aim;
}

export function setAuto(state, id, auto) {
  const ship = getShip(state, id);
  if (!ship) return;
  ship.auto = auto;
  if (auto && ship.b) ship.b.order = null;
}

export function orderCourse(state, id, heading) {
  const ship = getShip(state, id);
  if (!ship || ship.sunk || !ship.b || state.mode !== 'battle') return false;
  ship.auto = false;
  ship.b.order = { type: 'course', heading: normalizeAngle(heading) };
  return true;
}

export function orderBoard(state, id, targetId) {
  const ship = getShip(state, id);
  const target = getShip(state, targetId);
  if (!ship || !target || ship.sunk || target.sunk || !ship.b || !target.b || ship.side === target.side || state.mode !== 'battle') return false;
  ship.auto = false;
  ship.b.order = { type: 'board', target: targetId };
  return true;
}

export function nearestEnemy(state, ship) {
  const foes = battleShips(state).filter((s) => s.side !== ship.side);
  if (!foes.length || !ship.b) return null;
  return foes.reduce((a, b) => (dist(a.b, ship.b) <= dist(b.b, ship.b) ? a : b));
}

export function orderBoarding(state, order) {
  if (state.mode !== 'board') return;
  const bd = state.boarding;
  const side = bd.playerSide;
  if (side) bd.orders[side] = order;
}

export function disengage(state) {
  if (state.mode !== 'battle') return false;
  note(state, 'Your fleet breaks off the action.');
  endBattle(state, DISENGAGE_COOLDOWN);
  return true;
}

// ── Strategic map ─────────────────────────────────────────────────────────────

function blockedByIsland(state, x, y) {
  return state.islands.some((i) => Math.hypot(x - i.x, y - i.y) < i.r + 4);
}

function tryMove(state, ship, d) {
  for (const off of [0, 0.5, -0.5, 1, -1]) {
    const h = ship.heading + off;
    const nx = clamp(ship.x + Math.cos(h) * d, 5, WORLD.w - 5);
    const ny = clamp(ship.y + Math.sin(h) * d, 5, WORLD.h - 5);
    if (!blockedByIsland(state, nx, ny)) {
      ship.x = nx;
      ship.y = ny;
      return;
    }
  }
}

// If an island sits on the straight path to `goal`, return a waypoint that skirts it.
function detour(state, from, goal) {
  const dx = goal.x - from.x;
  const dy = goal.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  for (const isl of state.islands) {
    const t = clamp(((isl.x - from.x) * dx + (isl.y - from.y) * dy) / (len * len), 0, 1);
    const px = from.x + dx * t;
    const py = from.y + dy * t;
    if (Math.hypot(isl.x - px, isl.y - py) >= isl.r + 12) continue;
    // Perpendicular to the path, pointing to the side the path already leans.
    let nx = -dy / len;
    let ny = dx / len;
    if ((px - isl.x) * nx + (py - isl.y) * ny < 0) { nx = -nx; ny = -ny; }
    const clear = isl.r + 25;
    return {
      x: clamp(isl.x + nx * clear, 10, WORLD.w - 10),
      y: clamp(isl.y + ny * clear, 10, WORLD.h - 10),
    };
  }
  return null;
}

function setCourse(state, ship, goal) {
  const around = detour(state, ship, goal);
  ship.dest = around ?? goal;
  ship.route = around ? [goal] : [];
}

function runMapAi(state, ship) {
  const foes = alive(state, ship.side === 'player' ? 'enemy' : 'player');
  if (!foes.length) return;
  const nearest = foes.reduce((a, b) => (dist(a, ship) <= dist(b, ship) ? a : b));
  const escorts = alive(state, ship.side).filter((s) => s.kind !== 'flagship');
  if (ship.kind === 'flagship' && escorts.length) {
    // The flag keeps with its escorts.
    const cx = escorts.reduce((sum, s) => sum + s.x, 0) / escorts.length;
    const cy = escorts.reduce((sum, s) => sum + s.y, 0) / escorts.length;
    if (dist(ship, { x: cx, y: cy }) > 40) setCourse(state, ship, { x: cx, y: cy });
    else { ship.dest = null; ship.route = []; }
  } else {
    // Everyone else — and a flagship stripped of its escorts — goes after the nearest foe.
    setCourse(state, ship, { x: nearest.x, y: nearest.y });
  }
}

function moveOnMap(state, ship, dt) {
  if (!ship.dest) return;
  const spec = SPECS[ship.kind];
  const d = dist(ship, ship.dest);
  if (d <= ARRIVE_DIST) {
    ship.dest = ship.route.shift() ?? null;
    return;
  }
  const want = Math.atan2(ship.dest.y - ship.y, ship.dest.x - ship.x);
  const desired = bestHeading(want, state.wind.dir, ship.heading);
  ship.heading = turnToward(ship.heading, desired, spec.turn * 1.5 * dt);
  tryMove(state, ship, Math.min(shipSpeed(state, ship, ship.heading, 'mapSpeed') * dt, d));
}

function applyMapHazards(state, ship, dt) {
  if (state.hostile) {
    for (const shoal of state.shoals) {
      if (dist(ship, shoal) < shoal.r) {
        ship.hull -= 0.8 * dt;
        if (ship.hull <= 0) {
          ship.hull = 0;
          ship.sunk = true;
          note(state, `${ship.name} founders on the shoals!`);
          return;
        }
      }
    }
  }
  for (const port of state.ports) {
    if (port.side === ship.side && dist(ship, port) < 30) {
      ship.hull = Math.min(ship.maxHull, ship.hull + 4 * dt);
      ship.sail = Math.min(ship.maxSail, ship.sail + 4 * dt);
    }
  }
}

function stepMap(state, dt) {
  state.time += dt;
  state.shots = [];
  for (const ship of alive(state)) {
    ship.cool = Math.max(0, ship.cool - dt);
    if (ship.side === 'enemy') {
      ship.aiTimer -= dt;
      if (ship.aiTimer <= 0) {
        ship.aiTimer = AI_INTERVAL;
        runMapAi(state, ship);
      }
    }
    moveOnMap(state, ship, dt);
    if (!ship.sunk) applyMapHazards(state, ship, dt);
  }
  for (const p of alive(state, 'player')) {
    if (p.cool > 0) continue;
    const e = alive(state, 'enemy').find((s) => s.cool <= 0 && dist(s, p) < CONTACT_RANGE);
    if (e) {
      startBattle(state, p, e);
      return;
    }
  }
}

// ── Battle (the zoom) ─────────────────────────────────────────────────────────

function startBattle(state, a, b) {
  const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const ids = alive(state)
    .filter((s) => s.cool <= 0 && dist(s, center) <= ENGAGE_RADIUS)
    .map((s) => s.id);
  state.mode = 'battle';
  state.battle = { ids, center, time: 0 };
  for (const id of ids) {
    const s = getShip(state, id);
    s.b = {
      x: clamp(WORLD.w / 2 + (s.x - center.x) * BATTLE_SCALE, 60, WORLD.w - 60),
      y: clamp(WORLD.h / 2 + (s.y - center.y) * BATTLE_SCALE, 60, WORLD.h - 60),
      heading: s.heading,
      speed: 4,
      reload: [2, 2], // [port, starboard]
      order: null,
    };
    if (s.side === 'enemy') s.sails = 1;
  }
  // Squeeze apart any opposing ships clamping left too close together.
  const ships = battleShips(state);
  for (const x of ships) {
    for (const y of ships) {
      if (x.side === y.side) continue;
      const d = dist(x.b, y.b);
      if (d < 45) {
        const ux = d ? (x.b.x - y.b.x) / d : 1;
        const uy = d ? (x.b.y - y.b.y) / d : 0;
        x.b.x = clamp(x.b.x + ux * (45 - d), 20, WORLD.w - 20);
        x.b.y = clamp(x.b.y + uy * (45 - d), 20, WORLD.h - 20);
      }
    }
  }
  note(state, `Contact! ${ids.length} ships are engaged — the battle is joined.`);
}

function sinkShip(state, ship, by) {
  ship.hull = 0;
  ship.sunk = true;
  ship.b = null;
  note(state, `${by ? `${by.name} sank` : 'Lost:'} ${ship.name}${by ? '!' : '.'}`);
}

// The nearest enemy in reach of this ship's port or starboard guns, or null.
export function broadsideTarget(state, ship, side) {
  if (!ship.b || ship.sunk) return null;
  const spec = SPECS[ship.kind];
  const sign = side === 'port' ? -1 : 1;
  let target = null;
  let best = Infinity;
  for (const e of battleShips(state)) {
    if (e.side === ship.side) continue;
    const d = dist(ship.b, e.b);
    if (d > spec.range) continue;
    const rel = normalizeAngle(Math.atan2(e.b.y - ship.b.y, e.b.x - ship.b.x) - ship.b.heading - sign * (Math.PI / 2));
    if (Math.abs(rel) <= GUN_ARC && d < best) {
      target = e;
      best = d;
    }
  }
  return target;
}

export function fire(state, ship, side, rng = Math.random) {
  if (state.mode !== 'battle' || !ship.b || ship.sunk) return false;
  const idx = side === 'port' ? 0 : 1;
  if (ship.b.reload[idx] > 0) return false;
  const spec = SPECS[ship.kind];
  const sign = side === 'port' ? -1 : 1;
  const target = broadsideTarget(state, ship, side);
  if (!target) return false;
  const best = dist(ship.b, target.b);

  ship.b.reload[idx] = spec.reload;
  const guns = Math.max(1, Math.round(spec.guns * Math.sqrt(ship.crew / ship.maxCrew)));
  const p = clamp(0.75 - (0.55 * best) / spec.range, 0.12, 0.75);
  let hits = 0;
  for (let i = 0; i < guns; i++) if (rng() < p) hits++;

  if (ship.aim === 'rigging') {
    target.sail = Math.max(0, target.sail - hits * SAIL_DAMAGE);
  } else {
    target.hull -= hits * HULL_DAMAGE;
    for (let i = 0; i < hits; i++) if (rng() < 0.4) target.crew = Math.max(1, target.crew - 1);
  }
  state.shots.push({
    x1: ship.b.x, y1: ship.b.y, x2: target.b.x, y2: target.b.y,
    ttl: SHOT_TTL, side: ship.side, hits, aim: ship.aim, from: sign,
  });
  if (target.hull <= 0) sinkShip(state, target, ship);
  return true;
}

function battleAi(state, ship, rng) {
  const target = nearestEnemy(state, ship);
  if (!target) return;
  const spec = SPECS[ship.kind];
  ship.sails = 1;
  const d = dist(ship.b, target.b);
  const bearing = Math.atan2(target.b.y - ship.b.y, target.b.x - ship.b.x);

  const strongCrew = ship.crew >= target.crew * 1.3 && ship.hull > ship.maxHull * 0.4;
  if (strongCrew && d < spec.range * 0.9) {
    ship.b.order = { type: 'board', target: target.id };
  } else {
    let want;
    if (d > spec.range * 0.8) {
      want = bearing;
    } else {
      // Close in to a firing line: put the target on the beam.
      const side = normalizeAngle(bearing - ship.b.heading) > 0 ? 1 : -1;
      want = bearing - side * (Math.PI / 2);
    }
    ship.b.order = { type: 'course', heading: bestHeading(want, state.wind.dir, ship.b.heading) };
  }

  if (ship.side === 'enemy') ship.aim = target.sail > target.maxSail * 0.5 && rng() < 0.3 ? 'rigging' : 'hull';
  fire(state, ship, 'port', rng);
  fire(state, ship, 'starboard', rng);
}

function endBattle(state, cooldown) {
  const { center } = state.battle;
  for (const s of battleShips(state)) {
    let x = clamp(center.x + (s.b.x - WORLD.w / 2) / BATTLE_SCALE, 8, WORLD.w - 8);
    let y = clamp(center.y + (s.b.y - WORLD.h / 2) / BATTLE_SCALE, 8, WORLD.h - 8);
    for (let i = 0; i < 12 && blockedByIsland(state, x, y); i++) {
      const isl = state.islands.find((it) => Math.hypot(x - it.x, y - it.y) < it.r + 4);
      const d = Math.hypot(x - isl.x, y - isl.y) || 1;
      x += ((x - isl.x) / d) * 8;
      y += ((y - isl.y) / d) * 8;
    }
    s.x = x;
    s.y = y;
    s.heading = s.b.heading;
    s.b = null;
    s.cool = cooldown;
    s.dest = null;
    s.route = [];
  }
  state.battle = null;
  state.mode = 'map';
  state.shots = [];
}

function stepBattle(state, dt, rng) {
  const battle = state.battle;
  battle.time += dt;
  state.shots = state.shots.filter((s) => (s.ttl -= dt) > 0);

  for (const ship of battleShips(state)) {
    if (!ship.b) continue; // sunk earlier in this tick
    const spec = SPECS[ship.kind];
    const b = ship.b;
    b.reload[0] = Math.max(0, b.reload[0] - dt);
    b.reload[1] = Math.max(0, b.reload[1] - dt);

    if (ship.side === 'enemy' || ship.auto) battleAi(state, ship, rng);
    if (!ship.b) continue;

    let desired = b.heading;
    if (b.order?.type === 'course') {
      desired = b.order.heading;
    } else if (b.order?.type === 'board') {
      const t = getShip(state, b.order.target);
      if (!t || t.sunk || !t.b || t.side === ship.side) {
        b.order = null;
      } else {
        desired = Math.atan2(t.b.y - b.y, t.b.x - b.x);
        if (dist(b, t.b) < BOARD_RANGE) {
          startBoarding(state, ship, t);
          return;
        }
      }
    }

    const top = spec.speed * state.wind.strength;
    b.heading = turnToward(b.heading, desired, spec.turn * (0.35 + 0.65 * Math.min(1, b.speed / top)) * dt);
    const target = shipSpeed(state, ship, b.heading);
    b.speed += (target - b.speed) * Math.min(1, dt * 0.5);
    b.x = clamp(b.x + Math.cos(b.heading) * b.speed * dt, 8, WORLD.w - 8);
    b.y = clamp(b.y + Math.sin(b.heading) * b.speed * dt, 8, WORLD.h - 8);
  }

  // Colliding ships are locked together — boarding follows.
  const ships = battleShips(state);
  for (const a of ships) {
    for (const c of ships) {
      if (a.side === 'player' && c.side === 'enemy' && dist(a.b, c.b) < BOARD_RANGE * 0.6) {
        // Whoever was ordered to board is the attacker; otherwise the ram goes to the enemy.
        const playerBoards = a.b.order?.type === 'board' && a.b.order.target === c.id;
        startBoarding(state, playerBoards ? a : c, playerBoards ? c : a);
        return;
      }
    }
  }

  const ps = ships.filter((s) => s.side === 'player');
  const es = ships.filter((s) => s.side === 'enemy');
  if (!ps.length || !es.length) {
    note(state, ps.length ? 'The enemy squadron is destroyed.' : 'Your squadron is destroyed.');
    endBattle(state, BATTLE_END_COOLDOWN);
    return;
  }
  const gap = Math.min(...ps.flatMap((p) => es.map((e) => dist(p.b, e.b))));
  if (gap > BREAK_CONTACT_DIST) {
    note(state, 'The fleets have broken contact.');
    endBattle(state, BATTLE_END_COOLDOWN);
  }
}

// ── Boarding ──────────────────────────────────────────────────────────────────

function makeUnits(ship, side) {
  const swords = Math.max(1, Math.round(ship.crew * 0.6));
  const muskets = Math.max(0, ship.crew - swords);
  const units = [];
  const place = (n, kind, x) => {
    for (let i = 0; i < n; i++) {
      units.push({
        side, kind, x, y: 20 + ((i + 0.5) / n) * 160,
        hp: UNIT[kind].hp, cd: Math.random() * 0.5,
      });
    }
  };
  place(swords, 'sword', side === 'a' ? 120 : 280);
  place(muskets, 'musket', side === 'a' ? 60 : 340);
  return units;
}

function startBoarding(state, attacker, defender) {
  state.mode = 'board';
  const playerIsA = attacker.side === 'player';
  state.boarding = {
    a: attacker.id,
    b: defender.id,
    units: [...makeUnits(attacker, 'a'), ...makeUnits(defender, 'b')],
    orders: { a: 'charge', b: 'charge' },
    // The enemy's boarders think for themselves; yours take your orders.
    ai: { a: !playerIsA, b: playerIsA },
    playerSide: playerIsA ? 'a' : 'b',
    time: 0,
  };
  note(state, `${attacker.name} grapples ${defender.name} — boarders away!`);
}

function stepBoard(state, dt, rng) {
  const bd = state.boarding;
  bd.time += dt;
  const count = (s) => bd.units.filter((u) => u.side === s).length;
  const orders = { ...bd.orders };
  for (const s of ['a', 'b']) {
    if (bd.ai[s]) orders[s] = count(s) >= count(s === 'a' ? 'b' : 'a') * 0.7 ? 'charge' : 'hold';
  }

  for (const u of bd.units) {
    if (u.hp <= 0) continue;
    u.cd = Math.max(0, u.cd - dt);
    let foe = null;
    let best = Infinity;
    for (const o of bd.units) {
      if (o.hp > 0 && o.side !== u.side) {
        const d = Math.hypot(o.x - u.x, o.y - u.y);
        if (d < best) { foe = o; best = d; }
      }
    }
    if (!foe) continue;
    const spec = UNIT[u.kind];
    const advance = (speed) => {
      u.x += ((foe.x - u.x) / best) * speed * dt;
      u.y += ((foe.y - u.y) / best) * speed * dt;
    };
    if (best <= spec.reach) {
      if (u.cd <= 0) {
        if (rng() < spec.hit) foe.hp -= spec.dmg;
        u.cd = spec.cooldown;
      }
    } else if (u.kind === 'musket' && best <= spec.range) {
      if (u.cd <= 0) {
        if (rng() < spec.shotHit) foe.hp -= spec.shotDmg;
        u.cd = spec.shotCooldown;
      }
      if (orders[u.side] === 'charge' && best > spec.closeIn) advance(spec.speed);
    } else if (orders[u.side] === 'charge') {
      advance(spec.speed);
    }
  }
  bd.units = bd.units.filter((u) => u.hp > 0);

  const ca = count('a');
  const cb = count('b');
  if (ca === 0 || cb === 0) resolveBoarding(state, ca, cb);
}

function resolveBoarding(state, ca, cb) {
  const bd = state.boarding;
  const A = getShip(state, bd.a);
  const B = getShip(state, bd.b);
  state.boarding = null;
  state.mode = 'battle';

  if (ca === 0 && cb === 0) {
    A.crew = 1;
    B.crew = 1;
    A.b.x = clamp(A.b.x - 25, 10, WORLD.w - 10);
    B.b.x = clamp(B.b.x + 25, 10, WORLD.w - 10);
    note(state, 'Both crews are cut down — the ships drift apart.');
    return;
  }

  const [winner, loser, left] = ca > 0 ? [A, B, ca] : [B, A, cb];
  loser.side = winner.side;
  loser.auto = winner.side === 'player';
  loser.crew = Math.max(2, Math.ceil(left / 2));
  winner.crew = Math.max(1, left - loser.crew);
  loser.b.order = null;
  loser.dest = null;
  winner.b.order = null;
  // Pull the captured ship clear so the two aren't locked together again.
  loser.b.x = clamp(loser.b.x + 25, 10, WORLD.w - 10);
  note(state, `${winner.name} captures ${loser.name}!`);
}

// ── Main step ─────────────────────────────────────────────────────────────────

function checkVictory(state) {
  if (state.winner) return;
  const flag = (side) => alive(state, side).some((s) => s.kind === 'flagship');
  if (!flag('enemy')) state.winner = 'player';
  else if (!flag('player')) state.winner = 'enemy';
  if (state.winner) {
    state.mode = 'over';
    state.boarding = null;
    note(state, state.winner === 'player'
      ? 'Victory! The enemy flagship is taken — the day is yours.'
      : 'Defeat. Your flagship is lost.');
  }
}

// Advance the simulation by `dt` seconds (mutates `state`).
export function step(state, dt, rng = Math.random) {
  if (state.mode === 'over') return;
  if (state.mode === 'map') stepMap(state, dt);
  else if (state.mode === 'battle') stepBattle(state, dt, rng);
  else if (state.mode === 'board') stepBoard(state, dt, rng);
  checkVictory(state);
}
