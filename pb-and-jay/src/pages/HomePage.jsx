// src/pages/HomePage.jsx

import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Dashboard from '../components/Dashboard';

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Dev Note:
          This is the main landing page of PB and Jay.
          It introduces the project and offers quick access to:
          - Recent posts
          - Ongoing games
          - Create character / Start module
          - Access campaign journal
          Layout should prioritize mobile-first responsiveness.
      */}

      {/* Header with navbar */}
      <Header />

      {/* Main dashboard content */}
      <main className="flex-grow px-4 py-6 sm:px-6 lg:px-8">
        <Dashboard />
      </main>

      {/* Footer or persistent nav */}
      <Footer />
    </div>
  );
};

export default HomePage;