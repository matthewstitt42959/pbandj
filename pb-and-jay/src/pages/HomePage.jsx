import React from 'react';
import {Link} from 'react-router-dom';
// This is the HomePage component for the PB and Jay application.
// It serves as the landing page for users to navigate to different sections of the app.
// The page includes a welcome message and a brief description of the app's purpose.

const HomePage = () => {
  return (
    <div className="homepage-container">
      <h1>PB and Jay</h1>
      <p> Welcome to your play-by-post D&D adventure hub.</p>
      <nav className="homepage-nav">
        <ul>
          <li>
            <Link to="/characters">View Characters</Link>
          </li>
          <li>
            <Link to="/new-post">Start a New Post</Link>
          </li>
          <li>
            <Link to="/modules">Browse Modules</Link>
          </li>
          <li>
            <Link to="/siteopedia">Site-opedia</Link>
          </li>
        </ul>
        
      </nav>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
  },
};

export default HomePage;