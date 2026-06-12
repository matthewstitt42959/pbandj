// Pure utility functions for D&D 5e / 2024 character math

/** @param {number} score - ability score (3–20+) */
export function getModifier(score) {
  return Math.floor((score - 10) / 2);
}

/** @param {number} level - character level (1–20) */
export function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}

/**
 * @param {number} hitDie  - class hit die (6, 8, 10, or 12)
 * @param {number} conScore - Constitution score
 * @param {number} level   - character level
 */
export function calculateMaxHP(hitDie, conScore, level) {
  const conMod = getModifier(conScore);
  // Level 1: max hit die + CON mod. Each level after: average (round up) + CON mod
  const avgPerLevel = Math.floor(hitDie / 2) + 1;
  return hitDie + conMod + (level - 1) * (avgPerLevel + conMod);
}

/**
 * Unarmored AC (10 + DEX modifier)
 * @param {number} dexScore
 */
export function calculateUnarmoredAC(dexScore) {
  return 10 + getModifier(dexScore);
}

/**
 * Apply background ability bonuses to base scores
 * @param {{ str,dex,con,int,wis,cha }} base - standard array assignment
 * @param {{ str?,dex?,con?,int?,wis?,cha? }} bonus - from background
 */
export function applyBackgroundBonuses(base, bonus) {
  const result = { ...base };
  for (const [key, value] of Object.entries(bonus ?? {})) {
    result[key] = (result[key] ?? 0) + value;
  }
  return result;
}

/**
 * Generate default skill proficiencies from a list of skill names
 * @param {string[]} skills
 */
export function buildSkillsFromProficiencies(skills) {
  const ALL_SKILLS = [
    'acrobatics','animalHandling','arcana','athletics','deception',
    'history','insight','intimidation','investigation','medicine',
    'nature','perception','performance','persuasion','religion',
    'sleightOfHand','stealth','survival',
  ];
  const profSet = new Set(
    skills.map(s => s.replace(/\s+(\w)/g, (_, c) => c.toUpperCase())
      .replace(/^(\w)/, c => c.toLowerCase()))
  );
  return Object.fromEntries(ALL_SKILLS.map(s => [s, profSet.has(s)]));
}

const HIT_DICE = {
  barbarian: 12,
  fighter: 10, paladin: 10, ranger: 10,
  monk: 8, cleric: 8, druid: 8, rogue: 8, warlock: 8, bard: 8,
  sorcerer: 6, wizard: 6,
};

/**
 * Hit die size for a given class name (case-insensitive).
 * Defaults to d8 for unknown classes.
 * @param {string} className
 */
export function getHitDie(className) {
  return HIT_DICE[className?.toLowerCase()] ?? 8;
}

/**
 * HP gained when leveling up: average hit die roll (rounded up) + CON modifier.
 * Minimum 1.
 * @param {number} hitDie
 * @param {number} conScore
 */
export function hpGainPerLevel(hitDie, conScore) {
  const conMod = getModifier(conScore);
  return Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
}

/**
 * Level up a game-format character (hp: {current, max}, abilities: {con: {score}}).
 * @param {{ level: number, class: string, hp: {current: number, max: number}, abilities: {con: {score: number}} }} char
 */
export function levelUpGameChar(char) {
  const hitDie = getHitDie(char.class);
  const conScore = char.abilities?.con?.score ?? 10;
  const gain = hpGainPerLevel(hitDie, conScore);
  return {
    ...char,
    level: char.level + 1,
    hp: { current: char.hp.current + gain, max: char.hp.max + gain },
  };
}

/**
 * Level up a DB-format character (hp: number, maxHp: number, abilityScores: {con: number}).
 * Returns only the fields that change (for PATCH).
 * @param {{ level: number, class: string, hp: number, maxHp: number, abilityScores: {con: number} }} char
 */
export function levelUpDbChar(char) {
  const hitDie = getHitDie(char.class);
  const conScore = char.abilityScores?.con ?? 10;
  const gain = hpGainPerLevel(hitDie, conScore);
  return { level: char.level + 1, maxHp: char.maxHp + gain, hp: char.hp + gain };
}

/**
 * Suggest ability score assignment for a class
 * @param {string[]} primaryAbilities - e.g. ['str', 'con']
 * @param {number[]} array - standard array [15,14,13,12,10,8]
 */
export function suggestAbilityAssignment(primaryAbilities, array = [15, 14, 13, 12, 10, 8]) {
  const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const sorted = [...array].sort((a, b) => b - a);
  const assignment = {};

  // Assign highest values to primary abilities first
  const remaining = [...ABILITY_KEYS];
  primaryAbilities.forEach((ab, i) => {
    assignment[ab] = sorted[i];
    remaining.splice(remaining.indexOf(ab), 1);
  });

  // Distribute remaining values to remaining abilities
  const remainingValues = sorted.slice(primaryAbilities.length);
  remaining.forEach((ab, i) => {
    assignment[ab] = remainingValues[i] ?? 8;
  });

  return assignment;
}
