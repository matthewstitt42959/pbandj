import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  SPECIES, CLASSES, BACKGROUNDS, STANDARD_ARRAY, ABILITIES, CLASS_PRIMARY_ABILITIES, PRONOUN_OPTIONS,
  POINT_BUY_MIN, POINT_BUY_MAX, POINT_BUY_BUDGET, pointBuyCost, pointBuySpent,
  FIGHTING_STYLES, FEATS, getLineageOptions, hasFightingStyle, getSubclassOptions,
} from '../data/dnd2024';
import { getCasterInfo } from '../data/casterProgression';
import {
  getModifier, calculateMaxHP, calculateUnarmoredAC,
  applyBackgroundBonuses, buildSkillsFromChoices, suggestAbilityAssignment,
} from '../utils/characterUtils';
import PointBuyTracker from '../components/PointBuyTracker';
import './CharacterCreate.css';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_METHODS = [
  { id: 'standard', label: 'Standard Array' },
  { id: 'pointbuy', label: 'Point Buy' },
];
const POINT_BUY_RANGE = Array.from(
  { length: POINT_BUY_MAX - POINT_BUY_MIN + 1 },
  (_, i) => POINT_BUY_MIN + i,
);

const ALL_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
  'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival',
];

const BASE_STEPS = ['Name & Species', 'Class', 'Background', 'Ability Scores', 'Proficiencies'];

function isCasterAtLevel1(classId) {
  const info = getCasterInfo(classId, 1);
  return !!info && !info.noCastingYet;
}

// ─── Step 1: Name & Species ────────────────────────────────────────────────

function StepNameSpecies({ form, setForm }) {
  const species = SPECIES.find(x => x.id === form.species);
  const lineage = species ? getLineageOptions(species.id) : null;

  return (
    <div className="wiz-step">
      <h2 className="wiz-step__title">Who are you?</h2>
      <p className="wiz-step__hint">Give your character a name and choose their species.</p>

      <label className="wiz-label">Character name</label>
      <input
        className="wiz-input"
        type="text"
        placeholder="e.g. Kaelin Dawnwhisper"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        maxLength={40}
        autoFocus
      />

      <label className="wiz-label" style={{ marginTop: '1.5rem' }}>Pronouns</label>
      <p className="wiz-sublabel">
        Lets the AI refer to your character correctly instead of guessing.
      </p>
      <select
        className="wiz-input"
        value={form.pronouns}
        onChange={e => setForm(f => ({ ...f, pronouns: e.target.value }))}
      >
        {PRONOUN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <label className="wiz-label" style={{ marginTop: '1.5rem' }}>Species</label>
      <p className="wiz-sublabel">
        Your species shapes your innate traits and how the world perceives you. All are equally viable — pick what feels right.
      </p>
      <div className="wiz-card-grid">
        {SPECIES.map(s => (
          <button
            key={s.id}
            type="button"
            className={`wiz-card ${form.species === s.id ? 'wiz-card--selected' : ''}`}
            onClick={() => setForm(f => ({ ...f, species: s.id, speciesTrait: null }))}
          >
            <span className="wiz-card__icon">{s.icon}</span>
            <span className="wiz-card__name">{s.name}</span>
            <span className="wiz-card__tag">{s.tagline}</span>
            <span className="wiz-card__size">{s.size} · {s.speed}ft</span>
          </button>
        ))}
      </div>

      {species && (
        <div className="wiz-detail">
          <p className="wiz-detail__desc">{species.description}</p>
          <ul className="wiz-detail__traits">
            {species.traits.map((t, i) => <li key={i}>{t}</li>)}
          </ul>

          {lineage && (
            <div className="wiz-lineage-picker">
              <label className="wiz-label">Choose your lineage</label>
              <div className="wiz-chip-grid">
                {lineage.map(op => (
                  <button
                    key={op.id}
                    type="button"
                    className={`wiz-chip wiz-chip--pick ${form.speciesTrait === op.name ? 'wiz-chip--selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, speciesTrait: op.name }))}
                  >
                    {op.name}
                  </button>
                ))}
              </div>
              {form.speciesTrait && (
                <p className="wiz-sublabel" style={{ marginTop: '0.5rem' }}>
                  {lineage.find(o => o.name === form.speciesTrait)?.description}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Class ────────────────────────────────────────────────────────

const COMPLEXITY_COLOR = { Beginner: '#4caf81', Intermediate: '#ffc857', Advanced: '#ff8a80' };

function StepClass({ form, setForm }) {
  return (
    <div className="wiz-step">
      <h2 className="wiz-step__title">Choose your class</h2>
      <p className="wiz-step__hint">
        Your class is your role in the party — it defines how you fight, what magic you use, and what you're best at.
      </p>
      <div className="wiz-card-grid">
        {CLASSES.map(c => (
          <button
            key={c.id}
            type="button"
            className={`wiz-card ${form.class === c.id ? 'wiz-card--selected' : ''}`}
            onClick={() => setForm(f => ({
              ...f,
              class: c.id,
              classSkills: [],
              subclass: null,
              fightingStyle: null,
              spells: [],
            }))}
          >
            <span className="wiz-card__icon">{c.icon}</span>
            <span className="wiz-card__name">{c.name}</span>
            <span className="wiz-card__tag">{c.tagline}</span>
            <span
              className="wiz-card__badge"
              style={{ color: COMPLEXITY_COLOR[c.complexity] }}
            >
              {c.complexity}
            </span>
          </button>
        ))}
      </div>

      {form.class && (
        <div className="wiz-detail">
          {(() => {
            const c = CLASSES.find(x => x.id === form.class);
            return (
              <>
                <p className="wiz-detail__desc">{c.description}</p>
                <div className="wiz-detail__stats">
                  <span>Hit Die: <strong>d{c.hitDie}</strong></span>
                  <span>Armor: <strong>{c.armorProficiency}</strong></span>
                  <span>Key abilities: <strong>{c.primaryAbility.map(a => a.toUpperCase()).join(', ')}</strong></span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Background ───────────────────────────────────────────────────

function StepBackground({ form, setForm }) {
  return (
    <div className="wiz-step">
      <h2 className="wiz-step__title">Your background</h2>
      <p className="wiz-step__hint">
        Where did you come from before adventuring? Your background gives you skills, a starting feat, and ability score boosts.
      </p>
      <div className="wiz-card-grid">
        {BACKGROUNDS.map(b => (
          <button
            key={b.id}
            type="button"
            className={`wiz-card ${form.background === b.id ? 'wiz-card--selected' : ''}`}
            onClick={() => setForm(f => ({ ...f, background: b.id }))}
          >
            <span className="wiz-card__icon">{b.icon}</span>
            <span className="wiz-card__name">{b.name}</span>
            <span className="wiz-card__tag">{b.tagline}</span>
            <span className="wiz-card__asi">
              {Object.entries(b.abilityBonus).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}
            </span>
          </button>
        ))}
      </div>

      {form.background && (
        <div className="wiz-detail">
          {(() => {
            const b = BACKGROUNDS.find(x => x.id === form.background);
            return (
              <>
                <p className="wiz-detail__desc">{b.description}</p>
                <div className="wiz-detail__stats">
                  <span>Ability bonuses: <strong>
                    {Object.entries(b.abilityBonus).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}
                  </strong></span>
                  <span>Skills: <strong>{b.skills.join(', ')}</strong></span>
                  <span>Starting feat: <strong>{b.feat}</strong></span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Ability Scores ───────────────────────────────────────────────

function StepAbilityScores({ form, setForm }) {
  const bg = BACKGROUNDS.find(b => b.id === form.background);
  const cls = CLASSES.find(c => c.id === form.class);
  const primaryAbilities = cls ? CLASS_PRIMARY_ABILITIES[cls.id] ?? [] : [];
  const method = form.abilityMethod ?? 'standard';

  const assigned = form.abilityAssignment ?? {};
  const usedValues = Object.values(assigned);
  const remaining = STANDARD_ARRAY.filter(v => {
    const count = usedValues.filter(u => u === v).length;
    const inArray = STANDARD_ARRAY.filter(a => a === v).length;
    return count < inArray;
  });

  const finalScores = useMemo(() => {
    if (!bg) return assigned;
    return applyBackgroundBonuses(assigned, bg.abilityBonus);
  }, [assigned, bg]);

  const setMethod = (nextMethod) => {
    if (nextMethod === method) return;
    setForm(f => ({ ...f, abilityMethod: nextMethod, abilityAssignment: null }));
  };

  const handleAssign = (abilityKey, value) => {
    setForm(f => ({
      ...f,
      abilityAssignment: { ...(f.abilityAssignment ?? {}), [abilityKey]: value === '' ? undefined : Number(value) },
    }));
  };

  const handleAutoAssign = () => {
    const suggestion = suggestAbilityAssignment(primaryAbilities);
    setForm(f => ({ ...f, abilityAssignment: suggestion }));
  };

  const handleFillStandardArray = () => {
    const next = {};
    ABILITY_KEYS.forEach((k, i) => { next[k] = STANDARD_ARRAY[i]; });
    setForm(f => ({ ...f, abilityAssignment: next }));
  };

  return (
    <div className="wiz-step">
      <h2 className="wiz-step__title">Ability scores</h2>
      <p className="wiz-step__hint">
        Choose how to set your six ability scores. Your background will add bonuses on top.
      </p>

      <div className="wiz-method-toggle">
        {ABILITY_METHODS.map(m => (
          <button
            key={m.id}
            type="button"
            className={`wiz-method-btn ${method === m.id ? 'wiz-method-btn--active' : ''}`}
            onClick={() => setMethod(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {primaryAbilities.length > 0 && (
        <div className="wiz-auto-hint">
          <strong>{cls?.name}</strong> benefits most from{' '}
          <strong>{primaryAbilities.map(a => a.toUpperCase()).join(' and ')}</strong>.{' '}
          {method === 'standard' && (
            <button type="button" className="wiz-auto-btn" onClick={handleAutoAssign}>
              Auto-assign for me
            </button>
          )}
        </div>
      )}

      {method === 'pointbuy' && (
        <PointBuyTracker scores={assigned} onFillStandardArray={handleFillStandardArray} />
      )}

      <div className="wiz-ability-grid">
        {ABILITIES.map(ab => {
          const base = assigned[ab.key];
          const final = finalScores[ab.key];
          const bgBonus = bg?.abilityBonus[ab.key] ?? 0;
          const isPrimary = primaryAbilities.includes(ab.key);
          const cost = method === 'pointbuy' ? pointBuyCost(base) : null;

          return (
            <div key={ab.key} className={`wiz-ability-row ${isPrimary ? 'wiz-ability-row--primary' : ''}`}>
              <div className="wiz-ability-label">
                <span className="wiz-ability-name">{ab.abbr}</span>
                <span className="wiz-ability-desc">{ab.label}</span>
              </div>
              {method === 'standard' ? (
                <select
                  className="wiz-ability-select"
                  value={base ?? ''}
                  onChange={e => handleAssign(ab.key, e.target.value)}
                >
                  <option value="">—</option>
                  {STANDARD_ARRAY.map(v => {
                    const alreadyUsed = usedValues.filter(u => u === v).length;
                    const totalInArray = STANDARD_ARRAY.filter(a => a === v).length;
                    const isTakenElsewhere = alreadyUsed >= totalInArray && base !== v;
                    return (
                      <option key={v} value={v} disabled={isTakenElsewhere}>
                        {v}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <select
                  className="wiz-ability-select"
                  value={base ?? ''}
                  onChange={e => handleAssign(ab.key, e.target.value)}
                >
                  <option value="">—</option>
                  {POINT_BUY_RANGE.map(v => (
                    <option key={v} value={v}>{v} ({pointBuyCost(v)}pt)</option>
                  ))}
                </select>
              )}
              <div className="wiz-ability-final">
                {base != null ? (
                  <>
                    <span className="wiz-ability-score">{final}</span>
                    <span className="wiz-ability-mod">
                      ({getModifier(final) >= 0 ? '+' : ''}{getModifier(final)})
                    </span>
                    {bgBonus > 0 && (
                      <span className="wiz-ability-bgbonus">+{bgBonus} {bg?.name}</span>
                    )}
                    {cost !== null && (
                      <span className="wiz-ability-cost">{cost}pt</span>
                    )}
                  </>
                ) : (
                  <span className="wiz-ability-empty">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {method === 'standard' ? (
        <p className="wiz-array-remaining">
          Remaining values:{' '}
          {remaining.length === 0
            ? <strong style={{ color: '#4caf81' }}>All assigned ✓</strong>
            : remaining.join(', ')}
        </p>
      ) : (
        <p className="wiz-array-remaining">
          Pick a value from {POINT_BUY_MIN} to {POINT_BUY_MAX} for each ability — higher scores cost more points.
        </p>
      )}
    </div>
  );
}

// ─── Step 5: Proficiencies ─────────────────────────────────────────────────

function StepProficiencies({ form, setForm }) {
  const cls = CLASSES.find(c => c.id === form.class);
  const bg = BACKGROUNDS.find(b => b.id === form.background);
  const bgSkills = bg?.skills ?? [];
  const choice = cls?.skillChoices;
  const isHuman = form.species === 'human';

  const options = choice?.from === 'any' ? ALL_SKILLS : (choice?.from ?? []);
  const selectable = options.filter(s => !bgSkills.includes(s));
  const chosen = form.classSkills ?? [];
  const count = choice?.count ?? 0;

  const toggleSkill = (skill) => {
    setForm(f => {
      const cur = f.classSkills ?? [];
      if (cur.includes(skill)) return { ...f, classSkills: cur.filter(s => s !== skill) };
      if (cur.length >= count) return f;
      return { ...f, classSkills: [...cur, skill] };
    });
  };

  const humanOptions = ALL_SKILLS.filter(s => !bgSkills.includes(s) && !chosen.includes(s));

  return (
    <div className="wiz-step">
      <h2 className="wiz-step__title">Proficiencies</h2>
      <p className="wiz-step__hint">
        Your background already grants two skills. Now pick the skills your class trains you in.
      </p>

      <label className="wiz-label">From {bg?.name ?? 'your background'}</label>
      <div className="wiz-chip-grid">
        {bgSkills.map(s => <span key={s} className="wiz-chip wiz-chip--fixed">{s}</span>)}
      </div>

      <label className="wiz-label" style={{ marginTop: '1.5rem' }}>
        Choose {count} class skill{count === 1 ? '' : 's'} ({chosen.length}/{count})
      </label>
      <div className="wiz-chip-grid">
        {selectable.map(s => (
          <button
            key={s}
            type="button"
            className={`wiz-chip wiz-chip--pick ${chosen.includes(s) ? 'wiz-chip--selected' : ''}`}
            onClick={() => toggleSkill(s)}
            disabled={!chosen.includes(s) && chosen.length >= count}
          >
            {s}
          </button>
        ))}
      </div>

      {isHuman && (
        <>
          <label className="wiz-label" style={{ marginTop: '1.5rem' }}>
            Skillful — pick one bonus skill
          </label>
          <p className="wiz-sublabel">Humans gain proficiency in one additional skill of their choice.</p>
          <div className="wiz-chip-grid">
            {humanOptions.map(s => (
              <button
                key={s}
                type="button"
                className={`wiz-chip wiz-chip--pick ${form.humanSkill === s ? 'wiz-chip--selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, humanSkill: f.humanSkill === s ? null : s }))}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Step: Class Features (conditional) ────────────────────────────────────

function StepClassFeatures({ form, setForm }) {
  const cls = CLASSES.find(c => c.id === form.class);
  const subclassOptions = getSubclassOptions(form.class);

  if (hasFightingStyle(form.class)) {
    return (
      <div className="wiz-step">
        <h2 className="wiz-step__title">Fighting Style</h2>
        <p className="wiz-step__hint">Pick how you fight — this shapes your combat approach.</p>
        <div className="wiz-card-grid">
          {FIGHTING_STYLES.map(fs => (
            <button
              key={fs.id}
              type="button"
              className={`wiz-card ${form.fightingStyle === fs.name ? 'wiz-card--selected' : ''}`}
              onClick={() => setForm(f => ({ ...f, fightingStyle: fs.name }))}
            >
              <span className="wiz-card__name">{fs.name}</span>
              <span className="wiz-card__tag">{fs.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (subclassOptions) {
    return (
      <div className="wiz-step">
        <h2 className="wiz-step__title">{cls?.subclassName ?? 'Subclass'}</h2>
        <p className="wiz-step__hint">
          Your {cls?.name} gains their {cls?.subclassName} at 1st level. Choose yours.
        </p>
        <div className="wiz-card-grid">
          {subclassOptions.map(sc => (
            <button
              key={sc.id}
              type="button"
              className={`wiz-card ${form.subclass === sc.name ? 'wiz-card--selected' : ''}`}
              onClick={() => setForm(f => ({ ...f, subclass: sc.name }))}
            >
              <span className="wiz-card__name">{sc.name}</span>
              <span className="wiz-card__tag">{sc.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Step: Spells (conditional) ────────────────────────────────────────────

function SpellMeta({ spell }) {
  return (
    <p className="wiz-spell-preview__meta">
      {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
      {spell.school && ` • ${spell.school}`}
      {spell.castingTime && ` • ${spell.castingTime}`}
      {spell.range && ` • ${spell.range}`}
      {spell.duration && ` • ${spell.duration}`}
    </p>
  );
}

function StepSpells({ form, setForm }) {
  const { authFetch } = useAuth();
  const [wikiSpells, setWikiSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [previewSpell, setPreviewSpell] = useState(null);

  useEffect(() => {
    setLoading(true);
    authFetch(`/api/spells?class=${encodeURIComponent(form.class)}`)
      .then(data => setWikiSpells(Array.isArray(data) ? data : []))
      .catch(() => setWikiSpells([]))
      .finally(() => setLoading(false));
  }, [form.class]);

  const spells = form.spells ?? [];
  const knownNames = new Set(spells.map(s => s.name));
  const casterInfo = getCasterInfo(form.class, 1);
  const cantripCount = spells.filter(s => (s.level ?? 0) === 0).length;
  const leveledCount = spells.length - cantripCount;
  const overBudget = casterInfo && (cantripCount > casterInfo.cantrips || leveledCount > casterInfo.known);
  const availableToAdd = wikiSpells.filter(s => !knownNames.has(s.name));
  const selectedWikiSpell = wikiSpells.find(s => s.id === selectedId);

  const add = () => {
    const wiki = wikiSpells.find(s => s.id === selectedId);
    if (!wiki || knownNames.has(wiki.name)) return;
    setForm(f => ({
      ...f,
      spells: [...(f.spells ?? []), {
        name: wiki.name, level: wiki.level ?? 0, description: wiki.description ?? '',
        school: wiki.school ?? '', castingTime: wiki.castingTime ?? '', range: wiki.range ?? '', duration: wiki.duration ?? '',
        notes: '',
      }],
    }));
    setSelectedId('');
  };

  const remove = (name) => setForm(f => ({ ...f, spells: (f.spells ?? []).filter(s => s.name !== name) }));

  return (
    <div className="wiz-step">
      <h2 className="wiz-step__title">Spells</h2>
      <p className="wiz-step__hint">
        {casterInfo
          ? `Pick your starting spells — ${casterInfo.cantrips} cantrip${casterInfo.cantrips === 1 ? '' : 's'} and ${casterInfo.known} spell${casterInfo.known === 1 ? '' : 's'} is typical at level 1.`
          : 'Pick your starting spells.'}
      </p>

      <div className="wiz-add-row">
        <select
          className="wiz-input"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          disabled={loading}
        >
          <option value="">
            {loading
              ? 'Loading spells…'
              : wikiSpells.length === 0
                ? 'No spells in wiki yet'
                : availableToAdd.length === 0
                  ? 'All class spells added'
                  : '— Pick a spell —'}
          </option>
          {availableToAdd
            .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name))
            .map(s => (
              <option key={s.id} value={s.id}>
                {s.level === 0 ? 'Cantrip' : `L${s.level}`} — {s.name}
              </option>
            ))}
        </select>
        <button type="button" className="btn btn--primary btn--sm" onClick={add} disabled={!selectedId}>
          Add
        </button>
      </div>

      {selectedWikiSpell && (
        <div className="wiz-spell-preview">
          <SpellMeta spell={selectedWikiSpell} />
          {selectedWikiSpell.description && (
            <p className="wiz-spell-preview__desc">{selectedWikiSpell.description}</p>
          )}
        </div>
      )}

      <p className="wiz-sublabel" style={{ marginTop: spells.length === 0 ? 0 : '1rem' }}>
        {spells.length === 0 ? 'No spells picked yet.' : 'Click a spell below to read what it does.'}
      </p>
      {spells.length > 0 && (
        <div className="wiz-chip-grid">
          {spells.map(s => (
            <span
              key={s.name}
              className="wiz-chip wiz-chip--fixed wiz-chip--clickable"
              onClick={() => setPreviewSpell(s)}
            >
              {s.level === 0 ? 'Cantrip' : `L${s.level}`} — {s.name}
              <button
                type="button"
                className="wiz-chip__remove"
                onClick={e => { e.stopPropagation(); remove(s.name); }}
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {overBudget && (
        <p className="wiz-error">Over your level 1 budget — you can still continue, but consider trimming down.</p>
      )}

      {previewSpell && (
        <div className="wiz-spell-modal-backdrop" onClick={() => setPreviewSpell(null)}>
          <div className="wiz-spell-modal" onClick={e => e.stopPropagation()}>
            <div className="wiz-spell-modal__header">
              <h3>{previewSpell.name}</h3>
              <button type="button" className="wiz-spell-modal__close" onClick={() => setPreviewSpell(null)} title="Close">×</button>
            </div>
            <SpellMeta spell={previewSpell} />
            {previewSpell.description ? (
              <p className="wiz-spell-preview__desc">{previewSpell.description}</p>
            ) : (
              <p className="wiz-spell-preview__desc">No description available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step: Feats (conditional, Human only) ─────────────────────────────────

function StepFeats({ form, setForm }) {
  return (
    <div className="wiz-step">
      <h2 className="wiz-step__title">Origin Feat</h2>
      <p className="wiz-step__hint">
        Your Versatile trait grants one Origin Feat on top of your background's.
      </p>
      <div className="wiz-card-grid">
        {FEATS.map(ft => (
          <button
            key={ft.id}
            type="button"
            className={`wiz-card ${form.humanFeat === ft.name ? 'wiz-card--selected' : ''}`}
            onClick={() => setForm(f => ({ ...f, humanFeat: ft.name }))}
          >
            <span className="wiz-card__name">{ft.name}</span>
            <span className="wiz-card__tag">{ft.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step: Review ───────────────────────────────────────────────────────

function StepReview({ form, setForm }) {
  const sp = SPECIES.find(s => s.id === form.species);
  const cl = CLASSES.find(c => c.id === form.class);
  const bg = BACKGROUNDS.find(b => b.id === form.background);
  const finalScores = bg
    ? applyBackgroundBonuses(form.abilityAssignment ?? {}, bg.abilityBonus)
    : form.abilityAssignment ?? {};

  const hp = cl ? calculateMaxHP(cl.hitDie, finalScores.con ?? 10, 1) : 0;
  const ac = calculateUnarmoredAC(finalScores.dex ?? 10);
  const allSkills = [
    ...(bg?.skills ?? []),
    ...(form.classSkills ?? []),
    ...(form.humanSkill ? [form.humanSkill] : []),
  ];
  const allFeats = [bg?.feat, form.humanFeat].filter(Boolean);

  return (
    <div className="wiz-step">
      <h2 className="wiz-step__title">Meet {form.name || 'your character'}</h2>

      <div className="wiz-review-card">
        <div className="wiz-review-header">
          <span className="wiz-review-icon">{sp?.icon ?? '⚔️'}</span>
          <div>
            <h3 className="wiz-review-name">{form.name || '—'}</h3>
            <p className="wiz-review-subtitle">
              Level 1 {sp?.name} {cl?.name} · {bg?.name}
            </p>
          </div>
        </div>

        <div className="wiz-review-vitals">
          <div className="wiz-vital">
            <span className="wiz-vital__value">{hp}</span>
            <span className="wiz-vital__label">Hit Points</span>
          </div>
          <div className="wiz-vital">
            <span className="wiz-vital__value">{ac}</span>
            <span className="wiz-vital__label">Armor Class</span>
          </div>
          <div className="wiz-vital">
            <span className="wiz-vital__value">d{cl?.hitDie ?? '—'}</span>
            <span className="wiz-vital__label">Hit Die</span>
          </div>
        </div>

        <div className="wiz-review-scores">
          {ABILITIES.map(ab => {
            const score = finalScores[ab.key] ?? 0;
            const mod = getModifier(score);
            return (
              <div key={ab.key} className="wiz-review-score">
                <span className="wiz-review-score__abbr">{ab.abbr}</span>
                <span className="wiz-review-score__val">{score}</span>
                <span className="wiz-review-score__mod">{mod >= 0 ? '+' : ''}{mod}</span>
              </div>
            );
          })}
        </div>

        {form.speciesTrait && (
          <div className="wiz-review-section">
            <h4>Lineage</h4>
            <p>{form.speciesTrait}</p>
          </div>
        )}

        <div className="wiz-review-section">
          <h4>Skills</h4>
          <p>{allSkills.length ? allSkills.join(', ') : '—'}</p>
        </div>

        {(form.fightingStyle || form.subclass) && (
          <div className="wiz-review-section">
            <h4>{form.fightingStyle ? 'Fighting Style' : cl?.subclassName}</h4>
            <p>{form.fightingStyle || form.subclass}</p>
          </div>
        )}

        {(form.spells ?? []).length > 0 && (
          <div className="wiz-review-section">
            <h4>Spells</h4>
            <p>{form.spells.map(s => s.name).join(', ')}</p>
          </div>
        )}

        <div className="wiz-review-section">
          <h4>Feats</h4>
          <p>{allFeats.length ? allFeats.join(', ') : '—'}</p>
        </div>

        <div className="wiz-review-section">
          <label className="wiz-label">Backstory (optional)</label>
          <p className="wiz-sublabel">A sentence or two about who your character is — the AI DM will weave this into the story.</p>
          <textarea
            className="wiz-input wiz-textarea"
            placeholder="e.g. A disgraced noble seeking redemption after betraying their house..."
            value={form.backstory ?? ''}
            onChange={e => setForm(f => ({ ...f, backstory: e.target.value }))}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────

const CharacterCreate = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    pronouns: 'they/them',
    species: '',
    speciesTrait: null,
    class: '',
    subclass: null,
    fightingStyle: null,
    background: '',
    abilityMethod: 'standard',
    abilityAssignment: null,
    classSkills: [],
    humanSkill: null,
    spells: [],
    humanFeat: null,
    backstory: '',
  });

  const steps = useMemo(() => {
    const s = [...BASE_STEPS];
    if (hasFightingStyle(form.class) || getSubclassOptions(form.class)) s.push('Class Features');
    if (isCasterAtLevel1(form.class)) s.push('Spells');
    if (form.species === 'human') s.push('Feats');
    s.push('Review');
    return s;
  }, [form.class, form.species]);
  const total = steps.length;
  const currentStep = steps[Math.min(step, total - 1)];

  const bg = BACKGROUNDS.find(b => b.id === form.background);
  const cl = CLASSES.find(c => c.id === form.class);
  const finalScores = useMemo(() => {
    if (!form.abilityAssignment || !bg) return form.abilityAssignment ?? {};
    return applyBackgroundBonuses(form.abilityAssignment, bg.abilityBonus);
  }, [form.abilityAssignment, bg]);

  const canAdvance = () => {
    if (currentStep === 'Name & Species') {
      if (!(form.name.trim().length >= 2 && !!form.species)) return false;
      const lineage = getLineageOptions(form.species);
      if (lineage && !form.speciesTrait) return false;
      return true;
    }
    if (currentStep === 'Class') return !!form.class;
    if (currentStep === 'Background') return !!form.background;
    if (currentStep === 'Ability Scores') {
      const allAssigned = ABILITY_KEYS.every(k => form.abilityAssignment?.[k] != null);
      if (!allAssigned) return false;
      if ((form.abilityMethod ?? 'standard') === 'pointbuy') {
        return pointBuySpent(form.abilityAssignment) <= POINT_BUY_BUDGET;
      }
      return true;
    }
    if (currentStep === 'Proficiencies') {
      const count = cl?.skillChoices?.count ?? 0;
      if ((form.classSkills ?? []).length < count) return false;
      if (form.species === 'human' && !form.humanSkill) return false;
      return true;
    }
    if (currentStep === 'Class Features') {
      if (hasFightingStyle(form.class)) return !!form.fightingStyle;
      if (getSubclassOptions(form.class)) return !!form.subclass;
      return true;
    }
    if (currentStep === 'Feats') return !!form.humanFeat;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const skills = buildSkillsFromChoices(
        bg?.skills ?? [],
        form.classSkills ?? [],
        form.species === 'human' ? form.humanSkill : null,
      );
      const hp = calculateMaxHP(cl.hitDie, finalScores.con ?? 10, 1);
      const ac = calculateUnarmoredAC(finalScores.dex ?? 10);
      const feats = [bg?.feat, form.species === 'human' ? form.humanFeat : null].filter(Boolean);

      await authFetch('/api/characters', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          pronouns: form.pronouns,
          species: form.species,
          speciesTrait: form.speciesTrait || null,
          class: form.class,
          subclass: form.subclass || null,
          fightingStyle: form.fightingStyle || null,
          background: form.background,
          backstory: form.backstory?.trim() || null,
          level: 1,
          abilityScores: finalScores,
          hp, maxHp: hp, ac,
          skills,
          spells: form.spells ?? [],
          feats,
        }),
      });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wiz-page">
      <div className="wiz-container">
        {/* Progress bar */}
        <div className="wiz-progress">
          {steps.map((label, i) => (
            <div key={label} className={`wiz-progress__step ${i <= step ? 'wiz-progress__step--done' : ''} ${i === step ? 'wiz-progress__step--active' : ''}`}>
              <span className="wiz-progress__dot">{i < step ? '✓' : i + 1}</span>
              <span className="wiz-progress__label">{label}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="wiz-body">
          {currentStep === 'Name & Species' && <StepNameSpecies form={form} setForm={setForm} />}
          {currentStep === 'Class' && <StepClass form={form} setForm={setForm} />}
          {currentStep === 'Background' && <StepBackground form={form} setForm={setForm} />}
          {currentStep === 'Ability Scores' && <StepAbilityScores form={form} setForm={setForm} />}
          {currentStep === 'Proficiencies' && <StepProficiencies form={form} setForm={setForm} />}
          {currentStep === 'Class Features' && <StepClassFeatures form={form} setForm={setForm} />}
          {currentStep === 'Spells' && <StepSpells form={form} setForm={setForm} />}
          {currentStep === 'Feats' && <StepFeats form={form} setForm={setForm} />}
          {currentStep === 'Review' && <StepReview form={form} setForm={setForm} />}
        </div>

        {/* Navigation */}
        {error && <p className="wiz-error">{error}</p>}
        <div className="wiz-nav">
          {step > 0 && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setStep(s => s - 1)}
              disabled={saving}
            >
              Back
            </button>
          )}
          <span className="wiz-nav__spacer" />
          {step < total - 1 ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Enter the world'}
            </button>
          )}
        </div>

        <p className="wiz-footer-hint">
          You can create additional characters and retire old ones from your dashboard at any time.
        </p>
      </div>
    </div>
  );
};

export default CharacterCreate;
