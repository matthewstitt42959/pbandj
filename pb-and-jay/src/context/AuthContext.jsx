import React, { createContext, useContext, useEffect, useState } from 'react';

const TOKEN_KEY = 'pb-and-jay-token';
const AuthContext = createContext(null);

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('Server unavailable — make sure the backend is running on port 3001');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { id, email, username, displayName, role, characters }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    apiFetch('/api/users/me')
      .then(profile => setUser(profile))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email, password) => {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    // Fetch full profile (includes characters)
    const profile = await apiFetch('/api/users/me');
    setUser(profile);
    return profile;
  };

  const register = async ({ email, password, username, displayName }) => {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, displayName }),
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const signOut = () => {
    clearToken();
    setUser(null);
  };

  // For components that need to make authenticated API calls directly
  const authFetch = (path, options = {}) => apiFetch(path, options);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, register, signOut, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
