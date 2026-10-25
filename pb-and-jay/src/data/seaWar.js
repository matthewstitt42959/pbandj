// Engine for "Art of War at Sea" — a plan-then-execute naval skirmish game.
// Pure logic: no DOM, no timers. `step` mutates the state it is given.
export const WORLD = { w: 800, h: 500 };
export const SPECS = {
  battleship: { label: "Battleship", hp: 120, speed: 8, turn: 0.6, range: 150, damage: 18, reload: 4, weapon: "shell", standoff: 0.8 },
  cruiser: { label: "Cruiser", hp: 80, speed: 11, turn: 0.9, range: 120, damage: 9, reload: 2.5, weapon: "shell", standoff: 0.75 },
  destroyer: { label: "Destroyer", hp: 45, speed: 15, turn: 1.4, range: 90, damage: 5, reload: 2, weapon: "shell", standoff: 0.6 },
  submarine: { label: "Submarine", hp: 40, speed: 9, turn: 0.8, range: 70, damage: 30, reload: 7, weapon: "torpedo", standoff: 0.7 },
  carrier: { label: "Carrier", hp: 90, speed: 8, turn: 0.5, range: 260, damage: 16, reload: 9, weapon: "air", standoff: 0.95 },
};
export const SUB_DETECT_RANGE = 60;
const SUB_REVEAL_TIME = 3;
const SHOT_TTL = 0.5;
const ARRIVE_DIST = 4;
const AI_INTERVAL = 1.5;
export const SCENARIOS = {
  skirmish: {
    name: "Open Sea Skirmish",
    blurb: "Two small squadrons, nowhere to hide.",
    fleet: ["cruiser", "cruiser", "destroyer", "destroyer"],
    islands: [],
  },
  strait: {
    name: "The Narrow Strait",
    blurb: "An island chain splits the sea. Find the gap — or the flank.",
    fleet: ["battleship", "cruiser", "destroyer", "destroyer", "submarine"],
    islands: [
      { x: 400, y: 60, r: 50 },
      { x: 400, y: 200, r: 35 },
      { x: 400, y: 330, r: 40 },
      { x: 400, y: 460, r: 45 },
    ],
  },
  fleet: {
    name: "Fleet Action",
    blurb: "Full battle fleets with carrier air power.",
    fleet: ["carrier", "battleship", "cruiser", "cruiser", "destroyer", "destroyer", "destroyer", "submarine"],
    islands: [
      { x: 400, y: 120, r: 35 },
      { x: 400, y: 380, r: 35 },
    ],
  },
};
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function normalizeAngle(a) {
  while (a > Math.PI)
    a -= Math.PI * 2;
  while (a < -Math.PI)
    a += Math.PI * 2;
  return a;
}
function makeShip(state, side, kind, x, y) {
  const spec = SPECS[kind];
  return {
    id: state.nextId++,
    side,
    kind,
    x,
    y,
    heading: side === "player" ? 0 : Math.PI,
    hp: spec.hp,
    maxHp: spec.hp,
    waypoints: [],
    focus: null,
    cooldown: spec.reload * 0.5,
    aiTimer: 0,
    revealed: 0,
    sunk: false,
  };
}
export function createScenario(id) {
  const sc = SCENARIOS[id];
  const state = {
    time: 0,
    ships: [],
    islands: sc.islands.map((i) => ({ ...i })),
    shots: [],
    log: [`Scenario: ${sc.name}. Give your orders, then press Execute.`],
    nextId: 1,
    winner: null,
  };
  const n = sc.fleet.length;
  const spacing = Math.min(70, (WORLD.h - 100) / Math.max(1, n - 1));
  const top = WORLD.h / 2 - (spacing * (n - 1)) / 2;
  sc.fleet.forEach((kind, i) => {
    const y = top + i * spacing;
    state.ships.push(makeShip(state, "player", kind, 70 + (i % 2) * 25, y));
    state.ships.push(makeShip(state, "enemy", kind, WORLD.w - 70 - (i % 2) * 25, y));
  });
  return state;
}
export function alive(state, side) {
  return state.ships.filter((s) => !s.sunk && (!side || s.side === side));
}
/** Submarines are hidden from the other side unless a ship is close or the sub just fired. */
export function isVisibleTo(state, ship, side) {
  if (ship.side === side || ship.kind !== "submarine")
    return true;
  if (ship.revealed > 0)
    return true;
  return alive(state, side).some((s) => dist(s, ship) <= SUB_DETECT_RANGE);
}
function blockedByIsland(state, x, y) {
  return state.islands.some((i) => Math.hypot(x - i.x, y - i.y) < i.r + 4);
}
function tryMove(state, ship, d) {
  for (const off of [0, 0.5, -0.5, 1, -1]) {
    const h = ship.heading + off;
    const nx = Math.min(WORLD.w - 5, Math.max(5, ship.x + Math.cos(h) * d));
    const ny = Math.min(WORLD.h - 5, Math.max(5, ship.y + Math.sin(h) * d));
    if (!blockedByIsland(state, nx, ny)) {
      ship.x = nx;
      ship.y = ny;
      return;
    }
  }
}
function pickTarget(state, ship, range) {
  const foes = alive(state).filter((s) => s.side !== ship.side && isVisibleTo(state, s, ship.side) && dist(s, ship) <= range);
  if (!foes.length)
    return null;
  if (ship.focus !== null) {
    const f = foes.find((s) => s.id === ship.focus);
    if (f)
      return f;
  }
  return foes.reduce((a, b) => (dist(a, ship) <= dist(b, ship) ? a : b));
}
function runAi(state, ship) {
  const spec = SPECS[ship.kind];
  const foes = alive(state, ship.side === "player" ? "enemy" : "player");
  if (!foes.length)
    return;
  const target = foes.reduce((a, b) => (dist(a, ship) <= dist(b, ship) ? a : b));
  const want = spec.range * spec.standoff;
  const d = dist(target, ship);
  const ux = (ship.x - target.x) / (d || 1);
  const uy = (ship.y - target.y) / (d || 1);
  const goal = { x: target.x + ux * want, y: target.y + uy * want };
  ship.waypoints = [...detour(state, ship, goal), goal];
  ship.focus = target.id;
}
/** If an island sits on the straight path to `goal`, return a waypoint that skirts around it. */
function detour(state, from, goal) {
  const dx = goal.x - from.x;
  const dy = goal.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  for (const isl of state.islands) {
    const t = Math.max(0, Math.min(1, ((isl.x - from.x) * dx + (isl.y - from.y) * dy) / (len * len)));
    const px = from.x + dx * t;
    const py = from.y + dy * t;
    const off = Math.hypot(isl.x - px, isl.y - py);
    if (off >= isl.r + 12)
      continue;
    // Perpendicular to the path, pointing away from the island centre's side of the line.
    let nx = -dy / len;
    let ny = dx / len;
    if ((px - isl.x) * nx + (py - isl.y) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const clear = isl.r + 25;
    return [{
        x: Math.min(WORLD.w - 10, Math.max(10, isl.x + nx * clear)),
        y: Math.min(WORLD.h - 10, Math.max(10, isl.y + ny * clear)),
      }];
  }
  return [];
}
function fire(state, ship, target, rng) {
  const spec = SPECS[ship.kind];
  const d = dist(ship, target);
  const chance = spec.weapon === "torpedo" ? 0.75 : Math.max(0.2, 0.85 - 0.5 * (d / spec.range));
  const hit = rng() < chance;
  state.shots.push({
    x1: ship.x,
    y1: ship.y,
    x2: target.x,
    y2: target.y,
    ttl: SHOT_TTL,
    kind: spec.weapon,
    side: ship.side,
    hit,
  });
  if (spec.weapon === "torpedo")
    ship.revealed = SUB_REVEAL_TIME;
  if (!hit)
    return;
  target.hp -= spec.damage;
  if (target.hp <= 0) {
    target.hp = 0;
    target.sunk = true;
    target.waypoints = [];
    state.log.push(`${ship.side === "player" ? "Your" : "Enemy"} ${spec.label} sank ${target.side === "player" ? "your" : "an enemy"} ${SPECS[target.kind].label}!`);
  }
}
/** Advance the simulation by `dt` seconds (mutates `state`). */
export function step(state, dt, rng = Math.random) {
  if (state.winner)
    return;
  state.time += dt;
  state.shots = state.shots.filter((s) => (s.ttl -= dt) > 0);
  for (const ship of alive(state)) {
    const spec = SPECS[ship.kind];
    ship.revealed = Math.max(0, ship.revealed - dt);
    if (ship.side === "enemy") {
      ship.aiTimer -= dt;
      if (ship.aiTimer <= 0) {
        ship.aiTimer = AI_INTERVAL;
        runAi(state, ship);
      }
    }
    const wp = ship.waypoints[0];
    if (wp) {
      if (dist(ship, wp) <= ARRIVE_DIST) {
        ship.waypoints.shift();
      }
      else {
        const want = Math.atan2(wp.y - ship.y, wp.x - ship.x);
        const diff = normalizeAngle(want - ship.heading);
        const maxTurn = spec.turn * dt;
        ship.heading += Math.abs(diff) <= maxTurn ? diff : Math.sign(diff) * maxTurn;
        // Slow down in sharp turns so ships can't corkscrew around a waypoint.
        const throttle = Math.abs(diff) > 1 ? 0.3 : 1;
        tryMove(state, ship, Math.min(spec.speed * throttle * dt, dist(ship, wp)));
      }
    }
    ship.cooldown -= dt;
    if (ship.cooldown <= 0) {
      const target = pickTarget(state, ship, spec.range);
      if (target) {
        fire(state, ship, target, rng);
        ship.cooldown = spec.reload;
      }
      else {
        ship.cooldown = 0;
      }
    }
  }
  if (!alive(state, "enemy").length) {
    state.winner = "player";
    state.log.push("Victory! The enemy fleet is destroyed.");
  }
  else if (!alive(state, "player").length) {
    state.winner = "enemy";
    state.log.push("Defeat. Your fleet lies at the bottom of the sea.");
  }
}
