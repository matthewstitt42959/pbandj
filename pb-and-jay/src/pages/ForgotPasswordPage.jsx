import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const ForgotPasswordPage = () => {
  const { authFetch } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const emailVal = email.trim().toLowerCase();
    if (!emailVal) { setError('Please enter your email address.'); return; }

    setLoading(true);
    try {
      await authFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: emailVal }),
      });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
        <p className="auth-card__subtitle">Password reset</p>

        {sent ? (
          <p className="auth-card__body">
            If an account exists for that email, we've sent a link to reset your password.
            It expires in 1 hour.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <label className="auth-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              className="auth-input"
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && (
              <div className="auth-error-box" role="alert">
                <span className="auth-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn--primary auth-submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
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

export default ForgotPasswordPage;
