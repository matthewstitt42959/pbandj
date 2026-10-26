// Engine for the boarding battle in Chess at Sea — a deploy-and-watch fight on
// an enemy deck, in the spirit of Boom Beach.
//
// The attacker drops squads of troops along their rail and then watches them
// fight on their own, spending a recharging energy bar on three abilities
// (Rally, Volley, Grenade). The defender's crew stand where the game puts
// them, around their captain. Kill the captain or clear the deck before time
// runs out and the attacker wins; run out of troops or time and they lose.
//
// Pure logic: no DOM, no timers. `step` and the actions mutate the state they
// are given.

export const DECK = { w: 400, h: 200, zoneX: 14 };
export const TIME_LIMIT = 60;
export const SQUAD_SIZE = 3;
export const MAX_ENERGY = 100;
export const ENERGY_REGEN = 3; // per second
export const ABILITY_COST = { rally: 35, volley: 30, grenade: 45 };
export const RALLY_TIME = 6;
export const GRENADE_RADIUS = 30;
export const GRENADE_DAMAGE = 12;
export const GRENADE_DELAY = 0.5;

const AGGRO_RANGE = 60;
const DEFENDER_HP_BONUS = 1.6; // fighting on your own deck
const FX_TTL = 0.3;

export const STATS = {
  sword: { hp: 10, speed: 22, reach: 9, dmg: 4, hit: 0.75, cooldown: 0.8 },
  musket: {
    hp: 7, speed: 14, reach: 7, dmg: 2, hit: 0.6, cooldown: 1.2,
    range: 140, shotDmg: 6, shotHit: 0.55, shotCooldown: 3.2,
  },
  captain: { hp: 28, speed: 18, reach: 10, dmg: 6, hit: 0.8, cooldown: 0.9 },
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function makeUnit(state, side, kind, x, y) {
  const hp = Math.round(STATS[kind].hp * (side === 'd' && kind !== 'captain' ? DEFENDER_HP_BONUS : 1));
  return { id: state.nextId++, side, kind, x, y, hp, maxHp: hp, cd: 0.3, aggro: false };
}

// A staggered line down the deck: the same shape at every crew size.
function line(count, x, stagger) {
  const out = [];
  for (let i = 0; i < count; i++) out.push({ x: x + (i % 2) * stagger, y: 20 + ((i + 0.5) / count) * 160 });
  return out;
}

// attackerCrew / defenderCrew are crew counts. The defender's captain is extra
// to the crew, and is the objective.
export function createBattle({ attackerCrew, defenderCrew, swordShare = 0.6 }) {
  const state = {
    time: 0,
    started: false,
    units: [],
    pool: { sword: 0, musket: 0 },
    deployed: { sword: 0, musket: 0 },
    energy: 40,
    rally: 0,
    grenades: [],
    fx: [],
    result: null,
    nextId: 1,
    attackerCrew,
    defenderCrew,
    autoTimer: 0,
  };
  setSwordShare(state, swordShare);

  const swords = Math.round(defenderCrew * 0.6);
  const muskets = defenderCrew - swords;
  line(swords, 250, 18).forEach((p) => state.units.push(makeUnit(state, 'd', 'sword', p.x, p.y)));
  line(muskets, 330, 14).forEach((p) => state.units.push(makeUnit(state, 'd', 'musket', p.x, p.y)));
  state.units.push(makeUnit(state, 'd', 'captain', 374, DECK.h / 2));
  return state;
}

// Pick the swordsmen/musketeers split of the attacking crew. Only before the first drop.
export function setSwordShare(state, share) {
  if (state.started) return false;
  const swords = clamp(Math.round(state.attackerCrew * share), 0, state.attackerCrew);
  state.pool = { sword: swords, musket: state.attackerCrew - swords };
  return true;
}

export function attackers(state) {
  return state.units.filter((u) => u.side === 'a');
}

export function defenders(state) {
  return state.units.filter((u) => u.side === 'd');
}

// Land one squad along the rail at height y. Starts the clock on the first drop.
export function deploy(state, kind, y) {
  if (state.result || state.pool[kind] <= 0) return false;
  const n = Math.min(SQUAD_SIZE, state.pool[kind]);
  for (let i = 0; i < n; i++) {
    const yy = clamp(y + (i - (n - 1) / 2) * 6, 6, DECK.h - 6);
    state.units.push(makeUnit(state, 'a', kind, 4 + (i % 2) * 4, yy));
  }
  state.pool[kind] -= n;
  state.deployed[kind] += n;
  state.started = true;
  return true;
}

function nearest(state, from, side) {
  let best = null;
  let bd = Infinity;
  for (const u of state.units) {
    if (u.side !== side) continue;
    const d = dist(from, u);
    if (d < bd) { best = u; bd = d; }
  }
  return best ? { unit: best, d: bd } : null;
}

function hit(state, from, to, dmg, kind) {
  to.hp -= dmg;
  state.fx.push({ type: kind, x1: from.x, y1: from.y, x2: to.x, y2: to.y, ttl: FX_TTL });
}

// ── Abilities ─────────────────────────────────────────────────────────────────

function canSpend(state, cost) {
  return state.started && !state.result && state.energy >= cost;
}

export function castRally(state) {
  if (!canSpend(state, ABILITY_COST.rally)) return false;
  state.energy -= ABILITY_COST.rally;
  state.rally = RALLY_TIME;
  return true;
}

export function castVolley(state, rng = Math.random) {
  if (!canSpend(state, ABILITY_COST.volley)) return false;
  state.energy -= ABILITY_COST.volley;
  for (const u of attackers(state)) {
    if (u.kind !== 'musket') continue;
    const t = nearest(state, u, 'd');
    if (t && t.d <= STATS.musket.range) {
      if (rng() < 0.85) hit(state, u, t.unit, STATS.musket.shotDmg, 'shot');
      u.cd = STATS.musket.shotCooldown;
    }
  }
  return true;
}

export function castGrenade(state, x, y) {
  if (!canSpend(state, ABILITY_COST.grenade)) return false;
  state.energy -= ABILITY_COST.grenade;
  state.grenades.push({ x: clamp(x, 0, DECK.w), y: clamp(y, 0, DECK.h), t: GRENADE_DELAY });
  return true;
}

// ── Step ──────────────────────────────────────────────────────────────────────

function actUnit(state, u, dt, rng) {
  const spec = STATS[u.kind];
  const boosted = u.side === 'a' && state.rally > 0;
  u.cd -= dt * (boosted ? 1.4 : 1);
  const foe = nearest(state, u, u.side === 'a' ? 'd' : 'a');
  if (!foe) return;
  const mult = boosted ? 1.3 : 1;
  const advance = (speed) => {
    u.x = clamp(u.x + ((foe.unit.x - u.x) / foe.d) * speed * (boosted ? 1.5 : 1) * dt, 0, DECK.w);
    u.y = clamp(u.y + ((foe.unit.y - u.y) / foe.d) * speed * (boosted ? 1.5 : 1) * dt, 0, DECK.h);
  };

  if (foe.d <= spec.reach) {
    if (u.cd <= 0) {
      if (rng() < spec.hit) hit(state, u, foe.unit, spec.dmg * mult, 'slash');
      u.cd = spec.cooldown;
    }
    return;
  }

  if (u.kind === 'musket') {
    if (foe.d <= spec.range) {
      if (u.cd <= 0) {
        if (rng() < spec.shotHit) hit(state, u, foe.unit, spec.shotDmg * mult, 'shot');
        else state.fx.push({ type: 'miss', x1: u.x, y1: u.y, x2: foe.unit.x, y2: foe.unit.y, ttl: FX_TTL });
        u.cd = spec.shotCooldown;
      }
    }
    // Your musketeers push forward until the target is comfortably in range; the defenders stand.
    if (u.side === 'a' && foe.d > spec.range * 0.7) advance(spec.speed);
    return;
  }

  // Swordsmen and the captain.
  if (u.side === 'a') {
    advance(spec.speed);
  } else {
    if (foe.d <= (u.kind === 'captain' ? 50 : AGGRO_RANGE)) u.aggro = true;
    if (u.aggro) advance(spec.speed);
  }
}

function checkResult(state) {
  const a = attackers(state);
  const d = defenders(state);
  const captain = d.some((u) => u.kind === 'captain');
  const poolLeft = state.pool.sword + state.pool.musket;
  let winner = null;
  let reason = '';
  if (!captain || !d.length) { winner = 'a'; reason = captain ? 'The deck is cleared.' : 'The captain has fallen!'; }
  else if (!a.length && !poolLeft) { winner = 'd'; reason = 'Every boarder has fallen.'; }
  else if (state.time >= TIME_LIMIT) { winner = 'd'; reason = 'Time ran out — the boarders are driven off.'; }
  if (!winner) return;
  state.result = {
    winner,
    reason,
    // Troops still aboard their own ship when the fight ends come home.
    attackerSurvivors: Math.min(state.attackerCrew, a.length + poolLeft),
    defenderSurvivors: Math.min(state.defenderCrew, d.length),
  };
}

export function step(state, dt, rng = Math.random, { auto = false } = {}) {
  if (state.result || !state.started) return;
  state.time += dt;
  state.energy = Math.min(MAX_ENERGY, state.energy + ENERGY_REGEN * dt);
  state.rally = Math.max(0, state.rally - dt);
  state.fx = state.fx.filter((f) => (f.ttl -= dt) > 0);

  if (auto) autoPlay(state, dt, rng);

  for (const u of state.units) if (u.hp > 0) actUnit(state, u, dt, rng);

  for (const g of state.grenades) {
    g.t -= dt;
    if (g.t > 0) continue;
    g.boom = true;
    state.fx.push({ type: 'boom', x1: g.x, y1: g.y, x2: g.x, y2: g.y, ttl: 0.45 });
    for (const u of state.units) if (Math.hypot(u.x - g.x, u.y - g.y) <= GRENADE_RADIUS) u.hp -= GRENADE_DAMAGE;
  }
  state.grenades = state.grenades.filter((g) => !g.boom);

  state.units = state.units.filter((u) => u.hp > 0);
  checkResult(state);
}

// ── Computer play: drops troops and spends abilities for an attacker nobody is steering ──

function autoPlay(state, dt, rng) {
  state.autoTimer -= dt;
  if (state.autoTimer <= 0 && state.pool.sword + state.pool.musket > 0) {
    state.autoTimer = 1.1;
    const swordsFirst = state.pool.sword > 0 && (state.deployed.sword <= state.deployed.musket * 1.5 || state.pool.musket === 0);
    deploy(state, swordsFirst ? 'sword' : 'musket', 20 + rng() * 160);
  }
  const mine = attackers(state);
  if (!mine.length) return;
  const engaged = mine.filter((u) => { const t = nearest(state, u, 'd'); return t && t.d < 40; }).length;
  if (state.rally <= 0 && engaged >= 4) castRally(state);
  const shooters = mine.filter((u) => u.kind === 'musket' && (nearest(state, u, 'd')?.d ?? Infinity) <= STATS.musket.range).length;
  if (shooters >= 3) castVolley(state, rng);
  if (state.energy >= ABILITY_COST.grenade) {
    let best = null;
    let bestN = 2;
    for (const d of defenders(state)) {
      const n = state.units.filter((u) => u.side === 'd' && Math.hypot(u.x - d.x, u.y - d.y) <= GRENADE_RADIUS).length;
      const friends = state.units.filter((u) => u.side === 'a' && Math.hypot(u.x - d.x, u.y - d.y) <= GRENADE_RADIUS).length;
      if (n - friends > bestN) { best = d; bestN = n - friends; }
    }
    if (best) castGrenade(state, best.x, best.y);
  }
}

// Fight a battle to the end with the computer driving the attacker. Used for
// the Auto-battle button and for fights the computer starts.
export function simulate(state, rng = Math.random) {
  for (let i = 0; i < (TIME_LIMIT + 10) / 0.1 && !state.result; i++) {
    if (!state.started) deploy(state, state.pool.sword > 0 ? 'sword' : 'musket', 100);
    step(state, 0.1, rng, { auto: true });
  }
  return state.result;
}

// Rough chance the attacker wins, from simulated fights: it turns on the crew
// ratio, is a coin-flip a little under even, and swings hard either side.
export function estimateOdds(attackerCrew, defenderCrew) {
  const r = attackerCrew / Math.max(1, defenderCrew);
  return clamp(1 / (1 + Math.exp(-(r - 0.93) / 0.08)), 0.01, 0.99);
}
