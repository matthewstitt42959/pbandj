import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCasterInfo, fullProgressionRows, formatSlots } from '../data/casterProgression';
import { PRONOUN_OPTIONS } from '../data/dnd2024';
import './CharacterSheet.css';

const TABS = ['Overview', 'Skills', 'Inventory', 'Spells', 'Story'];

const SKILL_MAP = {
  acrobatics: 'dex', animalHandling: 'wis', arcana: 'int', athletics: 'str',
  deception: 'cha', history: 'int', insight: 'wis', intimidation: 'cha',
  investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
  performance: 'cha', persuasion: 'cha', religion: 'int', sleightOfHand: 'dex',
  stealth: 'dex', survival: 'wis',
};

const ABILITY_LABELS = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

const CONDITION_LIST = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

const mod = (s) => { const m = Math.floor((s - 10) / 2); return (m >= 0 ? '+' : '') + m; };
const profBonus = (level) => Math.ceil(level / 4) + 1;

// ── Point-buy helpers ─────────────────────────────────────────────────────────

const POINT_BUY_BUDGET = 27;
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

const scoreCost = (s) => POINT_COST[s] ?? null; // null = outside standard range
const totalSpent = (scores) =>
  ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[scores[k]] ?? 0), 0);

// ── Inline editable field ─────────────────────────────────────────────────────

function EditField({ label, value, onChange, type = 'text', min, max, multiline }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  const commit = () => {
    setEditing(false);
    const parsed = type === 'number' ? Number(draft) : draft;
    if (parsed !== value) onChange(parsed);
  };

  if (editing) {
    return (
      <span className="cs-edit-wrap">
        {multiline ? (
          <textarea
            className="cs-edit-input cs-edit-textarea"
            value={draft}
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
          />
        ) : (
          <input
            className="cs-edit-input"
            type={type}
            value={draft}
            min={min}
            max={max}
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          />
        )}
      </span>
    );
  }

  return (
    <span
      className="cs-editable"
      title={`Click to edit ${label}`}
      onClick={() => { setDraft(String(value ?? '')); setEditing(true); }}
    >
      {value !== '' && value != null ? value : <span className="cs-editable--empty">—</span>}
      <span className="cs-edit-icon">✎</span>
    </span>
  );
}

// ── Point-buy tracker ─────────────────────────────────────────────────────────

function PointBuyTracker({ scores, onFieldChange }) {
  const spent = totalSpent(scores);
  const remaining = POINT_BUY_BUDGET - spent;
  const over = remaining < 0;
  const exact = remaining === 0;

  const applyStandardArray = () => {
    const next = {};
    ABILITY_KEYS.forEach((k, i) => { next[k] = STANDARD_ARRAY[i]; });
    onFieldChange('abilityScores', { ...scores, ...next });
  };

  return (
    <div className={`cs-pb-tracker${over ? ' cs-pb-tracker--over' : exact ? ' cs-pb-tracker--exact' : ''}`}>
      <div className="cs-pb-tracker__left">
        <span className="cs-pb-tracker__label">Point Buy</span>
        <div className="cs-pb-tracker__bar-wrap">
          <div
            className="cs-pb-tracker__bar"
            style={{ width: `${Math.min(100, (spent / POINT_BUY_BUDGET) * 100)}%` }}
          />
        </div>
        <span className="cs-pb-tracker__count">
          {over
            ? `${Math.abs(remaining)} over budget`
            : exact
            ? 'Budget used'
            : `${remaining} pts remaining`}
        </span>
      </div>
      <button className="btn btn--ghost btn--xs" onClick={applyStandardArray} title="Fill in 15, 14, 13, 12, 10, 8">
        Standard Array
      </button>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ char, onFieldChange }) {
  const scores = char.abilityScores ?? {};
  const pb = profBonus(char.level);
  const conditions = Array.isArray(char.conditions) ? char.conditions : [];

  const toggleCondition = (c) => {
    if (conditions.includes(c)) onFieldChange('conditions', conditions.filter(x => x !== c));
    else onFieldChange('conditions', [...conditions, c]);
  };

  return (
    <div className="cs-overview">
      <div className="cs-identity-grid">
        {[
          ['Name', 'name'],
          ['Species', 'species'],
          ['Class', 'class'],
          ['Subclass', 'subclass'],
          ['Background', 'background'],
        ].map(([lbl, field]) => (
          <div key={field} className="cs-field">
            <span className="cs-field__label">{lbl}</span>
            <span className="cs-field__val">
              <EditField label={lbl} value={char[field] ?? ''} onChange={v => onFieldChange(field, v)} />
            </span>
          </div>
        ))}
        <div className="cs-field">
          <span className="cs-field__label">Pronouns</span>
          <span className="cs-field__val">
            <select
              className="cs-select"
              value={char.pronouns ?? 'they/them'}
              onChange={e => onFieldChange('pronouns', e.target.value)}
            >
              {PRONOUN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </span>
        </div>
        <div className="cs-field">
          <span className="cs-field__label">Level</span>
          <span className="cs-field__val">
            <EditField label="Level" value={char.level} type="number" min={1} max={20}
              onChange={v => onFieldChange('level', v)} />
          </span>
        </div>
      </div>

      <div className="cs-combat-row">
        <div className="cs-stat-box">
          <span className="cs-stat-box__val">
            <EditField label="Current HP" value={char.hp} type="number" min={0} onChange={v => onFieldChange('hp', v)} />
          </span>
          <span className="cs-stat-box__label">Current HP</span>
        </div>
        <span className="cs-combat-divider">/</span>
        <div className="cs-stat-box">
          <span className="cs-stat-box__val">
            <EditField label="Max HP" value={char.maxHp} type="number" min={1} onChange={v => onFieldChange('maxHp', v)} />
          </span>
          <span className="cs-stat-box__label">Max HP</span>
        </div>
        <div className="cs-stat-box cs-stat-box--sep">
          <span className="cs-stat-box__val">
            <EditField label="AC" value={char.ac} type="number" min={1} max={30} onChange={v => onFieldChange('ac', v)} />
          </span>
          <span className="cs-stat-box__label">AC</span>
        </div>
        <div className="cs-stat-box">
          <span className="cs-stat-box__val">+{pb}</span>
          <span className="cs-stat-box__label">Prof Bonus</span>
        </div>
      </div>

      <PointBuyTracker scores={scores} onFieldChange={onFieldChange} />

      <div className="cs-scores-grid">
        {Object.entries(ABILITY_LABELS).map(([k, label]) => {
          const cost = scoreCost(scores[k]);
          return (
            <div key={k} className="cs-score-card">
              <span className="cs-score-card__label">{label}</span>
              <span className="cs-score-card__mod">{scores[k] != null ? mod(scores[k]) : '—'}</span>
              <span className="cs-score-card__val">
                <EditField label={label} value={scores[k] ?? ''} type="number" min={1} max={30}
                  onChange={v => onFieldChange('abilityScores', { ...scores, [k]: v })} />
              </span>
              <span className="cs-score-card__cost" title="Point-buy cost">
                {cost !== null ? `${cost}pt` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="cs-ai-toggle">
        <label className="cs-ai-toggle__label">
          <input
            type="checkbox"
            className="cs-ai-toggle__check"
            checked={!!char.isAiCharacter}
            onChange={e => onFieldChange('isAiCharacter', e.target.checked)}
          />
          <span className="cs-ai-toggle__text">AI-generated character (hidden from My Characters)</span>
        </label>
      </div>

      <div className="cs-conditions">
        <h3 className="cs-sub-heading">Conditions</h3>
        <div className="cs-condition-grid">
          {CONDITION_LIST.map(c => (
            <button
              key={c}
              className={`cs-condition-btn ${conditions.includes(c) ? 'cs-condition-btn--active' : ''}`}
              onClick={() => toggleCondition(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Skills tab ────────────────────────────────────────────────────────────────

function SkillsTab({ char, onFieldChange }) {
  const scores = char.abilityScores ?? {};
  const skills = char.skills ?? {};
  const pb = profBonus(char.level);

  const toggleProficiency = (skill) => {
    const cur = skills[skill] ?? 0;
    onFieldChange('skills', { ...skills, [skill]: cur >= 2 ? 0 : cur + 1 });
  };

  const getBonus = (skill) => {
    const ability = SKILL_MAP[skill];
    const base = scores[ability] != null ? Math.floor((scores[ability] - 10) / 2) : 0;
    const prof = skills[skill] ?? 0;
    const bonus = base + (prof === 1 ? pb : prof === 2 ? pb * 2 : 0);
    return (bonus >= 0 ? '+' : '') + bonus;
  };

  const label = (skill) => skill.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

  return (
    <div className="cs-skills">
      <p className="cs-skills__hint">Click once for proficiency · twice for expertise · again to clear</p>
      <div className="cs-skill-list">
        {Object.entries(SKILL_MAP).map(([skill, ability]) => {
          const prof = skills[skill] ?? 0;
          return (
            <div key={skill} className="cs-skill-row" onClick={() => toggleProficiency(skill)}>
              <span className={`cs-skill-dot cs-skill-dot--${prof === 0 ? 'none' : prof === 1 ? 'prof' : 'expert'}`} />
              <span className="cs-skill-name">{label(skill)}</span>
              <span className="cs-skill-ability">({ability.toUpperCase()})</span>
              <span className="cs-skill-bonus">{getBonus(skill)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Inventory tab ─────────────────────────────────────────────────────────────

function InventoryTab({ char, onFieldChange }) {
  const parse = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
    return [];
  };
  const [items, setItems] = useState(() => parse(char.inventory));
  const [draft, setDraft] = useState('');

  const save = (next) => { setItems(next); onFieldChange('inventory', next); };
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    save([...items, { name: t, qty: 1, notes: '' }]);
    setDraft('');
  };
  const remove = (i) => save(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => save(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  return (
    <div className="cs-inventory">
      <div className="cs-add-row">
        <input className="cs-input" placeholder="Add item..." value={draft}
          onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn btn--primary btn--sm" onClick={add}>Add</button>
      </div>
      {items.length === 0 ? (
        <p className="cs-empty-msg">No items yet. Add your equipment above.</p>
      ) : (
        <div className="cs-item-list">
          {items.map((item, i) => (
            <div key={i} className="cs-item-row">
              <span className="cs-item-name">
                <EditField label="Item name" value={item.name} onChange={v => update(i, 'name', v)} />
              </span>
              <span className="cs-item-qty">
                <span className="cs-field__label">×</span>
                <EditField label="Quantity" value={item.qty ?? 1} type="number" min={0} onChange={v => update(i, 'qty', v)} />
              </span>
              <span className="cs-item-notes">
                <EditField label="Notes" value={item.notes ?? ''} onChange={v => update(i, 'notes', v)} />
              </span>
              <button className="cs-remove-btn" onClick={() => remove(i)} title="Remove">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Spells tab ────────────────────────────────────────────────────────────────

function SpellsTab({ char, onFieldChange }) {
  const { authFetch } = useAuth();

  const parse = (v) => {
    const raw = Array.isArray(v) ? v
      : typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return []; } })()
      : [];
    return raw.map(s => typeof s === 'string' ? { name: s, level: 0, description: '', notes: '' } : s);
  };

  const [spells, setSpells] = useState(() => parse(char.spells));
  const [wikiSpells, setWikiSpells] = useState([]);
  const [loadingWiki, setLoadingWiki] = useState(true);
  const [selectedSpellId, setSelectedSpellId] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  useEffect(() => {
    const cls = char.class;
    const url = cls ? `/api/spells?class=${encodeURIComponent(cls)}` : '/api/spells';
    authFetch(url)
      .then(data => setWikiSpells(Array.isArray(data) ? data : []))
      .catch(() => setWikiSpells([]))
      .finally(() => setLoadingWiki(false));
  }, [char.class]);

  const save = (next) => { setSpells(next); onFieldChange('spells', next); };

  const knownNames = new Set(spells.map(s => s.name));

  const add = () => {
    const wiki = wikiSpells.find(s => s.id === selectedSpellId);
    if (!wiki || knownNames.has(wiki.name)) return;
    const entry = {
      name: wiki.name,
      level: wiki.level ?? 0,
      description: wiki.description ?? '',
      notes: draftNotes.trim(),
    };
    save([...spells, entry]);
    setSelectedSpellId('');
    setDraftNotes('');
  };

  const remove = (i) => save(spells.filter((_, idx) => idx !== i));
  const updateNotes = (i, val) => save(spells.map((s, idx) => idx === i ? { ...s, notes: val } : s));

  const byLevel = spells.reduce((acc, s, i) => {
    const lvl = s.level ?? 0;
    if (!acc[lvl]) acc[lvl] = [];
    acc[lvl].push({ ...s, _idx: i });
    return acc;
  }, {});

  const availableToAdd = wikiSpells.filter(s => !knownNames.has(s.name));
  const selectedSpell = wikiSpells.find(s => s.id === selectedSpellId);

  const casterInfo = getCasterInfo(char.class, char.level);
  const cantripCount = spells.filter(s => (s.level ?? 0) === 0).length;
  const leveledCount = spells.length - cantripCount;
  const overBudget = casterInfo && !casterInfo.noCastingYet
    && (cantripCount > casterInfo.cantrips || leveledCount > casterInfo.known);

  return (
    <div className="cs-spells">
      {casterInfo && (
        <div className="cs-caster-summary">
          {casterInfo.noCastingYet ? (
            <p className="cs-caster-summary__line">{char.class} doesn't gain spellcasting until level 2.</p>
          ) : (
            <>
              <p className="cs-caster-summary__line">
                {casterInfo.track} caster, level {char.level}: <strong>{casterInfo.cantrips}</strong> cantrip{casterInfo.cantrips === 1 ? '' : 's'} known,{' '}
                <strong>{casterInfo.known}</strong> spell{casterInfo.known === 1 ? '' : 's'} known, {formatSlots(casterInfo)}.
              </p>
              <p className={`cs-caster-summary__count${overBudget ? ' cs-caster-summary__count--over' : ''}`}>
                You have {cantripCount} cantrip{cantripCount === 1 ? '' : 's'} and {leveledCount} leveled spell{leveledCount === 1 ? '' : 's'} added
                {overBudget ? ' — over your level\'s budget' : ''}.
              </p>
            </>
          )}
          <details className="cs-caster-details">
            <summary>Full progression, levels 1–20</summary>
            <div className="cs-caster-table-wrap">
              <table className="cs-caster-table">
                <thead>
                  <tr><th>Lvl</th><th>Cantrips</th><th>Known</th><th>Slots</th></tr>
                </thead>
                <tbody>
                  {fullProgressionRows(char.class).map(row => (
                    <tr key={row.level} className={row.level === char.level ? 'cs-caster-table__row--current' : ''}>
                      <td>{row.level}</td>
                      <td>{row.noCastingYet ? '—' : row.cantrips}</td>
                      <td>{row.noCastingYet ? '—' : row.known}</td>
                      <td>{row.noCastingYet ? '—' : formatSlots(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <div className="cs-add-row cs-add-row--multi">
        <select
          className="cs-select"
          value={selectedSpellId}
          onChange={e => setSelectedSpellId(e.target.value)}
          disabled={loadingWiki}
        >
          <option value="">
            {loadingWiki
              ? 'Loading spells…'
              : wikiSpells.length === 0
                ? 'No spells in wiki yet — ask SuperDM to seed'
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
        <input
          className="cs-input"
          placeholder="Notes (optional)"
          value={draftNotes}
          onChange={e => setDraftNotes(e.target.value)}
        />
        <button
          className="btn btn--primary btn--sm"
          onClick={add}
          disabled={!selectedSpellId}
        >
          Add
        </button>
      </div>

      {selectedSpell && (
        <div className="cs-spell-preview">
          <p className="cs-spell-preview__meta">
            {selectedSpell.school && <span>{selectedSpell.school}</span>}
            {selectedSpell.castingTime && <span> • {selectedSpell.castingTime}</span>}
            {selectedSpell.range && <span> • {selectedSpell.range}</span>}
            {selectedSpell.duration && <span> • {selectedSpell.duration}</span>}
          </p>
          {selectedSpell.description && (
            <p className="cs-spell-preview__desc">{selectedSpell.description}</p>
          )}
        </div>
      )}

      {spells.length === 0 ? (
        <p className="cs-empty-msg">No spells yet. Pick from the dropdown above.</p>
      ) : (
        Object.entries(byLevel).sort(([a], [b]) => Number(a) - Number(b)).map(([lvl, group]) => (
          <div key={lvl} className="cs-spell-group">
            <h4 className="cs-spell-level-heading">
              {Number(lvl) === 0 ? 'Cantrips' : `Level ${lvl} Spells`}
            </h4>
            {group.map((spell) => (
              <div key={spell._idx} className="cs-spell-row cs-spell-row--detailed">
                <div className="cs-spell-row__main">
                  <span className="cs-spell-name">{spell.name}</span>
                  <button className="cs-remove-btn" onClick={() => remove(spell._idx)} title="Remove">×</button>
                </div>
                {spell.description && (
                  <p className="cs-spell-description">
                    {spell.description.length > 120 ? spell.description.slice(0, 117) + '…' : spell.description}
                  </p>
                )}
                <div className="cs-spell-notes-row">
                  <EditField label="Notes" value={spell.notes ?? ''} onChange={v => updateNotes(spell._idx, v)} />
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

// ── Story tab ─────────────────────────────────────────────────────────────────

function StoryTab({ char, onFieldChange }) {
  return (
    <div className="cs-story">
      <div className="cs-story-field">
        <label className="cs-field__label">Backstory</label>
        <EditField label="Backstory" value={char.backstory ?? ''} multiline
          onChange={v => onFieldChange('backstory', v)} />
      </div>
    </div>
  );
}

// ── CharacterSheet page ───────────────────────────────────────────────────────

const CharacterSheet = () => {
  const { id } = useParams();
  const location = useLocation();
  const backTo = location.state?.from ?? '/dashboard';
  const backLabel = location.state?.fromLabel ?? 'Dashboard';
  const { authFetch } = useAuth();
  const [char, setChar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [pending, setPending] = useState({});

  useEffect(() => {
    authFetch(`/api/characters/${id}`)
      .then(setChar)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, authFetch]);

  const onFieldChange = useCallback((field, value) => {
    setChar(prev => ({ ...prev, [field]: value }));
    setPending(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    if (!Object.keys(pending).length) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await authFetch(`/api/characters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(pending),
      });
      setChar(updated);
      setPending({});
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) {
      setSaveMsg('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="cs-loading">Loading character...</div>;
  if (error) return (
    <div className="cs-error">
      <p>{error}</p>
      <Link to={backTo} className="btn btn--ghost">Back to {backLabel}</Link>
    </div>
  );
  if (!char) return null;

  const hasPending = Object.keys(pending).length > 0;

  return (
    <div className="cs-page">
      <div className="cs-top-bar">
        <Link to={backTo} className="cs-back-link">← {backLabel}</Link>
        <div className="cs-top-bar__right">
          {saveMsg && (
            <span className={`cs-save-msg ${saveMsg.startsWith('Save') ? 'cs-save-msg--err' : ''}`}>
              {saveMsg}
            </span>
          )}
          <button
            className="btn btn--primary btn--sm"
            onClick={handleSave}
            disabled={!hasPending || saving}
          >
            {saving ? 'Saving...' : hasPending ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      <header className="cs-header">
        <div>
          <h1 className="cs-header__name">{char.name}</h1>
          <p className="cs-header__meta">
            Level {char.level} {char.species} {char.class}
            {char.subclass ? ` (${char.subclass})` : ''} · {char.background}
          </p>
        </div>
        {char.campaignId && <span className="dash-badge dash-badge--ingame">In Game</span>}
      </header>

      <nav className="cs-tabs">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`cs-tab ${activeTab === tab ? 'cs-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="cs-tab-body">
        {activeTab === 'Overview' && <OverviewTab char={char} onFieldChange={onFieldChange} />}
        {activeTab === 'Skills' && <SkillsTab char={char} onFieldChange={onFieldChange} />}
        {activeTab === 'Inventory' && <InventoryTab char={char} onFieldChange={onFieldChange} />}
        {activeTab === 'Spells' && <SpellsTab char={char} onFieldChange={onFieldChange} />}
        {activeTab === 'Story' && <StoryTab char={char} onFieldChange={onFieldChange} />}
      </div>

      {hasPending && (
        <div className="cs-save-bar">
          <span>You have unsaved changes</span>
          <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CharacterSheet;
