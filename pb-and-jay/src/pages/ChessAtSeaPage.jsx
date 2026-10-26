import { useCallback, useEffect, useRef, useState } from 'react';
import ArcadeMenu from '../components/ArcadeMenu';
import ShipIcon from '../components/chessAtSea/ShipIcon';
import DeckBattleScene from '../components/chessAtSea/DeckBattleScene';
import './ChessAtSeaPage.css';
import {
  BATTLE_MODES, PIECES, SIDE, aiChoice, battleInfo, checkEnd, chooseAiMove, createGame,
  legalMoves, playMove, resolveBattle,
} from '../data/chessAtSea';
import { createBattle, estimateOdds } from '../data/deckBattle';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const LEVELS = { easy: 'Easy', normal: 'Normal' };

function shipName(color, type) {
  return `${SIDE[color]} ${PIECES[type].name}`;
}

function kingSquare(game, color) {
  for (const row of game.chess.board()) {
    for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  }
  return null;
}

export default function ChessAtSeaPage() {
  const [settings, setSettings] = useState({ battles: 'big', level: 'normal' });
  const gameRef = useRef(null);
  if (gameRef.current === null) {
    // ?fen=… starts from a given position — handy for trying out a particular fight.
    let fen;
    try { fen = new URLSearchParams(window.location.search).get('fen') || undefined; } catch { fen = undefined; }
    try { gameRef.current = createGame({ battles: 'big', fen }); } catch { gameRef.current = createGame({ battles: 'big' }); }
  }
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const timerRef = useRef(null);

  const [phase, setPhase] = useState('play'); // play | thinking | battle | over
  const [selected, setSelected] = useState(null);
  const [battle, setBattle] = useState(null); // { move, info, engine, mode }
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const game = gameRef.current;


  // After anything resolves: end the game, hand to the computer, or hand back to you.
  const settle = useCallback(() => {
    const g = gameRef.current;
    checkEnd(g);
    setSelected(null);
    if (g.winner) { setPhase('over'); refresh(); return; }
    if (g.chess.turn() === 'b') {
      setPhase('thinking');
      refresh();
      timerRef.current = setTimeout(() => {
        const mv = chooseAiMove(g, settingsRef.current.level);
        if (!mv) { checkEnd(g); setPhase(g.winner ? 'over' : 'play'); refresh(); return; }
        const info = battleInfo(g, mv);
        if (!info) {
          playMove(g, mv);
          settle();
        } else {
          setBattle({ move: mv, info, engine: createBattle({ attackerCrew: info.attackerCrew, defenderCrew: info.defenderCrew }), mode: 'watch' });
          setPhase('battle');
        }
      }, 350);
    } else {
      setPhase('play');
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    if (gameRef.current.chess.turn() === 'b') settle();
    return () => clearTimeout(timerRef.current);
  }, [settle]);

  const onBattleFinish = (result, choice) => {
    const { move, info } = battle;
    const attackerWon = result.winner === 'a';
    const userIsAttacker = info.attackerColor === 'w';
    const userWon = attackerWon === userIsAttacker;
    const winnerSurvivors = attackerWon ? result.attackerSurvivors : result.defenderSurvivors;
    const loserType = attackerWon ? info.defenderType : info.attackerType;
    resolveBattle(game, move, {
      winner: attackerWon ? 'attacker' : 'defender',
      attackerSurvivors: result.attackerSurvivors,
      defenderSurvivors: result.defenderSurvivors,
      choice: userWon ? choice || 'sink' : aiChoice(winnerSurvivors, loserType),
    });
    setBattle(null);
    settle();
  };

  const attempt = (move) => {
    const info = battleInfo(game, move);
    if (!info) {
      playMove(game, move);
      settle();
      return;
    }
    setBattle({ move, info, engine: createBattle({ attackerCrew: info.attackerCrew, defenderCrew: info.defenderCrew }), mode: 'play' });
    setSelected(null);
    setPhase('battle');
  };

  const targets = selected ? legalMoves(game, selected) : [];
  const targetMap = Object.fromEntries(targets.map((m) => [m.to, m]));

  const onSquare = (sq) => {
    if (phase !== 'play' || game.winner) return;
    const move = targetMap[sq];
    if (move) { attempt(move); return; }
    const p = game.chess.get(sq);
    setSelected(p && p.color === 'w' && p.color === game.chess.turn() ? sq : null);
  };

  const newGame = () => {
    clearTimeout(timerRef.current);
    gameRef.current = createGame({ battles: settings.battles });
    setBattle(null);
    setSelected(null);
    setPhase('play');
    refresh();
  };

  const changeSetting = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (patch.battles) game.battles = patch.battles;
  };

  const inCheck = (() => {
    try { return !game.winner && game.chess.isCheck(); } catch { return false; }
  })();
  const checkSq = inCheck ? kingSquare(game, game.chess.turn()) : null;
  const selectedPiece = selected ? game.chess.get(selected) : null;

  let hint;
  if (phase === 'over') hint = game.winner === 'w' ? `You win! ${game.endReason}` : game.winner === 'b' ? `Red wins. ${game.endReason}` : game.endReason;
  else if (phase === 'thinking') hint = 'Red is plotting its move…';
  else if (phase === 'battle') hint = '';
  else if (selected) hint = 'Tap a lit square to sail there. A red ring is a capture — and ⚔ means a boarding battle decides it.';
  else hint = `${inCheck ? 'Your flagship is in check! ' : ''}Your move. Tap one of your amber ships to see where it can go.`;

  const btn = 'px-3 py-2 border border-[var(--color-border)] rounded text-xs uppercase tracking-widest disabled:opacity-40';

  return (
    <div className="chess-sea-page min-h-screen bg-[var(--color-br-alt)] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-widest uppercase text-amber-400">Chess at Sea</h1>
            <p className="text-xs text-white uppercase tracking-widest mt-0.5">
              Sail your fleet · capture by boarding
            </p>
          </div>
          <ArcadeMenu />
        </div>

        {/* Settings */}
        {phase !== 'battle' && (
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-xs uppercase tracking-widest flex items-center gap-2">
            Battles
            <select
              value={settings.battles}
              onChange={(e) => changeSetting({ battles: e.target.value })}
              className="border border-[var(--color-border)] rounded px-2 py-2"
            >
              {Object.entries(BATTLE_MODES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs uppercase tracking-widest flex items-center gap-2">
            Opponent
            <select
              value={settings.level}
              onChange={(e) => changeSetting({ level: e.target.value })}
              className="border border-[var(--color-border)] rounded px-2 py-2"
            >
              {Object.entries(LEVELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <button onClick={newGame} className={btn}>New game</button>
        </div>
        )}

        {phase !== 'battle' && (
        <details className="text-[11px] text-white/80 tracking-wide leading-relaxed">
          <summary className="cursor-pointer uppercase tracking-widest text-amber-400 text-xs">How to play</summary>
          <div className="mt-2 space-y-1.5">
            <p>
              <b>It&apos;s chess.</b> You command the amber fleet (bottom) against red. Every ship moves like its chess piece, and
              you win by trapping the enemy flagship (checkmate) — or by boarding it.
            </p>
            <p>
              <b>Captures are boarding battles.</b> Moving onto an enemy ship starts a fight on its deck. Your crew is your army:
              a bigger crew nearly always wins, and a ship carries its casualties into every later fight. Lose and your attacking
              ship is lost — which can leave your own flagship exposed.
            </p>
            <p>
              <b>The winner chooses.</b> <i>Sink</i> the loser (an attacker then moves in at full strength), or take it as a
              <i> prize</i>: it switches sides where it floats, crewed by half your survivors, and your ship stays put.
            </p>
            <p>
              <b>Battle settings.</b> &quot;Big captures&quot; skips the deck fight when a sloop takes a sloop. &quot;Every capture&quot; makes
              all of them battles. &quot;No battles&quot; is plain chess.
            </p>
          </div>
        </details>
        )}

        {phase !== 'battle' && (
          <>
            <div className="p-2.5 border border-amber-600/60 bg-amber-950/40 rounded-lg text-xs leading-snug">{hint}</div>

            {/* Board */}
            <div className="chess-sea-board" role="grid" aria-label="Chess at Sea board">
              {RANKS.map((rank, r) => FILES.map((file, f) => {
                const sq = `${file}${rank}`;
                const piece = game.chess.get(sq);
                const move = targetMap[sq];
                const dark = (r + f) % 2 === 1;
                const last = game.lastMove && (game.lastMove.from === sq || game.lastMove.to === sq);
                const cls = [
                  'chess-sea-tile',
                  dark ? 'is-dark' : 'is-light',
                  last ? 'is-last' : '',
                  selected === sq ? 'is-selected' : '',
                  checkSq === sq ? 'is-check' : '',
                  move ? 'is-target' : '',
                  move?.captured ? 'is-capture' : '',
                ].join(' ');
                return (
                  <button
                    key={sq}
                    className={cls}
                    onClick={() => onSquare(sq)}
                    aria-label={`${sq}${piece ? ` ${shipName(piece.color, piece.type)}, crew ${game.crew[sq]}` : ''}`}
                  >
                    {piece && <ShipIcon type={piece.type} color={piece.color} className="chess-sea-ship" />}
                    {piece && <span className="chess-sea-glyph">{PIECES[piece.type].glyph}</span>}
                    {piece && <span className="chess-sea-crew">{game.crew[sq]}</span>}
                    {move && !move.captured && <span className="chess-sea-dot" />}
                    {move?.captured && battleInfo(game, move) && <span className="chess-sea-swords">⚔</span>}
                    {!piece && f === 0 && <span className="chess-sea-coord rank">{rank}</span>}
                    {!piece && r === 7 && <span className="chess-sea-coord file">{file}</span>}
                  </button>
                );
              }))}
            </div>

            {/* Selected ship */}
            {selectedPiece && (
              <div className="p-3 border border-[var(--color-border)] bg-[var(--color-surface2)] rounded-lg text-xs space-y-2">
                <div className="flex items-center gap-3">
                  <ShipIcon type={selectedPiece.type} color={selectedPiece.color} className="w-10 h-10 shrink-0" />
                  <div>
                    <div className="uppercase tracking-widest text-amber-400">{shipName(selectedPiece.color, selectedPiece.type)}</div>
                    <div className="text-white/70">Crew {game.crew[selected]} / {PIECES[selectedPiece.type].crew} · {PIECES[selectedPiece.type].blurb}</div>
                  </div>
                </div>
                {targets.some((m) => m.captured) && (
                  <div className="space-y-1">
                    <div className="uppercase tracking-widest text-white/70">Captures from here</div>
                    {targets.filter((m) => m.captured).map((m) => {
                      const info = battleInfo(game, m);
                      return (
                        <div key={m.to} className="flex justify-between">
                          <span>{m.to} — {PIECES[m.captured].name}</span>
                          <span className="text-white/70">
                            {info
                              ? `⚔ ${info.attackerCrew} v ${info.defenderCrew} crew · ~${Math.round(estimateOdds(info.attackerCrew, info.defenderCrew) * 100)}% to win`
                              : 'sinks at once'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Boarding battle */}
        {phase === 'battle' && battle && (
          <div className="space-y-3">
            <div className="uppercase tracking-widest text-sm text-amber-400">
              Boarding Battle — {shipName(battle.info.attackerColor, battle.info.attackerType)} attacks{' '}
              {shipName(battle.info.defenderColor, battle.info.defenderType)}
            </div>
            <DeckBattleScene
              key={`${battle.move.from}-${battle.move.to}-${game.log.length}`}
              engine={battle.engine}
              info={battle.info}
              playerIsAttacker={battle.info.attackerColor === 'w'}
              mode={battle.mode}
              attackerName={shipName(battle.info.attackerColor, battle.info.attackerType)}
              defenderName={shipName(battle.info.defenderColor, battle.info.defenderType)}
              onFinish={onBattleFinish}
            />
          </div>
        )}

        {/* Losses */}
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          {['b', 'w'].map((color) => (
            <div key={color} className="p-2.5 border border-[var(--color-border)] rounded-lg">
              <div className="uppercase tracking-widest text-white/70 mb-1">
                {color === 'b' ? 'Red ships lost' : 'Amber ships lost'}
              </div>
              <div className="flex flex-wrap gap-1 min-h-[28px]">
                {game.lost[color === 'b' ? 'b' : 'w'].length === 0 && <span className="text-white/40">none</span>}
                {game.lost[color === 'b' ? 'b' : 'w'].map((l, i) => (
                  <span key={i} className="relative inline-block w-7 h-7" title={`${PIECES[l.type].name} — ${l.how === 'taken' ? 'taken as a prize' : 'sunk'}`}>
                    <ShipIcon type={l.type} color={color} className="w-7 h-7 opacity-70" />
                    <span className="absolute -right-1 -top-1 text-[9px]">{l.how === 'taken' ? '⚑' : '✕'}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Log */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white mb-2">Captain&apos;s Log</div>
          <div className="h-32 overflow-y-auto bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)]">
            {[...game.log].reverse().map((m, i) => (
              <div key={`${game.log.length - i}-${m}`} className="px-3 py-1.5 text-xs">{m}</div>
            ))}
          </div>
        </div>

        {/* Fleet guide */}
        <details className="text-xs">
          <summary className="cursor-pointer uppercase tracking-widest text-amber-400">Fleet guide</summary>
          <div className="mt-2 grid sm:grid-cols-2 gap-2">
            {['k', 'q', 'r', 'b', 'n', 'p'].map((t) => (
              <div key={t} className="flex items-center gap-3 p-2 border border-[var(--color-border)] rounded-lg">
                <ShipIcon type={t} color="w" className="w-9 h-9 shrink-0" />
                <div>
                  <div>{PIECES[t].name} <span className="text-white/50">{PIECES[t].glyph} · crew {PIECES[t].crew}</span></div>
                  <div className="text-white/60">{PIECES[t].blurb}</div>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
