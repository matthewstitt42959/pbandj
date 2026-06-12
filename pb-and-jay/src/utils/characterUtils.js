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
