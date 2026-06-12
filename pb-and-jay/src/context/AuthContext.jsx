import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

async function fetchProfile(token) {
  const res = await fetch('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (session) => {
    if (!session) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    setUser(session.user);
    try {
      const p = await fetchProfile(session.access_token);
      setProfile(p);
    } catch {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session);
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // Sign in with email + password. Returns the profile (or null if no profile yet).
  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Auth service not configured');
    const { data: { session }, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    try {
      const p = await fetchProfile(session.access_token);
      setProfile(p);
      return p;
    } catch {
      return null;
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const p = await fetchProfile(session.access_token);
      setProfile(p);
      return p;
    }
    return null;
  };

  const getToken = async () => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
