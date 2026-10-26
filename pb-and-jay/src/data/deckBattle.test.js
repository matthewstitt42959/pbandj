import { describe, it, expect } from 'vitest';
import {
  ABILITY_COST, DECK, GRENADE_RADIUS, SQUAD_SIZE, STATS, TIME_LIMIT,
  attackers, createBattle, defenders, deploy, estimateOdds, setSwordShare, simulate, step,
  castGrenade, castRally, castVolley,
} from './deckBattle';

const always = () => 0; // every blow lands
const never = () => 0.999;

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('setup', () => {
  it('stations the defending crew plus a captain at the stern', () => {
    const b = createBattle({ attackerCrew: 10, defenderCrew: 12 });
    expect(defenders(b)).toHaveLength(13);
    const captain = defenders(b).find((u) => u.kind === 'captain');
    expect(captain.x).toBeGreaterThan(DECK.w * 0.8);
    expect(defenders(b).every((u) => u.x > 200 && u.y > 0 && u.y < DECK.h)).toBe(true);
  });

  it('holds the whole attacking crew in reserve, split into swordsmen and musketeers', () => {
    const b = createBattle({ attackerCrew: 10, defenderCrew: 6 });
    expect(b.pool.sword + b.pool.musket).toBe(10);
    expect(attackers(b)).toHaveLength(0);
  });

  it('lets you change the split only before the first drop', () => {
    const b = createBattle({ attackerCrew: 10, defenderCrew: 6 });
    expect(setSwordShare(b, 1)).toBe(true);
    expect(b.pool).toEqual({ sword: 10, musket: 0 });
    deploy(b, 'sword', 100);
    expect(setSwordShare(b, 0)).toBe(false);
    expect(b.pool.sword).toBe(7);
  });
});

describe('deploying', () => {
  it('lands a squad along the rail, uses up reserves, and starts the clock', () => {
    const b = createBattle({ attackerCrew: 9, defenderCrew: 6 });
    expect(b.started).toBe(false);
    const before = b.pool.sword;
    expect(deploy(b, 'sword', 100)).toBe(true);
    expect(b.started).toBe(true);
    expect(attackers(b)).toHaveLength(SQUAD_SIZE);
    expect(b.pool.sword).toBe(before - SQUAD_SIZE);
    expect(attackers(b).every((u) => u.x < DECK.zoneX)).toBe(true);
  });

  it('cannot deploy a kind that has run out', () => {
    const b = createBattle({ attackerCrew: 3, defenderCrew: 6 });
    setSwordShare(b, 1);
    expect(deploy(b, 'musket', 100)).toBe(false);
    expect(deploy(b, 'sword', 100)).toBe(true);
    expect(deploy(b, 'sword', 100)).toBe(false);
  });

  it('does nothing until the first troops land', () => {
    const b = createBattle({ attackerCrew: 9, defenderCrew: 6 });
    step(b, 1, always);
    expect(b.time).toBe(0);
  });
});

describe('the fight', () => {
  it('your swordsmen advance on the enemy on their own', () => {
    const b = createBattle({ attackerCrew: 9, defenderCrew: 6 });
    deploy(b, 'sword', 100);
    const x0 = attackers(b)[0].x;
    step(b, 1, never);
    expect(attackers(b)[0].x).toBeGreaterThan(x0 + 10);
  });

  it('killing the captain wins for the attacker, and unlanded troops come home', () => {
    const b = createBattle({ attackerCrew: 12, defenderCrew: 6 });
    deploy(b, 'sword', 100);
    const captain = defenders(b).find((u) => u.kind === 'captain');
    captain.hp = 0;
    step(b, 0.1, never);
    expect(b.result.winner).toBe('a');
    expect(b.result.attackerSurvivors).toBe(12); // nobody died; the reserve counts
  });

  it('clearing every defender also wins', () => {
    const b = createBattle({ attackerCrew: 6, defenderCrew: 2 });
    deploy(b, 'sword', 100);
    b.units = b.units.filter((u) => u.side === 'a');
    step(b, 0.1, never);
    expect(b.result.winner).toBe('a');
  });

  it('losing every boarder with nothing in reserve loses', () => {
    const b = createBattle({ attackerCrew: 3, defenderCrew: 8 });
    setSwordShare(b, 1);
    deploy(b, 'sword', 100);
    for (const u of attackers(b)) u.hp = 0;
    step(b, 0.1, never);
    expect(b.result).toMatchObject({ winner: 'd', attackerSurvivors: 0 });
  });

  it('does not lose while you still have troops in reserve', () => {
    const b = createBattle({ attackerCrew: 9, defenderCrew: 8 });
    deploy(b, 'sword', 100);
    for (const u of attackers(b)) u.hp = 0;
    step(b, 0.1, never);
    expect(b.result).toBeNull();
  });

  it('running out of time loses for the attacker', () => {
    const b = createBattle({ attackerCrew: 9, defenderCrew: 8 });
    deploy(b, 'sword', 100);
    b.time = TIME_LIMIT - 0.05;
    step(b, 0.1, never);
    expect(b.result).toMatchObject({ winner: 'd' });
  });

  it('defenders hold their ground until you get close', () => {
    const b = createBattle({ attackerCrew: 9, defenderCrew: 8 });
    deploy(b, 'sword', 100);
    const before = defenders(b).map((u) => u.x);
    step(b, 0.5, never);
    expect(defenders(b).map((u) => u.x)).toEqual(before);
  });

  it('survivors never exceed the crews that went in', () => {
    const b = createBattle({ attackerCrew: 10, defenderCrew: 6 });
    const r = simulate(b, seeded(3));
    expect(r.attackerSurvivors).toBeLessThanOrEqual(10);
    expect(r.defenderSurvivors).toBeLessThanOrEqual(6);
  });
});

describe('abilities', () => {
  function fresh() {
    const b = createBattle({ attackerCrew: 12, defenderCrew: 8 });
    deploy(b, 'musket', 100);
    return b;
  }

  it('cannot be used before the battle starts', () => {
    const b = createBattle({ attackerCrew: 12, defenderCrew: 8 });
    b.energy = 100;
    expect(castRally(b)).toBe(false);
  });

  it('cost energy, and are refused when it is short', () => {
    const b = fresh();
    b.energy = ABILITY_COST.rally - 1;
    expect(castRally(b)).toBe(false);
    b.energy = ABILITY_COST.rally;
    expect(castRally(b)).toBe(true);
    expect(b.energy).toBe(0);
    expect(b.rally).toBeGreaterThan(0);
  });

  it('energy recharges while the fight runs', () => {
    const b = fresh();
    b.energy = 0;
    step(b, 2, never);
    expect(b.energy).toBeGreaterThan(5);
  });

  it('Rally makes your troops move faster', () => {
    const slow = fresh();
    const quick = fresh();
    quick.energy = 100;
    castRally(quick);
    step(slow, 0.5, never);
    step(quick, 0.5, never);
    expect(attackers(quick)[0].x).toBeGreaterThan(attackers(slow)[0].x);
  });

  it('Volley fires every musketeer that has a target in range at once', () => {
    const b = createBattle({ attackerCrew: 12, defenderCrew: 8 });
    deploy(b, 'musket', 100);
    for (const u of attackers(b)) u.x = 250 - STATS.musket.range + 10; // in range of the defenders
    b.energy = 100;
    const hp = defenders(b).reduce((s, u) => s + u.hp, 0);
    expect(castVolley(b, always)).toBe(true);
    expect(defenders(b).reduce((s, u) => s + u.hp, 0)).toBeLessThan(hp);
  });

  it('Grenade blasts everything near the target a moment after it is thrown', () => {
    const b = fresh();
    b.energy = 100;
    const target = defenders(b).find((u) => u.kind === 'sword');
    const near = defenders(b).filter((u) => Math.hypot(u.x - target.x, u.y - target.y) <= GRENADE_RADIUS);
    const before = near.map((u) => u.hp);
    expect(castGrenade(b, target.x, target.y)).toBe(true);
    expect(near.map((u) => u.hp)).toEqual(before); // not instant
    step(b, 0.6, never);
    expect(near.some((u, i) => u.hp < before[i])).toBe(true);
  });
});

describe('who wins', () => {
  const winRate = (a, d, n = 40) => {
    let w = 0;
    for (let s = 1; s <= n; s++) {
      if (simulate(createBattle({ attackerCrew: a, defenderCrew: d }), seeded(s * 17 + a * 3 + d)).winner === 'a') w++;
    }
    return w / n;
  };

  it('a much bigger crew nearly always wins', () => {
    expect(winRate(22, 10)).toBeGreaterThan(0.9);
    expect(winRate(16, 6)).toBeGreaterThan(0.9);
  });

  it('a much smaller crew nearly always loses', () => {
    expect(winRate(6, 16)).toBeLessThan(0.1);
    expect(winRate(10, 22)).toBeLessThan(0.1);
  });

  it('close fights are genuinely uncertain', () => {
    const r = winRate(14, 16);
    expect(r).toBeGreaterThan(0.1);
    expect(r).toBeLessThan(0.9);
  });

  it('every fight ends within the time limit', () => {
    for (const [a, d] of [[6, 6], [22, 22], [10, 22]]) {
      const b = createBattle({ attackerCrew: a, defenderCrew: d });
      simulate(b, seeded(9));
      expect(b.result).not.toBeNull();
      expect(b.time).toBeLessThanOrEqual(TIME_LIMIT + 0.2);
    }
  });
});

describe('estimateOdds', () => {
  it('rises with the attacker\'s crew and stays inside 1%–99%', () => {
    expect(estimateOdds(6, 22)).toBeLessThan(estimateOdds(14, 22));
    expect(estimateOdds(14, 22)).toBeLessThan(estimateOdds(22, 22));
    expect(estimateOdds(22, 22)).toBeLessThan(estimateOdds(22, 6));
    expect(estimateOdds(1, 100)).toBeGreaterThanOrEqual(0.01);
    expect(estimateOdds(100, 1)).toBeLessThanOrEqual(0.99);
  });
});
