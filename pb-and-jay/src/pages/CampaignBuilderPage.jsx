import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './CampaignBuilderPage.css';

const STATUS_LABELS = {
  DRAFT: { label: 'Draft', color: '#9aa0b8' },
  PENDING_REVIEW: { label: 'Pending Review', color: '#ffc857' },
  APPROVED: { label: 'Approved', color: '#a8e6cf' },
  REJECTED: { label: 'Rejected', color: '#ff8a80' },
  ARCHIVED: { label: 'Archived', color: '#6a7088' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] ?? STATUS_LABELS.DRAFT;
  return (
    <span className="cb-status-badge" style={{ color: s.color, borderColor: s.color + '55' }}>
      {s.label}
    </span>
  );
}

const CampaignBuilderPage = () => {
  const { id } = useParams(); // undefined = new campaign
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState(null); // {text, type: 'ok'|'err'}

  const [form, setForm] = useState({
    name: '', setting: '', openingScene: '', dmNotes: '',
    hooks: ['', '', ''],
    npcs: [{ name: '', description: '' }],
    isAiGame: false,
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => {
    if (!id) return;
    authFetch(`/api/campaigns/${id}`)
      .then(c => { setCampaign(c); loadIntoForm(c); })
      .catch(err => setMsg({ text: err.message, type: 'err' }))
      .finally(() => setLoading(false));
  }, [id, authFetch]);

  function loadIntoForm(c) {
    const hooks = Array.isArray(c.hooks) ? c.hooks : [];
    const npcs = Array.isArray(c.npcs) && c.npcs.length > 0 ? c.npcs : [{ name: '', description: '' }];
    setForm({
      name: c.name ?? '',
      setting: c.setting ?? '',
      openingScene: c.openingScene ?? '',
      dmNotes: c.dmNotes ?? '',
      hooks: hooks.length >= 3 ? hooks : [...hooks, ...Array(3 - hooks.length).fill('')],
      npcs,
      isAiGame: c.isAiGame ?? false,
    });
  }

  const flash = (text, type = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setHook = (i, val) => setForm(f => {
    const hooks = [...f.hooks]; hooks[i] = val; return { ...f, hooks };
  });
  const addHook = () => setForm(f => ({ ...f, hooks: [...f.hooks, ''] }));
  const removeHook = (i) => setForm(f => ({ ...f, hooks: f.hooks.filter((_, idx) => idx !== i) }));
  const setNpc = (i, field, val) => setForm(f => {
    const npcs = f.npcs.map((n, idx) => idx === i ? { ...n, [field]: val } : n);
    return { ...f, npcs };
  });
  const addNpc = () => setForm(f => ({ ...f, npcs: [...f.npcs, { name: '', description: '' }] }));
  const removeNpc = (i) => setForm(f => ({ ...f, npcs: f.npcs.filter((_, idx) => idx !== i) }));

  const buildPayload = () => ({
    name: form.name.trim(),
    setting: form.setting.trim(),
    openingScene: form.openingScene.trim(),
    dmNotes: form.dmNotes.trim(),
    hooks: form.hooks.map(h => h.trim()).filter(Boolean),
    npcs: form.npcs.filter(n => n.name.trim()),
    isAiGame: form.isAiGame,
  });

  const handleSave = async () => {
    if (!form.name.trim()) { flash('Campaign name is required', 'err'); return; }
    setSaving(true);
    try {
      if (!id) {
        const created = await authFetch('/api/campaigns', { method: 'POST', body: JSON.stringify(buildPayload()) });
        navigate(`/campaigns/${created.id}`, { replace: true });
        flash('Campaign created');
      } else {
        const updated = await authFetch(`/api/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(buildPayload()) });
        setCampaign(updated);
        flash('Saved');
      }
    } catch (err) {
      flash(err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit this campaign for Super DM review?')) return;
    setSubmitting(true);
    try {
      await handleSave();
      const updated = await authFetch(`/api/campaigns/${id}/submit`, { method: 'POST' });
      setCampaign(updated);
      flash('Submitted for review!');
    } catch (err) {
      flash(err.message, 'err');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) { flash('Enter a prompt first', 'err'); return; }
    if (!form.name.trim()) { flash('Enter a campaign name first', 'err'); return; }
    setGenerating(true);
    try {
      let campaignId = id;
      if (!campaignId) {
        const created = await authFetch('/api/campaigns', { method: 'POST', body: JSON.stringify(buildPayload()) });
        campaignId = created.id;
      }
      const updated = await authFetch(`/api/campaigns/${campaignId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      setCampaign(updated);
      loadIntoForm(updated);
      setShowAiPanel(false);
      flash('AI content generated — review and edit below');
      if (!id) navigate(`/campaigns/${campaignId}`, { replace: true });
    } catch (err) {
      flash(err.message, 'err');
    } finally {
      setGenerating(false);
    }
  };

  const canEdit = !campaign || ['DRAFT', 'REJECTED'].includes(campaign.status) || user?.role === 'SUPER_DM';
  const canSubmit = id && campaign && ['DRAFT', 'REJECTED'].includes(campaign.status);

  if (loading) return <div className="cb-loading">Loading campaign...</div>;

  return (
    <div className="cb-page">
      <div className="cb-top-bar">
        <Link to="/dm" className="cs-back-link">← DM Panel</Link>
        <div className="cb-top-bar__right">
          {campaign && <StatusBadge status={campaign.status} />}
          {msg && <span className={`cb-msg ${msg.type === 'err' ? 'cb-msg--err' : 'cb-msg--ok'}`}>{msg.text}</span>}
          {canEdit && (
            <button className="btn btn--ghost btn--sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {canSubmit && (
            <button className="btn btn--primary btn--sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>

      <header className="cb-header">
        <h1 className="cb-header__title">{id ? (campaign?.name || 'Campaign') : 'New Campaign'}</h1>
        {campaign?.rejectedNote && (
          <div className="cb-rejected-note">
            <strong>Rejected:</strong> {campaign.rejectedNote}
          </div>
        )}
      </header>

      {/* AI Generate panel */}
      {canEdit && (
        <div className="cb-ai-panel">
          <button className="cb-ai-toggle" onClick={() => setShowAiPanel(s => !s)}>
            {showAiPanel ? '▲' : '▼'} Generate with AI
          </button>
          {showAiPanel && (
            <div className="cb-ai-form">
              <p className="cb-ai-hint">
                Describe your campaign concept and the AI will fill in the details.
                {!id && ' Save first to enable generation.'}
              </p>
              <textarea
                className="cb-textarea"
                rows={3}
                placeholder="e.g. A coastal city plagued by ghost ships, a mystery involving a lost sea god, with political intrigue between rival merchant guilds..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <button
                className="btn btn--primary btn--sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Campaign'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="cb-form">
        {/* Name */}
        <div className="cb-field">
          <label className="cb-label">Campaign Name *</label>
          <input
            className="cb-input"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="The Whispering Hollow"
            disabled={!canEdit}
          />
        </div>

        {/* AI DM toggle */}
        <div className="cb-field cb-field--inline">
          <label className="cb-label cb-label--check">
            <input
              type="checkbox"
              className="cb-checkbox"
              checked={form.isAiGame}
              onChange={e => set('isAiGame', e.target.checked)}
              disabled={!canEdit}
            />
            AI DM Game
          </label>
          <p className="cb-field-hint" style={{ margin: 0 }}>
            Mark this as an AI-run game. Players who join will see the AI DM badge. The game board auto-enables AI mode.
          </p>
        </div>

        {/* Setting */}
        <div className="cb-field">
          <label className="cb-label">Setting & World</label>
          <textarea
            className="cb-textarea"
            rows={5}
            value={form.setting}
            onChange={e => set('setting', e.target.value)}
            placeholder="Describe the world, region, tone, and lore that defines this campaign..."
            disabled={!canEdit}
          />
        </div>

        {/* Opening Scene */}
        <div className="cb-field">
          <label className="cb-label">Opening Scene</label>
          <p className="cb-field-hint">The first scene players encounter when the campaign begins.</p>
          <textarea
            className="cb-textarea"
            rows={6}
            value={form.openingScene}
            onChange={e => set('openingScene', e.target.value)}
            placeholder="The party finds themselves at the edge of a mist-shrouded valley..."
            disabled={!canEdit}
          />
        </div>

        {/* Adventure Hooks */}
        <div className="cb-field">
          <label className="cb-label">Adventure Hooks</label>
          <p className="cb-field-hint">Narrative threads that draw players into the story.</p>
          <div className="cb-hook-list">
            {form.hooks.map((h, i) => (
              <div key={i} className="cb-hook-row">
                <span className="cb-hook-num">{i + 1}.</span>
                <input
                  className="cb-input"
                  value={h}
                  onChange={e => setHook(i, e.target.value)}
                  placeholder={`Hook ${i + 1}...`}
                  disabled={!canEdit}
                />
                {canEdit && form.hooks.length > 1 && (
                  <button className="cb-remove-btn" onClick={() => removeHook(i)}>×</button>
                )}
              </div>
            ))}
            {canEdit && (
              <button className="cb-add-btn" onClick={addHook}>+ Add Hook</button>
            )}
          </div>
        </div>

        {/* Key NPCs */}
        <div className="cb-field">
          <label className="cb-label">Key NPCs</label>
          <div className="cb-npc-list">
            {form.npcs.map((npc, i) => (
              <div key={i} className="cb-npc-row">
                <input
                  className="cb-input cb-npc-name"
                  value={npc.name}
                  onChange={e => setNpc(i, 'name', e.target.value)}
                  placeholder="NPC name"
                  disabled={!canEdit}
                />
                <input
                  className="cb-input cb-npc-desc"
                  value={npc.description}
                  onChange={e => setNpc(i, 'description', e.target.value)}
                  placeholder="Role and personality..."
                  disabled={!canEdit}
                />
                {canEdit && form.npcs.length > 1 && (
                  <button className="cb-remove-btn" onClick={() => removeNpc(i)}>×</button>
                )}
              </div>
            ))}
            {canEdit && (
              <button className="cb-add-btn" onClick={addNpc}>+ Add NPC</button>
            )}
          </div>
        </div>

        {/* DM Notes (private) */}
        <div className="cb-field">
          <label className="cb-label">DM Notes <span className="cb-label-private">(private)</span></label>
          <textarea
            className="cb-textarea"
            rows={4}
            value={form.dmNotes}
            onChange={e => set('dmNotes', e.target.value)}
            placeholder="Secret plot threads, session prep notes, things players shouldn't see..."
            disabled={!canEdit}
          />
        </div>

        {/* Approval info */}
        {campaign?.approvedBy && (
          <div className="cb-approved-info">
            ✦ Approved by @{campaign.approvedBy.username} on {new Date(campaign.approvedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignBuilderPage;
