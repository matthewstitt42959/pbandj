import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import HomePage from './pages/HomePage';
import GameBoard from './pages/GameBoard';
import NotFound from './pages/NotFound';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CharacterCreate from './pages/CharacterCreate';
import CharacterSheet from './pages/CharacterSheet';
import DashboardPage from './pages/DashboardPage';
import DmPage from './pages/DmPage';
import CampaignBuilderPage from './pages/CampaignBuilderPage';
import CampaignListPage from './pages/CampaignListPage';
import RulesPage from './pages/RulesPage';

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <Router>
          <Navbar />
          <main className="app-main">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Auth-required routes */}
              <Route path="/character/create" element={
                <PrivateRoute><CharacterCreate /></PrivateRoute>
              } />
              <Route path="/character/:id" element={
                <PrivateRoute><CharacterSheet /></PrivateRoute>
              } />
              <Route path="/dashboard" element={
                <PrivateRoute><DashboardPage /></PrivateRoute>
              } />
              <Route path="/game" element={
                <PrivateRoute><GameBoard /></PrivateRoute>
              } />
              <Route path="/dm" element={
                <PrivateRoute><DmPage /></PrivateRoute>
              } />
              <Route path="/campaigns" element={
                <PrivateRoute><CampaignListPage /></PrivateRoute>
              } />
              <Route path="/campaigns/new" element={
                <PrivateRoute><CampaignBuilderPage /></PrivateRoute>
              } />
              <Route path="/campaigns/:id" element={
                <PrivateRoute><CampaignBuilderPage /></PrivateRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </Router>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
