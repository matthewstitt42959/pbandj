// src/pages/HomePage.jsx
import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';

const HomePage = () => {
  return (
    <DashboardLayout>
      {/* Optional: override children if you want custom content here */}
      <div style={{ padding: '1rem' }}>
        <h2>Welcome to PB and Jay</h2>
        <p>Build your party, explore modules, and play-by-post with AI DM support.</p>
      </div>
    </DashboardLayout>
  );
};

export default HomePage;