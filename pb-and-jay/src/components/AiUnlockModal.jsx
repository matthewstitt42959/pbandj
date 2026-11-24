import React, { useState } from 'react';
import { unlockAiDM } from '../services/auth.js';
import { KOFI_URL } from '../lib/support.js';
import './AiUnlockModal.css';

const AiUnlockModal = ({ onUnlocked, onClose }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await unlockAiDM(password);
      onUnlocked();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="modal-card__title">Unlock AI DM</h2>
        <p className="modal-card__desc">
          The AI dungeon master runs on paid API credits, so it&rsquo;s kept behind an access code.
        </p>
        <p className="modal-card__subdesc">
          Support the lab on Ko-fi and message me for a code, or enter one below if you already have it.
        </p>
        <a
          className="btn btn--primary modal-card__kofi"
          href={KOFI_URL}
          target="_blank"
          rel="noreferrer"
        >
          Support on Ko-fi
        </a>
        <form onSubmit={handleSubmit}>
          <input
            className="modal-card__input"
            type="password"
            placeholder="Enter access code"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="modal-card__error">{error}</p>}
          <div className="modal-card__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading || !password.trim()}
            >
              {loading ? 'Checking...' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AiUnlockModal;
