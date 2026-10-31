import { useEffect, useRef, useState } from 'react';
import {
  ABILITY_COST, DECK, MAX_ENERGY, SQUAD_SIZE, TIME_LIMIT,
  attackers, defenders, deploy, setSwordShare, simulate, step,
  castGrenade, castRally, castVolley,
} from '../../data/deckBattle';
import { PIECES } from '../../data/chessAtSea';
import { AMBER, RED } from './ShipIcon';
import { troopImage } from './troopSprites';

const SCALE = 2; // deck units → canvas pixels
const STEP = 0.05;
const SPEEDS = [1, 2, 3];

// Render height in canvas px for a troop sprite; width follows the sprite's
// own frame aspect (tall and narrow facing up/down, wide facing left/right).
const SPRITE_H = { sword: 26, musket: 26, captain: 34 };

function nearestFoe(units, u) {
  let best = null;
  let bd = Infinity;
  for (const o of units) {
    if (o.side === u.side) continue;
    const d = Math.hypot(o.x - u.x, o.y - u.y);
    if (d < bd) { best = o; bd = d; }
  }
  return best;
}

// Which of the four sprite facings a unit should use right now, based on the
// direction to its nearest foe — troops have no facing of their own in the
// pure battle engine, so the renderer works it out from relative position.
function facingOf(u, foe) {
  if (!foe) return u.side === 'a' ? 'right' : 'left';
  const dx = foe.x - u.x;
  const dy = foe.y - u.y;
  return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'down' : 'up');
}

function drawDeck(ctx, engine, colors) {
  const W = DECK.w * SCALE;
  const H = DECK.h * SCALE;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#7a5a36';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  for (let y = 0; y <= H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Your rail (where troops land) and their stern.
  ctx.fillStyle = colors.a + '33';
  ctx.fillRect(0, 0, DECK.w * 0.3 * SCALE, H);
  ctx.fillStyle = colors.a;
  ctx.fillRect(0, 0, 8, H);
  ctx.fillStyle = colors.d;
  ctx.fillRect(W - 8, 0, 8, H);
  if (!engine.started) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LAND TROOPS HERE ▸', 16, H - 12);
  }

  // Pending grenades.
  for (const g of engine.grenades) {
    ctx.strokeStyle = '#fb923c';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(g.x * SCALE, g.y * SCALE, 30 * SCALE, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fb923c';
    ctx.beginPath(); ctx.arc(g.x * SCALE, g.y * SCALE, 5, 0, Math.PI * 2); ctx.fill();
  }

  for (const u of engine.units) {
    const x = u.x * SCALE;
    const y = u.y * SCALE;
    const c = u.side === 'a' ? colors.a : colors.d;
    const facing = facingOf(u, nearestFoe(engine.units, u));
    const img = troopImage(u.kind, facing);
    let barY = y - 17;

    if (img) {
      const h = SPRITE_H[u.kind] ?? 26;
      const w = h * (img.naturalWidth / img.naturalHeight);
      const top = y - h * 0.95;
      // A faint tint disc underfoot tells the sides apart at a glance.
      ctx.fillStyle = c + '55';
      ctx.beginPath(); ctx.ellipse(x, y, w * 0.32, w * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(img, x - w / 2, top, w, h);
      barY = top - 4;
    } else {
      ctx.fillStyle = c;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      if (u.kind === 'musket') {
        ctx.fillRect(x - 6, y - 6, 12, 12);
        ctx.strokeRect(x - 6, y - 6, 12, 12);
        ctx.strokeStyle = '#e5e7eb';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (u.side === 'a' ? 15 : -15), y); ctx.stroke();
      } else {
        const r = u.kind === 'captain' ? 11 : 7;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (u.kind === 'captain') {
          ctx.fillStyle = '#facc15';
          ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x, y - 18); ctx.lineTo(x + 9, y - 9); ctx.closePath(); ctx.fill();
        } else {
          ctx.strokeStyle = '#e5e7eb';
          ctx.beginPath(); ctx.moveTo(x + (u.side === 'a' ? 7 : -7), y); ctx.lineTo(x + (u.side === 'a' ? 16 : -16), y - 5); ctx.stroke();
        }
      }
    }
    if (u.hp < u.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 9, barY, 18, 3);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(x - 9, barY, 18 * (u.hp / u.maxHp), 3);
    }
  }

  for (const f of engine.fx) {
    const t = f.ttl / (f.type === 'boom' ? 0.45 : 0.3);
    if (f.type === 'boom') {
      ctx.fillStyle = `rgba(251,146,60,${0.55 * t})`;
      ctx.beginPath(); ctx.arc(f.x1 * SCALE, f.y1 * SCALE, 30 * SCALE * (1.1 - t * 0.6), 0, Math.PI * 2); ctx.fill();
    } else if (f.type === 'shot' || f.type === 'miss') {
      ctx.strokeStyle = f.type === 'shot' ? `rgba(255,255,255,${t})` : `rgba(255,255,255,${0.3 * t})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(f.x1 * SCALE, f.y1 * SCALE); ctx.lineTo(f.x2 * SCALE, f.y2 * SCALE); ctx.stroke();
    } else if (f.type === 'slash') {
      ctx.fillStyle = `rgba(255,255,255,${t})`;
      ctx.beginPath(); ctx.arc(f.x2 * SCALE, f.y2 * SCALE, 9 * (1.2 - t * 0.4), 0, Math.PI * 2); ctx.fill();
    }
  }

  if (engine.rally > 0) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, W - 4, H - 4);
  }
}

// The boarding battle. In "play" mode you land and command your troops; in
// "watch" mode the computer attacks you and you look on.
export default function DeckBattleScene({
  engine, info, playerIsAttacker, mode, attackerName, defenderName, onFinish,
}) {
  const canvasRef = useRef(null);
  const speedRef = useRef(1);
  const [speed, setSpeed] = useState(1);
  const [kind, setKind] = useState('sword');
  const [armed, setArmed] = useState(false);
  const [share, setShare] = useState(60);
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const attackerColor = info.attackerColor === 'w' ? AMBER : RED;
  const defenderColor = info.defenderColor === 'w' ? AMBER : RED;
  const colorsRef = useRef({ a: attackerColor, d: defenderColor });
  colorsRef.current = { a: attackerColor, d: defenderColor };

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
      if (mode === 'watch' && !engine.started) deploy(engine, 'sword', 100);
      if (engine.started && !engine.result) {
        acc += delta * speedRef.current;
        while (acc >= STEP && !engine.result) {
          step(engine, STEP, Math.random, { auto: mode === 'watch' });
          acc -= STEP;
        }
        hud += delta;
        if (hud > 0.15 || engine.result) { hud = 0; setTick((t) => t + 1); }
      }
      drawDeck(ctx, engine, colorsRef.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine, mode]);

  const toDeck = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * DECK.w,
      y: ((e.clientY - rect.top) / rect.height) * DECK.h,
    };
  };

  const onCanvas = (e) => {
    if (engine.result || mode !== 'play') return;
    const p = toDeck(e);
    if (armed) {
      if (castGrenade(engine, p.x, p.y)) setArmed(false);
      refresh();
      return;
    }
    if (p.x > DECK.w * 0.3) return;
    if (deploy(engine, kind, p.y)) {
      if (engine.pool[kind] === 0) setKind(kind === 'sword' ? 'musket' : 'sword');
      refresh();
    }
  };

  const dropRest = () => {
    ['sword', 'musket'].forEach((k) => {
      let i = 0;
      while (engine.pool[k] > 0) { deploy(engine, k, 25 + ((i * 47 + (k === 'musket' ? 20 : 0)) % 150)); i++; }
    });
    refresh();
  };

  const changeSpeed = (s) => { speedRef.current = s; setSpeed(s); };
  const skip = () => { simulate(engine); refresh(); };

  const result = engine.result;
  const left = Math.max(0, Math.ceil(TIME_LIMIT - engine.time));
  const a = attackers(engine);
  const reserve = engine.pool.sword + engine.pool.musket;
  const alive = defenders(engine).length;
  const btn = 'px-3 py-2 border border-[var(--color-border)] rounded text-xs uppercase tracking-widest disabled:opacity-40';
  const btnOn = 'px-3 py-2 border border-amber-600 text-amber-400 rounded text-xs uppercase tracking-widest';
  const choiceBtn = 'px-3 py-2 border rounded text-xs w-full text-left leading-snug disabled:opacity-40';

  let hint;
  if (mode === 'watch') hint = 'The enemy is boarding you! Your crew defend the deck on their own.';
  else if (!engine.started) hint = 'Choose your troops, then tap along the shaded left edge to land a squad. The clock starts with your first drop.';
  else if (armed) hint = 'Tap the deck where the grenade should land. It hits a moment later — and hurts your own men too.';
  else hint = 'Your troops fight on their own. Keep landing squads and spend energy on Rally, Volley or Grenade. Kill their captain to win!';

  // Result and the winner's choice.
  let resultPanel = null;
  if (result) {
    const attackerWon = result.winner === 'a';
    const userWon = attackerWon === playerIsAttacker;
    const loserType = attackerWon ? info.defenderType : info.attackerType;
    const survivors = attackerWon ? result.attackerSurvivors : result.defenderSurvivors;
    const gameEnding = loserType === 'k';
    const canPrize = userWon && !gameEnding && survivors >= 2;
    const loserName = PIECES[loserType].name;
    const prizeCrew = Math.floor(survivors / 2);
    const stays = playerIsAttacker && attackerWon;
    resultPanel = (
      <div className={`p-3 border rounded-lg text-xs space-y-2 ${userWon ? 'border-amber-600 bg-amber-950/30' : 'border-red-800 bg-red-950/30'}`}>
        <div className="uppercase tracking-widest text-sm text-amber-400">{userWon ? 'Victory' : 'Defeat'}</div>
        <div>{result.reason}</div>
        {userWon && gameEnding && (
          <button onClick={() => onFinish(result, 'sink')} className={btnOn}>Continue</button>
        )}
        {userWon && !gameEnding && (
          <>
            <div className="text-white/80">The enemy {loserName} is yours to decide. {survivors} of your crew survive.</div>
            <button onClick={() => onFinish(result, 'sink')} className={`${choiceBtn} border-amber-600 text-amber-400`}>
              <b>Sink it.</b> {playerIsAttacker ? `Your ship moves in with all ${survivors} crew.` : `Your ship stays with all ${survivors} crew.`}
            </button>
            <button
              disabled={!canPrize}
              onClick={() => onFinish(result, 'prize')}
              className={`${choiceBtn} border-[var(--color-border)]`}
            >
              <b>Take it as a prize.</b>{' '}
              {canPrize
                ? `It joins your fleet where it floats, with ${prizeCrew} crew; your ship keeps ${survivors - prizeCrew}${stays ? ' and stays where it started' : ''}.`
                : 'Too few survivors to crew a second ship.'}
            </button>
          </>
        )}
        {!userWon && (
          <button onClick={() => onFinish(result, undefined)} className={btnOn}>Continue</button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-xs items-start">
        <div className="min-w-0" style={{ color: attackerColor }}>
          <div className="uppercase tracking-widest truncate">⚔ {attackerName}</div>
          <div className="text-white/80">{a.length} aboard{reserve ? ` · ${reserve} in reserve` : ''}</div>
        </div>
        <div className="text-center text-white text-sm font-bold tracking-widest">{result ? 'DONE' : `${left}s`}</div>
        <div className="min-w-0 text-right" style={{ color: defenderColor }}>
          <div className="uppercase tracking-widest truncate">{defenderName}</div>
          <div className="text-white/80">{alive} defending</div>
        </div>
      </div>

      <div className="chess-sea-sticky space-y-3">
      <canvas
        ref={canvasRef}
        width={DECK.w * SCALE}
        height={DECK.h * SCALE}
        onClick={onCanvas}
        className="chess-sea-canvas w-full border border-[var(--color-border)] rounded-lg cursor-crosshair"
        style={{ aspectRatio: `${DECK.w} / ${DECK.h}` }}
      />

      {!result && (
        <div className="p-2.5 border border-amber-600/60 bg-amber-950/40 rounded-lg text-xs leading-snug">{hint}</div>
      )}
      </div>

      {resultPanel}

      {!result && mode === 'play' && (
        <div className="space-y-3 text-xs">
          {!engine.started && (
            <div className="space-y-1">
              <div className="uppercase tracking-widest text-white/70">Your crew: {engine.attackerCrew}</div>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={share}
                onChange={(e) => { setShare(Number(e.target.value)); setSwordShare(engine, Number(e.target.value) / 100); refresh(); }}
                className="w-full"
                aria-label="Swordsmen share"
              />
              <div className="text-white/70">
                ⚔ {engine.pool.sword} swordsmen (tough, fight up close) · 🔫 {engine.pool.musket} musketeers (shoot from range)
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <span className="uppercase tracking-widest text-white/70">Land</span>
            <button onClick={() => { setKind('sword'); setArmed(false); }} disabled={engine.pool.sword === 0} className={kind === 'sword' && !armed ? btnOn : btn}>
              ⚔ Swordsmen ({engine.pool.sword})
            </button>
            <button onClick={() => { setKind('musket'); setArmed(false); }} disabled={engine.pool.musket === 0} className={kind === 'musket' && !armed ? btnOn : btn}>
              🔫 Musketeers ({engine.pool.musket})
            </button>
            <button onClick={dropRest} disabled={reserve === 0} className={btn}>Land the rest</button>
          </div>
          <div className="text-white/60">Each tap lands a squad of {SQUAD_SIZE}.</div>

          <div className="space-y-1">
            <div className="h-2 bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-sky-400" style={{ width: `${(engine.energy / MAX_ENERGY) * 100}%` }} />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="uppercase tracking-widest text-white/70">Energy</span>
              <button
                onClick={() => { castRally(engine); refresh(); }}
                disabled={!engine.started || engine.energy < ABILITY_COST.rally}
                className={btn}
                title="Your troops move and hit harder for a few seconds"
              >
                📣 Rally ({ABILITY_COST.rally})
              </button>
              <button
                onClick={() => { castVolley(engine); refresh(); }}
                disabled={!engine.started || engine.energy < ABILITY_COST.volley}
                className={btn}
                title="Every musketeer in range fires at once"
              >
                🔫 Volley ({ABILITY_COST.volley})
              </button>
              <button
                onClick={() => setArmed((v) => !v)}
                disabled={!engine.started || engine.energy < ABILITY_COST.grenade}
                className={armed ? btnOn : btn}
                title="Blast a cluster of men — friend and foe"
              >
                💥 Grenade ({ABILITY_COST.grenade})
              </button>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="flex flex-wrap gap-2 items-center text-xs">
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => changeSpeed(s)} className={speed === s ? btnOn : btn}>{s}x</button>
          ))}
          <button
            onClick={skip}
            className={btn}
            title="Let the computer play out the rest of the fight"
          >
            {mode === 'watch' ? 'Skip' : 'Auto-battle'}
          </button>
        </div>
      )}
    </div>
  );
}
