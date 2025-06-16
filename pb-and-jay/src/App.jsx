// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import GameBoard from './pages/GameBoard';
import CharacterSheet from './pages/CharacterSheet';
import CampaignEditor from './pages/CampaignEditor';
import NotFound from './pages/NotFound';

const App = () => {
  return (
    <Router>
      <Navbar />
      <main style={{ padding: '1rem' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game" element={<GameBoard />} />
          <Route path="/character/:id" element={<CharacterSheet />} />
          <Route path="/editor" element={<CampaignEditor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </Router>
  );
};

export default App;