// src/layouts/DashboardLayout.jsx
import React from 'react';
import Header from '../components/Header';
import CharacterSidebar from '../components/CharacterSidebar'; // Future feature
import GameFeed from '../components/GameFeed';               // Future feature
import ForumFeed from '../components/ForumFeed';             // Future feature
import './DashboardLayout.css';                              // Optional scoped styles

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-wrapper">
      <Header />
      <main className="dashboard-main">
        <aside className="dashboard-sidebar">
          <CharacterSidebar /> {/* Swap this with real tools later */}
        </aside>
        <section className="dashboard-content">
          {children || (
            <>
              <GameFeed />
              <ForumFeed />
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default DashboardLayout;