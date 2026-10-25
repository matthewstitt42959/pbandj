import { describe, it, expect } from 'vitest';
import { SCENARIOS, SPECS, SUB_DETECT_RANGE, WORLD, alive, createScenario, isVisibleTo, step, } from './seaWar';
const always = () => 0; // every shot hits
describe('createScenario', () => {
  it.each(Object.keys(SCENARIOS))('%s fields equal fleets on both sides', (id) => {
    const s = createScenario(id);
    expect(alive(s, 'player')).toHaveLength(SCENARIOS[id].fleet.length);
    expect(alive(s, 'enemy')).toHaveLength(SCENARIOS[id].fleet.length);
    for (const ship of s.ships) {
      expect(ship.x).toBeGreaterThan(0);
      expect(ship.x).toBeLessThan(WORLD.w);
      expect(ship.y).toBeGreaterThan(0);
      expect(ship.y).toBeLessThan(WORLD.h);
      for (const isl of s.islands)
        expect(Math.hypot(ship.x - isl.x, ship.y - isl.y)).toBeGreaterThan(isl.r);
    }
  });
});
describe('movement', () => {
  it('moves a ship toward its waypoint and clears it on arrival', () => {
    const s = createScenario('skirmish');
    const ship = s.ships.find((x) => x.side === 'player');
    const startX = ship.x;
    ship.waypoints = [{ x: ship.x + 30, y: ship.y }];
    for (let i = 0; i < 100; i++)
      step(s, 0.1, always);
    expect(ship.x).toBeGreaterThan(startX);
    expect(ship.waypoints).toHaveLength(0);
  });
  it('never moves a ship into an island', () => {
    const s = createScenario('strait');
    const isl = s.islands[0];
    const ship = s.ships.find((x) => x.side === 'player');
    ship.x = isl.x - isl.r - 20;
    ship.y = isl.y;
    ship.heading = 0;
    ship.waypoints = [{ x: isl.x + isl.r + 20, y: isl.y }];
    for (let i = 0; i < 300; i++) {
      step(s, 0.1, always);
      expect(Math.hypot(ship.x - isl.x, ship.y - isl.y)).toBeGreaterThanOrEqual(isl.r);
    }
  });
});
describe('combat', () => {
  it('sinks a ship at zero hp and logs it', () => {
    const s = createScenario('skirmish');
    const p = s.ships.find((x) => x.side === 'player');
    const e = s.ships.find((x) => x.side === 'enemy');
    s.ships = [p, e];
    p.x = 100;
    p.y = 100;
    e.x = 150;
    e.y = 100;
    p.cooldown = 0;
    e.hp = 1;
    step(s, 0.1, always);
    expect(e.sunk).toBe(true);
    expect(s.winner).toBe('player');
  });
  it('does not fire beyond weapon range', () => {
    const s = createScenario('skirmish');
    const p = s.ships.find((x) => x.side === 'player');
    const e = s.ships.find((x) => x.side === 'enemy');
    s.ships = [p, e];
    p.x = 50;
    p.y = 100;
    e.x = 50 + SPECS[p.kind].range + 100;
    e.y = 100;
    p.cooldown = 0;
    e.cooldown = 99;
    step(s, 0.1, always);
    expect(e.hp).toBe(e.maxHp);
  });
  it('declares an enemy win when the player fleet is gone', () => {
    const s = createScenario('skirmish');
    for (const sh of s.ships)
      if (sh.side === 'player')
        sh.sunk = true;
    step(s, 0.1, always);
    expect(s.winner).toBe('enemy');
  });
});
describe('submarine visibility', () => {
  it('is hidden until an enemy ship is within detection range', () => {
    const s = createScenario('strait');
    const sub = s.ships.find((x) => x.side === 'enemy' && x.kind === 'submarine');
    const watcher = s.ships.find((x) => x.side === 'player');
    sub.x = 400;
    sub.y = 250;
    watcher.x = 400 - SUB_DETECT_RANGE - 30;
    watcher.y = 250;
    s.ships.filter((x) => x.side === 'player' && x !== watcher).forEach((x) => { x.x = 10; x.y = 10; });
    expect(isVisibleTo(s, sub, 'player')).toBe(false);
    watcher.x = 400 - SUB_DETECT_RANGE + 10;
    expect(isVisibleTo(s, sub, 'player')).toBe(true);
  });
  it('is always visible to its own side', () => {
    const s = createScenario('strait');
    const sub = s.ships.find((x) => x.side === 'player' && x.kind === 'submarine');
    expect(isVisibleTo(s, sub, 'player')).toBe(true);
  });
});
