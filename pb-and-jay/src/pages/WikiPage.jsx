import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './WikiPage.css';

const CATEGORIES = ['All', 'Spells', 'Creatures', 'Factions', 'Locations', 'History', 'Events', 'Technology', 'General'];
const SPELL_CLASSES = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'];
const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];

const EMPTY_FORM = { title: '', category: 'General', content: '' };
const EMPTY_SPELL = { level: 0, school: 'Evocation', castingTime: '1 action', range: '60 feet', duration: 'Instantaneous', classes: [], description: '' };

function parseSpell(content) {
  try { return { ...EMPTY_SPELL, ...JSON.parse(content) }; }
  catch { return { ...EMPTY_SPELL }; }
}

function serializeSpell(title, spell) {
  return JSON.stringify({ name: title, ...spell });
}

export default function WikiPage() {
  const { user, authFetch } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [spellMeta, setSpellMeta] = useState(EMPTY_SPELL);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [search, setSearch] = useState('');

  const isDm = user?.role === 'DM' || user?.role === 'SUPER_DM';
  const isSuperDm = user?.role === 'SUPER_DM';
  const isSpellForm = form.category === 'Spells';

  useEffect(() => {
    fetch('/api/wiki')
      .then(r => r.json())
      .then(data => setEntries(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const searchable = (entry) => {
    const term = search.toLowerCase();
    if (entry.title.toLowerCase().includes(term)) return true;
    if (entry.category === 'Spells') {
      const s = parseSpell(entry.content);
      return (
        s.description?.toLowerCase().includes(term) ||
        s.school?.toLowerCase().includes(term) ||
        s.classes?.some(c => c.toLowerCase().includes(term)) ||
        (term === 'cantrip' && s.level === 0) ||
        (term.startsWith('level ') && String(s.level) === term.slice(6))
      );
    }
    return entry.content?.toLowerCase().includes(term);
  };

  const byCategory = activeCategory === 'All' ? entries : entries.filter(e => e.category === activeCategory);
  const filtered = search.trim() ? byCategory.filter(searchable) : byCategory;

  const openNew = () => {
    setForm(EMPTY_FORM);
    setSpellMeta(EMPTY_SPELL);
    setEditing('new');
    setError('');
  };

  const openEdit = (entry) => {
    setForm({ title: entry.title, category: entry.category, content: entry.content });
    if (entry.category === 'Spells') setSpellMeta(parseSpell(entry.content));
    else setSpellMeta(EMPTY_SPELL);
    setEditing(entry);
    setError('');
  };

  const cancelEdit = () => { setEditing(null); setError(''); };

  const handleCategoryChange = (cat) => {
    setForm(f => ({ ...f, category: cat }));
    if (cat === 'Spells') setSpellMeta(EMPTY_SPELL);
  };

  const toggleSpellClass = (cls) => {
    setSpellMeta(s => ({
      ...s,
      classes: s.classes.includes(cls) ? s.classes.filter(c => c !== cls) : [...s.classes, cls],
    }));
  };

  const handleSave = async () => {
    const finalContent = isSpellForm
      ? serializeSpell(form.title, spellMeta)
      : form.content;

    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (isSpellForm && !spellMeta.description.trim()) { setError('Description is required.'); return; }
    if (!isSpellForm && !form.content.trim()) { setError('Content is required.'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = { title: form.title, category: form.category, content: finalContent };
      if (editing === 'new') {
        const created = await authFetch('/api/wiki', { method: 'POST', body: JSON.stringify(payload) });
        setEntries(prev => [...prev, created].sort((a, b) =>
          a.category.localeCompare(b.category) || a.title.localeCompare(b.title)
        ));
      } else {
        const updated = await authFetch(`/api/wiki/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
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

  const handleSeedSpells = async () => {
    if (!window.confirm('Seed the wiki with the built-in D&D 5e spell list? Existing spells will be skipped.')) return;
    setSeeding(true);
    setError('');
    try {
      const result = await authFetch('/api/admin/seed-spells', { method: 'POST' });
      // Reload wiki entries after seeding
      const data = await fetch('/api/wiki').then(r => r.json());
      setEntries(data);
      alert(`Done! Created ${result.created} spells, skipped ${result.skipped} already existing.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
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

  const renderEntryContent = (entry) => {
    if (entry.category !== 'Spells') {
      const isLong = entry.content.length > 300;
      const expanded = expandedIds.has(entry.id);
      return (
        <>
          <p className={`wiki-entry__content ${isLong && !expanded ? 'wiki-entry__content--clamped' : ''}`}>
            {entry.content}
          </p>
          {isLong && (
            <button className="wiki-expand-btn" onClick={() => toggleExpand(entry.id)}>
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      );
    }

    const spell = parseSpell(entry.content);
    const expanded = expandedIds.has(entry.id);
    return (
      <div className="spell-card">
        <div className="spell-card__meta">
          <span className="spell-card__badge">{spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}</span>
          <span className="spell-card__badge spell-card__badge--school">{spell.school}</span>
          {spell.classes?.length > 0 && (
            <span className="spell-card__classes">{spell.classes.join(', ')}</span>
          )}
        </div>
        <div className="spell-card__stats">
          <span><strong>Casting:</strong> {spell.castingTime}</span>
          <span><strong>Range:</strong> {spell.range}</span>
          <span><strong>Duration:</strong> {spell.duration}</span>
        </div>
        {spell.description && (
          <>
            <p className={`wiki-entry__content ${!expanded ? 'wiki-entry__content--clamped' : ''}`}>
              {spell.description}
            </p>
            {spell.description.length > 200 && (
              <button className="wiki-expand-btn" onClick={() => toggleExpand(entry.id)}>
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="wiki-page">
      <div className="wiki-header">
        <div>
          <h1 className="wiki-title">World Wiki</h1>
          <p className="wiki-subtitle">Teraphobia universe &mdash; a Broken Archive world &nbsp;&middot;&nbsp; The AI DM reads this every session</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isSuperDm && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={handleSeedSpells}
              disabled={seeding}
            >
              {seeding ? 'Seeding…' : 'Seed Spells'}
            </button>
          )}
          {isDm && (
            <button className="btn btn--primary btn--sm" onClick={openNew}>+ Add Entry</button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="wiki-search-bar">
        <span className="wiki-search-icon">🔍</span>
        <input
          className="wiki-search-input"
          type="search"
          placeholder="Search by name, description, school, or class…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="wiki-search-clear" onClick={() => setSearch('')} title="Clear search">✕</button>
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
            : search.trim()
              ? `No results for "${search}".`
              : `No entries in "${activeCategory}".`}
        </p>
      ) : (
        <div className="wiki-entries">
          {filtered.map(entry => (
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
              {renderEntryContent(entry)}
            </article>
          ))}
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
              placeholder={isSpellForm ? 'e.g. Fireball' : 'e.g. The Harrow'}
              autoFocus
            />

            <label className="wiki-label">Category</label>
            <select
              className="wiki-select"
              value={form.category}
              onChange={e => handleCategoryChange(e.target.value)}
            >
              {CATEGORIES.filter(c => c !== 'All').map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>

            {isSpellForm ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label className="wiki-label">Level</label>
                    <select
                      className="wiki-select"
                      value={spellMeta.level}
                      onChange={e => setSpellMeta(s => ({ ...s, level: Number(e.target.value) }))}
                    >
                      <option value={0}>Cantrip (0)</option>
                      {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>Level {n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="wiki-label">School</label>
                    <select
                      className="wiki-select"
                      value={spellMeta.school}
                      onChange={e => setSpellMeta(s => ({ ...s, school: e.target.value }))}
                    >
                      {SCHOOLS.map(sc => <option key={sc}>{sc}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="wiki-label">Casting Time</label>
                    <input
                      className="wiki-input"
                      value={spellMeta.castingTime}
                      onChange={e => setSpellMeta(s => ({ ...s, castingTime: e.target.value }))}
                      placeholder="1 action"
                    />
                  </div>
                  <div>
                    <label className="wiki-label">Range</label>
                    <input
                      className="wiki-input"
                      value={spellMeta.range}
                      onChange={e => setSpellMeta(s => ({ ...s, range: e.target.value }))}
                      placeholder="60 feet"
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="wiki-label">Duration</label>
                    <input
                      className="wiki-input"
                      value={spellMeta.duration}
                      onChange={e => setSpellMeta(s => ({ ...s, duration: e.target.value }))}
                      placeholder="Instantaneous"
                    />
                  </div>
                </div>

                <label className="wiki-label">Classes</label>
                <div className="spell-class-grid">
                  {SPELL_CLASSES.map(cls => (
                    <label key={cls} className="spell-class-check">
                      <input
                        type="checkbox"
                        checked={spellMeta.classes.includes(cls)}
                        onChange={() => toggleSpellClass(cls)}
                      />
                      {cls}
                    </label>
                  ))}
                </div>

                <label className="wiki-label">Description</label>
                <textarea
                  className="wiki-textarea"
                  value={spellMeta.description}
                  onChange={e => setSpellMeta(s => ({ ...s, description: e.target.value }))}
                  placeholder="Describe the spell effect..."
                  rows={5}
                />
              </>
            ) : (
              <>
                <label className="wiki-label">Content</label>
                <textarea
                  className="wiki-textarea"
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Describe this in enough detail that the AI DM can use it accurately..."
                  rows={8}
                />
              </>
            )}

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
