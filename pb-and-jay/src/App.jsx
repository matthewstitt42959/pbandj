import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import GameBoard from './pages/GameBoard';
import SettingsPage from './pages/SettingsPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <GameProvider>
      <Router>
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game" element={<GameBoard />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </Router>
    </GameProvider>
  );
}

export default App;
