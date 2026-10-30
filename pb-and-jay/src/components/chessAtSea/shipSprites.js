// The EGA-style ship sprites for Chess at Sea (built by scripts/build-chess-sprites.py):
// cream sails for the amber fleet ('w'), red sails for the red fleet ('b').
import amberP from '../../assets/chess-at-sea/amber/p.png?no-inline';
import amberN from '../../assets/chess-at-sea/amber/n.png?no-inline';
import amberB from '../../assets/chess-at-sea/amber/b.png?no-inline';
import amberR from '../../assets/chess-at-sea/amber/r.png?no-inline';
import amberQ from '../../assets/chess-at-sea/amber/q.png?no-inline';
import amberK from '../../assets/chess-at-sea/amber/k.png?no-inline';
import redP from '../../assets/chess-at-sea/red/p.png?no-inline';
import redN from '../../assets/chess-at-sea/red/n.png?no-inline';
import redB from '../../assets/chess-at-sea/red/b.png?no-inline';
import redR from '../../assets/chess-at-sea/red/r.png?no-inline';
import redQ from '../../assets/chess-at-sea/red/q.png?no-inline';
import redK from '../../assets/chess-at-sea/red/k.png?no-inline';

export const SPRITES = {
  w: { p: amberP, n: amberN, b: amberB, r: amberR, q: amberQ, k: amberK },
  b: { p: redP, n: redN, b: redB, r: redR, q: redQ, k: redK },
};

// Start fetching every sprite so the board never pops in piece by piece.
export function preloadShipArt() {
  Object.values(SPRITES).forEach((set) => Object.values(set).forEach((src) => {
    const img = new Image();
    img.src = src;
  }));
}
