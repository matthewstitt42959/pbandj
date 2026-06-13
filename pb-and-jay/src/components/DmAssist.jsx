import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './DmAssist.css';

const QUICK_ACTIONS = [
  { label: 'Describe the scene', prompt: 'Give me a brief vivid description of the current scene — 2 sentences, grounded and atmospheric.' },
  { label: 'NPC reaction', prompt: 'How does a nearby NPC react to what just happened? Give them a line of dialogue in character.' },
  { label: 'Throw a complication', prompt: 'Suggest one short complication or unexpected twist that could naturally arise right now.' },
  { label: 'Narrate a roll', prompt: 'The player just rolled. Narrate a brief outcome — success or failure, keep it punchy.' },
  { label: 'End the scene', prompt: 'Write a short scene-closing beat — something that lands and sets up what comes next.' },
];

const DmAssist = ({ campaign, posts, characters, onInsert }) => {
  const { authFetch } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const ask = async (overridePrompt) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      const data = await authFetch('/api/dm/assist', {
        method: 'POST',
        body: JSON.stringify({
          prompt: text,
          campaign,
          posts,
          characters,
        }),
      });
      setResult(data.suggestion);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = (p) => {
    setPrompt('');
    ask(p);
    if (!open) setOpen(true);
  };

  return (
    <div className={`dm-assist ${open ? 'dm-assist--open' : ''}`}>
      <button
        className="dm-assist__toggle"
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span className="dm-assist__toggle-icon">{open ? '▼' : '▶'}</span>
        DM Assist
        <span className="dm-assist__toggle-hint">AI writing helper</span>
      </button>

      {open && (
        <div className="dm-assist__body">
          <div className="dm-assist__chips">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                className="dm-assist__chip"
                onClick={() => handleQuick(a.prompt)}
                disabled={loading}
                type="button"
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="dm-assist__input-row">
            <textarea
              className="dm-assist__input"
              rows={2}
              placeholder="Ask anything… 'give Mira a nervous line', 'describe the ambush', 'what does the crowd do?'"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
              }}
            />
            <button
              className="btn btn--primary btn--sm dm-assist__ask-btn"
              onClick={() => ask()}
              disabled={loading || !prompt.trim()}
              type="button"
            >
              {loading ? '…' : 'Ask'}
            </button>
          </div>

          {error && <p className="dm-assist__error">{error}</p>}

          {result && (
            <div className="dm-assist__result">
              <p className="dm-assist__result-text">{result}</p>
              <div className="dm-assist__result-actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => onInsert(result)}
                  type="button"
                >
                  Insert into post
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => { setResult(''); setPrompt(''); }}
                  type="button"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DmAssist;
