// Spell slot / spells-known progression by class, levels 1-20.
// Human-readable version of these same tables lives in docs/CASTER_PROGRESSION.md.
// Index 0 of each table is unused; index N is the row for character level N.

const FULL_CASTER = [null,
  { cantrips: 2, known: 2, slots: [2] },
  { cantrips: 2, known: 3, slots: [3] },
  { cantrips: 2, known: 4, slots: [4, 2] },
  { cantrips: 3, known: 5, slots: [4, 3] },
  { cantrips: 3, known: 6, slots: [4, 3, 2] },
  { cantrips: 3, known: 7, slots: [4, 3, 3] },
  { cantrips: 3, known: 8, slots: [4, 3, 3, 1] },
  { cantrips: 3, known: 9, slots: [4, 3, 3, 2] },
  { cantrips: 3, known: 10, slots: [4, 3, 3, 3, 1] },
  { cantrips: 4, known: 11, slots: [4, 3, 3, 3, 2] },
  { cantrips: 4, known: 12, slots: [4, 3, 3, 3, 2, 1] },
  { cantrips: 4, known: 12, slots: [4, 3, 3, 3, 2, 1] },
  { cantrips: 4, known: 13, slots: [4, 3, 3, 3, 2, 1, 1] },
  { cantrips: 4, known: 13, slots: [4, 3, 3, 3, 2, 1, 1] },
  { cantrips: 4, known: 14, slots: [4, 3, 3, 3, 2, 1, 1, 1] },
  { cantrips: 4, known: 14, slots: [4, 3, 3, 3, 2, 1, 1, 1] },
  { cantrips: 4, known: 15, slots: [4, 3, 3, 3, 2, 1, 1, 1, 1] },
  { cantrips: 4, known: 15, slots: [4, 3, 3, 3, 3, 1, 1, 1, 1] },
  { cantrips: 4, known: 15, slots: [4, 3, 3, 3, 3, 2, 1, 1, 1] },
  { cantrips: 4, known: 15, slots: [4, 3, 3, 3, 3, 2, 2, 1, 1] },
];

// Half casters (Paladin, Ranger) get no spellcasting at level 1.
const HALF_CASTER = [null, null,
  { known: 2, slots: [2] },
  { known: 3, slots: [3] },
  { known: 3, slots: [3] },
  { known: 4, slots: [4, 2] },
  { known: 4, slots: [4, 2] },
  { known: 5, slots: [4, 3] },
  { known: 5, slots: [4, 3] },
  { known: 6, slots: [4, 3, 2] },
  { known: 6, slots: [4, 3, 2] },
  { known: 7, slots: [4, 3, 3] },
  { known: 7, slots: [4, 3, 3] },
  { known: 8, slots: [4, 3, 3, 1] },
  { known: 8, slots: [4, 3, 3, 1] },
  { known: 9, slots: [4, 3, 3, 2] },
  { known: 9, slots: [4, 3, 3, 2] },
  { known: 10, slots: [4, 3, 3, 3, 1] },
  { known: 10, slots: [4, 3, 3, 3, 1] },
  { known: 11, slots: [4, 3, 3, 3, 2] },
  { known: 11, slots: [4, 3, 3, 3, 2] },
];

// Pact casters (Warlock, Summoner): few slots, always highest level, refresh on short rest.
const PACT_CASTER = [null,
  { cantrips: 2, known: 2, slots: 1, slotLevel: 1 },
  { cantrips: 2, known: 3, slots: 2, slotLevel: 1 },
  { cantrips: 2, known: 4, slots: 2, slotLevel: 2 },
  { cantrips: 3, known: 5, slots: 2, slotLevel: 2 },
  { cantrips: 3, known: 6, slots: 2, slotLevel: 3 },
  { cantrips: 3, known: 7, slots: 2, slotLevel: 3 },
  { cantrips: 3, known: 8, slots: 2, slotLevel: 4 },
  { cantrips: 3, known: 9, slots: 2, slotLevel: 4 },
  { cantrips: 3, known: 10, slots: 2, slotLevel: 5 },
  { cantrips: 4, known: 10, slots: 2, slotLevel: 5 },
  { cantrips: 4, known: 11, slots: 3, slotLevel: 5 },
  { cantrips: 4, known: 11, slots: 3, slotLevel: 5 },
  { cantrips: 4, known: 12, slots: 3, slotLevel: 5 },
  { cantrips: 4, known: 12, slots: 3, slotLevel: 5 },
  { cantrips: 4, known: 13, slots: 3, slotLevel: 5 },
  { cantrips: 4, known: 13, slots: 3, slotLevel: 5 },
  { cantrips: 4, known: 14, slots: 4, slotLevel: 5 },
  { cantrips: 4, known: 14, slots: 4, slotLevel: 5 },
  { cantrips: 4, known: 15, slots: 4, slotLevel: 5 },
  { cantrips: 4, known: 15, slots: 4, slotLevel: 5 },
];

const TRACK_BY_CLASS = {
  bard: 'full', cleric: 'full', druid: 'full', sorcerer: 'full', wizard: 'full',
  paladin: 'half', ranger: 'half',
  warlock: 'pact', summoner: 'pact',
  tinker: 'tinker',
};

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

function clampLevel(level) {
  return Math.min(20, Math.max(1, Number(level) || 1));
}

// Returns null for non-caster classes (Barbarian, Fighter, Monk, Rogue).
export function getCasterInfo(className, level) {
  const track = TRACK_BY_CLASS[(className || '').toLowerCase()];
  if (!track) return null;
  const lvl = clampLevel(level);

  if (track === 'tinker') {
    // Tinker follows the half-caster slot table one level early, plus its own cantrip count.
    const row = HALF_CASTER[Math.min(20, lvl + 1)];
    return { track: 'Half', cantrips: lvl >= 10 ? 3 : 2, known: row.known, slots: row.slots, slotLevel: row.slots.length };
  }

  if (track === 'half') {
    const row = HALF_CASTER[lvl];
    if (!row) return { track: 'Half', cantrips: 0, known: 0, slots: [], slotLevel: 0, noCastingYet: true };
    return { track: 'Half', cantrips: 0, known: row.known, slots: row.slots, slotLevel: row.slots.length };
  }

  if (track === 'pact') {
    const row = PACT_CASTER[lvl];
    return { track: 'Pact', cantrips: row.cantrips, known: row.known, slotLevel: row.slotLevel, pactSlots: row.slots };
  }

  const row = FULL_CASTER[lvl];
  return { track: 'Full', cantrips: row.cantrips, known: row.known, slots: row.slots, slotLevel: row.slots.length };
}

export function fullProgressionRows(className) {
  if (!TRACK_BY_CLASS[(className || '').toLowerCase()]) return [];
  const rows = [];
  for (let level = 1; level <= 20; level++) rows.push({ level, ...getCasterInfo(className, level) });
  return rows;
}

export function formatSlots(info) {
  if (!info) return '';
  if (info.noCastingYet) return 'no spellcasting yet';
  if (info.track === 'Pact') {
    return `${info.pactSlots} slot${info.pactSlots === 1 ? '' : 's'} (${ORDINAL[info.slotLevel - 1]} level)`;
  }
  return info.slots.map((n, i) => `${n}× ${ORDINAL[i]}`).join(', ');
}
