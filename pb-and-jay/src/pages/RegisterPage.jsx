import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';
import './RegisterPage.css';

const RegisterPage = () => {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const displayName = form.displayName.trim();
    const username = form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const email = form.email.trim().toLowerCase();

    if (!displayName) return setError('Please enter your name.');
    if (username.length < 3) return setError('Username must be at least 3 characters (letters, numbers, underscores).');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      // 1. Create Supabase auth account
      const { data: { session, user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
      });

      if (signUpError) throw signUpError;

      // Supabase may require email confirmation — session will be null
      if (!session) {
        setError('Check your email to confirm your account, then sign in.');
        setLoading(false);
        return;
      }

      // 2. Store profile in our database
      const res = await fetch('/api/users/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ username, displayName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Account creation failed');

      await refreshProfile();
      navigate('/character/create', { replace: true });
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('An account with that email already exists. Try signing in.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <div className="auth-card__logo">
          <span className="auth-card__logo-pb">PB</span>
          <span className="auth-card__logo-amp">&amp;</span>
          <span className="auth-card__logo-jay">Jay</span>
        </div>
        <p className="auth-card__subtitle">Join the Adventure</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="displayName">Your name at the table</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            className="auth-input"
            placeholder="e.g. Matt"
            value={form.displayName}
            onChange={handleChange}
            maxLength={40}
            required
            autoFocus
          />

          <label className="auth-label" htmlFor="username" style={{ marginTop: '0.75rem' }}>Username</label>
          <input
            id="username"
            name="username"
            type="text"
            className="auth-input"
            placeholder="e.g. dungeon_matt"
            value={form.username}
            onChange={handleChange}
            maxLength={24}
            required
          />
          <p className="register-hint">Letters, numbers, and underscores only. This identifies you in campaigns.</p>

          <label className="auth-label" htmlFor="email" style={{ marginTop: '0.75rem' }}>Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            className="auth-input"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />

          <label className="auth-label" htmlFor="password" style={{ marginTop: '0.75rem' }}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="auth-input"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />

          <label className="auth-label" htmlFor="confirmPassword" style={{ marginTop: '0.75rem' }}>Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className="auth-input"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="btn btn--primary auth-submit"
            disabled={loading || !form.email.trim() || !form.password || !form.displayName.trim() || !form.username.trim()}
          >
            {loading ? 'Creating account...' : 'Create account & choose your character'}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
