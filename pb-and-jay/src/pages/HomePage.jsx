import React from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { campaign } = useGame();
  const { user } = useAuth();

  const isDm = user?.role === 'DM' || user?.role === 'SUPER_DM';
  const activeChars = user?.characters?.filter(c => c.status !== 'RETIRED') ?? [];

  if (!user) {
    return (
      <div className="homepage">
        <header className="homepage__hero">
          <h1 className="homepage__title">PB & Jay</h1>
          <p className="homepage__tagline">
            Play-by-post D&amp;D — AI dungeon master, real adventures
          </p>
          <p className="homepage__universe">Set in the Teraphobia universe &mdash; a Broken Archive world</p>
          <div className="homepage__hero-actions">
            <Link to="/login" className="btn btn--primary">Sign In</Link>
            <Link to="/register" className="btn btn--ghost">Create Account</Link>
          </div>
        </header>

        <div className="homepage__grid homepage__grid--3col">
          <section className="homepage__card">
            <h2>Build a Character</h2>
            <p>Choose your race, class, and backstory. Your character persists across sessions and campaigns.</p>
          </section>
          <section className="homepage__card">
            <h2>Join a Campaign</h2>
            <p>The DM sets the world, writes the opening scene, and invites the party. You just show up ready to play.</p>
          </section>
          <section className="homepage__card">
            <h2>AI DM or Manual</h2>
            <p>Post your action. When the party is ready, the AI narrates what happens — or the DM writes it themselves.</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="homepage">
      <header className="homepage__hero homepage__hero--compact">
        <h1 className="homepage__title">PB & Jay</h1>
        <p className="homepage__tagline">
          Welcome back, {user.displayName || user.username}
        </p>
        <p className="homepage__universe">Set in the Teraphobia universe &mdash; a Broken Archive world</p>
      </header>

      <div className="homepage__grid">
        <section className="homepage__card homepage__card--featured">
          <h2>Jump In</h2>
          <div className="homepage__quick-links">
            {campaign ? (
              <Link to="/game" className="btn btn--primary btn--large">
                Continue Adventure
              </Link>
            ) : (
              <Link to="/campaigns" className="btn btn--primary btn--large">
                Browse Campaigns
              </Link>
            )}
            {isDm && (
              <Link to="/dm" className="btn btn--ghost btn--large">DM Panel</Link>
            )}
            <Link to="/dashboard" className="btn btn--ghost btn--large">Dashboard</Link>
            <Link to="/campaigns" className="btn btn--ghost btn--large">Campaigns</Link>
          </div>
        </section>

        <section className="homepage__card">
          <h2>Your Characters</h2>
          {activeChars.length === 0 ? (
            <p className="homepage__note">You don't have a character yet.</p>
          ) : (
            <div className="homepage__char-list">
              {activeChars.map(c => (
                <div key={c.id} className="homepage__char-chip">
                  <span className="homepage__char-name">{c.name}</span>
                  <span className="homepage__char-class">
                    {[c.race, c.class].filter(Boolean).join(' ')} — Level {c.level}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/character/create"
            className="btn btn--ghost btn--sm"
            style={{ marginTop: '1rem', display: 'inline-flex' }}
          >
            {activeChars.length === 0 ? 'Build a Character' : activeChars.length < 2 ? '+ New Character' : 'View on Dashboard'}
          </Link>
        </section>

        <section className="homepage__card">
          <h2>How It Works</h2>
          <ol className="homepage__steps">
            <li>Build your character — race, class, and backstory</li>
            <li>Your DM creates a campaign and sets the opening scene</li>
            <li>Post your action in the encounter log each round</li>
            <li>When the party is ready, click <strong>Get DM Response</strong> for AI narration — or the DM writes it themselves</li>
          </ol>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
