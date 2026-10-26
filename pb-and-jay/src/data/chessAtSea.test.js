import { describe, it, expect } from 'vitest';
import {
  PIECES, aiChoice, allLegalMoves, battleInfo, checkEnd, chooseAiMove, createGame, legalMoves,
  playMove, resolveBattle,
} from './chessAtSea';

// A game set up from a FEN, every ship at its full starting crew unless overridden.
function gameFrom(fen, { battles = 'big', crew = {} } = {}) {
  const game = createGame({ battles });
  game.chess.load(fen);
  game.crew = {};
  for (const row of game.chess.board()) {
    for (const p of row) if (p) game.crew[p.square] = PIECES[p.type].crew;
  }
  Object.assign(game.crew, crew);
  return game;
}

const find = (game, from, to) => legalMoves(game, from).find((m) => m.to === to);

// White rook on a1 can take a black knight on a5; kings tucked away.
const ROOK_TAKES_KNIGHT = '7k/8/8/n7/8/8/8/R6K w - - 0 1';

describe('setup', () => {
  it('starts with the standard 32 ships, each at its type crew', () => {
    const g = createGame();
    expect(Object.keys(g.crew)).toHaveLength(32);
    expect(g.crew.e1).toBe(PIECES.k.crew);
    expect(g.crew.d1).toBe(PIECES.q.crew);
    expect(g.crew.a2).toBe(PIECES.p.crew);
    expect(g.crew.b8).toBe(PIECES.n.crew);
  });

  it('follows the rules of chess', () => {
    const g = createGame();
    expect(allLegalMoves(g)).toHaveLength(20);
    expect(legalMoves(g, 'e2').map((m) => m.to).sort()).toEqual(['e3', 'e4']);
    expect(legalMoves(g, 'e7')).toHaveLength(0); // not Red's turn
  });
});

describe('which captures are battles', () => {
  it('big captures: every capture but pawn-takes-pawn', () => {
    const g = gameFrom(ROOK_TAKES_KNIGHT);
    expect(battleInfo(g, find(g, 'a1', 'a5'))).toMatchObject({
      attackerSq: 'a1', targetSq: 'a5', attackerType: 'r', defenderType: 'n', attackerCrew: 16, defenderCrew: 10,
    });
    const pp = gameFrom('7k/8/8/p7/1P6/8/8/7K w - - 0 1');
    expect(battleInfo(pp, find(pp, 'b4', 'a5'))).toBeNull();
  });

  it('every capture is a battle in "all" mode, none in "none" mode', () => {
    const pp = '7k/8/8/p7/1P6/8/8/7K w - - 0 1';
    const all = gameFrom(pp, { battles: 'all' });
    expect(battleInfo(all, find(all, 'b4', 'a5'))).not.toBeNull();
    const none = gameFrom(ROOK_TAKES_KNIGHT, { battles: 'none' });
    expect(battleInfo(none, find(none, 'a1', 'a5'))).toBeNull();
  });

  it('a plain move is never a battle', () => {
    const g = createGame();
    expect(battleInfo(g, find(g, 'e2', 'e4'))).toBeNull();
  });

  it('en passant targets the pawn it passes, not the empty square', () => {
    const g = gameFrom('7k/8/8/3pP3/8/8/8/7K w - d6 0 1', { battles: 'all' });
    expect(battleInfo(g, find(g, 'e5', 'd6')).targetSq).toBe('d5');
  });
});

describe('plain moves keep crews with their ships', () => {
  it('carries a ship\'s crew to its new square', () => {
    const g = createGame();
    g.crew.g1 = 7;
    playMove(g, find(g, 'g1', 'f3'));
    expect(g.crew.f3).toBe(7);
    expect(g.crew.g1).toBeUndefined();
    expect(g.chess.turn()).toBe('b');
  });

  it('moves the rook\'s crew when castling', () => {
    const g = gameFrom('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', { crew: { h1: 11 } });
    playMove(g, find(g, 'e1', 'g1'));
    expect(g.crew.f1).toBe(11);
    expect(g.crew.h1).toBeUndefined();
    expect(g.crew.g1).toBe(PIECES.k.crew);
  });

  it('refits a sloop that reaches the far end as a fully crewed man-of-war', () => {
    const g = gameFrom('7k/P7/8/8/8/8/8/7K w - - 0 1', { crew: { a7: 2 } });
    playMove(g, find(g, 'a7', 'a8'));
    expect(g.chess.get('a8').type).toBe('q');
    expect(g.crew.a8).toBe(PIECES.q.crew);
  });

  it('an instant capture (pawn takes pawn) sinks the target and keeps the crew', () => {
    const g = gameFrom('7k/8/8/p7/1P6/8/8/7K w - - 0 1', { crew: { b4: 5 } });
    playMove(g, find(g, 'b4', 'a5'));
    expect(g.crew.a5).toBe(5);
    expect(g.lost.b).toEqual([{ type: 'p', how: 'sunk' }]);
  });

  it('taking the flagship in plain chess ends the game', () => {
    const g = gameFrom('R6k/8/8/8/8/8/8/7K w - - 0 1');
    playMove(g, find(g, 'a8', 'h8'));
    expect(g.winner).toBe('w');
  });
});

describe('boarding battles: the attacker wins', () => {
  it('SINK: the attacker moves in with its survivors and the target is gone', () => {
    const g = gameFrom(ROOK_TAKES_KNIGHT);
    const move = find(g, 'a1', 'a5');
    resolveBattle(g, move, { winner: 'attacker', attackerSurvivors: 9, defenderSurvivors: 0, choice: 'sink' });
    expect(g.chess.get('a5')).toMatchObject({ type: 'r', color: 'w' });
    expect(g.chess.get('a1')).toBeFalsy();
    expect(g.crew.a5).toBe(9);
    expect(g.lost.b).toEqual([{ type: 'n', how: 'sunk' }]);
    expect(g.chess.turn()).toBe('b');
  });

  it('PRIZE: the target switches sides in place, the crew is split, the attacker stays home', () => {
    const g = gameFrom(ROOK_TAKES_KNIGHT);
    const move = find(g, 'a1', 'a5');
    resolveBattle(g, move, { winner: 'attacker', attackerSurvivors: 9, defenderSurvivors: 0, choice: 'prize' });
    expect(g.chess.get('a5')).toMatchObject({ type: 'n', color: 'w' });
    expect(g.chess.get('a1')).toMatchObject({ type: 'r', color: 'w' });
    expect(g.crew.a5).toBe(4);
    expect(g.crew.a1).toBe(5);
    expect(g.lost.b).toEqual([{ type: 'n', how: 'taken' }]);
    expect(g.chess.turn()).toBe('b');
  });

  it('PRIZE needs at least two survivors to crew both ships — otherwise it is a sink', () => {
    const g = gameFrom(ROOK_TAKES_KNIGHT);
    resolveBattle(g, find(g, 'a1', 'a5'), { winner: 'attacker', attackerSurvivors: 1, defenderSurvivors: 0, choice: 'prize' });
    expect(g.chess.get('a5')).toMatchObject({ type: 'r', color: 'w' });
  });

  it('boarding the enemy flagship wins the game', () => {
    const g = gameFrom('R6k/8/8/8/8/8/8/7K w - - 0 1');
    resolveBattle(g, find(g, 'a8', 'h8'), { winner: 'attacker', attackerSurvivors: 8, defenderSurvivors: 0, choice: 'sink' });
    expect(g.winner).toBe('w');
  });

  it('survivors cannot exceed the crew that went in', () => {
    const g = gameFrom(ROOK_TAKES_KNIGHT);
    resolveBattle(g, find(g, 'a1', 'a5'), { winner: 'attacker', attackerSurvivors: 99, defenderSurvivors: 0, choice: 'sink' });
    expect(g.crew.a5).toBe(PIECES.r.crew);
  });
});

describe('boarding battles: the defender wins', () => {
  it('SINK: the attacker is removed and the defender stays with its survivors', () => {
    const g = gameFrom(ROOK_TAKES_KNIGHT);
    resolveBattle(g, find(g, 'a1', 'a5'), { winner: 'defender', attackerSurvivors: 0, defenderSurvivors: 6, choice: 'sink' });
    expect(g.chess.get('a1')).toBeFalsy();
    expect(g.chess.get('a5')).toMatchObject({ type: 'n', color: 'b' });
    expect(g.crew.a5).toBe(6);
    expect(g.crew.a1).toBeUndefined();
    expect(g.lost.w).toEqual([{ type: 'r', how: 'sunk' }]);
    expect(g.chess.turn()).toBe('b'); // the attacker used its move
  });

  it('PRIZE: the attacker switches sides on its own square', () => {
    const g = gameFrom(ROOK_TAKES_KNIGHT);
    resolveBattle(g, find(g, 'a1', 'a5'), { winner: 'defender', attackerSurvivors: 0, defenderSurvivors: 7, choice: 'prize' });
    expect(g.chess.get('a1')).toMatchObject({ type: 'r', color: 'b' });
    expect(g.crew.a1).toBe(3);
    expect(g.crew.a5).toBe(4);
    expect(g.lost.w).toEqual([{ type: 'r', how: 'taken' }]);
  });

  it('a defeated attacking flagship loses the game', () => {
    const g = gameFrom('7k/8/8/n7/8/8/8/K7 w - - 0 1');
    g.chess.load('7k/8/8/8/8/8/n7/K7 w - - 0 1');
    g.crew = { a2: 10, a1: 14, h8: 14 };
    resolveBattle(g, find(g, 'a1', 'a2'), { winner: 'defender', attackerSurvivors: 0, defenderSurvivors: 5, choice: 'sink' });
    expect(g.winner).toBe('b');
  });

  it('losing an attack can expose your own flagship — and the enemy can board it', () => {
    // White's rook on e1 is pinned against its flagship on h1 by Red's rook on a1.
    // It may legally take the pinner along the rank. If it loses the boarding it is
    // sunk, the pin line opens, and Red can board the flagship.
    const g = gameFrom('7k/8/8/8/8/8/8/r3R2K w - - 0 1');
    resolveBattle(g, find(g, 'e1', 'a1'), { winner: 'defender', attackerSurvivors: 0, defenderSurvivors: 5, choice: 'sink' });
    expect(g.chess.get('e1')).toBeFalsy();
    expect(g.chess.turn()).toBe('b');
    const grab = g.chess.moves({ verbose: true }).find((m) => m.captured === 'k');
    expect(grab).toMatchObject({ from: 'a1', to: 'h1' });
  });
});

describe('after a prize flips a ship', () => {
  it('castling rights go when the rook is taken', () => {
    const g = gameFrom('4k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');
    // Red takes... instead flip the white a1 rook to Red by a defender-prize.
    g.chess.load('4k2r/8/8/8/8/8/n7/R3K2R w KQkq - 0 1');
    g.crew = { e8: 14, h8: 16, a2: 10, a1: 16, e1: 14, h1: 16 };
    resolveBattle(g, find(g, 'a1', 'a2'), { winner: 'defender', attackerSurvivors: 0, defenderSurvivors: 8, choice: 'prize' });
    expect(g.chess.getCastlingRights('w').q).toBe(false);
    expect(g.chess.getCastlingRights('w').k).toBe(true);
  });
});

describe('the end of the game', () => {
  it('detects checkmate', () => {
    const g = gameFrom('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');
    checkEnd(g);
    expect(g.winner).toBe('w');
  });

  it('detects stalemate as a draw', () => {
    const g = gameFrom('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    checkEnd(g);
    expect(g.winner).toBe('draw');
  });
});

describe('the computer opponent', () => {
  it('always returns a legal move', () => {
    const g = createGame();
    const m = chooseAiMove(g, 'normal', () => 0);
    expect(allLegalMoves(g).some((x) => x.from === m.from && x.to === m.to)).toBe(true);
  });

  it('takes a hanging man-of-war when its crew is strong enough to win the boarding', () => {
    // Black to move: the rook on a8 and Amber's queen on a1 attack each other.
    const g = gameFrom('r5k1/8/8/8/8/8/8/Q6K b - - 0 1', { crew: { a8: 30, a1: 10 } });
    const m = chooseAiMove(g, 'normal', () => 0);
    expect(m).toMatchObject({ from: 'a8', to: 'a1' });
  });

  it('will not throw a weak ship at a strong one', () => {
    // The black rook could take the queen, but with 2 crew against 22 it loses the boarding and its ship.
    const g = gameFrom('r5k1/8/8/8/8/8/8/Q6K b - - 0 1', { crew: { a8: 2, a1: 22 } });
    const m = chooseAiMove(g, 'normal', () => 0);
    expect(`${m.from}${m.to}`).not.toBe('a8a1');
  });

  it('prizes a worthwhile ship when it has the crew, sinks sloops and thin wins', () => {
    expect(aiChoice(8, 'q')).toBe('prize');
    expect(aiChoice(8, 'p')).toBe('sink');
    expect(aiChoice(3, 'q')).toBe('sink');
  });
});
