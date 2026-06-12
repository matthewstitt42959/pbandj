import { describe, it, expect } from 'vitest';
import {
  getModifier,
  getProficiencyBonus,
  calculateMaxHP,
  calculateUnarmoredAC,
  applyBackgroundBonuses,
  buildSkillsFromProficiencies,
  suggestAbilityAssignment,
} from './characterUtils';

describe('getModifier', () => {
  it('returns 0 for score 10', () => expect(getModifier(10)).toBe(0));
  it('returns 0 for score 11', () => expect(getModifier(11)).toBe(0));
  it('returns +1 for score 12', () => expect(getModifier(12)).toBe(1));
  it('returns +2 for score 14', () => expect(getModifier(14)).toBe(2));
  it('returns +3 for score 16', () => expect(getModifier(16)).toBe(3));
  it('returns +5 for score 20', () => expect(getModifier(20)).toBe(5));
  it('returns -1 for score 8', () => expect(getModifier(8)).toBe(-1));
  it('returns -2 for score 6', () => expect(getModifier(6)).toBe(-2));
  it('returns -5 for score 1', () => expect(getModifier(1)).toBe(-5));
});

describe('getProficiencyBonus', () => {
  it('is +2 at levels 1–4', () => {
    expect(getProficiencyBonus(1)).toBe(2);
    expect(getProficiencyBonus(4)).toBe(2);
  });
  it('is +3 at levels 5–8', () => {
    expect(getProficiencyBonus(5)).toBe(3);
    expect(getProficiencyBonus(8)).toBe(3);
  });
  it('is +4 at levels 9–12', () => expect(getProficiencyBonus(9)).toBe(4));
  it('is +6 at level 20', () => expect(getProficiencyBonus(20)).toBe(6));
});

describe('calculateMaxHP', () => {
  it('d8 class with CON 10 at level 1 = 8', () => {
    expect(calculateMaxHP(8, 10, 1)).toBe(8);
  });
  it('d8 class with CON 14 (+2) at level 1 = 10', () => {
    expect(calculateMaxHP(8, 14, 1)).toBe(10);
  });
  it('d12 (Barbarian) with CON 16 (+3) at level 1 = 15', () => {
    expect(calculateMaxHP(12, 16, 1)).toBe(15);
  });
  it('d8 with CON 10 at level 2 adds average (5) per level', () => {
    // level 1: 8, level 2: 8 + 5 = 13
    expect(calculateMaxHP(8, 10, 2)).toBe(13);
  });
  it('handles negative CON modifier', () => {
    // d8, CON 8 (-1), level 1 = 7
    expect(calculateMaxHP(8, 8, 1)).toBe(7);
  });
});

describe('calculateUnarmoredAC', () => {
  it('is 10 with DEX 10', () => expect(calculateUnarmoredAC(10)).toBe(10));
  it('is 13 with DEX 16', () => expect(calculateUnarmoredAC(16)).toBe(13));
  it('is 9 with DEX 8', () => expect(calculateUnarmoredAC(8)).toBe(9));
});

describe('applyBackgroundBonuses', () => {
  it('adds bonus to matching abilities', () => {
    const base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
    const result = applyBackgroundBonuses(base, { int: 2, wis: 1 });
    expect(result.int).toBe(14);
    expect(result.wis).toBe(11);
    expect(result.str).toBe(15); // unchanged
  });
  it('handles null bonus gracefully', () => {
    const base = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
    expect(applyBackgroundBonuses(base, null)).toEqual(base);
  });
});

describe('buildSkillsFromProficiencies', () => {
  it('marks provided skills as true', () => {
    const skills = buildSkillsFromProficiencies(['Arcana', 'History']);
    expect(skills.arcana).toBe(true);
    expect(skills.history).toBe(true);
  });
  it('marks unprovided skills as false', () => {
    const skills = buildSkillsFromProficiencies(['Arcana']);
    expect(skills.athletics).toBe(false);
  });
  it('handles multi-word skill names', () => {
    const skills = buildSkillsFromProficiencies(['Animal Handling', 'Sleight of Hand']);
    expect(skills.animalHandling).toBe(true);
    expect(skills.sleightOfHand).toBe(true);
  });
});

describe('suggestAbilityAssignment', () => {
  it('assigns highest values to primary abilities', () => {
    const result = suggestAbilityAssignment(['str', 'con']);
    expect(result.str).toBe(15);
    expect(result.con).toBe(14);
  });
  it('covers all six abilities', () => {
    const result = suggestAbilityAssignment(['int', 'con']);
    const keys = Object.keys(result);
    expect(keys).toHaveLength(6);
    ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(k => expect(keys).toContain(k));
  });
});
