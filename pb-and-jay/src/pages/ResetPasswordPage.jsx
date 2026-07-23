import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const ResetPasswordPage = () => {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await authFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__logo">
            <span className="auth-card__logo-pb">PB</span>
            <span className="auth-card__logo-amp">&amp;</span>
            <span className="auth-card__logo-jay">Jay</span>
          </div>
          <p className="auth-card__subtitle">Reset password</p>
          <p className="auth-card__body">
            This link is missing its reset token. Request a new one from the forgot-password page.
          </p>
          <p className="auth-card__footer">
            <Link to="/forgot-password" className="auth-link">Request a new link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <span className="auth-card__logo-pb">PB</span>
          <span className="auth-card__logo-amp">&amp;</span>
          <span className="auth-card__logo-jay">Jay</span>
        </div>
        <p className="auth-card__subtitle">Reset password</p>

        {done ? (
          <p className="auth-card__body">Password updated — taking you to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <label className="auth-label" htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="auth-label" htmlFor="confirmPassword" style={{ marginTop: '0.75rem' }}>
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="auth-input"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error && (
              <div className="auth-error-box" role="alert">
                <span className="auth-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn--primary auth-submit" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="auth-card__footer">
          <Link to="/login" className="auth-link">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
