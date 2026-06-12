import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const profile = await signIn(form.email.trim().toLowerCase(), form.password);
      const hasCharacter = profile?.characters?.some(c => !c.isRetired);
      navigate(hasCharacter ? '/dashboard' : '/character/create', { replace: true });
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email or password is incorrect.'
        : err.message || 'Sign in failed. Try again.');
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

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            className="auth-input"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
            autoFocus
            autoComplete="email"
          />

          <label className="auth-label" htmlFor="password" style={{ marginTop: '0.75rem' }}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="auth-input"
            placeholder="Your password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="btn btn--primary auth-submit"
            disabled={loading || !form.email.trim() || !form.password}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-card__footer">
          New adventurer?{' '}
          <Link to="/register" className="auth-link">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
