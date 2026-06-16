import React, { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { rollDice } from '../services/dice';
import './DmPage.css';

const ENCOUNTER_KEY = 'pb-and-jay-encounter';
const NOTES_KEY = 'pb-and-jay-dm-notes';

const PRESET_ENEMIES = [
  { name: 'Goblin', hp: 7, ac: 15 },
  { name: 'Orc', hp: 15, ac: 13 },
  { name: 'Hobgoblin', hp: 11, ac: 18 },
  { name: 'Bugbear', hp: 27, ac: 14 },
  { name: 'Bandit', hp: 11, ac: 12 },
  { name: 'Guard', hp: 11, ac: 16 },
  { name: 'Skeleton', hp: 13, ac: 13 },
  { name: 'Zombie', hp: 22, ac: 8 },
  { name: 'Wolf', hp: 11, ac: 13 },
  { name: 'Giant Spider', hp: 26, ac: 14 },
  { name: 'Cultist', hp: 9, ac: 12 },
  { name: 'Troll', hp: 84, ac: 15 },
];

const DND_CLASSES = [
  'Barbarian','Bard','Cleric','Druid','Fighter',
  'Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard',
];

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

function EnemyCard({ enemy, onUpdate, onRemove }) {
  const [editingHp, setEditingHp] = useState(false);
  const [hpDraft, setHpDraft] = useState('');

  const commitHp = () => {
    const val = parseInt(hpDraft, 10);
    if (!isNaN(val)) onUpdate(enemy.id, { hp: { ...enemy.hp, current: Math.max(0, Math.min(val, enemy.hp.max)) } });
    setEditingHp(false);
  };

  const toggleCondition = (c) => {
    const conds = enemy.conditions ?? [];
    onUpdate(enemy.id, { conditions: conds.includes(c) ? conds.filter(x => x !== c) : [...conds, c] });
  };

  const hpPct = Math.max(0, (enemy.hp.current / enemy.hp.max) * 100);
  const hpColor = hpPct > 50 ? '#7dcea0' : hpPct > 25 ? '#f0b429' : '#e55';

  return (
    <div className="dm-companion-card dm-enemy-card">
      <div className="dm-companion-card__header">
        <div>
          <h3 className="dm-companion-card__name">{enemy.name}</h3>
          <p className="dm-companion-card__meta">AC {enemy.ac}</p>
        </div>
        <button className="dm-bench-btn" style={{ color: '#ff8a80' }} onClick={() => onRemove(enemy.id)} title="Remove">✕</button>
      </div>
      <div className="dm-companion-card__vitals">
        <div className="dm-vital-group">
          <span className="dm-vital-label">HP</span>
          {editingHp ? (
            <input className="dm-hp-input" type="number" value={hpDraft} autoFocus min={0} max={enemy.hp.max}
              onChange={e => setHpDraft(e.target.value)}
              onBlur={commitHp}
              onKeyDown={e => { if (e.key === 'Enter') commitHp(); if (e.key === 'Escape') setEditingHp(false); }} />
          ) : (
            <button className="dm-hp-btn" onClick={() => { setHpDraft(String(enemy.hp.current)); setEditingHp(true); }}>
              {enemy.hp.current} / {enemy.hp.max}
            </button>
          )}
          <div className="dm-hp-bar"><div className="dm-hp-bar__fill" style={{ width: `${hpPct}%`, background: hpColor }} /></div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn--ghost btn--xs" onClick={() => onUpdate(enemy.id, { hp: { ...enemy.hp, current: Math.max(0, enemy.hp.current - 1) } })}>−1</button>
          <button className="btn btn--ghost btn--xs" onClick={() => onUpdate(enemy.id, { hp: { ...enemy.hp, current: Math.max(0, enemy.hp.current - 5) } })}>−5</button>
          <button className="btn btn--ghost btn--xs" onClick={() => onUpdate(enemy.id, { hp: { ...enemy.hp, current: Math.max(0, enemy.hp.current - 10) } })}>−10</button>
        </div>
      </div>
      <div className="dm-conditions">
        <span className="dm-vital-label">Conditions</span>
        <div className="dm-condition-grid">
          {CONDITIONS.map(c => (
            <button key={c} className={`dm-cond-btn ${(enemy.conditions ?? []).includes(c) ? 'dm-cond-btn--active' : ''}`} onClick={() => toggleCondition(c)}>{c}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  // Campaign player roster
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playerMsg, setPlayerMsg] = useState(null);

  useEffect(() => {
    setPlayersLoading(true);
    authFetch('/api/dm/players')
      .then(data => setPlayers(data))
      .catch(() => {})
      .finally(() => setPlayersLoading(false));
  }, []);

  // Join requests
  const [joinRequests, setJoinRequests] = useState([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestMsg, setJoinRequestMsg] = useState(null);

  useEffect(() => {
    if (!campaign?.id) return;
    setJoinRequestsLoading(true);
    authFetch(`/api/campaigns/${campaign.id}/join-requests`)
      .then(data => setJoinRequests(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setJoinRequestsLoading(false));
  }, [campaign?.id]);

  const handleJoinRequestAction = async (userId, status) => {
    try {
      await authFetch(`/api/campaigns/${campaign.id}/join-requests/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setJoinRequests(prev => prev.map(r =>
        r.userId === userId ? { ...r, status } : r
      ));
      setJoinRequestMsg({ text: `Request ${status === 'APPROVED' ? 'approved' : 'denied'}.`, ok: status === 'APPROVED' });
    } catch (e) {
      setJoinRequestMsg({ text: e.message, ok: false });
    }
    setTimeout(() => setJoinRequestMsg(null), 3000);
  };

  const pendingRequests = joinRequests.filter(r => r.status === 'PENDING');

  const handleAssign = async (characterId) => {
    if (!campaign?.id) return;
    try {
      const updated = await authFetch(`/api/dm/characters/${characterId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      setPlayers(prev => prev.map(p => ({
        ...p,
        characters: p.characters.map(c => c.id === updated.id ? updated : c),
      })));
      setPlayerMsg({ text: 'Player added to campaign', ok: true });
    } catch (err) {
      setPlayerMsg({ text: err.message, ok: false });
    }
    setTimeout(() => setPlayerMsg(null), 3000);
  };

  const handleUnassign = async (characterId) => {
    try {
      const updated = await authFetch(`/api/dm/characters/${characterId}/unassign`, { method: 'POST' });
      setPlayers(prev => prev.map(p => ({
        ...p,
        characters: p.characters.map(c => c.id === updated.id ? updated : c),
      })));
      setPlayerMsg({ text: 'Player removed from campaign', ok: true });
    } catch (err) {
      setPlayerMsg({ text: err.message, ok: false });
    }
    setTimeout(() => setPlayerMsg(null), 3000);
  };

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState('Fighter');
  const [newPersonality, setNewPersonality] = useState('');

  // --- Encounter enemies ---
  const [enemies, setEnemies] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ENCOUNTER_KEY) ?? '[]'); } catch { return []; }
  });
  const [enemyForm, setEnemyForm] = useState({ name: '', hp: '', ac: '' });
  const [showEnemyForm, setShowEnemyForm] = useState(false);

  useEffect(() => {
    localStorage.setItem(ENCOUNTER_KEY, JSON.stringify(enemies));
  }, [enemies]);

  const addPreset = (preset) => {
    const e = { id: `e-${Date.now()}`, name: preset.name, hp: { current: preset.hp, max: preset.hp }, ac: preset.ac, conditions: [] };
    setEnemies(prev => [...prev, e]);
  };
  const addCustomEnemy = () => {
    const hp = parseInt(enemyForm.hp, 10) || 10;
    const ac = parseInt(enemyForm.ac, 10) || 10;
    if (!enemyForm.name.trim()) return;
    setEnemies(prev => [...prev, { id: `e-${Date.now()}`, name: enemyForm.name.trim(), hp: { current: hp, max: hp }, ac, conditions: [] }]);
    setEnemyForm({ name: '', hp: '', ac: '' });
    setShowEnemyForm(false);
  };
  const updateEnemy = useCallback((id, updates) => {
    setEnemies(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);
  const removeEnemy = (id) => setEnemies(prev => prev.filter(e => e.id !== id));
  const clearEncounter = () => { if (window.confirm('Clear all enemies?')) setEnemies([]); };

  // --- Initiative tracker ---
  const [combatActive, setCombatActive] = useState(false);
  const [initOrder, setInitOrder] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);

  const startCombat = () => {
    const entries = [
      ...characters.map(c => ({ id: `c-${c.name}`, name: c.name, initiative: 0, isEnemy: false })),
      ...enemies.map(e => ({ id: e.id, name: e.name, initiative: 0, isEnemy: true })),
    ];
    setInitOrder(entries);
    setCurrentTurn(0);
    setRound(1);
    setCombatActive(true);
  };
  const setInit = (id, val) => {
    const n = parseInt(val, 10);
    setInitOrder(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, initiative: isNaN(n) ? 0 : n } : e);
      return [...updated].sort((a, b) => b.initiative - a.initiative);
    });
  };
  const rollInitForAll = () => {
    setInitOrder(prev => {
      const rolled = prev.map(e => ({ ...e, initiative: Math.floor(Math.random() * 20) + 1 }));
      return [...rolled].sort((a, b) => b.initiative - a.initiative);
    });
  };
  const nextTurn = () => {
    setCurrentTurn(prev => {
      const next = prev + 1;
      if (next >= initOrder.length) { setRound(r => r + 1); return 0; }
      return next;
    });
  };
  const endCombat = () => { setCombatActive(false); setInitOrder([]); setCurrentTurn(0); setRound(1); };

  // --- DM Notes ---
  const [notes, setNotes] = useState(() => localStorage.getItem(NOTES_KEY) ?? '');
  useEffect(() => { localStorage.setItem(NOTES_KEY, notes); }, [notes]);

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

      {campaign && (<>
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

      {/* Campaign player roster */}
      <section className="dm-section">
        <div className="dm-section__head">
          <h2 className="dm-section__title" style={{ margin: 0 }}>Campaign Players</h2>
          {playerMsg && (
            <span className={`dm-player-msg ${playerMsg.ok ? 'dm-player-msg--ok' : 'dm-player-msg--err'}`}>
              {playerMsg.text}
            </span>
          )}
        </div>
        {!campaign?.id && (
          <p className="dm-section__hint">No active campaign — activate one from the Admin panel first.</p>
        )}
        {campaign?.id && (
          playersLoading ? (
            <p className="dm-section__hint">Loading players...</p>
          ) : players.length === 0 ? (
            <p className="dm-section__hint">No registered players yet.</p>
          ) : (
            <div className="dm-player-list">
              {players.map(player => (
                <div key={player.id} className="dm-player-row">
                  <div className="dm-player-info">
                    <span className="dm-player-name">{player.displayName}</span>
                    <span className="dm-player-username">@{player.username}</span>
                  </div>
                  {player.characters.length === 0 ? (
                    <span className="dm-player-no-char">No characters yet</span>
                  ) : (
                    <div className="dm-player-chars">
                      {player.characters.map(char => {
                        const inCampaign = char.campaignId === campaign.id;
                        return (
                          <div key={char.id} className={`dm-player-char ${inCampaign ? 'dm-player-char--in' : ''}`}>
                            <span className="dm-player-char__name">{char.name}</span>
                            <span className="dm-player-char__meta">Lv {char.level} {char.class}</span>
                            {inCampaign ? (
                              <button
                                className="btn btn--ghost btn--xs"
                                onClick={() => handleUnassign(char.id)}
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                className="btn btn--primary btn--xs"
                                onClick={() => handleAssign(char.id)}
                              >
                                Add to Campaign
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* Join Requests */}
      {campaign?.id && (
        <section className="dm-section">
          <div className="dm-section__head">
            <h2 className="dm-section__title" style={{ margin: 0 }}>
              Join Requests
              {pendingRequests.length > 0 && (
                <span className="dm-badge dm-badge--pending" style={{ marginLeft: '0.5rem' }}>{pendingRequests.length}</span>
              )}
            </h2>
            {joinRequestMsg && (
              <span className={`dm-player-msg ${joinRequestMsg.ok ? 'dm-player-msg--ok' : 'dm-player-msg--err'}`}>
                {joinRequestMsg.text}
              </span>
            )}
          </div>
          {joinRequestsLoading && <p className="dm-section__hint">Loading requests…</p>}
          {!joinRequestsLoading && joinRequests.length === 0 && (
            <p className="dm-section__hint">No join requests for this campaign.</p>
          )}
          {!joinRequestsLoading && joinRequests.length > 0 && (
            <div className="dm-join-request-list">
              {joinRequests.map(req => (
                <div key={req.userId} className={`dm-join-request-row dm-join-request-row--${req.status.toLowerCase()}`}>
                  <div className="dm-join-request-info">
                    <span className="dm-join-request-name">{req.user?.displayName}</span>
                    <span className="dm-join-request-username">@{req.user?.username}</span>
                    {req.message && <span className="dm-join-request-msg">"{req.message}"</span>}
                  </div>
                  {req.user?.characters?.length > 0 && (
                    <div className="dm-join-request-chars">
                      <span className="dm-vital-label">Characters:</span>
                      {req.user.characters.map(c => (
                        <span key={c.id} className="dm-join-request-char">
                          {c.name} (Lv {c.level} {c.class})
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="dm-join-request-actions">
                    {req.status === 'PENDING' ? (
                      <>
                        <button
                          className="btn btn--approve btn--xs"
                          onClick={() => handleJoinRequestAction(req.userId, 'APPROVED')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn--danger btn--xs"
                          onClick={() => handleJoinRequestAction(req.userId, 'DENIED')}
                        >
                          Deny
                        </button>
                      </>
                    ) : (
                      <span className={`dm-join-status dm-join-status--${req.status.toLowerCase()}`}>
                        {req.status === 'APPROVED' ? 'Approved' : 'Denied'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
      </>)}

      {/* Encounter — Enemy Tracker */}
      <section className="dm-section">
        <div className="dm-section__head">
          <h2 className="dm-section__title" style={{ margin: 0 }}>Encounter Enemies</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowEnemyForm(s => !s)}>
              {showEnemyForm ? 'Cancel' : '+ Custom'}
            </button>
            {enemies.length > 0 && (
              <button className="btn btn--danger btn--xs" onClick={clearEncounter}>Clear All</button>
            )}
          </div>
        </div>

        <div className="dm-preset-row">
          {PRESET_ENEMIES.map(p => (
            <button key={p.name} className="btn btn--ghost btn--xs" onClick={() => addPreset(p)}>
              + {p.name}
            </button>
          ))}
        </div>

        {showEnemyForm && (
          <div className="dm-create-form">
            <input className="dm-create-input" placeholder="Name" value={enemyForm.name} onChange={e => setEnemyForm(f => ({ ...f, name: e.target.value }))} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="dm-create-input" placeholder="HP" type="number" value={enemyForm.hp} onChange={e => setEnemyForm(f => ({ ...f, hp: e.target.value }))} style={{ flex: 1 }} />
              <input className="dm-create-input" placeholder="AC" type="number" value={enemyForm.ac} onChange={e => setEnemyForm(f => ({ ...f, ac: e.target.value }))} style={{ flex: 1 }} />
            </div>
            <button className="btn btn--primary btn--sm" onClick={addCustomEnemy} disabled={!enemyForm.name.trim()}>Add Enemy</button>
          </div>
        )}

        {enemies.length > 0 && (
          <div className="dm-companion-grid" style={{ marginTop: '0.75rem' }}>
            {enemies.map(enemy => (
              <EnemyCard key={enemy.id} enemy={enemy} onUpdate={updateEnemy} onRemove={removeEnemy} />
            ))}
          </div>
        )}
        {enemies.length === 0 && !showEnemyForm && (
          <p className="dm-section__hint">No enemies. Use the presets above or add a custom enemy.</p>
        )}
      </section>

      {/* Initiative Tracker */}
      <section className="dm-section">
        <div className="dm-section__head">
          <h2 className="dm-section__title" style={{ margin: 0 }}>
            Initiative Order {combatActive && <span className="dm-round-badge">Round {round}</span>}
          </h2>
          {!combatActive ? (
            <button className="btn btn--primary btn--sm" onClick={startCombat}>Start Combat</button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn--ghost btn--sm" onClick={rollInitForAll}>Roll All</button>
              <button className="btn btn--ghost btn--sm" onClick={nextTurn}>Next Turn</button>
              <button className="btn btn--danger btn--xs" onClick={endCombat}>End Combat</button>
            </div>
          )}
        </div>

        {combatActive && (
          <div className="dm-init-list">
            {initOrder.map((entry, idx) => (
              <div key={entry.id} className={`dm-init-row ${idx === currentTurn ? 'dm-init-row--active' : ''}`}>
                <span className="dm-init-indicator">{idx === currentTurn ? '▶' : ''}</span>
                <span className={`dm-init-name ${entry.isEnemy ? 'dm-init-name--enemy' : ''}`}>{entry.name}</span>
                <input
                  className="dm-init-input"
                  type="number"
                  value={entry.initiative || ''}
                  placeholder="Init"
                  onChange={e => setInit(entry.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
        {!combatActive && (
          <p className="dm-section__hint">Click Start Combat to pull in all party members and enemies into initiative order.</p>
        )}
      </section>

      {/* DM Notes */}
      <section className="dm-section">
        <div className="dm-section__head">
          <h2 className="dm-section__title" style={{ margin: 0 }}>DM Notes</h2>
          {notes && (
            <button className="btn btn--ghost btn--xs" onClick={() => { if (window.confirm('Clear notes?')) setNotes(''); }}>Clear</button>
          )}
        </div>
        <textarea
          className="dm-notes-area"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Private notes — players never see this. Track NPC secrets, HP, loot, reminders..."
          rows={6}
        />
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
