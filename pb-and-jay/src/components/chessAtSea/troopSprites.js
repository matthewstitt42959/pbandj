// The pirate troop sprites for the Chess at Sea boarding battle (built by
// scripts/build-troop-sprites.py): one figure per unit kind, four facings each.
// There's no per-faction colouring — amber and red crews use the same art,
// told apart by the side banner on the deck instead.
import swordsmanUp from '../../assets/chess-at-sea/troops/swordsman-up.png?no-inline';
import swordsmanDown from '../../assets/chess-at-sea/troops/swordsman-down.png?no-inline';
import swordsmanLeft from '../../assets/chess-at-sea/troops/swordsman-left.png?no-inline';
import swordsmanRight from '../../assets/chess-at-sea/troops/swordsman-right.png?no-inline';
import archerUp from '../../assets/chess-at-sea/troops/archer-up.png?no-inline';
import archerDown from '../../assets/chess-at-sea/troops/archer-down.png?no-inline';
import archerLeft from '../../assets/chess-at-sea/troops/archer-left.png?no-inline';
import archerRight from '../../assets/chess-at-sea/troops/archer-right.png?no-inline';
import captainUp from '../../assets/chess-at-sea/troops/captain-up.png?no-inline';
import captainDown from '../../assets/chess-at-sea/troops/captain-down.png?no-inline';
import captainLeft from '../../assets/chess-at-sea/troops/captain-left.png?no-inline';
import captainRight from '../../assets/chess-at-sea/troops/captain-right.png?no-inline';

// Keyed by the deckBattle unit `kind` — 'musket' units are archers on deck.
export const TROOP_SPRITES = {
  sword: { up: swordsmanUp, down: swordsmanDown, left: swordsmanLeft, right: swordsmanRight },
  musket: { up: archerUp, down: archerDown, left: archerLeft, right: archerRight },
  captain: { up: captainUp, down: captainDown, left: captainLeft, right: captainRight },
};

const cache = {};

// A ready-to-draw Image for a sprite, loaded once and reused across frames.
// Returns null (draw a fallback instead) until the image has decoded.
export function troopImage(kind, facing) {
  const src = TROOP_SPRITES[kind]?.[facing];
  if (!src) return null;
  let img = cache[src];
  if (!img) {
    img = new Image();
    img.src = src;
    cache[src] = img;
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function preloadTroopArt() {
  for (const set of Object.values(TROOP_SPRITES)) {
    for (const src of Object.values(set)) {
      if (cache[src]) continue;
      const img = new Image();
      img.src = src;
      cache[src] = img;
    }
  }
}
