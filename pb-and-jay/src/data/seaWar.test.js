import { describe, it, expect } from 'vitest';
import {
  SCENARIOS, SPECS, WORLD, COMPASS, CONTACT_RANGE, BOARD_RANGE,
  alive, battleShips, bestHeading, createScenario, disengage, dist, fire, getShip,
  normalizeAngle, orderBoard, orderBoarding, orderCourse, orderMove, setAim, step, windFactor,
} from './seaWar';

const always = () => 0; // every shot / blow lands
const never = () => 0.999; // every shot / blow misses

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function firstOf(state, side, kind) {
  return state.ships.find((s) => s.side === side && (!kind || s.kind === kind));
}

// Put one ship per side in a bare battle, `gap` apart, both facing along +x.
function duel(gap = 80, kind = 'frigate') {
  const s = createScenario('pirates', { hostile: false });
  const p = firstOf(s, 'player', kind);
  const e = firstOf(s, 'enemy', kind);
  s.ships = s.ships.filter((x) => x === p || x === e || x.kind === 'flagship');
  const pf = firstOf(s, 'player', 'flagship');
  const ef = firstOf(s, 'enemy', 'flagship');
  pf.x = 20; pf.y = 20; ef.x = 780; ef.y = 480;
  p.x = 300; p.y = 250; p.heading = 0;
  e.x = 300 + gap / 3; e.y = 250 + gap / 3; e.heading = Math.PI;
  p.cool = e.cool = 0;
  return { s, p, e };
}

describe('wind', () => {
  it('sails fastest on a beam reach, slower running, slowest into the wind', () => {
    const wind = 0; // blowing toward +x
    const running = windFactor(0, wind);
    const beam = windFactor(Math.PI / 2, wind);
    const into = windFactor(Math.PI, wind);
    expect(beam).toBeGreaterThan(running);
    expect(running).toBeGreaterThan(windFactor(Math.PI * 0.8, wind));
    expect(into).toBeLessThan(0.2);
  });

  it('bestHeading keeps a heading that is not into the wind', () => {
    expect(bestHeading(0, 0)).toBe(0);
    expect(bestHeading(Math.PI / 2, 0)).toBe(Math.PI / 2);
  });

  it('bestHeading turns an upwind course into a close-hauled tack', () => {
    const h = bestHeading(Math.PI, 0); // straight into the wind
    expect(Math.abs(normalizeAngle(h - Math.PI))).toBeGreaterThan(0.5);
    expect(windFactor(h, 0)).toBeGreaterThan(0.35);
  });
});

describe('createScenario', () => {
  it.each(Object.keys(SCENARIOS))('%s: one flagship a side, ships and ports in open water', (id) => {
    const s = createScenario(id);
    for (const side of ['player', 'enemy']) {
      expect(alive(s, side)).toHaveLength(SCENARIOS[id].fleets[side].length);
      expect(alive(s, side).filter((x) => x.kind === 'flagship')).toHaveLength(1);
    }
    for (const sh of s.ships) {
      expect(sh.x).toBeGreaterThan(0);
      expect(sh.x).toBeLessThan(WORLD.w);
      expect(sh.y).toBeGreaterThan(0);
      expect(sh.y).toBeLessThan(WORLD.h);
      for (const isl of s.islands) expect(Math.hypot(sh.x - isl.x, sh.y - isl.y)).toBeGreaterThan(isl.r + 4);
    }
    for (const port of s.ports) {
      for (const isl of s.islands) expect(Math.hypot(port.x - isl.x, port.y - isl.y)).toBeGreaterThan(isl.r);
    }
  });

  it('applies wind and hostile-water options', () => {
    const s = createScenario('pirates', { windFrom: 'E', windStrength: 'strong', hostile: false });
    expect(s.wind.dir).toBeCloseTo(normalizeAngle(COMPASS.E + Math.PI));
    expect(s.wind.strength).toBeGreaterThan(1);
    expect(s.hostile).toBe(false);
  });
});

describe('map sailing', () => {
  it('sails to a destination and stops there', () => {
    const s = createScenario('pirates', { windFrom: 'N', hostile: false });
    const p = firstOf(s, 'player', 'frigate');
    s.ships.filter((x) => x.side === 'enemy').forEach((x) => { x.x = 750; x.y = 480; x.cool = 999; });
    const y0 = p.y;
    orderMove(s, p.id, { x: p.x, y: y0 + 60 });
    for (let i = 0; i < 600 && p.dest; i++) step(s, 0.1, always);
    expect(p.dest).toBeNull();
    expect(Math.abs(p.y - (y0 + 60))).toBeLessThan(10);
  });

  it('beats upwind by tacking to reach a destination dead into the wind', () => {
    const s = createScenario('straits', { windFrom: 'E', windStrength: 'moderate', hostile: false });
    s.islands = [];
    const p = firstOf(s, 'player', 'frigate');
    s.ships.filter((x) => x.side === 'enemy').forEach((x) => { x.x = 750; x.y = 480; x.cool = 999; });
    p.x = 100; p.y = 250; p.heading = 0;
    orderMove(s, p.id, { x: 500, y: 250 });
    for (let i = 0; i < 5000 && p.dest; i++) step(s, 0.1, always);
    expect(p.dest).toBeNull();
    expect(dist(p, { x: 500, y: 250 })).toBeLessThan(15);
  });

  it('never carries a ship into an island', () => {
    const s = createScenario('straits', { hostile: false });
    const isl = s.islands[0];
    const p = firstOf(s, 'player', 'frigate');
    s.ships.filter((x) => x.side === 'enemy').forEach((x) => { x.x = 750; x.y = 480; x.cool = 999; });
    p.x = isl.x - isl.r - 25; p.y = isl.y; p.heading = 0;
    orderMove(s, p.id, { x: isl.x + isl.r + 25, y: isl.y });
    for (let i = 0; i < 400; i++) {
      step(s, 0.1, always);
      expect(Math.hypot(p.x - isl.x, p.y - isl.y)).toBeGreaterThanOrEqual(isl.r);
    }
  });

  it('shoals hurt in hostile waters but not otherwise', () => {
    for (const hostile of [true, false]) {
      const s = createScenario('pirates', { hostile });
      const p = firstOf(s, 'player', 'frigate');
      s.ships.filter((x) => x.side === 'enemy').forEach((x) => { x.x = 750; x.y = 480; x.cool = 999; });
      p.x = s.shoals[0].x; p.y = s.shoals[0].y;
      for (let i = 0; i < 100; i++) step(s, 0.1, always);
      if (hostile) expect(p.hull).toBeLessThan(p.maxHull);
      else expect(p.hull).toBe(p.maxHull);
    }
  });

  it('a port repairs a damaged friendly ship', () => {
    const s = createScenario('pirates', { hostile: false });
    const p = firstOf(s, 'player', 'frigate');
    s.ships.filter((x) => x.side === 'enemy').forEach((x) => { x.x = 750; x.y = 480; x.cool = 999; });
    const port = s.ports.find((x) => x.side === 'player');
    p.x = port.x + 10; p.y = port.y; p.hull = 20; p.sail = 10;
    for (let i = 0; i < 50; i++) step(s, 0.1, always);
    expect(p.hull).toBeGreaterThan(20);
    expect(p.sail).toBeGreaterThan(10);
  });
});

describe('contact', () => {
  it('opposing ships meeting on the map starts a battle with only nearby ships', () => {
    const s = createScenario('pirates', { hostile: false });
    const p = firstOf(s, 'player', 'frigate');
    const e = firstOf(s, 'enemy', 'frigate');
    p.x = 400; p.y = 100; e.x = 400 + CONTACT_RANGE - 10; e.y = 100;
    step(s, 0.1, always);
    expect(s.mode).toBe('battle');
    expect(battleShips(s).map((x) => x.id)).toContain(p.id);
    expect(battleShips(s).map((x) => x.id)).toContain(e.id);
    expect(battleShips(s).every((x) => dist(x, { x: 400, y: 100 }) < 200)).toBe(true);
  });

  it('disengaging returns to the map with a cooldown so the fleets do not instantly re-clash', () => {
    const s = createScenario('pirates', { hostile: false });
    const p = firstOf(s, 'player', 'frigate');
    const e = firstOf(s, 'enemy', 'frigate');
    p.x = 400; p.y = 100; e.x = 420; e.y = 100;
    step(s, 0.1, always);
    expect(disengage(s)).toBe(true);
    expect(s.mode).toBe('map');
    expect(p.b).toBeNull();
    expect(p.cool).toBeGreaterThan(0);
    step(s, 0.1, always);
    expect(s.mode).toBe('map');
  });
});

describe('gunnery', () => {
  it('hits a target on the beam, damaging the hull', () => {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [0, 0], order: null };
    e.b = { x: 300, y: 300, heading: Math.PI, speed: 0, reload: [0, 0], order: null }; // starboard of p (y down)
    expect(fire(s, p, 'starboard', always)).toBe(true);
    expect(e.hull).toBeLessThan(e.maxHull);
  });

  it('does not fire to the side with nothing in arc, or while reloading', () => {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [0, 0], order: null };
    e.b = { x: 300, y: 300, heading: Math.PI, speed: 0, reload: [0, 0], order: null };
    expect(fire(s, p, 'port', always)).toBe(false);
    expect(fire(s, p, 'starboard', always)).toBe(true);
    expect(fire(s, p, 'starboard', always)).toBe(false);
    expect(p.b.reload[1]).toBeCloseTo(SPECS.frigate.reload);
  });

  it('rigging fire hurts the sails instead of the hull', () => {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [0, 0], order: null };
    e.b = { x: 300, y: 300, heading: Math.PI, speed: 0, reload: [0, 0], order: null };
    setAim(s, p.id, 'rigging');
    fire(s, p, 'starboard', always);
    expect(e.sail).toBeLessThan(e.maxSail);
    expect(e.hull).toBe(e.maxHull);
  });

  it('misses leave the target untouched', () => {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [0, 0], order: null };
    e.b = { x: 300, y: 300, heading: Math.PI, speed: 0, reload: [0, 0], order: null };
    fire(s, p, 'starboard', never);
    expect(e.hull).toBe(e.maxHull);
  });

  it('a ship reduced to no hull sinks', () => {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [0, 0], order: null };
    e.b = { x: 300, y: 300, heading: Math.PI, speed: 0, reload: [0, 0], order: null };
    e.hull = 1;
    fire(s, p, 'starboard', always);
    expect(e.sunk).toBe(true);
    expect(e.b).toBeNull();
  });
});

describe('victory', () => {
  it('sinking the enemy flagship wins the game', () => {
    const s = createScenario('pirates');
    firstOf(s, 'enemy', 'flagship').sunk = true;
    step(s, 0.1, always);
    expect(s.winner).toBe('player');
    expect(s.mode).toBe('over');
  });

  it('losing your flagship loses the game', () => {
    const s = createScenario('pirates');
    firstOf(s, 'player', 'flagship').sunk = true;
    step(s, 0.1, always);
    expect(s.winner).toBe('enemy');
  });
});

describe('boarding', () => {
  function boardingFight(rngFor) {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [9, 9], order: null };
    e.b = { x: 300 + BOARD_RANGE - 4, y: 250, heading: Math.PI, speed: 0, reload: [9, 9], order: null };
    p.auto = false; e.auto = false;
    expect(orderBoard(s, p.id, e.id)).toBe(true);
    step(s, 0.1, rngFor);
    expect(s.mode).toBe('board');
    for (let i = 0; i < 2000 && s.mode === 'board'; i++) step(s, 0.1, rngFor);
    return { s, p, e };
  }

  it('an ordered boarding within range starts a fight on deck', () => {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [9, 9], order: null };
    e.b = { x: 305, y: 250, heading: Math.PI, speed: 0, reload: [9, 9], order: null };
    p.auto = false; e.auto = false;
    orderBoard(s, p.id, e.id);
    step(s, 0.1, always);
    expect(s.mode).toBe('board');
    expect(s.boarding.units.some((u) => u.kind === 'sword')).toBe(true);
    expect(s.boarding.units.some((u) => u.kind === 'musket')).toBe(true);
  });

  it('the winner captures the other ship', () => {
    const { s, p, e } = boardingFight(always);
    expect(s.mode).not.toBe('board');
    const sides = new Set([p.side, e.side]);
    expect(sides.size).toBe(1); // one side now owns both hulls, or both crews died (then they differ)
  });

  it('a heavily outnumbered boarding party loses the ship', () => {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.crew = 2;
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [9, 9], order: null };
    e.b = { x: 305, y: 250, heading: Math.PI, speed: 0, reload: [9, 9], order: null };
    p.auto = false; e.auto = false;
    orderBoard(s, p.id, e.id);
    step(s, 0.1, always);
    orderBoarding(s, 'charge');
    for (let i = 0; i < 2000 && s.mode === 'board'; i++) step(s, 0.1, seeded(7));
    expect(e.side).toBe('enemy');
    expect(getShip(s, p.id).side).toBe('enemy');
  });

  it('holding fire lets your side wait on deck instead of advancing', () => {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [9, 9], order: null };
    e.b = { x: 305, y: 250, heading: Math.PI, speed: 0, reload: [9, 9], order: null };
    p.auto = false; e.auto = false;
    orderBoard(s, p.id, e.id);
    step(s, 0.1, always);
    orderBoarding(s, 'hold');
    const sword = s.boarding.units.find((u) => u.side === s.boarding.playerSide && u.kind === 'sword');
    const x0 = sword.x;
    step(s, 0.1, never);
    expect(sword.x).toBe(x0);
  });
});

describe('orders', () => {
  it('a course order switches a ship off auto-pilot', () => {
    const { s, p, e } = duel();
    s.mode = 'battle';
    s.battle = { ids: [p.id, e.id], center: { x: 400, y: 250 }, time: 0 };
    p.b = { x: 300, y: 250, heading: 0, speed: 0, reload: [0, 0], order: null };
    e.b = { x: 500, y: 250, heading: Math.PI, speed: 0, reload: [0, 0], order: null };
    expect(p.auto).toBe(true);
    expect(orderCourse(s, p.id, 1)).toBe(true);
    expect(p.auto).toBe(false);
    expect(p.b.order.heading).toBeCloseTo(1);
  });

  it('refuses to board a friendly ship or order a course outside battle', () => {
    const s = createScenario('pirates');
    const [a, b] = alive(s, 'player');
    expect(orderCourse(s, a.id, 1)).toBe(false);
    expect(orderBoard(s, a.id, b.id)).toBe(false);
  });
});

describe('full battles', () => {
  it.each(Object.keys(SCENARIOS))('%s: with no orders the battle still resolves, without NaNs or hangs', (id) => {
    const s = createScenario(id);
    const rng = seeded(42);
    for (let i = 0; i < 20000 && !s.winner; i++) step(s, 0.1, rng);
    for (const sh of s.ships) {
      expect(Number.isFinite(sh.x) && Number.isFinite(sh.y) && Number.isFinite(sh.hull)).toBe(true);
      if (sh.b) expect(Number.isFinite(sh.b.x) && Number.isFinite(sh.b.y)).toBe(true);
    }
    expect(['player', 'enemy']).toContain(s.winner);
    expect(s.mode).toBe('over');
  });

  it('player auto-pilot fleets fight and resolve a winner', () => {
    const results = [];
    for (let seed = 1; seed <= 4; seed++) {
      const s = createScenario('pirates');
      const rng = seeded(seed);
      // Send the player's escorts at the enemy.
      for (const sh of alive(s, 'player')) if (sh.kind !== 'flagship') orderMove(s, sh.id, { x: 600, y: 250 });
      for (let i = 0; i < 20000 && !s.winner; i++) {
        step(s, 0.1, rng);
        if (s.mode === 'map') {
          for (const sh of alive(s, 'player')) if (sh.kind !== 'flagship' && !sh.dest) orderMove(s, sh.id, { x: 700, y: 250 });
        }
      }
      results.push(s.winner);
    }
    expect(results.every((r) => r === 'player' || r === 'enemy')).toBe(true);
  });
});
