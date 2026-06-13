import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import './DmPage.css';

const DND_CLASSES = [
  'Barbarian','Bard','Cleric','Druid','Fighter',
  'Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard',
];

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

function AiCompanionCard({ character, index, onUpdate, onBench }) {
  const [hpDraft, setHpDraft] = useState('');
  const [editingHp, setEditingHp] = useState(false);

  const toggleCondition = (c) => {
    const conds = character.conditions ?? [];
    const next = conds.includes(c) ? conds.filter(x => x !== c) : [...conds, c];
    onUpdate(index, { conditions: next });
  };

  const commitHp = () => {
    const val = parseInt(hpDraft, 10);
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, character.hp?.max ?? 999));
      onUpdate(index, { hp: { ...character.hp, current: clamped } });
    }
    setEditingHp(false);
  };

  const { hp, ac, level, abilities } = character;
  const hpPct = hp ? Math.max(0, (hp.current / hp.max) * 100) : 100;
  const hpColor = hpPct > 50 ? '#7dcea0' : hpPct > 25 ? '#f0b429' : '#e55';

  return (
    <div className="dm-companion-card">
      <div className="dm-companion-card__header">
        <div>
          <h3 className="dm-companion-card__name">{character.name}</h3>
          <p className="dm-companion-card__meta">
            Level {level} {character.class}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          <span className="dm-badge dm-badge--ai">AI</span>
          <button className="dm-bench-btn" onClick={() => onBench(character.name)} title="Move to bench">Bench</button>
        </div>
      </div>

      <div className="dm-companion-card__vitals">
        <div className="dm-vital-group">
          <span className="dm-vital-label">HP</span>
          {editingHp ? (
            <input
              className="dm-hp-input"
              type="number"
              value={hpDraft}
              autoFocus
              min={0}
              max={hp?.max}
              onChange={e => setHpDraft(e.target.value)}
              onBlur={commitHp}
              onKeyDown={e => { if (e.key === 'Enter') commitHp(); if (e.key === 'Escape') setEditingHp(false); }}
            />
          ) : (
            <button className="dm-hp-btn" onClick={() => { setHpDraft(String(hp?.current ?? 0)); setEditingHp(true); }}>
              {hp?.current ?? '?'} / {hp?.max ?? '?'}
            </button>
          )}
          <div className="dm-hp-bar">
            <div className="dm-hp-bar__fill" style={{ width: `${hpPct}%`, background: hpColor }} />
          </div>
        </div>
        <div className="dm-vital-group">
          <span className="dm-vital-label">AC</span>
          <span className="dm-vital-val">{ac}</span>
        </div>
      </div>

      <div className="dm-conditions">
        <span className="dm-vital-label">Conditions</span>
        <div className="dm-condition-grid">
          {CONDITIONS.map(c => (
            <button
              key={c}
              className={`dm-cond-btn ${(character.conditions ?? []).includes(c) ? 'dm-cond-btn--active' : ''}`}
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

// Sessions recommended before leveling up, by current level
function sessionsRecommended(level) {
  if (level <= 4) return 2;
  if (level <= 10) return 3;
  if (level <= 16) return 4;
  return 5;
}

const DmPage = () => {
  const { user, authFetch } = useAuth();
  const {
    campaign, characters, benchedCompanions,
    levelUpParty, markSessionComplete, updateCharacter,
    addToParty, benchCompanion, createCompanion, deleteCompanion,
    sessionsAtLevel, totalSessions,
  } = useGame();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState('Fighter');
  const [newPersonality, setNewPersonality] = useState('');

  const partyAiCount = characters.filter((_, i) => i !== 0).length;
  const partyFull = partyAiCount >= 4;

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCompanion({ name: newName.trim(), className: newClass, personality: newPersonality.trim() });
    setNewName('');
    setNewClass('Fighter');
    setNewPersonality('');
    setShowCreateForm(false);
  };
  const [leveling, setLeveling] = useState(false);
  const [levelMsg, setLevelMsg] = useState('');

  if (!user) return <Navigate to="/login" />;
  if (user.role === 'PLAYER') return <Navigate to="/dashboard" />;

  const aiCompanions = characters.filter(c => c.isAI);
  const humanChars = characters.filter(c => !c.isAI);
  const currentLevel = characters[0]?.level ?? 1;

  const handleLevelUp = async () => {
    if (!window.confirm(`Level up the entire party from ${currentLevel} → ${currentLevel + 1}? This cannot be undone.`)) return;
    setLeveling(true);
    setLevelMsg('');
    try {
      // Level up DB characters (human players)
      await authFetch('/api/campaign/levelup', { method: 'POST' });
      // Level up all characters in game state (human + AI companions)
      levelUpParty();
      setLevelMsg(`Party leveled up to ${currentLevel + 1}!`);
    } catch (err) {
      setLevelMsg('Error: ' + err.message);
    } finally {
      setLeveling(false);
    }
  };

  const handleUpdateCompanion = (gameIndex, updates) => {
    updateCharacter(gameIndex, updates);
  };

  // Find the game index of each AI companion
  const aiWithIndex = characters
    .map((c, i) => ({ char: c, index: i }))
    .filter(({ char }) => char.isAI);

  return (
    <div className="dm-page">
      <div className="dm-top-bar">
        <Link to="/game" className="cs-back-link">← Game Board</Link>
        <span className="dm-role-badge">{user.role === 'SUPER_DM' ? 'Super DM' : 'DM'}</span>
      </div>

      <header className="dm-header">
        <div>
          <h1 className="dm-header__title">Campaign Management</h1>
          {campaign && (
            <p className="dm-header__campaign">{campaign.name}</p>
          )}
        </div>
      </header>

      {/* Party level */}
      <section className="dm-section">
        <h2 className="dm-section__title">Party Level</h2>
        <div className="dm-level-panel">

          {/* Current level */}
          <div className="dm-level-display">
            <span className="dm-level-num">{currentLevel}</span>
            <span className="dm-level-label">Current Level</span>
          </div>

          {/* Session counter */}
          <div className="dm-session-block">
            <div className="dm-session-pips">
              {Array.from({ length: sessionsRecommended(currentLevel) }).map((_, i) => (
                <span
                  key={i}
                  className={`dm-session-pip ${i < sessionsAtLevel ? 'dm-session-pip--done' : ''}`}
                />
              ))}
              {sessionsAtLevel > sessionsRecommended(currentLevel) && (
                <span className="dm-session-extra">+{sessionsAtLevel - sessionsRecommended(currentLevel)}</span>
              )}
            </div>
            <p className="dm-session-label">
              {sessionsAtLevel} / {sessionsRecommended(currentLevel)} sessions at level {currentLevel}
              {totalSessions > 0 && <span className="dm-session-total"> · {totalSessions} total</span>}
            </p>
            {sessionsAtLevel >= sessionsRecommended(currentLevel) && (
              <p className="dm-session-nudge">✦ Party may be ready to level up</p>
            )}
            <button className="btn btn--ghost btn--sm" onClick={markSessionComplete}>
              Mark Session Complete
            </button>
          </div>

          {/* Level up */}
          <div className="dm-level-actions">
            {levelMsg && (
              <p className={`dm-level-msg ${levelMsg.startsWith('Error') ? 'dm-level-msg--err' : 'dm-level-msg--ok'}`}>
                {levelMsg}
              </p>
            )}
            <button className="btn btn--primary" onClick={handleLevelUp} disabled={leveling}>
              {leveling ? 'Leveling up...' : `Level Up Party → ${currentLevel + 1}`}
            </button>
            <p className="dm-level-hint">
              Levels all characters simultaneously and resets the session counter.
            </p>
          </div>

        </div>
      </section>

      {/* Human players (read-only summary) */}
      {humanChars.length > 0 && (
        <section className="dm-section">
          <h2 className="dm-section__title">Human Players</h2>
          <div className="dm-human-list">
            {humanChars.map(char => (
              <div key={char.name} className="dm-human-row">
                <span className="dm-human-name">{char.name}</span>
                <span className="dm-human-meta">Level {char.level} {char.class}</span>
                <span className="dm-human-hp">HP {char.hp?.current}/{char.hp?.max}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI companions */}
      {aiWithIndex.length > 0 && (
        <section className="dm-section">
          <h2 className="dm-section__title">AI Companions</h2>
          <p className="dm-section__hint">
            Edit HP and conditions directly. Stats and level update automatically with the party.
          </p>
          <div className="dm-companion-grid">
            {aiWithIndex.map(({ char, index }) => (
              <AiCompanionCard
                key={char.name}
                character={char}
                index={index}
                onUpdate={handleUpdateCompanion}
                onBench={benchCompanion}
              />
            ))}
          </div>
        </section>
      )}

      {/* Companion Roster — bench + create */}
      <section className="dm-section">
        <div className="dm-section__head">
          <h2 className="dm-section__title" style={{ margin: 0 }}>Companion Roster</h2>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowCreateForm(s => !s)}>
            {showCreateForm ? 'Cancel' : '+ New Companion'}
          </button>
        </div>

        {showCreateForm && (
          <div className="dm-create-form">
            <input
              className="dm-create-input"
              placeholder="Name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <select
              className="dm-create-select"
              value={newClass}
              onChange={e => setNewClass(e.target.value)}
            >
              {DND_CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input
              className="dm-create-input"
              placeholder="Personality (optional) — e.g. gruff but loyal, speaks in riddles"
              value={newPersonality}
              onChange={e => setNewPersonality(e.target.value)}
            />
            <p className="dm-create-hint">
              Stats auto-generated for the class at party level {characters[0]?.level ?? 1}.
              {partyFull ? ' Party is full — companion goes to the bench.' : ''}
            </p>
            <button className="btn btn--primary btn--sm" onClick={handleCreate} disabled={!newName.trim()}>
              Create Companion
            </button>
          </div>
        )}

        {benchedCompanions.length > 0 && (
          <div className="dm-bench">
            <p className="dm-bench__label">On the bench</p>
            <div className="dm-bench-list">
              {benchedCompanions.map(c => (
                <div key={c.name} className="dm-bench-row">
                  <div className="dm-bench-row__info">
                    <span className="dm-bench-row__name">{c.name}</span>
                    <span className="dm-bench-row__meta">Lv {c.level} {c.class}</span>
                    {c.personality && <span className="dm-bench-row__personality">{c.personality}</span>}
                  </div>
                  <div className="dm-bench-row__actions">
                    {!partyFull && (
                      <button className="btn btn--ghost btn--xs" onClick={() => addToParty(c.name)}>
                        Add to Party
                      </button>
                    )}
                    <button
                      className="btn btn--danger btn--xs"
                      onClick={() => { if (window.confirm(`Remove ${c.name} permanently?`)) deleteCompanion(c.name); }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {benchedCompanions.length === 0 && partyAiCount === 0 && !showCreateForm && (
          <p className="dm-section__hint">No companions in the game. Create one above to add intelligent NPCs.</p>
        )}
        {partyFull && (
          <p className="dm-section__hint">Party full (4 AI + player). Bench an active companion to swap.</p>
        )}
      </section>

      {/* Campaign management link */}
      <section className="dm-section">
        <div className="dm-section__head">
          <h2 className="dm-section__title">Campaign</h2>
        </div>
        <div className="dm-campaign-links">
          <Link to="/campaigns" className="btn btn--ghost btn--sm">View All Campaigns</Link>
          <Link to="/campaigns/new" className="btn btn--primary btn--sm">+ New Campaign</Link>
        </div>
      </section>
    </div>
  );
};

export default DmPage;
