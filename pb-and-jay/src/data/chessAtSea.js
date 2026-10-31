// Game logic for Chess at Sea — standard chess played with ships, where a
// capture is settled by a boarding battle (see deckBattle.js).
//
// chess.js owns the rules of chess. This module adds what the ships bring:
//   - every ship has a crew that carries from battle to battle,
//   - captures between big ships are boarding battles, not automatic,
//   - the winner of a battle chooses: SINK the loser, or take it as a PRIZE.
//
//   Sink:  the loser is removed. A winning attacker moves onto the square, as in
//          chess, with its survivors intact.
//   Prize: the loser switches sides on its own square, crewed by half the
//          winner's survivors. A winning attacker stays where it started.
//
// An attacker that loses is sunk or taken — never left alone. That can leave
// its own flagship exposed, and the enemy may then board it.

import { Chess } from 'chess.js';
import { estimateOdds } from './deckBattle';

export const PIECES = {
  p: { name: 'Sloop', crew: 6, glyph: '♟', blurb: 'moves forward, takes diagonally' },
  n: { name: 'Frigate', crew: 10, glyph: '♞', blurb: 'jumps in an L' },
  b: { name: 'Brig', crew: 10, glyph: '♝', blurb: 'sails any distance diagonally' },
  r: { name: 'Ship of the Line', crew: 16, glyph: '♜', blurb: 'sails any distance in straight lines' },
  q: { name: 'Man-of-War', crew: 22, glyph: '♛', blurb: 'sails any distance in any direction' },
  k: { name: 'Flagship', crew: 14, glyph: '♚', blurb: 'one square at a time — lose it and the battle is lost' },
};

export const SIDE = { w: 'Amber', b: 'Red' };
export const BATTLE_MODES = {
  big: 'Big captures',
  all: 'Every capture',
  none: 'No battles (plain chess)',
};

const other = (c) => (c === 'w' ? 'b' : 'w');

// `fen` starts from a given position instead of the usual setup (for testing).
export function createGame({ battles = 'big', fen } = {}) {
  const chess = new Chess();
  if (fen) chess.load(fen);
  const crew = {};
  for (const row of chess.board()) {
    for (const p of row) if (p) crew[p.square] = PIECES[p.type].crew;
  }
  return {
    chess,
    crew,
    battles,
    log: ['The fleets are drawn up. Amber sails first.'],
    lost: { w: [], b: [] },
    winner: null,
    endReason: '',
    lastMove: null,
  };
}

export function legalMoves(game, from) {
  // Promotion is always a refit into a man-of-war, so offer just that one.
  return game.chess
    .moves({ square: from, verbose: true })
    .filter((m) => !m.promotion || m.promotion === 'q');
}

export function allLegalMoves(game) {
  return game.chess.moves({ verbose: true }).filter((m) => !m.promotion || m.promotion === 'q');
}

// Describe the boarding battle a move would start, or null if it needs none.
export function battleInfo(game, move) {
  if (!move.captured) return null;
  if (game.battles === 'none') return null;
  if (game.battles === 'big' && move.piece === 'p' && move.captured === 'p') return null;
  const targetSq = move.flags.includes('e') ? move.to[0] + move.from[1] : move.to;
  return {
    attackerSq: move.from,
    targetSq,
    attackerType: move.piece,
    defenderType: move.captured,
    attackerColor: move.color,
    defenderColor: other(move.color),
    attackerCrew: game.crew[move.from],
    defenderCrew: game.crew[targetSq],
    kingCapture: move.captured === 'k',
  };
}

function say(game, msg) {
  game.log.push(msg);
  if (game.log.length > 60) game.log.shift();
}

function who(game, color, type) {
  return `${SIDE[color]} ${PIECES[type].name}`;
}

// ── Making moves ──────────────────────────────────────────────────────────────

// Make a move on the chess board and carry the crews with it.
function applyChessMove(game, move, carriedCrew) {
  const { chess, crew } = game;
  const m = chess.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: 'q' } : {}) });
  const carried = carriedCrew ?? crew[m.from];
  delete crew[m.from];
  if (m.flags.includes('e')) delete crew[m.to[0] + m.from[1]];
  crew[m.to] = m.promotion ? PIECES.q.crew : carried;
  if (m.flags.includes('k') || m.flags.includes('q')) {
    const rank = m.color === 'w' ? '1' : '8';
    const kingside = m.flags.includes('k');
    crew[(kingside ? 'f' : 'd') + rank] = crew[(kingside ? 'h' : 'a') + rank];
    delete crew[(kingside ? 'h' : 'a') + rank];
  }
  if (m.captured) game.lost[other(m.color)].push({ type: m.captured, how: 'sunk' });
  game.lastMove = { from: m.from, to: m.to };
  return m;
}

// A move with no battle: an ordinary step, or a capture that resolves at once.
export function playMove(game, move) {
  const m = applyChessMove(game, move);
  if (m.captured === 'k') {
    game.winner = m.color;
    game.endReason = 'The flagship is taken — the day is won!';
    say(game, `${who(game, m.color, m.piece)} takes the enemy flagship!`);
    return m;
  }
  if (m.captured) say(game, `${who(game, m.color, m.piece)} sinks a ${PIECES[m.captured].name}.`);
  else if (m.promotion) say(game, `${who(game, m.color, 'p')} is refitted as a Man-of-War!`);
  checkEnd(game);
  return m;
}

// Replace chess.js's position with edited pieces and the given side to move.
// (chess.js can't "pass", and prizes change a ship's side.)
function rebuild(game, edits, turn) {
  const { chess } = game;
  const grid = chess.board().map((row) => row.map((p) => (p ? { type: p.type, color: p.color } : null)));
  for (const [sq, p] of Object.entries(edits)) grid[8 - Number(sq[1])][sq.charCodeAt(0) - 97] = p;
  const at = (sq) => grid[8 - Number(sq[1])][sq.charCodeAt(0) - 97];

  let castling = '';
  for (const color of ['w', 'b']) {
    const rank = color === 'w' ? '1' : '8';
    const rights = chess.getCastlingRights(color);
    const kingHome = at(`e${rank}`);
    const ok = (corner) => at(corner + rank)?.type === 'r' && at(corner + rank)?.color === color;
    const kingOk = kingHome?.type === 'k' && kingHome?.color === color;
    if (rights.k && kingOk && ok('h')) castling += color === 'w' ? 'K' : 'k';
    if (rights.q && kingOk && ok('a')) castling += color === 'w' ? 'Q' : 'q';
  }
  castling = castling.split('').sort((x, y) => 'KQkq'.indexOf(x) - 'KQkq'.indexOf(y)).join('') || '-';

  const placement = grid
    .map((row) => {
      let s = '';
      let empty = 0;
      for (const p of row) {
        if (!p) { empty++; continue; }
        if (empty) { s += empty; empty = 0; }
        s += p.color === 'w' ? p.type.toUpperCase() : p.type;
      }
      return s + (empty || '');
    })
    .join('/');
  chess.load(`${placement} ${turn} ${castling} - 0 ${chess.moveNumber()}`, { skipValidation: true });
}

// outcome: { winner: 'attacker'|'defender', attackerSurvivors, defenderSurvivors, choice: 'sink'|'prize' }
export function resolveBattle(game, move, outcome) {
  const info = battleInfo(game, move);
  const att = info.attackerColor;
  const def = info.defenderColor;
  const aName = who(game, att, info.attackerType);
  const dName = who(game, def, info.defenderType);
  const { crew } = game;
  const aSurv = Math.max(1, Math.min(outcome.attackerSurvivors, info.attackerCrew));
  const dSurv = Math.max(1, Math.min(outcome.defenderSurvivors, info.defenderCrew));

  if (outcome.winner === 'attacker') {
    if (info.kingCapture) {
      applyChessMove(game, move, aSurv);
      game.winner = att;
      game.endReason = 'The flagship is taken — the day is won!';
      say(game, `${aName} boards and takes the enemy flagship!`);
      return;
    }
    if (outcome.choice === 'prize' && aSurv >= 2) {
      const prize = Math.floor(aSurv / 2);
      rebuild(game, { [info.targetSq]: { type: info.defenderType, color: att } }, def);
      crew[info.targetSq] = prize;
      crew[info.attackerSq] = aSurv - prize;
      game.lost[def].push({ type: info.defenderType, how: 'taken' });
      game.lastMove = { from: info.attackerSq, to: info.targetSq };
      say(game, `${aName} wins the deck and takes the ${PIECES[info.defenderType].name} as a prize!`);
    } else {
      applyChessMove(game, move, aSurv);
      say(game, `${aName} wins the deck and sinks the ${PIECES[info.defenderType].name}.`);
    }
  } else {
    if (info.attackerType === 'k') {
      game.winner = def;
      game.endReason = 'The flagship was lost in the boarding.';
      say(game, `${dName} repels the boarders — ${aName} is lost!`);
      return;
    }
    if (outcome.choice === 'prize' && dSurv >= 2) {
      const prize = Math.floor(dSurv / 2);
      rebuild(game, { [info.attackerSq]: { type: info.attackerType, color: def } }, def);
      crew[info.attackerSq] = prize;
      crew[info.targetSq] = dSurv - prize;
      game.lost[att].push({ type: info.attackerType, how: 'taken' });
      say(game, `${dName} beats off the boarders and takes the ${PIECES[info.attackerType].name} as a prize!`);
    } else {
      rebuild(game, { [info.attackerSq]: null }, def);
      delete crew[info.attackerSq];
      crew[info.targetSq] = dSurv;
      game.lost[att].push({ type: info.attackerType, how: 'sunk' });
      say(game, `${dName} beats off the boarders — the ${PIECES[info.attackerType].name} is sunk.`);
    }
    if (!game.winner) crew[info.targetSq] = Math.min(crew[info.targetSq] ?? dSurv, PIECES[info.defenderType].crew);
    game.lastMove = { from: info.attackerSq, to: info.targetSq };
  }
  checkEnd(game);
}

export function checkEnd(game) {
  if (game.winner) return game.winner;
  const { chess } = game;
  try {
    if (chess.isCheckmate()) {
      game.winner = other(chess.turn());
      game.endReason = 'Checkmate — the flagship is trapped.';
    } else if (chess.isStalemate()) {
      game.winner = 'draw';
      game.endReason = 'Stalemate — no ship can move safely.';
    } else if (chess.isDraw()) {
      game.winner = 'draw';
      game.endReason = 'Drawn — neither fleet can win.';
    }
  } catch {
    // A position chess.js can't judge (a flagship already taken) is handled where it happens.
  }
  return game.winner;
}

// When the winner is the computer, it picks sink or prize with a simple rule:
// take a worthwhile prize if there are enough survivors to crew it well.
export function aiChoice(survivors, loserType) {
  return survivors >= 4 && ['n', 'b', 'r', 'q'].includes(loserType) ? 'prize' : 'sink';
}

// ── Computer opponent ─────────────────────────────────────────────────────────

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const MATE = 100000;

function evaluate(chess) {
  let s = 0;
  for (const row of chess.board()) {
    for (const p of row) {
      if (!p) continue;
      const file = p.square.charCodeAt(0) - 97;
      const rank = Number(p.square[1]) - 1;
      let v = VALUE[p.type];
      const centre = 3.5 - Math.max(Math.abs(file - 3.5), Math.abs(rank - 3.5)) / 1;
      if (p.type === 'n' || p.type === 'b') v += centre * 8;
      if (p.type === 'p') v += (p.color === 'w' ? rank - 1 : 6 - rank) * 5;
      s += p.color === 'w' ? v : -v;
    }
  }
  return s;
}

function negamax(chess, depth, alpha, beta) {
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return chess.isCheck() ? -MATE - depth : 0;
  if (moves.some((m) => m.captured === 'k')) return MATE + depth;
  if (depth === 0) return chess.turn() === 'w' ? evaluate(chess) : -evaluate(chess);
  moves.sort((a, b) => (b.captured ? VALUE[b.captured] - VALUE[b.piece] / 10 : 0) - (a.captured ? VALUE[a.captured] - VALUE[a.piece] / 10 : 0));
  let best = -Infinity;
  for (const m of moves) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -beta, -alpha);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Pick a move for whoever's turn it is. Captures that start a battle are
// weighed by the crews' chances, so the computer won't throw a sloop at a man-of-war.
export function chooseAiMove(game, level = 'normal', rng = Math.random) {
  const depth = level === 'easy' ? 2 : 3;
  // A boarding battle can leave a position chess.js's own strict FEN parser
  // would reject (e.g. a ship vanishing out from under a defended king,
  // leaving it in check on the mover's own turn) even though `game.chess`
  // keeps working fine — skip re-validating what's already live.
  const search = new Chess(game.chess.fen(), { skipValidation: true });
  const me = search.turn();
  const sign = me === 'w' ? 1 : -1;
  const baseline = sign * evaluate(search);
  const scored = [];
  for (const move of allLegalMoves(game)) {
    search.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: 'q' } : {}) });
    let score = -negamax(search, depth - 1, -Infinity, Infinity);
    search.undo();
    const info = battleInfo(game, move);
    if (info && !info.kingCapture) {
      const p = estimateOdds(info.attackerCrew, info.defenderCrew);
      score = p * score + (1 - p) * (baseline - VALUE[move.piece]);
    }
    scored.push({ move, score });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  const slack = level === 'easy' ? 60 : 12;
  const pool = scored.filter((s) => s.score >= scored[0].score - slack);
  return pool[Math.floor(rng() * pool.length)].move;
}
