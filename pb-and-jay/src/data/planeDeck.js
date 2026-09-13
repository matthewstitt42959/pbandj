import p51Mustang from '../assets/aerial-war/p-51-mustang.webp';
import p47Thunderbolt from '../assets/aerial-war/p-47-thunderbolt.webp';
import hurricane from '../assets/aerial-war/hurricane.webp';
import spitfire from '../assets/aerial-war/spitfire.webp';
import bf109 from '../assets/aerial-war/bf-109.webp';
import albatrosD3 from '../assets/aerial-war/albatros-d3.webp';
import sopwithCamel from '../assets/aerial-war/sopwith-camel.webp';
import nieuport17 from '../assets/aerial-war/nieuport-17.webp';
import fw190 from '../assets/aerial-war/fw-190.webp';
import fokkerDr1 from '../assets/aerial-war/fokker-dr1.webp';
import spadXiii from '../assets/aerial-war/spad-xiii.webp';
import zero from '../assets/aerial-war/zero.webp';
import p38Lightning from '../assets/aerial-war/p-38-lightning.webp';

// Shared across every plane-card game (Aerial War, Dogfight 21, ...) so the
// art and rank system only live in one place.

export const BASE_DECK = [
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
  { name: 'P-38 Lightning',   value: 14, era: 'WWII' },
];

// Card art for every plane in BASE_DECK.
export const PLANE_ART = {
  'P-51 Mustang': p51Mustang,
  'P-47 Thunderbolt': p47Thunderbolt,
  Hurricane: hurricane,
  Spitfire: spitfire,
  'Bf-109': bf109,
  'Albatros D.III': albatrosD3,
  'Sopwith Camel': sopwithCamel,
  'Nieuport 17': nieuport17,
  'Fw 190': fw190,
  'Fokker Dr.I': fokkerDr1,
  'SPAD XIII': spadXiii,
  Zero: zero,
  'P-38 Lightning': p38Lightning,
};

// Playing-card style corner rank for a plane's value. This deck runs 2-14
// (2 through Ace) — 13 ranks x 4 copies = 52 cards, same size as a real deck.
export function rankLabel(value) {
  if (value === 13) return 'K';
  if (value === 12) return 'Q';
  if (value === 11) return 'J';
  if (value === 14) return 'A';
  return String(value);
}

export function valueOf(name) {
  return BASE_DECK.find((c) => c.name === name)?.value;
}

export function buildDeck() {
  return [...BASE_DECK, ...BASE_DECK, ...BASE_DECK, ...BASE_DECK];
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Warms the browser's cache for every plane image up front, so cards don't
// visibly pop in one at a time as they're dealt during a round — matters
// most on a slow connection, where waiting until a card is actually drawn
// to start fetching it is the difference between instant and a stall.
// Safe to call from multiple pages; only fires the network requests once.
let artPreloaded = false;
export function preloadPlaneArt() {
  if (artPreloaded) return;
  artPreloaded = true;
  Object.values(PLANE_ART).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}
