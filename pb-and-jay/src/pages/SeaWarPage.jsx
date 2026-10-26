import { useCallback, useEffect, useRef, useState } from 'react';
import ArcadeMenu from '../components/ArcadeMenu';
import './SeaWarPage.css';
import {
  COMPASS, SCENARIOS, SPECS, UNIT, WIND_STRENGTHS, WORLD,
  alive, battleShips, clearCourse, createScenario, disengage, dist, fire, getShip,
  nearestEnemy, orderBoard, orderBoarding, orderCourse, orderMove, setAim, setAuto,
  setSails, step, windFromLabel,
} from '../data/seaWar';

const PLAYER = '#fbbf24';
const ENEMY = '#f87171';
const FIXED_DT = 0.1;
const SPEEDS = [1, 2, 4, 8];
const CLOSE_ZOOM = 2.2;
const MODE_LABEL = { map: 'Strategic Map', battle: 'Battle', board: 'Boarding Action', over: 'Battle Over' };

// ── Drawing ───────────────────────────────────────────────────────────────────

function drawSea(ctx, g) {
  ctx.fillStyle = '#0b2a3d';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  // Faint swell lines drifting the way the wind blows.
  const drift = g.time * 4 * g.wind.strength;
  const dx = Math.cos(g.wind.dir) * drift;
  const dy = Math.sin(g.wind.dir) * drift;
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  const mod = (v, m) => ((v % m) + m) % m;
  ctx.beginPath();
  for (let row = 0; row <= WORLD.h / 36 + 2; row++) {
    for (let col = 0; col <= WORLD.w / 56 + 2; col++) {
      const x = mod(col * 56 + (row % 2 ? 28 : 0) + dx, WORLD.w + 112) - 56;
      const y = mod(row * 36 + dy, WORLD.h + 72) - 36;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 9, y);
    }
  }
  ctx.stroke();
}

function drawTerrain(ctx, g, showPorts) {
  if (g.hostile) {
    for (const sh of g.shoals) {
      ctx.fillStyle = 'rgba(196,170,104,0.22)';
      ctx.strokeStyle = 'rgba(196,170,104,0.7)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  for (const isl of g.islands) {
    ctx.fillStyle = '#3f5b3a';
    ctx.strokeStyle = '#c8b27a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(isl.x, isl.y, isl.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (!showPorts) return;
  for (const port of g.ports) {
    const c = port.side === 'player' ? PLAYER : ENEMY;
    ctx.fillStyle = '#3f5b3a';
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(port.x, port.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c;
    ctx.fillRect(port.x - 1, port.y - 12, 2, 12);
    ctx.beginPath(); ctx.moveTo(port.x + 1, port.y - 12); ctx.lineTo(port.x + 9, port.y - 9); ctx.lineTo(port.x + 1, port.y - 6); ctx.fill();
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(port.name, port.x, port.y + 24);
  }
}

function drawShip(ctx, ship, pos, { scale = 1, selected = false }) {
  const spec = SPECS[ship.kind];
  const L = spec.length;
  const B = spec.beam;
  const color = ship.side === 'player' ? PLAYER : ENEMY;
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(pos.heading);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#6b4a2b';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(L / 2, 0);
  ctx.quadraticCurveTo(L / 4, B * 0.62, -L / 2, B * 0.5);
  ctx.lineTo(-L / 2, -B * 0.5);
  ctx.quadraticCurveTo(L / 4, -B * 0.62, L / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const masts = ship.kind === 'frigate' ? [0.2, -0.22] : [0.26, -0.02, -0.28];
  const health = ship.sail / ship.maxSail;
  const yard = B * 1.7 * (0.25 + 0.75 * ship.sails);
  ctx.fillStyle = `rgba(245,240,225,${0.2 + 0.75 * health})`;
  for (const m of masts) ctx.fillRect(m * L - 1.2, -yard / 2, 2.4, yard);

  if (ship.kind === 'flagship') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2 - 7, -2.5); ctx.lineTo(-L / 2 - 7, 2.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  if (selected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, L * 0.8 * scale, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawBars(ctx, ship, pos, scale = 1) {
  const w = 22 * scale;
  const y = pos.y - 17 * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(pos.x - w / 2, y, w, 3);
  ctx.fillStyle = ship.hull / ship.maxHull > 0.4 ? '#4ade80' : '#ef4444';
  ctx.fillRect(pos.x - w / 2, y, w * (ship.hull / ship.maxHull), 3);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(pos.x - w / 2, y + 4, w, 2);
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(pos.x - w / 2, y + 4, w * (ship.sail / ship.maxSail), 2);
}

function drawCompass(ctx, g) {
  const cx = WORLD.w - 46;
  const cy = 46;
  const r = 26;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy - r - 6);
  // Arrow points the way the wind is blowing.
  const len = r * (0.55 + 0.4 * (g.wind.strength / 1.25));
  const ex = cx + Math.cos(g.wind.dir) * len;
  const ey = cy + Math.sin(g.wind.dir) * len;
  const sx = cx - Math.cos(g.wind.dir) * len;
  const sy = cy - Math.sin(g.wind.dir) * len;
  ctx.strokeStyle = '#7dd3fc';
  ctx.fillStyle = '#7dd3fc';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  const a = g.wind.dir;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - Math.cos(a - 0.5) * 8, ey - Math.sin(a - 0.5) * 8);
  ctx.lineTo(ex - Math.cos(a + 0.5) * 8, ey - Math.sin(a + 0.5) * 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`WIND ${windFromLabel(g.wind.dir)}`, cx, cy + r + 16);
  ctx.restore();
}

function drawShots(ctx, g) {
  for (const shot of g.shots) {
    const f = shot.ttl / 0.8;
    const color = shot.side === 'player' ? PLAYER : ENEMY;
    // Powder smoke puffing off the firing side.
    ctx.fillStyle = `rgba(220,220,220,${0.5 * f})`;
    const ang = Math.atan2(shot.y2 - shot.y1, shot.x2 - shot.x1);
    for (let i = 0; i < 4; i++) {
      const d = 6 + (1 - f) * 14 + i * 4;
      ctx.beginPath();
      ctx.arc(shot.x1 + Math.cos(ang) * d, shot.y1 + Math.sin(ang) * d, 3 + (1 - f) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = shot.hits ? color : 'rgba(255,255,255,0.3)';
    ctx.globalAlpha = f;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(shot.x1, shot.y1); ctx.lineTo(shot.x2, shot.y2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (shot.hits) {
      ctx.fillStyle = shot.aim === 'rigging' ? `rgba(229,231,235,${f})` : `rgba(251,146,60,${f})`;
      ctx.beginPath(); ctx.arc(shot.x2, shot.y2, 3 + shot.hits * 1.2 * (1.2 - f), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * f})`;
      ctx.beginPath(); ctx.arc(shot.x2, shot.y2, 3 + (1 - f) * 8, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

function drawBoarding(ctx, g) {
  const bd = g.boarding;
  ctx.fillStyle = '#0b2a3d';
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  const top = 50;
  ctx.fillStyle = '#7a5a36';
  ctx.fillRect(0, top, WORLD.w, 400);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + 400); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(WORLD.w / 2, top); ctx.lineTo(WORLD.w / 2, top + 400); ctx.stroke();
  ctx.setLineDash([]);

  const A = getShip(g, bd.a);
  const B = getShip(g, bd.b);
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = A.side === 'player' ? PLAYER : ENEMY;
  ctx.fillText(`${A.name} (boarders)`, 12, 32);
  ctx.textAlign = 'right';
  ctx.fillStyle = B.side === 'player' ? PLAYER : ENEMY;
  ctx.fillText(`${B.name} (defenders)`, WORLD.w - 12, 32);

  for (const u of bd.units) {
    const x = u.x * 2;
    const y = top + u.y * 2;
    const owner = u.side === 'a' ? A : B;
    ctx.globalAlpha = 0.4 + 0.6 * (u.hp / UNIT[u.kind].hp);
    ctx.fillStyle = owner.side === 'player' ? PLAYER : ENEMY;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    if (u.kind === 'sword') {
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#e5e7eb';
      ctx.beginPath();
      const dir = u.side === 'a' ? 1 : -1;
      ctx.moveTo(x + dir * 6, y); ctx.lineTo(x + dir * 14, y - 4);
      ctx.stroke();
    } else {
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.strokeRect(x - 5, y - 5, 10, 10);
      ctx.strokeStyle = '#e5e7eb';
      const dir = u.side === 'a' ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dir * 14, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function frameCamera(g, ui, selected) {
  if (g.battle && ui.view === 'close') {
    const focus = selected?.b ?? battleShips(g).find((s) => s.side === 'player')?.b ?? { x: WORLD.w / 2, y: WORLD.h / 2 };
    const hw = WORLD.w / (2 * CLOSE_ZOOM);
    const hh = WORLD.h / (2 * CLOSE_ZOOM);
    return {
      x: Math.min(WORLD.w - hw, Math.max(hw, focus.x)),
      y: Math.min(WORLD.h - hh, Math.max(hh, focus.y)),
      zoom: CLOSE_ZOOM,
    };
  }
  return { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 1 };
}

function render(ctx, g, ui) {
  ctx.clearRect(0, 0, WORLD.w, WORLD.h);
  if (g.mode === 'board') {
    drawBoarding(ctx, g);
    return;
  }
  const selected = g.ships.find((s) => s.id === ui.selectedId && !s.sunk);
  const inBattle = !!g.battle;
  ui.cam = frameCamera(g, ui, selected);
  const cam = ui.cam;

  ctx.save();
  ctx.translate(WORLD.w / 2, WORLD.h / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  drawSea(ctx, g);

  if (inBattle) {
    // Open water: the arena has no land, but show its bounds.
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, WORLD.w - 2, WORLD.h - 2);
    const bs = battleShips(g);
    const scale = cam.zoom > 1 ? 1 : 1.25;
    for (const s of bs) {
      drawShip(ctx, s, s.b, { scale, selected: s.id === ui.selectedId });
    }
    for (const s of bs) if (cam.zoom === 1 || s.id === ui.selectedId) drawBars(ctx, s, s.b, scale);
    drawShots(ctx, g);
  } else {
    drawTerrain(ctx, g, true);
    if (selected) {
      ctx.strokeStyle = PLAYER;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      let prev = selected;
      for (const wp of [selected.dest, ...selected.route].filter(Boolean)) {
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(wp.x, wp.y); ctx.stroke();
        ctx.strokeRect(wp.x - 3, wp.y - 3, 6, 6);
        prev = wp;
      }
      ctx.setLineDash([]);
    }
    for (const s of alive(g)) {
      drawShip(ctx, s, s, { scale: 0.85, selected: s.id === ui.selectedId });
      drawBars(ctx, s, s, 0.85);
    }
  }
  ctx.restore();

  drawCompass(ctx, g);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(8, 8, 150, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  const viewLabel = inBattle ? (cam.zoom > 1 ? ' · Close view' : ' · Long view') : '';
  ctx.fillText(`${MODE_LABEL[g.mode].toUpperCase()}${viewLabel}`, 14, 21);
}

// ── Page ──────────────────────────────────────────────────────────────────────

const COMPASS_POINTS = Object.keys(COMPASS);

function Bar({ value, max, color }) {
  return (
    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
      <div className="h-full" style={{ width: `${Math.max(0, (value / max) * 100)}%`, background: color }} />
    </div>
  );
}

export default function SeaWarPage() {
  const [opts, setOpts] = useState({ scenario: 'pirates', windFrom: 'N', windStrength: 'moderate', hostile: true });
  const gameRef = useRef(null);
  if (gameRef.current === null) gameRef.current = createScenario('pirates');
  const canvasRef = useRef(null);
  const runningRef = useRef(false);
  const speedRef = useRef(4);
  const prevModeRef = useRef('map');
  const uiRef = useRef({
    selectedId: gameRef.current.ships.find((s) => s.side === 'player' && s.kind === 'flagship').id,
    view: 'long',
    cam: { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 1 },
  });

  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [view, setViewState] = useState('long');
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const g = gameRef.current;
  const ui = uiRef.current;

  const select = (id) => { uiRef.current.selectedId = id; refresh(); };
  const setSpeedBoth = (s) => { speedRef.current = s; setSpeed(s); };
  const setView = (v) => { uiRef.current.view = v; setViewState(v); };

  const newGame = useCallback((o) => {
    const state = createScenario(o.scenario, {
      windFrom: o.windFrom, windStrength: o.windStrength, hostile: o.hostile,
    });
    gameRef.current = state;
    prevModeRef.current = 'map';
    runningRef.current = false;
    setRunning(false);
    speedRef.current = 4;
    setSpeed(4);
    uiRef.current.selectedId = state.ships.find((s) => s.side === 'player' && s.kind === 'flagship').id;
    uiRef.current.view = 'long';
    setViewState('long');
    refresh();
  }, [refresh]);

  const changeOpt = (patch) => {
    const next = { ...opts, ...patch };
    // Picking a scenario resets wind to that scenario's own; the rest are your settings.
    if (patch.scenario) {
      next.windFrom = SCENARIOS[patch.scenario].windFrom;
      next.windStrength = SCENARIOS[patch.scenario].strength;
    }
    setOpts(next);
    newGame(next);
  };

  // Main loop: fixed-step simulation, draw every frame, refresh the panels ~5x/sec.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return undefined;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hud = 0;
    const frame = (now) => {
      const delta = Math.min(0.25, (now - last) / 1000);
      last = now;
      const state = gameRef.current;
      if (runningRef.current && state.mode !== 'over') {
        acc += delta * speedRef.current;
        while (acc >= FIXED_DT) {
          step(state, FIXED_DT);
          acc -= FIXED_DT;
          if (state.mode !== prevModeRef.current || state.mode === 'over') break;
        }
        hud += delta;
        if (hud > 0.2) { hud = 0; setTick((t) => t + 1); }
      }
      if (state.mode !== prevModeRef.current) {
        // The zoom: stop the clock so you can take in the new situation.
        prevModeRef.current = state.mode;
        runningRef.current = false;
        setRunning(false);
        acc = 0;
        if (state.mode === 'battle') {
          speedRef.current = 1; setSpeed(1);
          uiRef.current.view = 'long'; setViewState('long');
        } else if (state.mode === 'map') {
          speedRef.current = 4; setSpeed(4);
        }
        setTick((t) => t + 1);
      }
      render(ctx, state, uiRef.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toWorld = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * WORLD.w;
    const sy = ((e.clientY - rect.top) / rect.height) * WORLD.h;
    const { x, y, zoom } = uiRef.current.cam;
    return { x: x + (sx - WORLD.w / 2) / zoom, y: y + (sy - WORLD.h / 2) / zoom };
  };

  const posOf = (s) => (g.battle && s.b ? s.b : s);

  const shipAt = (p, side) => {
    const reach = 16 / uiRef.current.cam.zoom;
    const pool = g.battle ? battleShips(g) : alive(g);
    return pool
      .filter((s) => s.side === side && dist(posOf(s), p) <= reach)
      .sort((a, b) => dist(posOf(a), p) - dist(posOf(b), p))[0];
  };

  const selected = g.ships.find((s) => s.id === ui.selectedId && !s.sunk && s.side === 'player');

  const onClick = (e) => {
    if (g.mode === 'board' || g.mode === 'over') return;
    const p = toWorld(e);
    const own = shipAt(p, 'player');
    if (own) { select(own.id); return; }
    if (!selected) return;
    if (g.mode === 'map') {
      orderMove(g, selected.id, p, e.shiftKey);
    } else if (g.mode === 'battle' && selected.b) {
      orderCourse(g, selected.id, Math.atan2(p.y - selected.b.y, p.x - selected.b.x));
    }
    refresh();
  };

  const onContextMenu = (e) => {
    e.preventDefault();
    if (!selected) return;
    if (g.mode === 'map') {
      clearCourse(g, selected.id);
    } else if (g.mode === 'battle') {
      const foe = shipAt(toWorld(e), 'enemy');
      if (foe) orderBoard(g, selected.id, foe.id);
    }
    refresh();
  };

  const toggleRun = () => {
    if (g.mode === 'over') return;
    runningRef.current = !runningRef.current;
    setRunning(runningRef.current);
  };

  const turn = (delta) => {
    if (!selected?.b || g.mode !== 'battle') return;
    const base = selected.b.order?.type === 'course' ? selected.b.order.heading : selected.b.heading;
    orderCourse(g, selected.id, base + delta);
    refresh();
  };
  const doFire = (side) => { if (selected) { fire(g, selected, side); refresh(); } };
  const boardNearest = () => {
    if (!selected) return;
    const foe = nearestEnemy(g, selected);
    if (foe) { orderBoard(g, selected.id, foe.id); refresh(); }
  };

  // Keyboard: arrows steer, Q/E fire port/starboard, 1-3 sails, B board, V view, space pause.
  const keyRef = useRef(null);
  keyRef.current = (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ') { toggleRun(); return true; }
    if (g.mode === 'battle') {
      if (k === 'arrowleft' || k === 'a') { turn(-0.2); return true; }
      if (k === 'arrowright' || k === 'd') { turn(0.2); return true; }
      if (k === 'q') { doFire('port'); return true; }
      if (k === 'e') { doFire('starboard'); return true; }
      if (k === 'b') { boardNearest(); return true; }
      if (k === 'v') { setView(ui.view === 'long' ? 'close' : 'long'); return true; }
    }
    if (g.mode === 'board') {
      if (k === 'c') { orderBoarding(g, 'charge'); refresh(); return true; }
      if (k === 'h') { orderBoarding(g, 'hold'); refresh(); return true; }
    }
    if (selected && g.mode !== 'board' && ['1', '2', '3'].includes(k)) {
      setSails(g, selected.id, { 1: 1, 2: 0.5, 3: 0 }[k]);
      refresh();
      return true;
    }
    return false;
  };
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (keyRef.current(e)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sc = SCENARIOS[opts.scenario];
  const mine = g.ships.filter((s) => s.side === 'player');
  const foes = alive(g, 'enemy');
  const bd = g.boarding;
  const unitCounts = bd
    ? ['a', 'b'].map((side) => ({
      sword: bd.units.filter((u) => u.side === side && u.kind === 'sword').length,
      musket: bd.units.filter((u) => u.side === side && u.kind === 'musket').length,
    }))
    : null;
  const mySide = bd?.playerSide;
  const btn = 'px-3 py-2 border border-[var(--color-border)] rounded text-xs uppercase tracking-widest disabled:opacity-40';
  const btnOn = 'px-3 py-2 border border-amber-600 text-amber-400 rounded text-xs uppercase tracking-widest';

  return (
    <div className="sea-war-page min-h-screen bg-[var(--color-br-alt)] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-widest uppercase text-amber-400">Art of War at Sea</h1>
            <p className="text-xs text-white uppercase tracking-widest mt-0.5">
              {sc.name} · vs {sc.opponent} · {MODE_LABEL[g.mode]} · T+{Math.floor(g.time)}s
            </p>
          </div>
          <ArcadeMenu />
        </div>

        {g.winner && (
          <div className="p-4 border border-amber-600 bg-amber-950/30 rounded-lg text-center">
            <div className="text-amber-400 text-lg font-bold tracking-widest uppercase">
              {g.winner === 'player' ? 'Victory' : 'Defeat'}
            </div>
            <div className="text-xs mt-1">
              {g.winner === 'player' ? `${sc.opponent}'s flagship is yours.` : 'Your flagship has been lost.'}
            </div>
          </div>
        )}

        {/* Setup */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={opts.scenario}
            onChange={(e) => changeOpt({ scenario: e.target.value })}
            className="border border-[var(--color-border)] rounded px-3 py-2 text-xs uppercase tracking-widest"
          >
            {Object.keys(SCENARIOS).map((id) => (
              <option key={id} value={id}>{SCENARIOS[id].name}</option>
            ))}
          </select>
          <label className="text-xs uppercase tracking-widest flex items-center gap-2">
            Wind from
            <select
              value={opts.windFrom}
              onChange={(e) => changeOpt({ windFrom: e.target.value })}
              className="border border-[var(--color-border)] rounded px-2 py-2"
            >
              {COMPASS_POINTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <select
            value={opts.windStrength}
            onChange={(e) => changeOpt({ windStrength: e.target.value })}
            className="border border-[var(--color-border)] rounded px-2 py-2 text-xs uppercase tracking-widest"
          >
            {Object.keys(WIND_STRENGTHS).map((w) => <option key={w} value={w}>{w} wind</option>)}
          </select>
          <label className="text-xs uppercase tracking-widest flex items-center gap-2">
            <input
              type="checkbox"
              checked={opts.hostile}
              onChange={(e) => changeOpt({ hostile: e.target.checked })}
            />
            Hostile waters
          </label>
          <button onClick={() => newGame(opts)} className={btn}>New battle</button>
        </div>

        {/* Run controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={toggleRun} disabled={g.mode === 'over'} className={btnOn}>
            {running ? 'Pause' : g.time > 0 ? 'Resume' : 'Execute'}
          </button>
          <div className="flex gap-1">
            {SPEEDS.map((s) => (
              <button key={s} onClick={() => setSpeedBoth(s)} className={speed === s ? btnOn : btn}>{s}x</button>
            ))}
          </div>
          {g.mode === 'battle' && (
            <>
              <button onClick={() => setView(view === 'long' ? 'close' : 'long')} className={btn}>
                {view === 'long' ? 'Close view' : 'Long view'}
              </button>
              <button onClick={() => { disengage(g); refresh(); }} className={btn}>Disengage</button>
            </>
          )}
        </div>

        <details className="text-[11px] text-white/80 tracking-wide leading-relaxed">
          <summary className="cursor-pointer uppercase tracking-widest text-amber-400 text-xs">How to play</summary>
          <div className="mt-2 space-y-1.5">
            <p>
              <b>Map:</b> select a ship and click the sea to plot a course (shift-click adds waypoints, right-click cancels).
              Ships can&apos;t sail straight into the wind — they&apos;ll tack. A beam reach is fastest. Ports repair hull and sails;
              with hostile waters on, shoals tear hulls open. Capture or sink the enemy flagship to win — lose yours and you lose.
            </p>
            <p>
              <b>Contact:</b> when fleets meet, the game zooms to the battle and pauses. Click the sea to set a ship&apos;s course,
              or use ◀ ▶ (arrow keys). Fire a broadside to port (Q) or starboard (E) at anything in arc — aim for the hull to kill crew
              and sink ships, or the rigging to slow them. Unordered ships fight on auto-pilot.
            </p>
            <p>
              <b>Boarding:</b> order a ship to board (B, or right-click an enemy) or ram one. On deck, swordsmen close in and
              musketeers shoot — Charge (C) or Hold (H). The last side standing takes the ship.
            </p>
          </div>
        </details>

        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_280px]">
          <canvas
            ref={canvasRef}
            width={WORLD.w}
            height={WORLD.h}
            onClick={onClick}
            onContextMenu={onContextMenu}
            className="sea-war-map w-full min-w-0 border border-[var(--color-border)] rounded-lg cursor-crosshair"
            style={{ aspectRatio: `${WORLD.w} / ${WORLD.h}` }}
          />

          <div className="space-y-4 min-w-0">
            {/* Boarding controls */}
            {g.mode === 'board' && bd && (
              <div className="p-3 border border-amber-600 bg-amber-950/30 rounded-lg text-xs space-y-2">
                <div className="uppercase tracking-widest text-amber-400">Boarding Action</div>
                {['a', 'b'].map((side, i) => (
                  <div key={side} className="flex justify-between">
                    <span>{getShip(g, bd[side]).name}</span>
                    <span>⚔ {unitCounts[i].sword} · 🔫 {unitCounts[i].musket}</span>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => { orderBoarding(g, 'charge'); refresh(); }} className={bd.orders[mySide] === 'charge' ? btnOn : btn}>Charge!</button>
                  <button onClick={() => { orderBoarding(g, 'hold'); refresh(); }} className={bd.orders[mySide] === 'hold' ? btnOn : btn}>Hold</button>
                </div>
                <div className="text-white/70">⚔ swordsmen fight hand-to-hand; 🔫 musketeers fire from range.</div>
              </div>
            )}

            {/* Selected ship */}
            {selected && g.mode !== 'board' && (
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface2)] rounded-lg text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="uppercase tracking-widest text-amber-400">{selected.name}</span>
                  <span className="text-white/70">{SPECS[selected.kind].label}</span>
                </div>
                <div className="text-white/70">
                  Hull {Math.ceil(selected.hull)}/{selected.maxHull} · Sails {Math.ceil(selected.sail)}/{selected.maxSail} · Crew {selected.crew}
                </div>
                <div className="flex gap-1 items-center">
                  <span className="uppercase tracking-widest mr-1">Sails</span>
                  {[[1, 'Full'], [0.5, 'Half'], [0, 'Furl']].map(([lv, label]) => (
                    <button key={label} onClick={() => { setSails(g, selected.id, lv); refresh(); }} className={selected.sails === lv ? btnOn : btn}>{label}</button>
                  ))}
                </div>
                {g.mode === 'map' && (
                  <button onClick={() => { clearCourse(g, selected.id); refresh(); }} className={btn}>Clear course</button>
                )}
                {g.mode === 'battle' && selected.b && (
                  <>
                    <div className="flex gap-1 items-center">
                      <span className="uppercase tracking-widest mr-1">Helm</span>
                      <button onClick={() => turn(-0.2)} className={btn}>◀ Port</button>
                      <button onClick={() => turn(0.2)} className={btn}>Stbd ▶</button>
                    </div>
                    {['port', 'starboard'].map((side, i) => {
                      const left = selected.b.reload[i];
                      const total = SPECS[selected.kind].reload;
                      return (
                        <div key={side}>
                          <button onClick={() => doFire(side)} disabled={left > 0} className={`${btn} w-full`}>
                            Fire {side} ({side === 'port' ? 'Q' : 'E'})
                          </button>
                          <Bar value={total - left} max={total} color="#fb923c" />
                        </div>
                      );
                    })}
                    <div className="flex gap-1 items-center">
                      <span className="uppercase tracking-widest mr-1">Aim</span>
                      <button onClick={() => { setAim(g, selected.id, 'hull'); refresh(); }} className={selected.aim === 'hull' ? btnOn : btn}>Hull</button>
                      <button onClick={() => { setAim(g, selected.id, 'rigging'); refresh(); }} className={selected.aim === 'rigging' ? btnOn : btn}>Rigging</button>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={boardNearest} className={btn}>Board (B)</button>
                      <button onClick={() => { setAuto(g, selected.id, !selected.auto); refresh(); }} className={selected.auto ? btnOn : btn}>
                        Auto {selected.auto ? 'on' : 'off'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Fleet */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white mb-2">Your Fleet</div>
              <div className="space-y-1.5">
                {mine.map((s) => (
                  <button
                    key={s.id}
                    disabled={s.sunk}
                    onClick={() => select(s.id)}
                    className={`w-full text-left p-2 border rounded-lg ${
                      s.id === ui.selectedId ? 'border-amber-600 bg-amber-950/30' : 'border-[var(--color-border)] bg-[var(--color-surface2)]'
                    } ${s.sunk ? 'opacity-40' : ''}`}
                  >
                    <div className="flex justify-between text-xs">
                      <span>{s.name}{s.kind === 'flagship' ? ' ⚑' : ''}</span>
                      <span className="text-white/70">{s.sunk ? 'LOST' : SPECS[s.kind].label}</span>
                    </div>
                    {!s.sunk && (
                      <div className="mt-1 space-y-0.5">
                        <Bar value={s.hull} max={s.maxHull} color="#4ade80" />
                        <Bar value={s.sail} max={s.maxSail} color="#e5e7eb" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-white/70 mt-2">Enemy ships afloat: {foes.length}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest text-white mb-2">Captain&apos;s Log</div>
          <div className="h-36 overflow-y-auto bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)]">
            {[...g.log].reverse().map((m, i) => (
              <div key={`${g.log.length - i}-${m}`} className="px-3 py-1.5 text-xs">{m}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
