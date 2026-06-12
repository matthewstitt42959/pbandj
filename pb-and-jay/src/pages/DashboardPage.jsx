import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

function CharacterCard({ character, onRetire, retiring }) {
  const abilityScores = character.abilityScores ?? {};
  const abils = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const getModStr = (score) => {
    const mod = Math.floor((score - 10) / 2);
    return `${mod >= 0 ? '+' : ''}${mod}`;
  };

  return (
    <div className={`dash-char-card ${character.isRetired ? 'dash-char-card--retired' : ''}`}>
      <div className="dash-char-card__header">
        <div>
          <h3 className="dash-char-card__name">{character.name}</h3>
          <p className="dash-char-card__sub">
            Level {character.level} {character.species} {character.class} · {character.background}
          </p>
        </div>
        {character.isRetired && <span className="dash-char-card__retired-badge">Retired</span>}
      </div>

      <div className="dash-char-card__vitals">
        <span className="dash-vital">
          <strong>{character.maxHp}</strong> HP
        </span>
        <span className="dash-vital">
          <strong>{character.ac}</strong> AC
        </span>
      </div>

      <div className="dash-char-card__scores">
        {abils.map(k => (
          <div key={k} className="dash-score">
            <span className="dash-score__abbr">{k.toUpperCase()}</span>
            <span className="dash-score__val">{abilityScores[k] ?? '—'}</span>
            <span className="dash-score__mod">{abilityScores[k] != null ? getModStr(abilityScores[k]) : ''}</span>
          </div>
        ))}
      </div>

      {character.backstory && (
        <p className="dash-char-card__backstory">"{character.backstory}"</p>
      )}

      {!character.isRetired && (
        <button
          className="dash-char-card__retire-btn"
          onClick={() => onRetire(character.id)}
          disabled={retiring === character.id}
        >
          {retiring === character.id ? 'Retiring...' : 'Retire character'}
        </button>
      )}
    </div>
  );
}

const DashboardPage = () => {
  const { profile, getToken, signOut } = useAuth();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retiring, setRetiring] = useState(null);
  const [showRetired, setShowRetired] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/characters', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCharacters(data);
        }
      } catch {
        // ignore — characters will be empty
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken]);

  const handleRetire = async (id) => {
    if (!window.confirm('Retire this character? They will no longer be playable, but you can still view them.')) return;
    setRetiring(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/characters/${id}/retire`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCharacters(prev => prev.map(c => c.id === id ? { ...c, isRetired: true } : c));
      }
    } catch {
      // ignore
    } finally {
      setRetiring(null);
    }
  };

  const active = characters.filter(c => !c.isRetired);
  const retired = characters.filter(c => c.isRetired);

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div>
          <h1 className="dash-header__title">Welcome back, {profile?.displayName ?? 'Adventurer'}</h1>
          <p className="dash-header__sub">@{profile?.username} · {profile?.role?.toLowerCase() ?? 'player'}</p>
        </div>
        <div className="dash-header__actions">
          <button className="btn btn--ghost dash-signout" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {/* Campaign entry */}
      <section className="dash-section">
        <h2 className="dash-section__title">Active Campaign</h2>
        <div className="dash-campaign-card">
          <div className="dash-campaign-card__info">
            <h3>The Current Adventure</h3>
            <p>Join the shared game world with AI storytelling.</p>
          </div>
          <Link to="/game" className="btn btn--primary">
            Enter Game →
          </Link>
        </div>
      </section>

      {/* Characters */}
      <section className="dash-section">
        <div className="dash-section__head">
          <h2 className="dash-section__title">
            Your Characters {active.length > 0 && <span className="dash-count">{active.length}</span>}
          </h2>
          <Link to="/character/create" className="btn btn--ghost">
            + New Character
          </Link>
        </div>

        {loading ? (
          <p className="dash-loading">Loading characters...</p>
        ) : active.length === 0 ? (
          <div className="dash-empty">
            <p>You don't have any active characters yet.</p>
            <Link to="/character/create" className="btn btn--primary">Create your first character</Link>
          </div>
        ) : (
          <div className="dash-char-grid">
            {active.map(c => (
              <CharacterCard key={c.id} character={c} onRetire={handleRetire} retiring={retiring} />
            ))}
          </div>
        )}

        {retired.length > 0 && (
          <div className="dash-retired-section">
            <button
              className="dash-retired-toggle"
              onClick={() => setShowRetired(s => !s)}
            >
              {showRetired ? '▲' : '▼'} Retired characters ({retired.length})
            </button>
            {showRetired && (
              <div className="dash-char-grid dash-char-grid--retired">
                {retired.map(c => (
                  <CharacterCard key={c.id} character={c} onRetire={handleRetire} retiring={retiring} />
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
