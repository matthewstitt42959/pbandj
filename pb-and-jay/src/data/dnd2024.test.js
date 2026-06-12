import { describe, it, expect } from 'vitest';
import {
  SPECIES, CLASSES, BACKGROUNDS, STANDARD_ARRAY,
  getSpeciesById, getClassById, getBackgroundById,
  CLASS_PRIMARY_ABILITIES,
} from './dnd2024';

describe('SPECIES', () => {
  it('has at least 8 species', () => expect(SPECIES.length).toBeGreaterThanOrEqual(8));
  it('every species has required fields', () => {
    SPECIES.forEach(s => {
      expect(s.id, `${s.name} missing id`).toBeTruthy();
      expect(s.name, `${s.id} missing name`).toBeTruthy();
      expect(s.description, `${s.id} missing description`).toBeTruthy();
      expect(Array.isArray(s.traits), `${s.id} traits not array`).toBe(true);
      expect(s.speed, `${s.id} missing speed`).toBeGreaterThan(0);
    });
  });
  it('all species ids are unique', () => {
    const ids = SPECIES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('CLASSES', () => {
  it('has exactly 12 classes (2024 PHB)', () => expect(CLASSES.length).toBe(12));
  it('every class has required fields', () => {
    CLASSES.forEach(c => {
      expect(c.id, `${c.name} missing id`).toBeTruthy();
      expect(c.hitDie, `${c.id} missing hitDie`).toBeGreaterThan(0);
      expect([6, 8, 10, 12], `${c.id} invalid hitDie`).toContain(c.hitDie);
      expect(Array.isArray(c.primaryAbility), `${c.id} primaryAbility not array`).toBe(true);
    });
  });
  it('all class ids are unique', () => {
    const ids = CLASSES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every class has a matching CLASS_PRIMARY_ABILITIES entry', () => {
    CLASSES.forEach(c => {
      expect(CLASS_PRIMARY_ABILITIES[c.id], `${c.id} missing primary ability mapping`).toBeTruthy();
    });
  });
});

describe('BACKGROUNDS', () => {
  it('has at least 10 backgrounds', () => expect(BACKGROUNDS.length).toBeGreaterThanOrEqual(10));
  it('every background has required fields', () => {
    BACKGROUNDS.forEach(b => {
      expect(b.id, `${b.name} missing id`).toBeTruthy();
      expect(b.abilityBonus, `${b.id} missing abilityBonus`).toBeTruthy();
      expect(Array.isArray(b.skills), `${b.id} skills not array`).toBe(true);
      expect(b.skills).toHaveLength(2);
      expect(b.feat, `${b.id} missing feat`).toBeTruthy();
    });
  });
  it('every background abilityBonus sums to +3 (+2 and +1)', () => {
    BACKGROUNDS.forEach(b => {
      const total = Object.values(b.abilityBonus).reduce((a, v) => a + v, 0);
      expect(total, `${b.id} ASI total should be 3`).toBe(3);
    });
  });
  it('all background ids are unique', () => {
    const ids = BACKGROUNDS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('STANDARD_ARRAY', () => {
  it('has 6 values', () => expect(STANDARD_ARRAY).toHaveLength(6));
  it('contains the correct values', () => {
    expect([...STANDARD_ARRAY].sort((a, b) => b - a)).toEqual([15, 14, 13, 12, 10, 8]);
  });
});

describe('lookup helpers', () => {
  it('getSpeciesById returns correct species', () => {
    expect(getSpeciesById('human')?.name).toBe('Human');
  });
  it('getSpeciesById returns null for unknown id', () => {
    expect(getSpeciesById('unicorn')).toBeNull();
  });
  it('getClassById returns correct class', () => {
    expect(getClassById('wizard')?.hitDie).toBe(6);
  });
  it('getBackgroundById returns correct background', () => {
    expect(getBackgroundById('sage')?.feat).toBe('Magic Initiate (Wizard)');
  });
});
