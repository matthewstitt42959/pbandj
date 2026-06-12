import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── AuthContext token helpers (extracted logic, not the React component) ──────

const TOKEN_KEY = 'pb-and-jay-token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

describe('token storage helpers', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when no token stored', () => {
    expect(getToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    setToken('abc.def.ghi');
    expect(getToken()).toBe('abc.def.ghi');
  });

  it('clears the token', () => {
    setToken('abc.def.ghi');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('overwrites an existing token', () => {
    setToken('old-token');
    setToken('new-token');
    expect(getToken()).toBe('new-token');
  });
});

// ── Registration validation rules (mirroring server-side checks) ──────────────

function validateRegistration({ email, password, username, displayName }) {
  if (!email || !password || !username || !displayName) return 'All fields are required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (clean.length < 3) return 'Username must be at least 3 characters';
  return null;
}

describe('registration validation', () => {
  const valid = { email: 'a@b.com', password: 'secret1', username: 'matt', displayName: 'Matt' };

  it('passes for valid input', () => {
    expect(validateRegistration(valid)).toBeNull();
  });

  it('fails when email is missing', () => {
    expect(validateRegistration({ ...valid, email: '' })).toBeTruthy();
  });

  it('fails when password is too short', () => {
    expect(validateRegistration({ ...valid, password: 'abc' })).toMatch(/6 characters/);
  });

  it('fails when username is too short after stripping invalid chars', () => {
    expect(validateRegistration({ ...valid, username: 'ab' })).toMatch(/3 characters/);
  });

  it('fails when username contains only special characters', () => {
    expect(validateRegistration({ ...valid, username: '!!!' })).toMatch(/3 characters/);
  });

  it('passes username with underscores and numbers', () => {
    expect(validateRegistration({ ...valid, username: 'matt_42' })).toBeNull();
  });

  it('fails when displayName is missing', () => {
    expect(validateRegistration({ ...valid, displayName: '' })).toBeTruthy();
  });
});

// ── Login validation ──────────────────────────────────────────────────────────

function validateLogin({ email, password }) {
  if (!email || !password) return 'Email and password are required';
  return null;
}

describe('login validation', () => {
  it('passes for valid credentials', () => {
    expect(validateLogin({ email: 'a@b.com', password: 'secret1' })).toBeNull();
  });

  it('fails with empty email', () => {
    expect(validateLogin({ email: '', password: 'secret1' })).toBeTruthy();
  });

  it('fails with empty password', () => {
    expect(validateLogin({ email: 'a@b.com', password: '' })).toBeTruthy();
  });
});
