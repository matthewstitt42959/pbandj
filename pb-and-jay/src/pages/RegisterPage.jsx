import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';
import './RegisterPage.css';

const RegisterPage = () => {
  const { getToken, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const username = form.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const displayName = form.displayName.trim();

    if (username.length < 3) {
      return setError('Username must be at least 3 characters (letters, numbers, underscores)');
    }
    if (!displayName) {
      return setError('Display name is required');
    }

    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/users/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, displayName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      await refreshProfile();
      navigate('/character/create', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <div className="auth-card__icon">🧙</div>
        <h1 className="auth-card__title">Create your profile</h1>
        <p className="auth-card__body">
          Choose a username and tell us what to call you at the table.
        </p>

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
            placeholder="e.g. dungeon_matt (letters, numbers, _)"
            value={form.username}
            onChange={handleChange}
            maxLength={24}
            required
          />
          <p className="register-hint">Used to identify you in campaigns. Lowercase only.</p>

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="btn btn--primary auth-submit"
            disabled={loading || !form.username.trim() || !form.displayName.trim()}
          >
            {loading ? 'Saving...' : 'Continue to character creation'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
