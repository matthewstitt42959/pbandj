const mockCharacters = [
  {
    name: 'Kaelin',
    class: 'Wizard',
    level: 3,
    hp: { current: 14, max: 18 },
    ac: 12,
    speed: 30,
    abilities: {
      str: { score: 8, modifier: -1 },
      dex: { score: 14, modifier: 2 },
      con: { score: 12, modifier: 1 },
      int: { score: 18, modifier: 4 },
      wis: { score: 13, modifier: 1 },
      cha: { score: 10, modifier: 0 }
    },
    inventory: ['Spellbook', 'Wand', 'Potion of Healing'],
    spells: ['Magic Missile', 'Shield', 'Detect Magic'],
    conditions: []
  },
  {
    name: 'Morg',
    class: 'Barbarian',
    level: 3,
    hp: { current: 34, max: 38 },
    ac: 15,
    speed: 40,
    abilities: {
      str: { score: 18, modifier: 4 },
      dex: { score: 13, modifier: 1 },
      con: { score: 16, modifier: 3 },
      int: { score: 8, modifier: -1 },
      wis: { score: 11, modifier: 0 },
      cha: { score: 9, modifier: -1 }
    },
    inventory: ['Greataxe', 'Javelins (x3)', 'Rations'],
    spells: [],
    conditions: ['Rage (active)']
  },
  {
    name: 'Sylra',
    class: 'Rogue',
    level: 3,
    hp: { current: 21, max: 24 },
    ac: 14,
    speed: 30,
    abilities: {
      str: { score: 10, modifier: 0 },
      dex: { score: 17, modifier: 3 },
      con: { score: 12, modifier: 1 },
      int: { score: 13, modifier: 1 },
      wis: { score: 14, modifier: 2 },
      cha: { score: 11, modifier: 0 }
    },
    inventory: ['Dagger (x2)', 'Thieves\' Tools', 'Cloak of Elvenkind'],
    spells: [],
    conditions: []
  },
  {
    name: 'Thorne',
    class: 'Ranger',
    level: 3,
    hp: { current: 24, max: 28 },
    ac: 16,
    speed: 35,
    abilities: {
      str: { score: 13, modifier: 1 },
      dex: { score: 16, modifier: 3 },
      con: { score: 14, modifier: 2 },
      int: { score: 10, modifier: 0 },
      wis: { score: 15, modifier: 2 },
      cha: { score: 9, modifier: -1 }
    },
    inventory: ['Longbow', 'Shortsword', 'Animal Feed'],
    spells: ['Hunter\'s Mark', 'Cure Wounds'],
    conditions: []
  },
  {
    name: 'Elira',
    class: 'Cleric',
    level: 3,
    hp: { current: 19, max: 22 },
    ac: 17,
    speed: 25,
    abilities: {
      str: { score: 12, modifier: 1 },
      dex: { score: 10, modifier: 0 },
      con: { score: 14, modifier: 2 },
      int: { score: 10, modifier: 0 },
      wis: { score: 18, modifier: 4 },
      cha: { score: 13, modifier: 1 }
    },
    inventory: ['Mace', 'Shield', 'Holy Symbol'],
    spells: ['Guiding Bolt', 'Healing Word', 'Bless'],
    conditions: ['Concentration (Bless)']
  }
];

export default mockCharacters;