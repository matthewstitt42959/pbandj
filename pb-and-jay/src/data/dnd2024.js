// Teraphobia species, classes, and backgrounds — original content.
// See docs/SPELLBOOK_RULES.md for the magic-system rules these tie into.

export const SPECIES = [
  {
    id: 'kindled',
    name: 'Kindled',
    tagline: 'Touched by the bleed-light',
    description:
      'The Kindled carry something that caught when a rift tore near them — a light under the skin that never quite goes out. Some were born to parents already marked; others were changed by a single close call. Either way, people notice, and not always kindly.',
    traits: ['Darkvision 60 ft', 'Steady Hands (healing touch)', 'Bleed Surge (Radiant, Ash, or Hollow manifestation)'],
    lineageOptions: [
      { id: 'radiant', name: 'Radiant', description: 'Your Bleed Surge manifests as searing light.', damageType: 'radiant', resistance: 'radiant' },
      { id: 'ash', name: 'Ash', description: 'Your Bleed Surge manifests as smoldering embers.', damageType: 'fire', resistance: 'fire' },
      { id: 'hollow', name: 'Hollow', description: 'Your Bleed Surge manifests as draining emptiness.', damageType: 'necrotic', resistance: 'necrotic' },
    ],
    size: 'Medium',
    speed: 30,
    icon: '✨',
  },
  {
    id: 'ashborn',
    name: 'Ashborn',
    tagline: 'Marked by the rip',
    description:
      'Ashborn carry scale and claw where skin used to be — a Kimerian bloodline crossed generations back, or a rift-burn that never fully healed. They choose a lineage that colors their breath weapon and their resistances.',
    traits: ['Elemental Lineage (a strain your DM helps you pick — colors your breath weapon and resistances)', 'Breath Weapon', 'Damage Resistance', 'Rift-Wings at level 5'],
    lineageOptions: [
      { id: 'ash', name: 'Ash Strain', description: 'Your breath weapon deals fire damage; you resist fire.', damageType: 'fire', resistance: 'fire' },
      { id: 'frost', name: 'Frost Strain', description: 'Your breath weapon deals cold damage; you resist cold.', damageType: 'cold', resistance: 'cold' },
      { id: 'storm', name: 'Storm Strain', description: 'Your breath weapon deals lightning damage; you resist lightning.', damageType: 'lightning', resistance: 'lightning' },
      { id: 'radiant', name: 'Radiant Strain', description: 'Your breath weapon deals radiant damage; you resist radiant.', damageType: 'radiant', resistance: 'radiant' },
      { id: 'hollow', name: 'Hollow Strain', description: 'Your breath weapon deals necrotic damage; you resist necrotic.', damageType: 'necrotic', resistance: 'necrotic' },
    ],
    size: 'Medium',
    speed: 30,
    icon: '🐉',
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    tagline: 'Sturdy mountain folk',
    description:
      'Dwarves are tough, dependable, and fiercely loyal. Born in the deep mountains, they are masters of craftsmanship and can endure hardships that would break most others.',
    traits: ['Darkvision 120 ft', 'Dwarven Resilience (poison resistance)', 'Stonecunning (tremorsense)', 'Tool Proficiency'],
    size: 'Medium',
    speed: 30,
    icon: '⛏️',
  },
  {
    id: 'elf',
    name: 'Elf',
    tagline: 'Ancient and graceful',
    description:
      'Elves live for centuries and accumulate wisdom and skill over lifetimes. Their keen senses and innate magic make them natural adventurers. Their lineage — High Elf, Wood Elf, or Drow — is worked out with your DM as part of their story.',
    traits: ['Darkvision 60 ft', 'Fey Ancestry (immune to magical sleep)', 'Keen Senses', 'Trance (only needs 4 hours rest)', 'Elven Lineage (a subtype special ability your DM helps you settle on)'],
    lineageOptions: [
      { id: 'high', name: 'High Elf', description: 'Sharpened by old magic — you have a knack for arcane tricks and a keen memory.' },
      { id: 'wood', name: 'Wood Elf', description: 'Raised in the wild places — you move quicker and vanish into the trees.' },
      { id: 'drow', name: 'Drow', description: 'Born under stone — your eyes pierce total darkness and shadow clings to you.' },
    ],
    size: 'Medium',
    speed: 30,
    icon: '🌿',
  },
  {
    id: 'gnome',
    name: 'Gnome',
    tagline: 'Curious and quick-witted',
    description:
      'Gnomes are small in body but enormous in personality. Their boundless curiosity drives them to explore every mystery the world has to offer, and their natural cleverness helps them survive it.',
    traits: ['Small size', 'Darkvision 60 ft', 'Gnomish Cunning (Adv. on INT/WIS/CHA saves vs magic)', 'Gnomish Lineage (Forest or Rock subtype, settled with your DM)'],
    lineageOptions: [
      { id: 'forest', name: 'Forest Gnome', description: 'Small illusions and a way with woodland creatures come naturally to you.' },
      { id: 'rock', name: 'Rock Gnome', description: 'A knack for tinkering — you can rig small clockwork contraptions.' },
    ],
    size: 'Small',
    speed: 30,
    icon: '🔮',
  },
  {
    id: 'ridgeborn',
    name: 'Ridgeborn',
    tagline: 'Built for the hard country',
    description:
      'Ridgeborn are massive, mountain-bred survivors — some say descended from something that came through a rift in the old Rockies and never left. They thrive where the ground is hard and the weather doesn\'t forgive mistakes.',
    traits: ['Large build (counts as Large for carrying capacity)', 'Old Blood (a heritage — Cloud, Ash, Frost, Stone, or Storm — worked out with your DM)', 'Set Your Feet (reduce damage once per short rest)'],
    lineageOptions: [
      { id: 'cloud', name: 'Cloud', description: 'Old Blood runs thin and high — you shrug off falls and heights unnerve you less.' },
      { id: 'ash', name: 'Ash', description: 'Old Blood carries embers — you resist fire.', damageType: 'fire', resistance: 'fire' },
      { id: 'frost', name: 'Frost', description: 'Old Blood runs cold — you resist cold.', damageType: 'cold', resistance: 'cold' },
      { id: 'stone', name: 'Stone', description: 'Old Blood runs heavy — your skin is tougher than it looks.' },
      { id: 'storm', name: 'Storm', description: 'Old Blood crackles — you resist lightning.', damageType: 'lightning', resistance: 'lightning' },
    ],
    size: 'Medium',
    speed: 35,
    icon: '🗻',
  },
  {
    id: 'halfling',
    name: 'Halfling',
    tagline: 'Lucky and surprisingly brave',
    description:
      'Halflings are small folk with remarkably good luck and a talent for going unnoticed when they want to. Despite their modest size, they show tremendous courage when it counts.',
    traits: ['Small size', 'Lucky (reroll 1s on attack/ability/saves)', 'Brave (Adv. on saves vs frightened)', 'Halfling Nimbleness (move through spaces of larger creatures)', 'Naturally Stealthy'],
    size: 'Small',
    speed: 30,
    icon: '🍀',
  },
  {
    id: 'human',
    name: 'Human',
    tagline: 'Versatile and determined',
    description:
      'Humans are the most adaptable of all peoples. Their short lives drive them to accomplish great things. They\'re the best choice for players who want maximum flexibility in their build.',
    traits: ['Resourceful (gain Heroic Inspiration after a long rest)', 'Skillful (gain proficiency in one skill)', 'Versatile (gain one Origin Feat)'],
    size: 'Medium',
    speed: 30,
    icon: '⚔️',
  },
  {
    id: 'orc',
    name: 'Orc',
    tagline: 'Relentless and powerful',
    description:
      'Orcs are known for their physical power and indomitable will. They were shaped by the god Gruumsh to be warriors, but many choose their own path — often as defenders or champions of their people.',
    traits: ['Adrenaline Rush (Dash as bonus action, gain temp HP)', 'Powerful Build (counts as Large for carrying capacity)', 'Relentless Endurance (drop to 1 HP instead of 0, once per long rest)'],
    size: 'Medium',
    speed: 30,
    icon: '💪',
  },
  {
    id: 'warped',
    name: 'Warped',
    tagline: 'Carrying the rift\'s mark',
    description:
      'The Warped were touched too long, too close, or too young — exposure to a rift that should have killed them instead changed them for good. Most people flinch first and ask questions later; the Warped have learned to expect it.',
    traits: ['Darkvision 60 ft', 'Warp Lineage (an Ash, Hollow, or Static strain, settled with your DM)', 'Static Hum (know the Small Wonder cantrip)', 'Heat-Touched (fire resistance)'],
    lineageOptions: [
      { id: 'ash', name: 'Ash', description: 'Your rift-mark runs hot — you resist fire.', damageType: 'fire', resistance: 'fire' },
      { id: 'hollow', name: 'Hollow', description: 'Your rift-mark drains — you resist necrotic.', damageType: 'necrotic', resistance: 'necrotic' },
      { id: 'static', name: 'Static', description: 'Your rift-mark crackles — you resist lightning.', damageType: 'lightning', resistance: 'lightning' },
    ],
    size: 'Medium',
    speed: 30,
    icon: '🔥',
  },
];

export const CLASSES = [
  {
    id: 'barbarian',
    name: 'Barbarian',
    tagline: 'Rage-fueled warrior',
    description:
      'Barbarians are primal warriors who channel raw fury into devastating combat power. When they Rage, they shrug off wounds that would fell lesser fighters and hit harder than a battering ram. Great for players who love being in the thick of battle.',
    hitDie: 12,
    primaryAbility: ['str'],
    saves: ['str', 'con'],
    armorProficiency: 'Light and Medium armor, Shields',
    skillChoices: { count: 2, from: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'] },
    subclassLevel: 3,
    subclassName: 'Primal Path',
    icon: '🪓',
    complexity: 'Beginner',
  },
  {
    id: 'bard',
    name: 'Bard',
    tagline: 'Magical performer and jack-of-all-trades',
    description:
      'Bards weave magic through music, storytelling, and performance. They\'re incredibly versatile — decent in combat, excellent at supporting allies, and masterful at social situations. A great choice for roleplay-focused players.',
    hitDie: 8,
    primaryAbility: ['cha'],
    saves: ['dex', 'cha'],
    armorProficiency: 'Light armor',
    skillChoices: { count: 3, from: 'any' },
    subclassLevel: 3,
    subclassName: 'Bard College',
    icon: '🎶',
    complexity: 'Intermediate',
  },
  {
    id: 'cleric',
    name: 'Cleric',
    tagline: 'Divine servant and healer',
    description:
      'Clerics draw power from their deity, channeling divine magic to heal allies, smite enemies, and protect the faithful. They\'re the backbone of any party — essential healers who can also hold their own in a fight.',
    hitDie: 8,
    primaryAbility: ['wis'],
    saves: ['wis', 'cha'],
    armorProficiency: 'Light and Medium armor, Shields',
    skillChoices: { count: 2, from: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] },
    subclassLevel: 1,
    subclassName: 'Divine Domain',
    icon: '⚕️',
    complexity: 'Intermediate',
  },
  {
    id: 'druid',
    name: 'Druid',
    tagline: 'Nature\'s guardian and shapeshifter',
    description:
      'Druids are mystical protectors of the natural world. They command weather, animals, and plant life — and can transform into beasts. They\'re versatile casters who can adapt to almost any situation.',
    hitDie: 8,
    primaryAbility: ['wis'],
    saves: ['int', 'wis'],
    armorProficiency: 'Light and Medium armor (no metal), Shields',
    skillChoices: { count: 2, from: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'] },
    subclassLevel: 2,
    subclassName: 'Druid Circle',
    icon: '🌿',
    complexity: 'Intermediate',
  },
  {
    id: 'fighter',
    name: 'Fighter',
    tagline: 'Master of weapons and combat',
    description:
      'Fighters are combat specialists who can fight with any weapon or armor. They\'re the most adaptable martial class — whether you want a heavily armored tank, an archer, or a nimble duelist, Fighter has you covered.',
    hitDie: 10,
    primaryAbility: ['str', 'dex'],
    saves: ['str', 'con'],
    armorProficiency: 'All armor, Shields',
    skillChoices: { count: 2, from: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'] },
    subclassLevel: 3,
    subclassName: 'Martial Archetype',
    icon: '🛡️',
    complexity: 'Beginner',
  },
  {
    id: 'monk',
    name: 'Monk',
    tagline: 'Martial artist with ki powers',
    description:
      'Monks are disciplined warriors who harness inner energy called Ki to perform superhuman feats. They move faster than anyone, deflect arrows, and can stun enemies with precise strikes. Excellent for players who want a fast, agile fighter.',
    hitDie: 8,
    primaryAbility: ['dex', 'wis'],
    saves: ['str', 'dex'],
    armorProficiency: 'None (Unarmored Defense uses DEX + WIS)',
    skillChoices: { count: 2, from: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'] },
    subclassLevel: 3,
    subclassName: 'Monastic Tradition',
    icon: '👊',
    complexity: 'Intermediate',
  },
  {
    id: 'paladin',
    name: 'Paladin',
    tagline: 'Holy warrior with divine smite',
    description:
      'Paladins are righteous warriors bound by a sacred oath. They combine heavy armor combat with powerful healing and the ability to unleash radiant Smites that deal massive damage. Great for players who want to feel heroic.',
    hitDie: 10,
    primaryAbility: ['str', 'cha'],
    saves: ['wis', 'cha'],
    armorProficiency: 'All armor, Shields',
    skillChoices: { count: 2, from: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'] },
    subclassLevel: 3,
    subclassName: 'Sacred Oath',
    icon: '⚡',
    complexity: 'Intermediate',
  },
  {
    id: 'ranger',
    name: 'Ranger',
    tagline: 'Wilderness hunter and tracker',
    description:
      'Rangers are expert hunters and trackers who blend martial prowess with nature magic. They\'re at their best in the wilds — tracking enemies, navigating dangerous terrain, and picking off foes from range or striking with two weapons.',
    hitDie: 10,
    primaryAbility: ['dex', 'wis'],
    saves: ['str', 'dex'],
    armorProficiency: 'Light and Medium armor, Shields',
    skillChoices: { count: 3, from: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'] },
    subclassLevel: 3,
    subclassName: 'Ranger Archetype',
    icon: '🏹',
    complexity: 'Intermediate',
  },
  {
    id: 'rogue',
    name: 'Rogue',
    tagline: 'Cunning trickster and sneak attacker',
    description:
      'Rogues are masters of stealth, deception, and precision. Their Sneak Attack deals devastating damage when they have advantage, and their Cunning Action lets them act faster than other classes. Perfect for players who like outsmarting enemies.',
    hitDie: 8,
    primaryAbility: ['dex'],
    saves: ['dex', 'int'],
    armorProficiency: 'Light armor',
    skillChoices: { count: 4, from: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'] },
    subclassLevel: 3,
    subclassName: 'Roguish Archetype',
    icon: '🗡️',
    complexity: 'Beginner',
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    tagline: 'Innate magic from bloodline power',
    description:
      'Sorcerers don\'t study magic — they were born with it. Their innate power comes from a magical bloodline or cosmic event, and they channel it into devastating spells. Sorcery Points let them push their magic further than any other caster.',
    hitDie: 6,
    primaryAbility: ['cha'],
    saves: ['con', 'cha'],
    armorProficiency: 'None',
    skillChoices: { count: 2, from: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'] },
    subclassLevel: 1,
    subclassName: 'Sorcerous Origin',
    icon: '💥',
    complexity: 'Intermediate',
  },
  {
    id: 'warlock',
    name: 'Warlock',
    tagline: 'Power through a dark pact',
    description:
      'Warlocks gain magical power through a pact with a powerful otherworldly being — a Fiend, an Archfey, or an Ancient Entity. They have fewer spell slots than other casters but those slots refresh on a short rest, making them consistent damage dealers.',
    hitDie: 8,
    primaryAbility: ['cha'],
    saves: ['wis', 'cha'],
    armorProficiency: 'Light armor',
    skillChoices: { count: 2, from: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'] },
    subclassLevel: 1,
    subclassName: 'Otherworldly Patron',
    icon: '👁️',
    complexity: 'Intermediate',
  },
  {
    id: 'wizard',
    name: 'Wizard',
    tagline: 'Scholar of the arcane arts',
    description:
      'Wizards learn magic through rigorous study and fill their spellbooks with the most powerful arcane spells in existence. They have the widest spell selection of any class. Challenging to master but incredibly rewarding for players who love options.',
    hitDie: 6,
    primaryAbility: ['int'],
    saves: ['int', 'wis'],
    armorProficiency: 'None',
    skillChoices: { count: 2, from: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'] },
    subclassLevel: 2,
    subclassName: 'Arcane Tradition',
    icon: '📚',
    complexity: 'Advanced',
  },
  {
    id: 'summoner',
    name: 'Summoner',
    tagline: 'Holds the seam open, pulls something through',
    description:
      'Summoners don\'t fling their own power around — they specialize in tearing a small, controlled seam toward the other side and binding whatever comes through to their will. It\'s dangerous, unpredictable work, and the best Summoners are the ones who\'ve learned exactly how far a seam can be pushed before it pushes back.',
    hitDie: 8,
    primaryAbility: ['cha'],
    saves: ['con', 'cha'],
    armorProficiency: 'Light armor',
    skillChoices: { count: 2, from: ['Arcana', 'Insight', 'Intimidation', 'Investigation', 'Nature', 'Religion'] },
    subclassLevel: 1,
    subclassName: 'Binding',
    icon: '🕳️',
    complexity: 'Advanced',
  },
  {
    id: 'tinker',
    name: 'Tinker',
    tagline: 'Scavenger-engineer who bends magic through scrap',
    description:
      'Tinkers channel their magic through what they build — rigged wiring, salvaged parts, gear jury-rigged into something that shouldn\'t work but does. Half mechanic, half caster, they turn Teraphobia\'s ruins into a toolbox.',
    hitDie: 8,
    primaryAbility: ['int'],
    saves: ['con', 'int'],
    armorProficiency: 'Light and Medium armor, Shields',
    skillChoices: { count: 2, from: ['Arcana', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'] },
    subclassLevel: 3,
    subclassName: 'Specialization',
    icon: '🔧',
    complexity: 'Intermediate',
  },
];

// Fighting Style — the only class with a level-1 style choice; others pick a subclass
// (see SUBCLASSES) or nothing yet, matching each class's own subclassLevel.
export const FIGHTING_STYLES = [
  { id: 'archery', name: 'Archery', description: '+2 bonus to attack rolls made with ranged weapons.' },
  { id: 'defense', name: 'Defense', description: '+1 bonus to AC while wearing armor.' },
  { id: 'dueling', name: 'Dueling', description: '+2 bonus to damage when wielding a single one-handed weapon with no other weapon.' },
  { id: 'great-weapon-fighting', name: 'Great Weapon Fighting', description: 'Reroll 1s and 2s on damage dice when using a two-handed weapon.' },
  { id: 'protection', name: 'Protection', description: 'Use your reaction to impose disadvantage on an attack against a nearby ally.' },
  { id: 'two-weapon-fighting', name: 'Two-Weapon Fighting', description: 'Add your ability modifier to the damage of your off-hand attack.' },
];

// Subclass options for the four classes whose subclassLevel is 1 (chosen at creation).
// Every other class keeps subclass unset at creation — it isn't chosen until a later
// level, same as the real rules — and remains editable later from the character sheet.
export const SUBCLASSES = {
  cleric: [
    { id: 'ember', name: 'Domain of the Ember', description: 'Your faith burns hot — you channel fire and ash alongside your healing.' },
    { id: 'mercy', name: 'Domain of Mercy', description: 'Your faith is a steady hand — your healing and protection magic run deep.' },
    { id: 'rift', name: 'Domain of the Rift', description: 'Your faith looks straight at the tear in the world and does not flinch.' },
    { id: 'order', name: 'Domain of Order', description: 'Your faith is a held line — you ward and guard those who stand with you.' },
  ],
  sorcerer: [
    { id: 'riftborn', name: 'Riftborn', description: 'Your power sparked the moment a rift tore near you, and never fully settled.' },
    { id: 'bleedline', name: 'Bleedline', description: 'Magic seeps into you from a Kindled ancestor\'s bloodline, subtle and constant.' },
    { id: 'static-blood', name: 'Static Blood', description: 'Your power crackles like a live wire — quick, unstable, hard to predict.' },
    { id: 'old-blood', name: 'Old Blood', description: 'Your power is inherited from something ancient that predates the rifts.' },
  ],
  warlock: [
    { id: 'the-hollow', name: 'The Hollow', description: 'Your patron is a hunger from beyond a collapsed rift — it wants, and you provide.' },
    { id: 'the-static', name: 'The Static', description: 'Your patron is an entity woven from raw rift-storm, restless and loud.' },
    { id: 'the-undertow', name: 'The Undertow', description: 'Your patron lives in the space between tears, and speaks to you from the gaps.' },
    { id: 'ember-court', name: 'The Ember Court', description: 'Your patron rules a fire-and-ash aristocracy on the other side of a rift.' },
  ],
  summoner: [
    { id: 'binding-ash', name: 'Binding of Ash', description: 'What you pulled through burns — your bound thing runs hot and aggressive.' },
    { id: 'binding-hollow', name: 'Binding of Hollow', description: 'What you pulled through is emptiness given shape — quiet, patient, draining.' },
    { id: 'binding-static', name: 'Binding of Static', description: 'What you pulled through crackles with rift-storm — fast, erratic, shocking.' },
    { id: 'binding-stone', name: 'Binding of Stone', description: 'What you pulled through is heavy and slow to anger — a wall that fights back.' },
  ],
};

// 2024 PHB backgrounds — each provides fixed ASIs, two skill proficiencies, and an Origin Feat
export const BACKGROUNDS = [
  {
    id: 'acolyte',
    name: 'Acolyte',
    tagline: 'Devoted servant of a deity',
    description: 'You have spent your life in service to a temple. You understand the rituals and prayers of your faith, and devotion to your god has shaped your entire outlook.',
    abilityBonus: { int: 1, wis: 2 },
    skills: ['Insight', 'Religion'],
    feat: 'Magic Initiate (Cleric)',
    equipment: 'Holy symbol, prayer book, 5 sticks of incense, vestments, common clothes, 15 gp',
    icon: '🕯️',
  },
  {
    id: 'artisan',
    name: 'Artisan',
    tagline: 'Skilled craftsperson',
    description: 'You trained as an apprentice in a craft. Your work has shaped your hands and your mind — you understand materials, tools, and the satisfaction of making something that will last.',
    abilityBonus: { str: 2, wis: 1 },
    skills: ['Insight', 'Persuasion'],
    feat: 'Crafter',
    equipment: 'Artisan\'s tools (one type), letter of introduction from guild, traveler\'s clothes, 15 gp',
    icon: '🔨',
  },
  {
    id: 'charlatan',
    name: 'Charlatan',
    tagline: 'Silver-tongued deceiver',
    description: 'You have always been able to spot a sucker — and a way out of trouble. Whether selling miracle cures or playing a wealthy merchant, deception comes naturally to you.',
    abilityBonus: { dex: 2, cha: 1 },
    skills: ['Deception', 'Sleight of Hand'],
    feat: 'Skilled',
    equipment: 'Fine clothes, disguise kit, con tools (weighted dice, marked cards), 15 gp',
    icon: '🃏',
  },
  {
    id: 'criminal',
    name: 'Criminal',
    tagline: 'Experienced in the shadows',
    description: 'You have a history with the wrong side of the law. Whether thief, smuggler, or assassin, you know how to survive in the criminal underworld — and when to run.',
    abilityBonus: { dex: 2, int: 1 },
    skills: ['Deception', 'Stealth'],
    feat: 'Alert',
    equipment: 'Crowbar, dark common clothes with hood, 15 gp',
    icon: '🔓',
  },
  {
    id: 'entertainer',
    name: 'Entertainer',
    tagline: 'Performer who lives for the crowd',
    description: 'Your life has been defined by the stage. You thrive on the adoration of an audience and know how to work a room — whether in a grand theater or a smoky tavern.',
    abilityBonus: { dex: 1, cha: 2 },
    skills: ['Acrobatics', 'Performance'],
    feat: 'Skilled',
    equipment: 'Musical instrument, favor from an admirer, costume, 15 gp',
    icon: '🎭',
  },
  {
    id: 'farmer',
    name: 'Farmer',
    tagline: 'Salt-of-the-earth worker',
    description: 'You grew up tending crops and livestock. Hard work, patience, and reading the land and weather are second nature to you. You know that nature is something to work with, not against.',
    abilityBonus: { con: 2, wis: 1 },
    skills: ['Animal Handling', 'Nature'],
    feat: 'Tough',
    equipment: 'Pitchfork, milk-cart, iron pot, common clothes, 10 gp',
    icon: '🌾',
  },
  {
    id: 'guard',
    name: 'Guard',
    tagline: 'Watchful protector',
    description: 'You worked as a guard — at a gate, a noble estate, or a merchant caravan. Long shifts have trained you to stay alert and to notice when something is wrong before it becomes a crisis.',
    abilityBonus: { str: 2, wis: 1 },
    skills: ['Athletics', 'Perception'],
    feat: 'Alert',
    equipment: 'Spear, light crossbow with 20 bolts, uniform, horn, manacles, 10 gp',
    icon: '🪖',
  },
  {
    id: 'guide',
    name: 'Guide',
    tagline: 'Expert wilderness navigator',
    description: 'You have spent years leading expeditions through dangerous terrain. You read tracks, predict weather, and know which berries will heal and which will kill.',
    abilityBonus: { dex: 1, wis: 2 },
    skills: ['Stealth', 'Survival'],
    feat: 'Magic Initiate (Druid)',
    equipment: 'Cartographer\'s tools, staff, hunting trap, traveler\'s clothes, 10 gp',
    icon: '🧭',
  },
  {
    id: 'hermit',
    name: 'Hermit',
    tagline: 'Seeker of hidden truths',
    description: 'You lived in seclusion — in a cave, a monastery, or a hidden grove. Months or years of solitude gave you time to think deeply, and you discovered something profound about the nature of existence.',
    abilityBonus: { con: 2, wis: 1 },
    skills: ['Medicine', 'Religion'],
    feat: 'Magic Initiate (Druid)',
    equipment: 'Scroll case with notes, winter blanket, common clothes, herbalism kit, 5 gp',
    icon: '🏔️',
  },
  {
    id: 'merchant',
    name: 'Merchant',
    tagline: 'Savvy trader and negotiator',
    description: 'You grew up in commerce — buying, selling, and knowing the value of everything. You understand that information is the most valuable currency, and you always know a buyer for the goods others can\'t move.',
    abilityBonus: { int: 1, cha: 2 },
    skills: ['Investigation', 'Persuasion'],
    feat: 'Lucky',
    equipment: 'Merchant\'s scale, lockbox, fine clothes, 25 gp',
    icon: '💰',
  },
  {
    id: 'noble',
    name: 'Noble',
    tagline: 'Born to privilege and power',
    description: 'You were raised in a noble house — trained in etiquette, politics, and the subtle art of wielding influence. Doors open for you that remain closed to others, but so do enemies.',
    abilityBonus: { str: 1, cha: 2 },
    skills: ['History', 'Persuasion'],
    feat: 'Skilled',
    equipment: 'Fine clothes, signet ring, scroll of pedigree, gaming set, 25 gp',
    icon: '👑',
  },
  {
    id: 'sage',
    name: 'Sage',
    tagline: 'Scholar of ancient lore',
    description: 'You spent years studying in a library, academy, or wizard\'s tower. You have accumulated knowledge that most people never encounter — and you know exactly who to ask when you hit the edge of your expertise.',
    abilityBonus: { int: 2, wis: 1 },
    skills: ['Arcana', 'History'],
    feat: 'Magic Initiate (Wizard)',
    equipment: 'Bottle of black ink, quill, small knife, common clothes, 10 gp',
    icon: '📖',
  },
  {
    id: 'sailor',
    name: 'Sailor',
    tagline: 'Weathered seafarer',
    description: 'You have crewed ships across treacherous waters. You\'ve survived storms, pirates, and sea monsters. The sea both terrifies and calls to you — no landlocked life will ever feel entirely real.',
    abilityBonus: { str: 2, dex: 1 },
    skills: ['Athletics', 'Perception'],
    feat: 'Tavern Brawler',
    equipment: 'Belaying pin (club), 50 ft silk rope, lucky charm, common clothes, 10 gp',
    icon: '⚓',
  },
  {
    id: 'scribe',
    name: 'Scribe',
    tagline: 'Meticulous keeper of records',
    description: 'You worked as a scribe — copying texts, drafting contracts, or recording histories. Your attention to detail is unmatched, and you have read enough secret documents to know that knowledge is power.',
    abilityBonus: { dex: 1, int: 2 },
    skills: ['Investigation', 'Perception'],
    feat: 'Skilled',
    equipment: 'Fine ink, parchment (10 sheets), small knife, common clothes, 10 gp',
    icon: '📜',
  },
  {
    id: 'soldier',
    name: 'Soldier',
    tagline: 'Hardened veteran of war',
    description: 'You served in an army — or maybe a mercenary company or city guard. You know how battles are won and lost, how to follow orders, and what it costs to survive when your comrades don\'t.',
    abilityBonus: { str: 2, con: 1 },
    skills: ['Athletics', 'Intimidation'],
    feat: 'Savage Attacker',
    equipment: 'Insignia of rank, trophy from fallen enemy, gaming set, common clothes, 10 gp',
    icon: '⚔️',
  },
  {
    id: 'wayfarer',
    name: 'Wayfarer',
    tagline: 'Wanderer between worlds',
    description: 'You have never stayed anywhere long enough to call it home. Whether by choice or necessity, you move from place to place, picking up skills, contacts, and stories along the way.',
    abilityBonus: { dex: 2, wis: 1 },
    skills: ['Insight', 'Stealth'],
    feat: 'Lucky',
    equipment: 'Bedroll, lucky token, traveler\'s clothes, gaming set, 10 gp',
    icon: '🎒',
  },
];

// Origin Feats — covers every feat name referenced by BACKGROUNDS above (granted
// automatically, fixed by background) and doubles as the pool Humans pick from for
// their "Versatile" trait (gain one Origin Feat of your choice).
export const FEATS = [
  { id: 'magic-initiate-cleric', name: 'Magic Initiate (Cleric)', description: 'Learn two cantrips and one 1st-level spell from the Cleric list; cast the leveled spell once per long rest without a slot.' },
  { id: 'magic-initiate-druid', name: 'Magic Initiate (Druid)', description: 'Learn two cantrips and one 1st-level spell from the Druid list; cast the leveled spell once per long rest without a slot.' },
  { id: 'magic-initiate-wizard', name: 'Magic Initiate (Wizard)', description: 'Learn two cantrips and one 1st-level spell from the Wizard list; cast the leveled spell once per long rest without a slot.' },
  { id: 'crafter', name: 'Crafter', description: 'You work faster and cheaper at the crafting table, and gain proficiency with three artisan\'s tools.' },
  { id: 'skilled', name: 'Skilled', description: 'Gain proficiency in three skills or tools of your choice.' },
  { id: 'alert', name: 'Alert', description: 'You can\'t be caught flat-footed — you act first when it matters, and see through most disguises at a glance.' },
  { id: 'tough', name: 'Tough', description: 'Your hit point maximum increases by 2 per character level.' },
  { id: 'lucky', name: 'Lucky', description: 'Once per long rest, turn a failed roll into a second chance.' },
  { id: 'tavern-brawler', name: 'Tavern Brawler', description: 'You hit harder unarmed and can grapple as part of an attack.' },
  { id: 'savage-attacker', name: 'Savage Attacker', description: 'Once per turn, reroll your weapon damage and take the better result.' },
];

// Standard array values for ability score assignment (2024 PHB)
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Point buy (2024 PHB): 27-point budget, scores range 8-15
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
export const POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function pointBuyCost(score) {
  return POINT_BUY_COST[score] ?? null; // null = outside point-buy range
}

export function pointBuySpent(scores) {
  return ABILITY_KEYS.reduce((sum, k) => sum + (POINT_BUY_COST[scores[k]] ?? 0), 0);
}

// Pronoun options for character sheets — surfaced to the AI so it refers to
// each character correctly instead of defaulting to one pronoun for everyone.
export const PRONOUN_OPTIONS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'other'];

export const ABILITIES = [
  { key: 'str', label: 'Strength', abbr: 'STR', description: 'Physical power, melee attacks, carrying capacity' },
  { key: 'dex', label: 'Dexterity', abbr: 'DEX', description: 'Speed, ranged attacks, stealth, AC without armor' },
  { key: 'con', label: 'Constitution', abbr: 'CON', description: 'Stamina, hit points, concentration spells' },
  { key: 'int', label: 'Intelligence', abbr: 'INT', description: 'Memory, reasoning, wizard spells, arcana' },
  { key: 'wis', label: 'Wisdom', abbr: 'WIS', description: 'Awareness, intuition, cleric/druid spells' },
  { key: 'cha', label: 'Charisma', abbr: 'CHA', description: 'Personality, leadership, bard/warlock/sorcerer spells' },
];

// Which abilities a class most wants — guides recommended array assignment
export const CLASS_PRIMARY_ABILITIES = {
  barbarian: ['str', 'con'],
  bard: ['cha', 'dex'],
  cleric: ['wis', 'con'],
  druid: ['wis', 'con'],
  fighter: ['str', 'con'],        // or dex, con for ranged
  monk: ['dex', 'wis'],
  paladin: ['str', 'cha'],
  ranger: ['dex', 'wis'],
  rogue: ['dex', 'int'],
  sorcerer: ['cha', 'con'],
  summoner: ['cha', 'con'],
  tinker: ['int', 'con'],
  warlock: ['cha', 'con'],
  wizard: ['int', 'con'],
};

export function getSpeciesById(id) {
  return SPECIES.find(s => s.id === id) ?? null;
}

export function getClassById(id) {
  return CLASSES.find(c => c.id === id) ?? null;
}

export function getBackgroundById(id) {
  return BACKGROUNDS.find(b => b.id === id) ?? null;
}

export function getLineageOptions(speciesId) {
  return getSpeciesById(speciesId)?.lineageOptions ?? null;
}

export function hasFightingStyle(classId) {
  return classId === 'fighter';
}

export function getSubclassOptions(classId) {
  return SUBCLASSES[classId] ?? null;
}

export function getFeatByName(name) {
  return FEATS.find(f => f.name === name) ?? null;
}
