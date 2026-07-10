import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './AerialWarPage.css';

// Simple dart-shaped plane silhouette — not meant to be an accurate WWI/WWII
// aircraft, just enough visual flavor to sell "one side vs. the other."
function PlaneIcon({ color, facing = 'right' }) {
  const points = facing === 'right' ? '98,15 6,2 34,15 6,28' : '2,15 94,2 66,15 94,28';
  return (
    <svg viewBox="0 0 100 30" width="72" height="22" aria-hidden="true">
      <polygon points={points} fill={color} />
    </svg>
  );
}

// Ported from broken-archive's admin lab (src/app/admin/war-game/page.tsx),
// stripped of Next.js "use client" + TypeScript types. Game logic unchanged.

// ── Data ─────────────────────────────────────────────────────────────────────

const BASE_DECK = [
  { name: 'Nieuport 17',      value:  2, era: 'WWI'  },
  { name: 'Albatros D.III',   value:  3, era: 'WWI'  },
  { name: 'Sopwith Camel',    value:  4, era: 'WWI'  },
  { name: 'Fokker Dr.I',      value:  5, era: 'WWI'  },
  { name: 'SPAD XIII',        value:  6, era: 'WWI'  },
  { name: 'Hurricane',        value:  7, era: 'WWII' },
  { name: 'Zero',             value:  8, era: 'WWII' },
  { name: 'Bf-109',           value:  9, era: 'WWII' },
  { name: 'Fw 190',           value: 10, era: 'WWII' },
  { name: 'Spitfire',         value: 11, era: 'WWII' },
  { name: 'P-47 Thunderbolt', value: 12, era: 'WWII' },
  { name: 'P-51 Mustang',     value: 13, era: 'WWII' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDeck() {
  return [...BASE_DECK, ...BASE_DECK, ...BASE_DECK, ...BASE_DECK];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── War resolution (mutates arrays in-place) ──────────────────────────────────

function resolveWar(p1, p2, pot, depth = 0) {
  if (depth > 4) {
    const half = Math.floor(pot.length / 2);
    p1.push(...shuffle(pot.splice(0, half)));
    p2.push(...shuffle(pot.splice(0)));
    return { winner: 0, detail: 'Endless war — pot split' };
  }

  const burn = Math.min(3, p1.length, p2.length);
  for (let i = 0; i < burn; i++) pot.push(p1.shift(), p2.shift());

  if (!p1.length && !p2.length) return { winner: 0, detail: 'Both ran out during war' };
  if (!p1.length) { p2.push(...shuffle(pot.splice(0))); return { winner: 2, detail: 'P1 ran out during war' }; }
  if (!p2.length) { p1.push(...shuffle(pot.splice(0))); return { winner: 1, detail: 'P2 ran out during war' }; }

  const c1 = p1.shift();
  const c2 = p2.shift();
  pot.push(c1, c2);

  if (c1.value > c2.value) {
    p1.push(...shuffle(pot.splice(0)));
    return { winner: 1, detail: `${c1.name} (${c1.value}) vs ${c2.name} (${c2.value}) — P1 claims the pot` };
  }
  if (c2.value > c1.value) {
    p2.push(...shuffle(pot.splice(0)));
    return { winner: 2, detail: `${c1.name} (${c1.value}) vs ${c2.name} (${c2.value}) — P2 claims the pot` };
  }

  const r = resolveWar(p1, p2, pot, depth + 1);
  return { winner: r.winner, detail: `Double war! ${r.detail}` };
}

// ── Game state ────────────────────────────────────────────────────────────────
// p1/p2 are a single array: indices 0-2 are the visible hand, rest is deck.
// Winnings are appended to the end so the hand naturally cycles through cards.

function initGame() {
  const deck = shuffle(buildDeck());
  const mid = deck.length / 2;
  return {
    p1: deck.slice(0, mid),
    p2: deck.slice(mid),
    log: [],
    phase: 'choose',
    round: 0,
    winner: null,
  };
}

function applyRound(state, p1Idx) {
  const p1 = [...state.p1];
  const p2 = [...state.p2];

  // P1 plays chosen hand card; P2 plays a random card from their hand
  const p1Card = p1.splice(p1Idx, 1)[0];
  const p2HandSize = Math.min(3, p2.length);
  const p2Card = p2.splice(Math.floor(Math.random() * p2HandSize), 1)[0];

  const pot = [p1Card, p2Card];
  let winner;
  let msg;
  let isWar = false;

  if (p1Card.value > p2Card.value) {
    winner = 1;
    p1.push(...shuffle(pot));
    msg = `${p1Card.name} (${p1Card.value}) beats ${p2Card.name} (${p2Card.value}) — Player 1 wins`;
  } else if (p2Card.value > p1Card.value) {
    winner = 2;
    p2.push(...shuffle(pot));
    msg = `${p2Card.name} (${p2Card.value}) beats ${p1Card.name} (${p1Card.value}) — Player 2 wins`;
  } else {
    isWar = true;
    const r = resolveWar(p1, p2, pot);
    winner = r.winner;
    msg = `WAR! ${p1Card.name} ties ${p2Card.name} at ${p1Card.value} — ${r.detail}`;
  }

  const round = state.round + 1;
  const gameOver = !p1.length || !p2.length;

  const entry = {
    id: round,
    round,
    p1Name: p1Card.name, p1Val: p1Card.value,
    p2Name: p2Card.name, p2Val: p2Card.value,
    msg, winner, isWar,
    p1Total: p1.length,
    p2Total: p2.length,
  };

  return {
    p1, p2,
    log: [...state.log, entry].slice(-60),
    phase: gameOver ? 'done' : 'choose',
    round,
    winner: gameOver ? (p1.length ? 'Player 1' : 'Player 2') : null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AerialWarPage() {
  const [game, setGame] = useState(initGame);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(800); // ms delay between auto rounds
  const logRef = useRef(null);

  // Auto-play: P1 always plays the highest card in hand
  const autoStep = useCallback(() => {
    setGame((prev) => {
      if (prev.phase !== 'choose' || !prev.p1.length) return prev;
      const handSize = Math.min(3, prev.p1.length);
      let best = 0;
      for (let i = 1; i < handSize; i++) {
        if (prev.p1[i].value > prev.p1[best].value) best = i;
      }
      return applyRound(prev, best);
    });
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(autoStep, speed);
    return () => clearInterval(id);
  }, [autoPlay, speed, autoStep]);

  // Stop auto-play when game ends
  useEffect(() => {
    if (game.phase === 'done') setAutoPlay(false);
  }, [game.phase]);

  // Scroll log to bottom on new entry
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [game.log.length]);

  const handleCardClick = (idx) => {
    if (game.phase !== 'choose' || autoPlay) return;
    setGame((prev) => applyRound(prev, idx));
  };

  const restart = () => {
    setAutoPlay(false);
    setGame(initGame());
  };

  const { p1, p2, log, phase, round, winner } = game;
  const total = p1.length + p2.length;
  const p1Pct = total > 0 ? (p1.length / total) * 100 : 50;
  const p1Hand = p1.slice(0, Math.min(3, p1.length));
  const p2HandSize = Math.min(3, p2.length);
  const lastEntry = log[log.length - 1];

  const speedLabel = speed <= 350 ? 'Fast' : speed <= 900 ? 'Normal' : 'Slow';

  return (
    <div className="aerial-war-page min-h-screen bg-[var(--color-br-alt)] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-widest uppercase text-amber-400">Aerial War</h1>
            <p className="text-xs text-white uppercase tracking-widest mt-0.5">
              WWI &amp; WWII Plane Card Game
              {round > 0 && <span className="ml-3 text-white">Round {round}</span>}
            </p>
          </div>
          <Link to="/" className="aerial-war-back-link text-xs uppercase tracking-widest text-amber-400">
            ← Hub
          </Link>
        </div>

        {/* Game over */}
        {phase === 'done' && (
          <div className="p-4 border border-amber-600 bg-amber-950/30 rounded-lg text-center">
            <div className="text-amber-400 text-lg font-bold tracking-widest uppercase">
              {winner ?? 'Draw'} Wins!
            </div>
            <div className="text-xs text-white mt-1">Completed in {round} rounds</div>
          </div>
        )}

        {/* Momentum bar */}
        <div>
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-white mb-1.5">
            <span className="text-amber-500">You · {p1.length}</span>
            <span>Deck Momentum</span>
            <span>Opponent · {p2.length}</span>
          </div>
          <div className="h-2.5 bg-[var(--color-surface2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${p1Pct}%` }}
            />
          </div>
        </div>

        {/* Squadrons */}
        <div className="flex items-center justify-between px-1">
          <PlaneIcon color="#f59e0b" facing="right" />
          <span className="text-[9px] uppercase tracking-widest text-white/40">vs</span>
          <PlaneIcon color="#e5e5e5" facing="left" />
        </div>

        {/* Hands */}
        {phase === 'choose' && (
          <div className="space-y-4">

            {/* P1 hand — clickable */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white mb-2">
                {autoPlay ? 'Your Hand (Auto-playing)' : 'Your Hand — choose a card'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {p1Hand.map((card, i) => (
                  <button
                    key={i}
                    onClick={() => handleCardClick(i)}
                    disabled={autoPlay}
                    className={`p-3 border rounded-lg text-left transition-all ${
                      autoPlay
                        ? 'border-[var(--color-border)] bg-[var(--color-surface2)] cursor-default opacity-50'
                        : 'border-[var(--color-border)] bg-[var(--color-surface2)] hover:border-amber-500 hover:bg-[var(--color-surface2)] active:scale-95 cursor-pointer'
                    }`}
                  >
                    <div className="text-[9px] uppercase tracking-widest text-white mb-1">{card.era}</div>
                    <div className="text-xs font-semibold text-white leading-tight mb-2">{card.name}</div>
                    <div className="text-xl font-bold text-amber-400">{card.value}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* P2 hand — face down */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white mb-2">Opponent's Hand</div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: p2HandSize }).map((_, i) => (
                  <div key={i} className="p-3 border border-[var(--color-border)] bg-[var(--color-surface2)]/50 rounded-lg">
                    <div className="text-[9px] uppercase tracking-widest text-white mb-1">???</div>
                    <div className="text-xs font-semibold text-white leading-tight mb-2">Unknown</div>
                    <div className="text-xl font-bold text-white">?</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Last round result */}
        {lastEntry && (
          <div className={`border rounded-lg p-4 ${lastEntry.isWar ? 'border-red-800 bg-red-950/20' : 'border-[var(--color-border)] bg-[var(--color-surface2)]'}`}>
            {lastEntry.isWar && (
              <div className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2">War</div>
            )}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white mb-1">You played</div>
                <div className="text-sm font-semibold text-white">{lastEntry.p1Name}</div>
                <div className="text-xs text-amber-500 mt-0.5">Value {lastEntry.p1Val}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white mb-1">Opponent played</div>
                <div className="text-sm font-semibold text-white">{lastEntry.p2Name}</div>
                <div className="text-xs text-white mt-0.5">Value {lastEntry.p2Val}</div>
              </div>
            </div>
            <div className="text-xs text-white border-t border-[var(--color-border)] pt-3">{lastEntry.msg}</div>
          </div>
        )}

        {/* Battle log */}
        {log.length > 1 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white mb-2">Battle Log</div>
            <div
              ref={logRef}
              className="h-44 overflow-y-auto bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)]"
            >
              {log.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2.5 px-3 py-1.5 text-[11px] ${entry.isWar ? 'bg-red-950/10' : ''}`}
                >
                  <span className="text-white w-7 flex-shrink-0 font-mono text-right">{entry.round}</span>
                  <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                    entry.winner === 1 ? 'bg-amber-500' : entry.winner === 2 ? 'bg-white/40' : 'bg-red-600'
                  }`} />
                  <span className={`flex-1 truncate ${entry.isWar ? 'text-red-300/80' : 'text-white'}`}>
                    {entry.msg}
                  </span>
                  <span className="text-white flex-shrink-0 font-mono text-[10px] tabular-nums">
                    {entry.p1Total}/{entry.p2Total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {phase !== 'done' && (
            <button
              onClick={() => setAutoPlay((v) => !v)}
              className={`py-2.5 px-5 text-[11px] uppercase tracking-widest rounded font-semibold transition-colors ${
                autoPlay
                  ? 'bg-red-800 hover:bg-red-700 text-white'
                  : 'bg-amber-700 hover:bg-amber-600 text-white'
              }`}
            >
              {autoPlay ? 'Stop' : 'Auto Play'}
            </button>
          )}

          {phase === 'done' && (
            <button
              onClick={restart}
              className="py-2.5 px-5 bg-amber-700 hover:bg-amber-600 text-white text-[11px] uppercase tracking-widest rounded font-semibold transition-colors"
            >
              Play Again
            </button>
          )}

          {phase !== 'done' && (
            <button
              onClick={restart}
              className="py-2.5 px-5 border border-[var(--color-border)] bg-[var(--color-surface2)] hover:border-[var(--color-accent)] text-white hover:text-white text-[11px] uppercase tracking-widest rounded transition-colors"
            >
              Restart
            </button>
          )}

          {/* Speed slider — only shown during an active game */}
          {phase !== 'done' && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px] uppercase tracking-widest text-white">Speed</span>
              <input
                type="range"
                min={200}
                max={2000}
                step={100}
                value={2200 - speed}
                onChange={(e) => setSpeed(2200 - Number(e.target.value))}
                className="w-24 accent-amber-500"
              />
              <span className="text-[10px] text-white w-10">{speedLabel}</span>
            </div>
          )}
        </div>

        {/* Plane reference */}
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[var(--color-surface2)] border-b border-[var(--color-border)]">
            <span className="text-[10px] uppercase tracking-widest text-white">Plane Reference</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {BASE_DECK.map((card) => (
              <div key={card.name} className="flex items-center justify-between px-4 py-2">
                <div>
                  <span className="text-xs text-white">{card.name}</span>
                  <span className="ml-2 text-[9px] uppercase tracking-widest text-white">{card.era}</span>
                </div>
                <span className="text-xs font-mono text-amber-500">{card.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
