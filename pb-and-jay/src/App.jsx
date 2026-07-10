import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import HubPage from './pages/HubPage';
import AerialWarPage from './pages/AerialWarPage';
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
import AdminPage from './pages/AdminPage';
import CampaignBuilderPage from './pages/CampaignBuilderPage';
import CampaignListPage from './pages/CampaignListPage';
import CampaignManagePage from './pages/CampaignManagePage';
import RulesPage from './pages/RulesPage';
import WikiPage from './pages/WikiPage';

// The hub (/) and other games (/games/*) are chrome-free — PB & Jay's own
// navbar only makes sense once you're inside the PB & Jay app itself.
function AppShell() {
  const location = useLocation();
  const hideChrome = location.pathname === '/' || location.pathname.startsWith('/games/');

  const routes = (
    <Routes>
      {/* Hub + other games */}
      <Route path="/" element={<HubPage />} />
      <Route path="/games/aerial-war" element={<AerialWarPage />} />

      {/* PB & Jay — public routes (homepage lives at /pbj; everything else unchanged) */}
      <Route path="/pbj" element={<HomePage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* PB & Jay — auth-required routes */}
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
      <Route path="/admin" element={
        <PrivateRoute><AdminPage /></PrivateRoute>
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
      <Route path="/campaigns/:id/manage" element={
        <PrivateRoute><CampaignManagePage /></PrivateRoute>
      } />
      <Route path="/wiki" element={<WikiPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  if (hideChrome) return routes;

  return (
    <>
      <Navbar />
      <main className="app-main">{routes}</main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <Router>
          <AppShell />
        </Router>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
