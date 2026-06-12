import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './LoginPage.css';

const AuthCallback = () => {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (!supabase || handled.current) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (handled.current) return;
      if (event === 'SIGNED_IN' && session) {
        handled.current = true;

        try {
          const res = await fetch('/api/users/me', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          if (res.status === 404) {
            // First-time login — collect username and display name
            navigate('/register', { replace: true });
          } else if (res.ok) {
            const user = await res.json();
            const hasCharacter = user.characters?.some(c => !c.isRetired);
            navigate(hasCharacter ? '/dashboard' : '/character/create', { replace: true });
          } else {
            navigate('/register', { replace: true });
          }
        } catch {
          navigate('/register', { replace: true });
        }
      }
    });

    // Fallback: if already signed in (page refresh on callback URL)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (handled.current || !session) return;
      handled.current = true;

      try {
        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.status === 404) {
          navigate('/register', { replace: true });
        } else if (res.ok) {
          const user = await res.json();
          const hasCharacter = user.characters?.some(c => !c.isRetired);
          navigate(hasCharacter ? '/dashboard' : '/character/create', { replace: true });
        } else {
          navigate('/register', { replace: true });
        }
      } catch {
        navigate('/register', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__icon">✨</div>
        <h1 className="auth-card__title">Signing you in...</h1>
        <p className="auth-card__body">Hold tight, adventurer.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
