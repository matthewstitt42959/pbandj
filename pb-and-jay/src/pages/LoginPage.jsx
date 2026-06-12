import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendMagicLink(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__icon">📬</div>
          <h1 className="auth-card__title">Check your email</h1>
          <p className="auth-card__body">
            We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.
          </p>
          <p className="auth-card__hint">
            Didn't get it? Check your spam folder, or{' '}
            <button className="auth-link-btn" onClick={() => setSent(false)}>try again</button>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__icon">⚔️</div>
        <h1 className="auth-card__title">PB & Jay</h1>
        <p className="auth-card__subtitle">AI-powered tabletop adventure</p>
        <p className="auth-card__body">
          Enter your email and we'll send you a magic link — no password required.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          {error && <p className="auth-error">{error}</p>}
          <button
            type="submit"
            className="btn btn--primary auth-submit"
            disabled={loading || !email.trim()}
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>

        <p className="auth-card__footer">
          New here? You'll create your account after clicking the link.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
