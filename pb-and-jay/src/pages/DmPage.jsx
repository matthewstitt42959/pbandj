import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import './DmPage.css';

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

function AiCompanionCard({ character, index, onUpdate }) {
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
        <span className="dm-badge dm-badge--ai">AI</span>
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

const DmPage = () => {
  const { user, authFetch } = useAuth();
  const { campaign, characters, levelUpParty, updateCharacter } = useGame();
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
        <div className="dm-section__head">
          <h2 className="dm-section__title">Party Level</h2>
        </div>
        <div className="dm-level-panel">
          <div className="dm-level-display">
            <span className="dm-level-num">{currentLevel}</span>
            <span className="dm-level-label">Current Level</span>
          </div>
          <div className="dm-level-actions">
            <p className="dm-level-hint">
              Leveling up advances all party members simultaneously — human players and AI companions.
              Human player HP is also updated in the database.
            </p>
            {levelMsg && (
              <p className={`dm-level-msg ${levelMsg.startsWith('Error') ? 'dm-level-msg--err' : 'dm-level-msg--ok'}`}>
                {levelMsg}
              </p>
            )}
            <button
              className="btn btn--primary"
              onClick={handleLevelUp}
              disabled={leveling}
            >
              {leveling ? 'Leveling up...' : `Level Up Party → ${currentLevel + 1}`}
            </button>
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
              />
            ))}
          </div>
        </section>
      )}

      {!campaign && (
        <div className="dm-no-campaign">
          <p>No active campaign. Start one from the <Link to="/">home page</Link>.</p>
        </div>
      )}
    </div>
  );
};

export default DmPage;
