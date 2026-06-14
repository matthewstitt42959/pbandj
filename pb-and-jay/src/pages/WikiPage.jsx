import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './WikiPage.css';

const CATEGORIES = ['All', 'Creatures', 'Factions', 'Locations', 'History', 'Events', 'Technology', 'General'];

const EMPTY_FORM = { title: '', category: 'General', content: '' };

export default function WikiPage() {
  const { user, authFetch } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [editing, setEditing] = useState(null); // null | 'new' | entry object
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());

  const isDm = user?.role === 'DM' || user?.role === 'SUPER_DM';

  useEffect(() => {
    fetch('/api/wiki')
      .then(r => r.json())
      .then(data => setEntries(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);


  const filtered = activeCategory === 'All'
    ? entries
    : entries.filter(e => e.category === activeCategory);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing('new');
    setError('');
  };

  const openEdit = (entry) => {
    setForm({ title: entry.title, category: entry.category, content: entry.content });
    setEditing(entry);
    setError('');
  };

  const cancelEdit = () => { setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing === 'new') {
        const created = await authFetch('/api/wiki', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setEntries(prev => [...prev, created].sort((a, b) =>
          a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
        ));
      } else {
        const updated = await authFetch(`/api/wiki/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
      }
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await authFetch(`/api/wiki/${id}`, { method: 'DELETE' });
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const categoryCount = (cat) => cat === 'All'
    ? entries.length
    : entries.filter(e => e.category === cat).length;

  return (
    <div className="wiki-page">
      <div className="wiki-header">
        <div>
          <h1 className="wiki-title">World Wiki</h1>
          <p className="wiki-subtitle">Teraphobia universe &mdash; a Broken Archive world &nbsp;&middot;&nbsp; The AI DM reads this every session</p>
        </div>
        {isDm && (
          <button className="btn btn--primary btn--sm" onClick={openNew}>+ Add Entry</button>
        )}
      </div>

      {/* Category filter */}
      <div className="wiki-categories">
        {CATEGORIES.map(cat => {
          const count = categoryCount(cat);
          if (cat !== 'All' && count === 0) return null;
          return (
            <button
              key={cat}
              className={`wiki-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
              <span className="wiki-cat-count">{count}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="wiki-error">{error}</p>}

      {/* Entry list */}
      {loading ? (
        <p className="wiki-empty">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="wiki-empty">
          {entries.length === 0
            ? isDm ? 'No entries yet. Click "+ Add Entry" to start building the world.' : 'No world entries yet.'
            : `No entries in "${activeCategory}".`}
        </p>
      ) : (
        <div className="wiki-entries">
          {filtered.map(entry => {
            const isLong = entry.content.length > 300;
            const expanded = expandedIds.has(entry.id);
            return (
              <article key={entry.id} className="wiki-entry">
                <div className="wiki-entry__head">
                  <div className="wiki-entry__meta">
                    <h2 className="wiki-entry__title">{entry.title}</h2>
                    <span className="wiki-entry__cat">{entry.category}</span>
                  </div>
                  {isDm && (
                    <div className="wiki-entry__actions">
                      <button className="btn btn--ghost btn--xs" onClick={() => openEdit(entry)}>Edit</button>
                      <button className="btn btn--danger btn--xs" onClick={() => handleDelete(entry.id, entry.title)}>Delete</button>
                    </div>
                  )}
                </div>
                <p className={`wiki-entry__content ${isLong && !expanded ? 'wiki-entry__content--clamped' : ''}`}>
                  {entry.content}
                </p>
                {isLong && (
                  <button className="wiki-expand-btn" onClick={() => toggleExpand(entry.id)}>
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {editing && (
        <div className="wiki-modal-backdrop" onClick={cancelEdit}>
          <div className="wiki-modal" onClick={e => e.stopPropagation()}>
            <h2 className="wiki-modal__title">
              {editing === 'new' ? 'New Wiki Entry' : `Edit: ${editing.title}`}
            </h2>

            <label className="wiki-label">Title</label>
            <input
              className="wiki-input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. The Harrow"
              autoFocus
            />

            <label className="wiki-label">Category</label>
            <select
              className="wiki-select"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <label className="wiki-label">Content</label>
            <textarea
              className="wiki-textarea"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Describe this in enough detail that the AI DM can use it accurately..."
              rows={8}
            />

            {error && <p className="wiki-error">{error}</p>}

            <div className="wiki-modal__actions">
              <button className="btn btn--ghost" onClick={cancelEdit} disabled={saving}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
