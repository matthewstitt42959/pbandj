import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

const MAX_ACTIVE = 2;

function CharacterCard({ character, onRetire, onAssign, onUnassign, retiring, assigning }) {
  const scores = character.abilityScores ?? {};
  const mod = (s) => { const m = Math.floor((s - 10) / 2); return (m >= 0 ? '+' : '') + m; };
  const inGame = !!character.campaignId;
  const isRetired = character.isRetired;

  return (
    <div className={`dash-char-card ${isRetired ? 'dash-char-card--retired' : ''} ${inGame ? 'dash-char-card--ingame' : ''}`}>
      <div className="dash-char-card__header">
        <div>
          <h3 className="dash-char-card__name">{character.name}</h3>
          <p className="dash-char-card__sub">
            Level {character.level} {character.species} {character.class}
          </p>
          <p className="dash-char-card__bg">{character.background}</p>
        </div>
        <div className="dash-char-card__badges">
          {isRetired && <span className="dash-badge dash-badge--retired">Retired</span>}
          {inGame && !isRetired && <span className="dash-badge dash-badge--ingame">In Game</span>}
          {!inGame && !isRetired && <span className="dash-badge dash-badge--free">Available</span>}
        </div>
      </div>

      <div className="dash-char-card__vitals">
        <div className="dash-vital"><span className="dash-vital__val">{character.hp}</span><span className="dash-vital__label">HP</span></div>
        <div className="dash-vital"><span className="dash-vital__val">{character.ac}</span><span className="dash-vital__label">AC</span></div>
        <div className="dash-vital"><span className="dash-vital__val">{character.level}</span><span className="dash-vital__label">LVL</span></div>
      </div>

      <div className="dash-char-card__scores">
        {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => (
          <div key={k} className="dash-score">
            <span className="dash-score__abbr">{k.toUpperCase()}</span>
            <span className="dash-score__val">{scores[k] ?? '—'}</span>
            <span className="dash-score__mod">{scores[k] != null ? mod(scores[k]) : ''}</span>
          </div>
        ))}
      </div>

      {character.backstory && (
        <p className="dash-char-card__backstory">"{character.backstory}"</p>
      )}

      {!isRetired && (
        <div className="dash-char-card__actions">
          <Link to={`/character/${character.id}`} className="btn btn--ghost btn--sm">
            View Sheet
          </Link>

          {inGame ? (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => onUnassign(character.id)}
              disabled={assigning === character.id}
            >
              {assigning === character.id ? '...' : 'Leave Game'}
            </button>
          ) : (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => onAssign(character.id)}
              disabled={assigning === character.id}
            >
              {assigning === character.id ? '...' : 'Enter Game'}
            </button>
          )}

          <button
            className="btn btn--ghost btn--sm dash-retire-btn"
            onClick={() => onRetire(character.id)}
            disabled={retiring === character.id}
          >
            {retiring === character.id ? '...' : 'Retire'}
          </button>
        </div>
      )}
    </div>
  );
}

const DashboardPage = () => {
  const { user, authFetch, signOut } = useAuth();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retiring, setRetiring] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [showRetired, setShowRetired] = useState(false);

  useEffect(() => {
    authFetch('/api/characters')
      .then(setCharacters)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authFetch]);

  const handleRetire = async (id) => {
    if (!window.confirm('Retire this character? They can still be viewed but not played.')) return;
    setRetiring(id);
    try {
      await authFetch(`/api/characters/${id}/retire`, { method: 'POST' });
      setCharacters(prev => prev.map(c => c.id === id ? { ...c, isRetired: true, campaignId: null } : c));
    } finally {
      setRetiring(null);
    }
  };

  const handleAssign = async (id) => {
    setAssigning(id);
    try {
      const updated = await authFetch(`/api/characters/${id}/assign`, { method: 'POST', body: JSON.stringify({ campaignId: 'singleton' }) });
      setCharacters(prev => prev.map(c => c.id === id ? updated : c));
      navigate('/game');
    } finally {
      setAssigning(null);
    }
  };

  const handleUnassign = async (id) => {
    setAssigning(id);
    try {
      const updated = await authFetch(`/api/characters/${id}/unassign`, { method: 'POST' });
      setCharacters(prev => prev.map(c => c.id === id ? updated : c));
    } finally {
      setAssigning(null);
    }
  };

  const active = characters.filter(c => !c.isRetired);
  const retired = characters.filter(c => c.isRetired);
  const atLimit = active.length >= MAX_ACTIVE;

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div>
          <h1 className="dash-header__title">Welcome back, {user?.displayName ?? 'Adventurer'}</h1>
          <p className="dash-header__sub">@{user?.username} · {user?.role?.toLowerCase() ?? 'player'}</p>
        </div>
        <button className="btn btn--ghost" onClick={signOut}>Sign out</button>
      </header>

      <section className="dash-section">
        <div className="dash-section__head">
          <h2 className="dash-section__title">
            Your Characters
            <span className="dash-count">{active.length} / {MAX_ACTIVE}</span>
          </h2>
          {atLimit ? (
            <span className="dash-limit-msg">Retire a character to create a new one</span>
          ) : (
            <Link to="/character/create" className="btn btn--ghost">+ New Character</Link>
          )}
        </div>

        {loading ? (
          <p className="dash-loading">Loading characters...</p>
        ) : active.length === 0 ? (
          <div className="dash-empty">
            <p>You don't have any characters yet.</p>
            <Link to="/character/create" className="btn btn--primary">Create your first character</Link>
          </div>
        ) : (
          <div className="dash-char-grid">
            {active.map(c => (
              <CharacterCard
                key={c.id} character={c}
                onRetire={handleRetire}
                onAssign={handleAssign}
                onUnassign={handleUnassign}
                retiring={retiring}
                assigning={assigning}
              />
            ))}
          </div>
        )}

        {retired.length > 0 && (
          <div className="dash-retired-section">
            <button className="dash-retired-toggle" onClick={() => setShowRetired(s => !s)}>
              {showRetired ? '▲' : '▼'} Retired characters ({retired.length})
            </button>
            {showRetired && (
              <div className="dash-char-grid">
                {retired.map(c => (
                  <CharacterCard
                    key={c.id} character={c}
                    onRetire={handleRetire}
                    onAssign={handleAssign}
                    onUnassign={handleUnassign}
                    retiring={retiring}
                    assigning={assigning}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
