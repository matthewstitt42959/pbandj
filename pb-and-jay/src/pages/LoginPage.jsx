import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

function friendlyError(msg) {
  if (!msg) return 'Sign in failed. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('invalid email or password') || m.includes('invalid login')) {
    return 'Email or password is incorrect. Double-check and try again.';
  }
  if (m.includes('email and password are required')) {
    return 'Please enter your email and password.';
  }
  if (m.includes('no connection') || m.includes('network') || m.includes('failed to fetch')) {
    return 'No internet connection. Check your signal and try again.';
  }
  if (m.includes('server error') || m.includes('server unavailable')) {
    return 'The server is temporarily unavailable. Try again in a moment.';
  }
  return msg;
}

const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDebugInfo('');

    // Read directly from the DOM — handles mobile autofill which bypasses onChange
    const emailVal = (e.target.email?.value ?? '').trim().toLowerCase();
    const passwordVal = e.target.password?.value ?? '';

    if (!emailVal) { setError('Please enter your email address.'); return; }
    if (!passwordVal) { setError('Please enter your password.'); return; }

    setLoading(true);
    try {
      const profile = await signIn(emailVal, passwordVal);
      const hasCharacter = profile?.characters?.some(c => !c.isRetired);
      navigate(hasCharacter ? '/dashboard' : '/character/create', { replace: true });
    } catch (err) {
      setError(friendlyError(err.message));
      // Temporary debug line — shows the raw error so we can diagnose
      setDebugInfo(`[debug] ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <span className="auth-card__logo-pb">PB</span>
          <span className="auth-card__logo-amp">&amp;</span>
          <span className="auth-card__logo-jay">Jay</span>
        </div>
        <p className="auth-card__subtitle">AI-Powered Tabletop Adventure</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label className="auth-label" htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            className="auth-input"
            placeholder="you@example.com"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />

          <label className="auth-label" htmlFor="password" style={{ marginTop: '0.75rem' }}>Password</label>
          <div className="auth-password-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input auth-input--password"
              placeholder="Your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="auth-show-btn"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && (
            <div className="auth-error-box" role="alert">
              <span className="auth-error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          {debugInfo && (
            <p className="auth-debug">{debugInfo}</p>
          )}

          <button
            type="submit"
            className="btn btn--primary auth-submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-card__footer">
          <Link to="/forgot-password" className="auth-link">Forgot your password?</Link>
        </p>
        <p className="auth-card__footer">
          New adventurer?{' '}
          <Link to="/register" className="auth-link">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
