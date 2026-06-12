import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './RulesPage.css';

function RuleCard({ rule, isSuperDm, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(rule.title);
  const [body, setBody] = useState(rule.body);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    await onSave(rule.id, { title, body });
    setBusy(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(rule.title);
    setBody(rule.body);
    setEditing(false);
  };

  return (
    <div className={`rule-card ${editing ? 'rule-card--editing' : ''}`}>
      <div className="rule-card__num">{rule.order}</div>
      <div className="rule-card__content">
        {editing ? (
          <>
            <input
              className="rule-edit-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Rule title"
            />
            <textarea
              className="rule-edit-body"
              rows={4}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Rule description..."
            />
            <div className="rule-edit-actions">
              <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={busy}>
                {busy ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={handleCancel}>Cancel</button>
              <button className="btn btn--danger btn--sm" onClick={() => onDelete(rule.id)}>Delete</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="rule-card__title">{rule.title}</h3>
            <p className="rule-card__body">{rule.body}</p>
            {isSuperDm && (
              <button className="rule-edit-btn" onClick={() => setEditing(true)}>Edit</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const RulesPage = () => {
  const { user, authFetch } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [saving, setSaving] = useState(false);

  const isSuperDm = user?.role === 'SUPER_DM';

  useEffect(() => {
    fetch('/api/rules')
      .then(r => r.json())
      .then(data => setRules(Array.isArray(data) ? data : []))
      .catch(() => setErr('Could not load rules.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (id, updates) => {
    try {
      const updated = await authFetch(`/api/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setRules(prev => prev.map(r => r.id === id ? updated : r));
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await authFetch(`/api/rules/${id}`, { method: 'DELETE' });
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newBody.trim()) return;
    setSaving(true);
    try {
      const created = await authFetch('/api/rules', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, body: newBody }),
      });
      setRules(prev => [...prev, created]);
      setNewTitle('');
      setNewBody('');
      setAdding(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rules-page">
      <header className="rules-header">
        <div className="rules-header__inner">
          <h1 className="rules-header__title">Community Rules</h1>
          <p className="rules-header__sub">
            Guidelines for a great game at every table.
          </p>
        </div>
        {isSuperDm && (
          <button className="btn btn--primary btn--sm" onClick={() => setAdding(a => !a)}>
            {adding ? 'Cancel' : '+ Add Rule'}
          </button>
        )}
      </header>

      {err && <p className="rules-err">{err}</p>}

      {isSuperDm && adding && (
        <div className="rule-add-form">
          <h3 className="rule-add-form__title">New Rule</h3>
          <input
            className="rule-edit-title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Rule title..."
          />
          <textarea
            className="rule-edit-body"
            rows={4}
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            placeholder="Rule description..."
          />
          <div className="rule-edit-actions">
            <button className="btn btn--primary btn--sm" onClick={handleAdd} disabled={saving}>
              {saving ? 'Adding...' : 'Add Rule'}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => { setAdding(false); setNewTitle(''); setNewBody(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="rules-loading">Loading rules...</p>
      ) : (
        <div className="rules-list">
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              isSuperDm={isSuperDm}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <div className="rules-footer">
        <p>Questions or concerns? Reach out to your DM or Super DM before or after a session.</p>
      </div>
    </div>
  );
};

export default RulesPage;
