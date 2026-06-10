import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { defaultCampaign } from '../data/defaultCampaign';

const HomePage = () => {
  const { campaign, startCampaign } = useGame();
  const navigate = useNavigate();

  const handleStart = () => {
    startCampaign();
    navigate('/game');
  };

  const handleContinue = () => {
    navigate('/game');
  };

  return (
    <div className="homepage">
      <header className="homepage__hero">
        <h1 className="homepage__title">PB & Jay</h1>
        <p className="homepage__tagline">
          Play-by-post D&amp;D — run the story yourself, or add an AI DM later
        </p>
      </header>

      <div className="homepage__grid">
        <section className="homepage__card homepage__card--featured">
          <h2>Your Adventure Awaits</h2>
          <p className="homepage__campaign-name">{defaultCampaign.name}</p>
          <p className="homepage__campaign-desc">{defaultCampaign.setting}</p>

          <div className="homepage__party">
            <span className="homepage__party-label">Your party of five:</span>
            <div className="homepage__party-chips">
              {['Kaelin', 'Morg', 'Sylra', 'Thorne', 'Elira'].map((name) => (
                <span key={name} className="party-chip">{name}</span>
              ))}
            </div>
          </div>

          {campaign ? (
            <button className="btn btn--primary btn--large" onClick={handleContinue}>
              Continue Adventure
            </button>
          ) : (
            <button className="btn btn--primary btn--large" onClick={handleStart}>
              Begin Adventure
            </button>
          )}
        </section>

        <section className="homepage__card">
          <h2>How It Works</h2>
          <ol className="homepage__steps">
            <li>Begin with the opening scene already in the log</li>
            <li>Post as any party member — actions and dice rolls</li>
            <li>Switch to <strong>DM Narration</strong> to write what happens next</li>
            <li>Optionally enable AI DM later from the game board</li>
          </ol>
        </section>

        <section className="homepage__card">
          <h2>Manual play (default)</h2>
          <p className="status-text status-text--ok">No API key required</p>
          <p className="homepage__note">
            You are the DM. Toggle between character posts and DM narration on the game board.
            See <Link to="/settings">Setup</Link> if you want to try AI later.
          </p>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
