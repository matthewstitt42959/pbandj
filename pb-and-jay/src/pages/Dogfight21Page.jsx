import { useState, useCallback, useEffect, useRef } from 'react';
import './Dogfight21Page.css';
import ArcadeMenu from '../components/ArcadeMenu';
import { PLANE_ART, rankLabel, buildDeck, shuffle } from '../data/planeDeck';

// Blackjack, but the target is random instead of a fixed 21.
//
// Jack/Queen/King (values 11-13) count as 10 for hit/stand/bust math, same
// as real blackjack — they keep their own art and corner rank for card
// identity, but the arithmetic treats them as 10. That "lots of 10s"
// clustering turned out to matter far more for getting blackjack-like odds
// than the target range does: simulating identical-strategy play, capping
// face cards lands around 40% player / 51% dealer / 9% push regardless of
// range, versus a lopsided ~65/31 with their raw plane values (2-13).
//
// MIN_TARGET stays at 21 and up (never lower): with face cards capped at
// 10, the highest possible 2-card hand is 10+10=20, so a target of 21+
// guarantees the opening deal can never bust before the player gets a
// single Hit/Stand decision — not just unlikely, structurally impossible.
const MIN_TARGET = 21;
const MAX_TARGET = 25;
const DEALER_STAND_MARGIN = 4; // dealer (and auto-play) stops hitting within this of target
const RESHUFFLE_THRESHOLD = 6; // keep a continuous shoe instead of running out mid-round

function rollTarget() {
  return MIN_TARGET + Math.floor(Math.random() * (MAX_TARGET - MIN_TARGET + 1));
}

function blackjackValue(card) {
  return Math.min(card.value, 10);
}

function sumOf(hand) {
  return hand.reduce((total, card) => total + blackjackValue(card), 0);
}

// Draws one card, reshuffling a fresh shoe onto the deck first if it's
// running low — mirrors a real table topping up from a shoe mid-shift.
function draw(deck) {
  const d = deck.length < RESHUFFLE_THRESHOLD ? [...deck, ...shuffle(buildDeck())] : deck;
  return { card: d[0], deck: d.slice(1) };
}

function dealHand(deck) {
  let d = deck;
  const hand = [];
  for (let i = 0; i < 2; i++) {
    const r = draw(d);
    d = r.deck;
    hand.push(r.card);
  }
  return { hand, deck: d };
}

// Deals a fresh round on top of the running match state (log, round count,
// score tally). The immediate-bust check below is now unreachable in
// practice (MIN_TARGET guarantees it can't happen) but stays as a guard in
// case that constant ever changes — better a dead branch than a live bug.
function startRound(state) {
  const p = dealHand(state.deck);
  const d = dealHand(p.deck);
  const dealt = {
    ...state,
    deck: d.deck,
    target: rollTarget(),
    playerHand: p.hand,
    dealerHand: d.hand,
    phase: 'player-turn',
    ownRevealed: false,
  };
  return sumOf(dealt.playerHand) > dealt.target ? resolveRound(dealt) : dealt;
}

// The player's own second card starts hidden, mirroring the dealer's hole
// card, until they choose to look at it.
function revealOwnHand(state) {
  if (state.phase !== 'player-turn' || state.ownRevealed) return state;
  return { ...state, ownRevealed: true };
}

function initGame() {
  return startRound({
    deck: shuffle(buildDeck()),
    target: 0,
    playerHand: [],
    dealerHand: [],
    phase: 'player-turn',
    ownRevealed: false,
    log: [],
    round: 0,
    playerWins: 0,
    dealerWins: 0,
    pushes: 0,
  });
}

function nextRound(state) {
  return state.phase === 'round-over' ? startRound(state) : state;
}

// Bust status is always derived from the hand/target, never passed in as a
// flag — that way a hand that was already over target when dealt resolves
// the same way as one that busted from a Hit.
function resolveRound(state) {
  const { target, playerHand } = state;
  const playerSum = sumOf(playerHand);
  const playerBusted = playerSum > target;
  let deck = state.deck;
  let dealerHand = state.dealerHand;

  if (!playerBusted) {
    let dealerSum = sumOf(dealerHand);
    while (dealerSum < target - DEALER_STAND_MARGIN) {
      const r = draw(deck);
      deck = r.deck;
      dealerHand = [...dealerHand, r.card];
      dealerSum = sumOf(dealerHand);
    }
  }
  const dealerSum = sumOf(dealerHand);

  let winner;
  let msg;
  if (playerBusted) {
    winner = 'dealer';
    msg = `You bust at ${playerSum} (target ${target}) — dealer wins`;
  } else if (dealerSum > target) {
    winner = 'player';
    msg = `Dealer busts at ${dealerSum} (target ${target}) — you win`;
  } else if (playerSum > dealerSum) {
    winner = 'player';
    msg = `You hold ${playerSum}, dealer holds ${dealerSum} (target ${target}) — you win`;
  } else if (dealerSum > playerSum) {
    winner = 'dealer';
    msg = `Dealer holds ${dealerSum}, you hold ${playerSum} (target ${target}) — dealer wins`;
  } else {
    winner = 'push';
    msg = `Both land on ${playerSum} (target ${target}) — push`;
  }

  const round = state.round + 1;
  const entry = { id: round, round, target, playerSum, dealerSum, winner, msg };

  return {
    ...state,
    deck,
    dealerHand,
    phase: 'round-over',
    log: [...state.log, entry].slice(-60),
    round,
    playerWins: state.playerWins + (winner === 'player' ? 1 : 0),
    dealerWins: state.dealerWins + (winner === 'dealer' ? 1 : 0),
    pushes: state.pushes + (winner === 'push' ? 1 : 0),
  };
}

function playerHit(state) {
  if (state.phase !== 'player-turn') return state;
  const { card, deck } = draw(state.deck);
  const playerHand = [...state.playerHand, card];
  const next = { ...state, deck, playerHand };
  return sumOf(playerHand) > state.target ? resolveRound(next) : next;
}

function playerStand(state) {
  if (state.phase !== 'player-turn') return state;
  return resolveRound(state);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dogfight21Page() {
  const [game, setGame] = useState(initGame);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(900);
  const logRef = useRef(null);

  const revealHand = () => {
    if (autoPlay) return;
    setGame((prev) => revealOwnHand(prev));
  };

  const hit = () => {
    if (autoPlay) return;
    setGame((prev) => playerHit(prev));
  };

  const stand = () => {
    if (autoPlay) return;
    setGame((prev) => playerStand(prev));
  };

  const nextRoundClick = () => {
    if (autoPlay) return;
    setGame((prev) => nextRound(prev));
  };

  const restart = () => {
    setAutoPlay(false);
    setGame(initGame());
  };

  // Auto-play: reveal the hidden card first (its own tick, so the flip is
  // still visible), then hit while below the dealer's own stopping
  // threshold, stand otherwise, then move on once a round resolves.
  const autoStep = useCallback(() => {
    setGame((prev) => {
      if (prev.phase === 'round-over') return nextRound(prev);
      if (!prev.ownRevealed) return revealOwnHand(prev);
      const sum = sumOf(prev.playerHand);
      if (sum < prev.target - DEALER_STAND_MARGIN) return playerHit(prev);
      return playerStand(prev);
    });
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(autoStep, speed);
    return () => clearInterval(id);
  }, [autoPlay, speed, autoStep]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [game.log.length]);

  const { target, playerHand, dealerHand, phase, log, playerWins, dealerWins, pushes, ownRevealed } = game;
  const playerSum = sumOf(playerHand);
  const revealed = phase === 'round-over';
  const dealerSum = sumOf(dealerHand);
  const decided = playerWins + dealerWins;
  const playerPct = decided > 0 ? (playerWins / decided) * 100 : 50;
  const lastEntry = log[log.length - 1];
  const speedLabel = speed <= 350 ? 'Fast' : speed <= 900 ? 'Normal' : 'Slow';

  return (
    <div className="dogfight21-page min-h-screen bg-[var(--color-br-alt)] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-widest uppercase text-emerald-400">Dogfight 21</h1>
            <p className="text-xs text-white uppercase tracking-widest mt-0.5">
              Push your luck to a random target altitude
              {game.round > 0 && <span className="ml-3 text-white">Round {game.round}</span>}
            </p>
          </div>
          <ArcadeMenu />
        </div>

        {/* Match record bar */}
        <div>
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-white mb-1.5">
            <span className="text-emerald-400">You · {playerWins}</span>
            <span>Match Record{pushes > 0 && ` · ${pushes} push${pushes === 1 ? '' : 'es'}`}</span>
            <span>Dealer · {dealerWins}</span>
          </div>
          <div className="h-2.5 bg-[var(--color-surface2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${playerPct}%` }}
            />
          </div>
        </div>

        {/* Target altitude */}
        <div className="dogfight21-target">
          <span className="text-[10px] uppercase tracking-widest text-white/60">Target Altitude</span>
          <span className="text-3xl font-bold text-emerald-400">{target}</span>
        </div>

        {/* Hands */}
        <div className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white mb-2">
              Your Hand —{' '}
              {!ownRevealed && phase === 'player-turn'
                ? 'Tap your hidden card'
                : playerSum > target
                ? <span className="text-red-400">Bust at {playerSum}</span>
                : `Total ${playerSum}`}
            </div>
            <div className="flex flex-wrap gap-2">
              {playerHand.map((card, i) => {
                const hidden = phase === 'player-turn' && i === 1 && !ownRevealed;
                return (
                  <div key={i} className="dogfight21-card-wrap">
                    {hidden ? (
                      <button
                        type="button"
                        onClick={revealHand}
                        disabled={autoPlay}
                        aria-label="Reveal your hidden card"
                        className="dogfight21-card-back dogfight21-card-back--reveal"
                      >
                        ?
                      </button>
                    ) : (
                      PLANE_ART[card.name] && (
                        <div className="dogfight21-card-art-wrap">
                          <img src={PLANE_ART[card.name]} alt="" className="dogfight21-card-art" />
                          <span className="dogfight21-card-rank">{rankLabel(card.value)}</span>
                        </div>
                      )
                    )}
                    <div className="text-[9px] uppercase tracking-widest text-white/70 truncate">
                      {hidden ? 'Tap to reveal' : card.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-white mb-2">
              Dealer's Hand — {revealed ? `Total ${dealerSum}` : `Showing ${blackjackValue(dealerHand[0])}`}
            </div>
            <div className="flex flex-wrap gap-2">
              {dealerHand.map((card, i) => {
                const hidden = !revealed && i === 1;
                return (
                  <div key={i} className="dogfight21-card-wrap">
                    {hidden ? (
                      <div className="dogfight21-card-back">?</div>
                    ) : (
                      PLANE_ART[card.name] && (
                        <div className="dogfight21-card-art-wrap">
                          <img src={PLANE_ART[card.name]} alt="" className="dogfight21-card-art" />
                          <span className="dogfight21-card-rank">{rankLabel(card.value)}</span>
                        </div>
                      )
                    )}
                    <div className="text-[9px] uppercase tracking-widest text-white/70 truncate">
                      {hidden ? 'Hidden' : card.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reveal, then Hit / Stand */}
        {phase === 'player-turn' && !ownRevealed && (
          <button
            onClick={revealHand}
            disabled={autoPlay}
            className="w-full py-2.5 px-5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] uppercase tracking-widest rounded font-semibold transition-colors"
          >
            Reveal Your Hand
          </button>
        )}
        {phase === 'player-turn' && ownRevealed && (
          <div className="flex gap-3">
            <button
              onClick={hit}
              disabled={autoPlay}
              className="flex-1 py-2.5 px-5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] uppercase tracking-widest rounded font-semibold transition-colors"
            >
              Hit
            </button>
            <button
              onClick={stand}
              disabled={autoPlay}
              className="flex-1 py-2.5 px-5 border border-[var(--color-border)] bg-[var(--color-surface2)] hover:border-emerald-500 disabled:opacity-50 text-white text-[11px] uppercase tracking-widest rounded transition-colors"
            >
              Stand
            </button>
          </div>
        )}

        {/* Round result */}
        {phase === 'round-over' && lastEntry && (
          <div
            className={`dogfight21-result border rounded-lg p-4 ${
              lastEntry.winner === 'player'
                ? 'border-emerald-700 bg-emerald-950/20'
                : lastEntry.winner === 'dealer'
                ? 'border-red-800 bg-red-950/20'
                : 'border-[var(--color-border)] bg-[var(--color-surface2)]'
            }`}
          >
            <div className="text-xs text-white">{lastEntry.msg}</div>
            {!autoPlay && (
              <button
                onClick={nextRoundClick}
                className="mt-3 w-full py-2.5 px-5 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] uppercase tracking-widest rounded font-semibold transition-colors"
              >
                Next Round
              </button>
            )}
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
                <div key={entry.id} className="flex items-center gap-2.5 px-3 py-1.5 text-[11px]">
                  <span className="text-white w-7 flex-shrink-0 font-mono text-right">{entry.round}</span>
                  <span
                    className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${
                      entry.winner === 'player' ? 'bg-emerald-500' : entry.winner === 'dealer' ? 'bg-white/40' : 'bg-amber-500'
                    }`}
                  />
                  <span className="flex-1 truncate text-white">{entry.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => setAutoPlay((v) => !v)}
            className={`py-2.5 px-5 text-[11px] uppercase tracking-widest rounded font-semibold transition-colors ${
              autoPlay ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white'
            }`}
          >
            {autoPlay ? 'Stop' : 'Auto Play'}
          </button>

          <button
            onClick={restart}
            className="py-2.5 px-5 border border-[var(--color-border)] bg-[var(--color-surface2)] hover:border-[var(--color-accent)] text-white text-[11px] uppercase tracking-widest rounded transition-colors"
          >
            Restart
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] uppercase tracking-widest text-white">Speed</span>
            <input
              type="range"
              min={200}
              max={2000}
              step={100}
              value={2200 - speed}
              onChange={(e) => setSpeed(2200 - Number(e.target.value))}
              className="w-24 accent-emerald-500"
            />
            <span className="text-[10px] text-white w-10">{speedLabel}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
