import React, { useState } from 'react';
import { unlockAiDM } from '../services/auth.js';
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
          AI-powered storytelling requires a subscription.<br />
          <strong>$5/month for access.</strong>
        </p>
        <p className="modal-card__subdesc">
          Contact the site owner to subscribe and receive your access code.
        </p>
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
