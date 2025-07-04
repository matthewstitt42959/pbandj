import React from 'react';
import { Link } from 'react-router-dom';

/**
 * DEV NOTE:
 * HomePage.jsx is the main landing screen for PB and Jay.
 * It introduces the user to the Play-by-Post system, provides quick access
 * to the core sections of the app, and sets the tone for future enhancements
 * like news, featured campaigns, and user onboarding tips.
 */

const HomePage = () => {
  return (
    <div className="homepage-container">
      <h1>Welcome to PB and Jay</h1>
      <p>
        Begin your solo D&D play-by-post adventure. Explore, post, and build your journey.
      </p>

      <nav className="homepage-nav">
        <ul>
          <li><Link to="/game">🧭 Game Board</Link></li>
          <li><Link to="/characters">👤 Character Roster</Link></li>
          <li><Link to="/journal">📓 Journal</Link></li>
          <li><Link to="/modules">📚 Modules</Link></li>
          <li><Link to="/rules">📜 Rules</Link></li>
          <li><Link to="/siteopedia">📂 Site-o-pedia</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default HomePage;