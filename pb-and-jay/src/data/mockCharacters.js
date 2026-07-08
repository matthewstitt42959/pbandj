const mockCharacters = [
  {
    name: 'Kaelin',
    isAI: false,
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
    skills: {
      athletics: false, acrobatics: false, sleightOfHand: false, stealth: false,
      arcana: true, history: true, investigation: false, nature: false, religion: false,
      animalHandling: false, insight: false, medicine: false, perception: false, survival: false,
      deception: false, intimidation: false, performance: false, persuasion: false,
    },
    inventory: ['Spellbook', 'Wand', 'Potion of Healing'],
    spells: ['Force Darts', 'Snapward', 'Bleed Sense'],
    conditions: []
  },
  {
    name: 'Morg',
    isAI: true,
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
    skills: {
      athletics: true, acrobatics: false, sleightOfHand: false, stealth: false,
      arcana: false, history: false, investigation: false, nature: false, religion: false,
      animalHandling: false, insight: false, medicine: false, perception: true, survival: false,
      deception: false, intimidation: true, performance: false, persuasion: false,
    },
    inventory: ['Greataxe', 'Javelins (x3)', 'Rations'],
    spells: [],
    conditions: ['Rage (active)']
  },
  {
    name: 'Sylra',
    isAI: true,
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
    skills: {
      athletics: false, acrobatics: true, sleightOfHand: true, stealth: true,
      arcana: false, history: false, investigation: true, nature: false, religion: false,
      animalHandling: false, insight: false, medicine: false, perception: false, survival: false,
      deception: true, intimidation: false, performance: false, persuasion: false,
    },
    inventory: ['Dagger (x2)', 'Thieves\' Tools', 'Static-Woven Cloak'],
    spells: [],
    conditions: []
  },
  {
    name: 'Thorne',
    isAI: true,
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
    skills: {
      athletics: false, acrobatics: false, sleightOfHand: false, stealth: true,
      arcana: false, history: false, investigation: false, nature: true, religion: false,
      animalHandling: true, insight: false, medicine: false, perception: true, survival: true,
      deception: false, intimidation: false, performance: false, persuasion: false,
    },
    inventory: ['Longbow', 'Shortsword', 'Animal Feed'],
    spells: ['Beast Tongue', 'Mend Flesh'],
    conditions: []
  },
  {
    name: 'Elira',
    isAI: true,
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
    skills: {
      athletics: false, acrobatics: false, sleightOfHand: false, stealth: false,
      arcana: false, history: true, investigation: false, nature: false, religion: true,
      animalHandling: false, insight: true, medicine: true, perception: false, survival: false,
      deception: false, intimidation: false, performance: false, persuasion: false,
    },
    inventory: ['Mace', 'Shield', 'Holy Symbol'],
    spells: ['Beacon Shot', 'Quick Mend', 'Rally'],
    conditions: ['Concentration (Rally)']
  }
];

export default mockCharacters;
