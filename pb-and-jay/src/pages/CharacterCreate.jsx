import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  SPECIES, CLASSES, BACKGROUNDS, STANDARD_ARRAY, ABILITIES, CLASS_PRIMARY_ABILITIES,
} from '../data/dnd2024';
import {
  getModifier, calculateMaxHP, calculateUnarmoredAC,
  applyBackgroundBonuses, buildSkillsFromProficiencies, suggestAbilityAssignment,
} from '../utils/characterUtils';
import './CharacterCreate.css';

const STEPS = ['Name & Species', 'Class', 'Background', 'Ability Scores', 'Review'];
const TOTAL = STEPS.length;

// ─── Step 1: Name & Species ────────────────────────────────────────────────

function StepNameSpecies({ form, setForm }) {
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
            onClick={() => setForm(f => ({ ...f, species: s.id }))}
          >
            <span className="wiz-card__icon">{s.icon}</span>
            <span className="wiz-card__name">{s.name}</span>
            <span className="wiz-card__tag">{s.tagline}</span>
            <span className="wiz-card__size">{s.size} · {s.speed}ft</span>
          </button>
        ))}
      </div>

      {form.species && (
        <div className="wiz-detail">
          {(() => {
            const s = SPECIES.find(x => x.id === form.species);
            return (
              <>
                <p className="wiz-detail__desc">{s.description}</p>
                <ul className="wiz-detail__traits">
                  {s.traits.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </>
            );
          })()}
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
            onClick={() => setForm(f => ({ ...f, class: c.id }))}
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

  return (
    <div className="wiz-step">
      <h2 className="wiz-step__title">Ability scores</h2>
      <p className="wiz-step__hint">
        Assign the standard array (15, 14, 13, 12, 10, 8) to your six abilities.
        Your background will add bonuses on top.
      </p>

      {primaryAbilities.length > 0 && (
        <div className="wiz-auto-hint">
          <strong>{cls?.name}</strong> benefits most from{' '}
          <strong>{primaryAbilities.map(a => a.toUpperCase()).join(' and ')}</strong>.{' '}
          <button type="button" className="wiz-auto-btn" onClick={handleAutoAssign}>
            Auto-assign for me
          </button>
        </div>
      )}

      <div className="wiz-ability-grid">
        {ABILITIES.map(ab => {
          const base = assigned[ab.key];
          const final = finalScores[ab.key];
          const bgBonus = bg?.abilityBonus[ab.key] ?? 0;
          const isPrimary = primaryAbilities.includes(ab.key);

          return (
            <div key={ab.key} className={`wiz-ability-row ${isPrimary ? 'wiz-ability-row--primary' : ''}`}>
              <div className="wiz-ability-label">
                <span className="wiz-ability-name">{ab.abbr}</span>
                <span className="wiz-ability-desc">{ab.label}</span>
              </div>
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
                  </>
                ) : (
                  <span className="wiz-ability-empty">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="wiz-array-remaining">
        Remaining values:{' '}
        {remaining.length === 0
          ? <strong style={{ color: '#4caf81' }}>All assigned ✓</strong>
          : remaining.join(', ')}
      </p>
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────

function StepReview({ form }) {
  const sp = SPECIES.find(s => s.id === form.species);
  const cl = CLASSES.find(c => c.id === form.class);
  const bg = BACKGROUNDS.find(b => b.id === form.background);
  const finalScores = bg
    ? applyBackgroundBonuses(form.abilityAssignment ?? {}, bg.abilityBonus)
    : form.abilityAssignment ?? {};

  const hp = cl ? calculateMaxHP(cl.hitDie, finalScores.con ?? 10, 1) : 0;
  const ac = calculateUnarmoredAC(finalScores.dex ?? 10);

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

        {bg && (
          <div className="wiz-review-section">
            <h4>Background skills</h4>
            <p>{bg.skills.join(', ')} · Feat: {bg.feat}</p>
          </div>
        )}

        <div className="wiz-review-section">
          <label className="wiz-label">Backstory (optional)</label>
          <p className="wiz-sublabel">A sentence or two about who your character is — the AI DM will reference this.</p>
          <textarea
            className="wiz-input wiz-textarea"
            placeholder="e.g. A disgraced noble seeking redemption after betraying their house..."
            value={form.backstory ?? ''}
            onChange={e => {
              const val = e.target.value;
              // Allows direct editing via the review step; we propagate up via the parent's setForm
              // This textarea is rendered inside StepReview which doesn't have direct setForm access.
              // The parent CharacterCreate passes backstory up via the form ref approach.
            }}
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
    species: '',
    class: '',
    background: '',
    abilityAssignment: null,
    backstory: '',
  });

  const bg = BACKGROUNDS.find(b => b.id === form.background);
  const cl = CLASSES.find(c => c.id === form.class);
  const finalScores = useMemo(() => {
    if (!form.abilityAssignment || !bg) return form.abilityAssignment ?? {};
    return applyBackgroundBonuses(form.abilityAssignment, bg.abilityBonus);
  }, [form.abilityAssignment, bg]);

  const canAdvance = () => {
    if (step === 0) return form.name.trim().length >= 2 && !!form.species;
    if (step === 1) return !!form.class;
    if (step === 2) return !!form.background;
    if (step === 3) {
      const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      return keys.every(k => form.abilityAssignment?.[k] != null);
    }
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const skills = buildSkillsFromProficiencies(bg?.skills ?? []);
      const hp = calculateMaxHP(cl.hitDie, finalScores.con ?? 10, 1);
      const ac = calculateUnarmoredAC(finalScores.dex ?? 10);

      await authFetch('/api/characters', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          species: form.species,
          class: form.class,
          background: form.background,
          backstory: form.backstory?.trim() || null,
          level: 1,
          abilityScores: finalScores,
          hp, maxHp: hp, ac,
          skills,
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
          {STEPS.map((label, i) => (
            <div key={i} className={`wiz-progress__step ${i <= step ? 'wiz-progress__step--done' : ''} ${i === step ? 'wiz-progress__step--active' : ''}`}>
              <span className="wiz-progress__dot">{i < step ? '✓' : i + 1}</span>
              <span className="wiz-progress__label">{label}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="wiz-body">
          {step === 0 && <StepNameSpecies form={form} setForm={setForm} />}
          {step === 1 && <StepClass form={form} setForm={setForm} />}
          {step === 2 && <StepBackground form={form} setForm={setForm} />}
          {step === 3 && <StepAbilityScores form={form} setForm={setForm} />}
          {step === 4 && (
            <div className="wiz-step">
              <h2 className="wiz-step__title">Meet {form.name || 'your character'}</h2>
              {(() => {
                const sp = SPECIES.find(s => s.id === form.species);
                const hp = calculateMaxHP(cl?.hitDie ?? 8, finalScores.con ?? 10, 1);
                const ac = calculateUnarmoredAC(finalScores.dex ?? 10);
                return (
                  <>
                    <div className="wiz-review-card">
                      <div className="wiz-review-header">
                        <span className="wiz-review-icon">{sp?.icon ?? '⚔️'}</span>
                        <div>
                          <h3 className="wiz-review-name">{form.name}</h3>
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

                      {bg && (
                        <div className="wiz-review-section">
                          <h4>Background skills</h4>
                          <p>{bg.skills.join(', ')} · Feat: {bg.feat}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '1.25rem' }}>
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
                  </>
                );
              })()}
            </div>
          )}
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
          {step < TOTAL - 1 ? (
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
