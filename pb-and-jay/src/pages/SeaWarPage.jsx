import { useCallback, useEffect, useRef, useState } from 'react';
import { SCENARIOS, SPECS, SUB_DETECT_RANGE, WORLD, alive, createScenario, dist, isVisibleTo, step, } from '../data/seaWar';
import ArcadeMenu from '../components/ArcadeMenu';
import './SeaWarPage.css';
const PLAYER_COLOR = "#fbbf24";
const ENEMY_COLOR = "#f87171";
const FIXED_DT = 0.1;
const SPEEDS = [1, 2, 4];
function drawShip(ctx, ship, color, selected) {
  const len = { battleship: 16, cruiser: 13, destroyer: 10, submarine: 9, carrier: 18 }[ship.kind];
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.heading);
  ctx.globalAlpha = ship.sunk ? 0.25 : 1;
  ctx.fillStyle = color;
  ctx.strokeStyle = selected ? "#ffffff" : "rgba(0,0,0,0.6)";
  ctx.lineWidth = selected ? 2 : 1;
  ctx.beginPath();
  if (ship.kind === "carrier") {
    ctx.rect(-len / 2, -4, len, 8);
  }
  else if (ship.kind === "submarine") {
    ctx.ellipse(0, 0, len / 2, 2.5, 0, 0, Math.PI * 2);
  }
  else {
    const w = ship.kind === "battleship" ? 4 : ship.kind === "cruiser" ? 3.2 : 2.5;
    ctx.moveTo(len / 2, 0);
    ctx.lineTo(-len / 2, w);
    ctx.lineTo(-len / 2, -w);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function render(ctx, game, selectedId) {
  ctx.clearRect(0, 0, WORLD.w, WORLD.h);
  ctx.fillStyle = "#0b2a3d";
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.w; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.h);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.h; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.w, y);
    ctx.stroke();
  }
  for (const isl of game.islands) {
    ctx.fillStyle = "#3f5b3a";
    ctx.strokeStyle = "#8a7a52";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(isl.x, isl.y, isl.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  const selected = game.ships.find((s) => s.id === selectedId && !s.sunk);
  if (selected) {
    ctx.strokeStyle = "rgba(251,191,36,0.35)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(selected.x, selected.y, SPECS[selected.kind].range, 0, Math.PI * 2);
    ctx.stroke();
    let prev = selected;
    ctx.strokeStyle = PLAYER_COLOR;
    for (const wp of selected.waypoints) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(wp.x, wp.y);
      ctx.stroke();
      ctx.strokeRect(wp.x - 3, wp.y - 3, 6, 6);
      prev = wp;
    }
    ctx.setLineDash([]);
  }
  for (const ship of game.ships) {
    if (ship.sunk)
      drawShip(ctx, ship, ship.side === "player" ? PLAYER_COLOR : ENEMY_COLOR, false);
  }
  for (const ship of alive(game)) {
    if (!isVisibleTo(game, ship, "player"))
      continue;
    drawShip(ctx, ship, ship.side === "player" ? PLAYER_COLOR : ENEMY_COLOR, ship.id === selectedId);
    const w = 18;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(ship.x - w / 2, ship.y - 15, w, 3);
    ctx.fillStyle = ship.hp / ship.maxHp > 0.4 ? "#4ade80" : "#ef4444";
    ctx.fillRect(ship.x - w / 2, ship.y - 15, w * (ship.hp / ship.maxHp), 3);
  }
  for (const shot of game.shots) {
    if (shot.kind === "air") {
      ctx.fillStyle = shot.side === "player" ? PLAYER_COLOR : ENEMY_COLOR;
      const t = 1 - shot.ttl / 0.5;
      ctx.fillRect(shot.x1 + (shot.x2 - shot.x1) * t - 2, shot.y1 + (shot.y2 - shot.y1) * t - 2, 4, 4);
      continue;
    }
    ctx.strokeStyle = shot.kind === "torpedo" ? "#7dd3fc" : shot.hit ? "#ffffff" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = shot.kind === "torpedo" ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(shot.x1, shot.y1);
    ctx.lineTo(shot.x2, shot.y2);
    ctx.stroke();
    if (shot.hit) {
      ctx.fillStyle = "#fb923c";
      ctx.beginPath();
      ctx.arc(shot.x2, shot.y2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
export default function SeaWarPage() {
  const [scenarioId, setScenarioId] = useState("skirmish");
  const gameRef = useRef(createScenario("skirmish"));
  const canvasRef = useRef(null);
  const runningRef = useRef(false);
  const speedRef = useRef(1);
  const selectedRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const game = gameRef.current;
  const select = (id) => {
    selectedRef.current = id;
    setSelectedId(id);
  };
  const reset = useCallback((id) => {
    gameRef.current = createScenario(id);
    runningRef.current = false;
    setRunning(false);
    select(null);
    refresh();
  }, [refresh]);
  // Main loop: fixed-step simulation, draw every frame, refresh HUD ~5x/sec.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx)
      return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hud = 0;
    const frame = (now) => {
      const delta = Math.min(0.25, (now - last) / 1000);
      last = now;
      const g = gameRef.current;
      if (runningRef.current && !g.winner) {
        acc += delta * speedRef.current;
        while (acc >= FIXED_DT) {
          step(g, FIXED_DT);
          acc -= FIXED_DT;
        }
        if (g.winner) {
          runningRef.current = false;
          setRunning(false);
        }
        hud += delta;
        if (hud > 0.2 || g.winner) {
          hud = 0;
          refresh();
        }
      }
      render(ctx, g, selectedRef.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [refresh]);
  const toWorld = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WORLD.w,
      y: ((e.clientY - rect.top) / rect.height) * WORLD.h,
    };
  };
  const shipAt = (p, side) => {
    const g = gameRef.current;
    return alive(g, side)
      .filter((s) => dist(s, p) <= 14 && isVisibleTo(g, s, "player"))
      .sort((a, b) => dist(a, p) - dist(b, p))[0];
  };
  const onClick = (e) => {
    if (game.winner)
      return;
    const p = toWorld(e);
    const own = shipAt(p, "player");
    if (own) {
      select(own.id);
      refresh();
      return;
    }
    const sel = game.ships.find((s) => s.id === selectedRef.current && !s.sunk);
    if (!sel)
      return;
    sel.waypoints = e.shiftKey ? [...sel.waypoints, p] : [p];
    refresh();
  };
  const onContextMenu = (e) => {
    e.preventDefault();
    const sel = game.ships.find((s) => s.id === selectedRef.current && !s.sunk);
    if (!sel)
      return;
    const foe = shipAt(toWorld(e), "enemy");
    sel.focus = foe ? foe.id : null;
    refresh();
  };
  const toggleRun = () => {
    if (game.winner)
      return;
    runningRef.current = !runningRef.current;
    setRunning(runningRef.current);
  };
  const setSpeedBoth = (s) => {
    speedRef.current = s;
    setSpeed(s);
  };
  const selected = game.ships.find((s) => s.id === selectedId && !s.sunk);
  const mine = game.ships.filter((s) => s.side === "player");
  const foes = alive(game, "enemy").length;
  return (<div className="sea-war-page min-h-screen bg-[var(--color-br-alt)] text-white p-6">
    <div className="max-w-5xl mx-auto space-y-5">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-widest uppercase text-amber-400">Art of War at Sea</h1>
        <p className="text-xs text-white uppercase tracking-widest mt-0.5">
        {SCENARIOS[scenarioId].name} · T+{Math.floor(game.time)}s · Enemy ships {foes}
        </p>
      </div>
      <ArcadeMenu />
    </div>

    {game.winner && (<div className="p-4 border border-amber-600 bg-amber-950/30 rounded-lg text-center">
      <div className="text-amber-400 text-lg font-bold tracking-widest uppercase">
        {game.winner === "player" ? "Victory" : "Defeat"}
      </div>
      </div>)}

    <div className="flex flex-wrap gap-3 items-center">
      <select value={scenarioId} onChange={(e) => {
      const id = e.target.value;
      setScenarioId(id);
      reset(id);
    }} className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded px-3 py-2 text-xs uppercase tracking-widest">
      {Object.keys(SCENARIOS).map((id) => (<option key={id} value={id}>{SCENARIOS[id].name}</option>))}
      </select>
      <button onClick={toggleRun} disabled={!!game.winner} className="px-4 py-2 border border-amber-600 text-amber-400 rounded text-xs uppercase tracking-widest hover:bg-amber-950/40 disabled:opacity-40">
      {running ? "Pause" : game.time > 0 ? "Resume" : "Execute"}
      </button>
      <div className="flex gap-1">
      {SPEEDS.map((s) => (<button key={s} onClick={() => setSpeedBoth(s)} className={`px-3 py-2 border rounded text-xs tracking-widest ${speed === s ? "border-amber-600 text-amber-400" : "border-[var(--color-border)] text-white"}`}>
        {s}x
        </button>))}
      </div>
      <button onClick={() => reset(scenarioId)} className="px-4 py-2 border border-[var(--color-border)] rounded text-xs uppercase tracking-widest hover:bg-white/5">
      Reset
      </button>
    </div>

    <p className="text-[11px] text-white/70 tracking-wide">
      {SCENARIOS[scenarioId].blurb} Click one of your ships to select it, then click the sea to plot a course
      (shift-click to add waypoints). Right-click an enemy to focus fire. Ships fire automatically at anything in
      range. Submarines are invisible until you pass within {SUB_DETECT_RANGE} units or they fire.
    </p>

    <div className="grid lg:grid-cols-[1fr_260px] gap-5">
      <canvas ref={canvasRef} width={WORLD.w} height={WORLD.h} onClick={onClick} onContextMenu={onContextMenu} className="w-full border border-[var(--color-border)] rounded-lg cursor-crosshair" style={{ aspectRatio: `${WORLD.w} / ${WORLD.h}` }}/>

      <div className="space-y-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-white mb-2">Your Fleet</div>
        <div className="space-y-1.5">
        {mine.map((s) => (<button key={s.id} disabled={s.sunk} onClick={() => { select(s.id); refresh(); }} className={`w-full text-left p-2 border rounded-lg ${s.id === selectedId ? "border-amber-600 bg-amber-950/30" : "border-[var(--color-border)] bg-[var(--color-surface2)]"} ${s.sunk ? "opacity-40" : ""}`}>
          <div className="flex justify-between text-xs">
            <span>{SPECS[s.kind].label}</span>
            <span className="text-white/70">{s.sunk ? "SUNK" : `${s.hp}/${s.maxHp}`}</span>
          </div>
          <div className="h-1.5 mt-1 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-amber-600" style={{ width: `${(s.hp / s.maxHp) * 100}%` }}/>
          </div>
          </button>))}
        </div>
      </div>

      {selected && (<div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface2)] rounded-lg text-xs space-y-2">
        <div className="uppercase tracking-widest text-amber-400">{SPECS[selected.kind].label}</div>
        <div>Range {SPECS[selected.kind].range} · Dmg {SPECS[selected.kind].damage} · Speed {SPECS[selected.kind].speed}</div>
        <div>Waypoints: {selected.waypoints.length} · Focus: {selected.focus ? "set" : "auto"}</div>
        <button onClick={() => { selected.waypoints = []; selected.focus = null; refresh(); }} className="px-3 py-1.5 border border-[var(--color-border)] rounded uppercase tracking-widest hover:bg-white/5">
          Clear orders
        </button>
        </div>)}
      </div>
    </div>

    <div>
      <div className="text-[10px] uppercase tracking-widest text-white mb-2">Battle Log</div>
      <div className="h-36 overflow-y-auto bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)]">
      {[...game.log].reverse().map((m, i) => (<div key={i} className="px-3 py-1.5 text-xs">{m}</div>))}
      </div>
    </div>
    </div>
  </div>);
}
