import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';
import './RegisterPage.css';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      await register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        username: form.username.trim(),
        displayName: form.displayName.trim(),
      });
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
        <div className="auth-card__logo">
          <span className="auth-card__logo-pb">PB</span>
          <span className="auth-card__logo-amp">&amp;</span>
          <span className="auth-card__logo-jay">Jay</span>
        </div>
        <p className="auth-card__subtitle">Join the Adventure</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="displayName">Your name at the table</label>
          <input id="displayName" name="displayName" type="text" className="auth-input"
            placeholder="e.g. Matt" value={form.displayName} onChange={handleChange}
            maxLength={40} required autoFocus />

          <label className="auth-label" htmlFor="username" style={{ marginTop: '0.75rem' }}>Username</label>
          <input id="username" name="username" type="text" className="auth-input"
            placeholder="e.g. dungeon_matt" value={form.username} onChange={handleChange}
            maxLength={24} required />
          <p className="register-hint">Letters, numbers, and underscores only.</p>

          <label className="auth-label" htmlFor="email" style={{ marginTop: '0.75rem' }}>Email address</label>
          <input id="email" name="email" type="email" className="auth-input"
            placeholder="you@example.com" value={form.email} onChange={handleChange}
            required autoComplete="email" />

          <label className="auth-label" htmlFor="password" style={{ marginTop: '0.75rem' }}>Password</label>
          <input id="password" name="password" type="password" className="auth-input"
            placeholder="At least 6 characters" value={form.password} onChange={handleChange}
            required autoComplete="new-password" />

          <label className="auth-label" htmlFor="confirmPassword" style={{ marginTop: '0.75rem' }}>Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" className="auth-input"
            placeholder="Repeat your password" value={form.confirmPassword} onChange={handleChange}
            required autoComplete="new-password" />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn--primary auth-submit"
            disabled={loading || !form.email || !form.password || !form.displayName || !form.username}>
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
