import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import './CampaignManagePage.css';

// ── Custom select dropdown ────────────────────────────────────────────────────

function CustomSelect({ value, onChange, options, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`cm-custom-select${open ? ' cm-custom-select--open' : ''}${disabled ? ' cm-custom-select--disabled' : ''}`}>
      <button
        type="button"
        className="cm-custom-select__trigger"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <span>{selected?.label ?? value}</span>
        <span className="cm-custom-select__arrow">▾</span>
      </button>
      {open && (
        <ul className="cm-custom-select__menu">
          {options.map(o => (
            <li
              key={o.value}
              className={`cm-custom-select__option${o.value === value ? ' cm-custom-select__option--active' : ''}`}
              onMouseDown={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Small shared components ───────────────────────────────────────────────────

function Badge({ label, color }) {
  return (
    <span className="cm-badge" style={{ color, borderColor: color + '44' }}>{label}</span>
  );
}

function CharacterChip({ char, onRemove }) {
  return (
    <div className="cm-char-chip">
      <div className="cm-char-chip__info">
        <span className="cm-char-chip__name">
          <Link to={`/character/${char.id}`} className="cm-char-chip__link">{char.name}</Link>
        </span>
        <span className="cm-char-chip__meta">
          {char.class} · Lv {char.level}
          {char.user && ` · ${char.user.displayName ?? char.user.username}`}
        </span>
      </div>
      {onRemove && (
        <button className="cm-char-chip__remove" onClick={() => onRemove(char.id)} title="Remove from campaign">✕</button>
      )}
    </div>
  );
}

// ── AI Game panel ─────────────────────────────────────────────────────────────

const MAX_PARTY = 6;

function AiRosterPanel({ campaign, roster, onRosterChange, authFetch }) {
  const [myChars, setMyChars] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(3);
  const [genPrompt, setGenPrompt] = useState('');
  const [genError, setGenError] = useState('');
  const [adding, setAdding] = useState(null);
  const [msg, setMsg] = useState('');

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3500); };

  const slotsLeft = Math.max(0, MAX_PARTY - roster.length);

  // Keep genCount in range when roster grows
  useEffect(() => {
    if (genCount > slotsLeft && slotsLeft > 0) setGenCount(slotsLeft);
  }, [slotsLeft]);

  useEffect(() => {
    authFetch('/api/characters')
      .then(data => setMyChars(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const inCampaign = new Set(roster.map(c => c.id));

  const handleAdd = async (charId) => {
    setAdding(charId);
    try {
      await authFetch(`/api/dm/characters/${charId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      // Reload from server so we get the user info populated
      const updated = await authFetch(`/api/campaigns/${campaign.id}/characters`);
      onRosterChange(updated);
      flash('Character added to party.');
    } catch (e) {
      flash(e.message);
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (charId) => {
    try {
      await authFetch(`/api/dm/characters/${charId}/unassign`, { method: 'POST' });
      onRosterChange(roster.filter(c => c.id !== charId));
      flash('Character removed from party.');
    } catch (e) {
      flash(e.message);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const newChars = await authFetch(`/api/campaigns/${campaign.id}/generate-characters`, {
        method: 'POST',
        body: JSON.stringify({ count: genCount, prompt: genPrompt }),
      });
      onRosterChange([...roster, ...newChars]);
      flash(`Generated ${newChars.length} characters and added them to the party.`);
      setGenPrompt('');
    } catch (e) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const available = myChars.filter(c => !c.isRetired && !inCampaign.has(c.id) && !c.campaignId);

  return (
    <div className="cm-panel">
      {/* Current party */}
      <section className="cm-section">
        <h2 className="cm-section__title">Current Party ({roster.length})</h2>
        {roster.length === 0 ? (
          <p className="cm-empty">No characters yet. Generate a party or add from your own characters below.</p>
        ) : (
          <div className="cm-char-list">
            {roster.map(c => <CharacterChip key={c.id} char={c} onRemove={handleRemove} />)}
          </div>
        )}
      </section>

      {/* Generate AI party */}
      <section className="cm-section">
        <h2 className="cm-section__title">Generate AI Party</h2>
        {slotsLeft === 0 ? (
          <p className="cm-empty">Party is full ({MAX_PARTY}/{MAX_PARTY}). Remove a character to generate more.</p>
        ) : (
          <>
            <p className="cm-hint">
              Let the AI create a full party tailored to this campaign's setting.
              {roster.length > 0 && ` (${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} remaining)`}
            </p>
            <div className="cm-gen-form">
              <label className="cm-label">
                Add characters
                <CustomSelect
                  value={Math.min(genCount, slotsLeft)}
                  onChange={v => setGenCount(Number(v))}
                  disabled={generating}
                  options={Array.from({ length: slotsLeft }, (_, i) => i + 1).map(n => ({
                    value: n,
                    label: `${n} character${n !== 1 ? 's' : ''}`,
                  }))}
                />
              </label>
              <label className="cm-label cm-label--full">
                Guidance (optional)
                <input
                  className="cm-input"
                  type="text"
                  placeholder="e.g. include a healer, dark and gritty tone…"
                  value={genPrompt}
                  onChange={e => setGenPrompt(e.target.value)}
                  disabled={generating}
                />
              </label>
              <button
                className="btn btn--primary btn--sm cm-gen-btn"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Generating…' : '✦ Generate Party'}
              </button>
              {genError && <p className="cm-err">{genError}</p>}
            </div>
          </>
        )}
      </section>

      {/* Add from own characters */}
      {available.length > 0 && (
        <section className="cm-section">
          <h2 className="cm-section__title">Add from Your Characters</h2>
          <div className="cm-char-list">
            {available.map(c => (
              <div key={c.id} className="cm-char-chip">
                <div className="cm-char-chip__info">
                  <span className="cm-char-chip__name">{c.name}</span>
                  <span className="cm-char-chip__meta">{c.class} · Lv {c.level}</span>
                </div>
                <button
                  className="btn btn--ghost btn--xs"
                  onClick={() => handleAdd(c.id)}
                  disabled={adding === c.id}
                >
                  {adding === c.id ? '…' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {msg && <div className="cm-flash">{msg}</div>}
    </div>
  );
}

// ── Manual game panel ─────────────────────────────────────────────────────────

function ManualRosterPanel({ campaign, roster, onRosterChange, authFetch }) {
  const [joinRequests, setJoinRequests] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [msg, setMsg] = useState('');

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3500); };

  useEffect(() => {
    Promise.all([
      authFetch(`/api/campaigns/${campaign.id}/join-requests`).catch(() => []),
      authFetch('/api/dm/players').catch(() => []),
    ]).then(([reqs, players]) => {
      setJoinRequests(Array.isArray(reqs) ? reqs : []);
      setAllPlayers(Array.isArray(players) ? players : []);
    }).finally(() => setLoadingReqs(false));
  }, [campaign.id]);

  const handleJoinAction = async (userId, status) => {
    setActioning(userId);
    try {
      await authFetch(`/api/campaigns/${campaign.id}/join-requests/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setJoinRequests(prev => prev.filter(r => r.userId !== userId));
      flash(`Request ${status === 'APPROVED' ? 'approved' : 'denied'}.`);
    } catch (e) {
      flash(e.message);
    } finally {
      setActioning(null);
    }
  };

  const handleAssign = async (charId) => {
    setAssigning(charId);
    try {
      await authFetch(`/api/dm/characters/${charId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      const updated = await authFetch(`/api/campaigns/${campaign.id}/characters`);
      onRosterChange(updated);
      // Refresh player list so assigned characters disappear from the picker
      const players = await authFetch('/api/dm/players').catch(() => allPlayers);
      setAllPlayers(Array.isArray(players) ? players : allPlayers);
      flash('Player assigned to campaign.');
    } catch (e) {
      flash(e.message);
    } finally {
      setAssigning(null);
    }
  };

  const handleRemove = async (charId) => {
    try {
      await authFetch(`/api/dm/characters/${charId}/unassign`, { method: 'POST' });
      onRosterChange(roster.filter(c => c.id !== charId));
      flash('Player removed from campaign.');
    } catch (e) {
      flash(e.message);
    }
  };

  const inCampaign = new Set(roster.map(c => c.id));
  const available = allPlayers.flatMap(p =>
    p.characters
      .filter(c => !inCampaign.has(c.id) && !c.campaignId)
      .map(c => ({ ...c, ownerName: p.displayName ?? p.username, ownerId: p.id }))
  );

  return (
    <div className="cm-panel">
      {/* Join requests */}
      <section className="cm-section">
        <h2 className="cm-section__title">Join Requests</h2>
        {loadingReqs && <p className="cm-empty">Loading…</p>}
        {!loadingReqs && joinRequests.length === 0 && (
          <p className="cm-empty">No pending join requests.</p>
        )}
        <div className="cm-request-list">
          {joinRequests.map(req => (
            <div key={req.userId} className="cm-request">
              <div className="cm-request__info">
                <span className="cm-request__name">{req.user?.displayName ?? req.user?.username}</span>
                {req.message && <p className="cm-request__msg">"{req.message}"</p>}
                {req.user?.characters?.length > 0 && (
                  <p className="cm-request__chars">
                    Characters: {req.user.characters.map(c => `${c.name} (${c.class} Lv ${c.level})`).join(', ')}
                  </p>
                )}
              </div>
              <div className="cm-request__actions">
                <button
                  className="btn btn--approve btn--xs"
                  onClick={() => handleJoinAction(req.userId, 'APPROVED')}
                  disabled={actioning === req.userId}
                >
                  Approve
                </button>
                <button
                  className="btn btn--danger btn--xs"
                  onClick={() => handleJoinAction(req.userId, 'DENIED')}
                  disabled={actioning === req.userId}
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Current roster */}
      <section className="cm-section">
        <h2 className="cm-section__title">Current Roster ({roster.length})</h2>
        {roster.length === 0 ? (
          <p className="cm-empty">No players assigned yet.</p>
        ) : (
          <div className="cm-char-list">
            {roster.map(c => <CharacterChip key={c.id} char={c} onRemove={handleRemove} />)}
          </div>
        )}
      </section>

      {/* Assign players */}
      {available.length > 0 && (
        <section className="cm-section">
          <h2 className="cm-section__title">Assign a Player</h2>
          <p className="cm-hint">Directly add a player's character to this campaign.</p>
          <div className="cm-char-list">
            {available.map(c => (
              <div key={c.id} className="cm-char-chip">
                <div className="cm-char-chip__info">
                  <span className="cm-char-chip__name">{c.name}</span>
                  <span className="cm-char-chip__meta">{c.class} · Lv {c.level} · {c.ownerName}</span>
                </div>
                <button
                  className="btn btn--ghost btn--xs"
                  onClick={() => handleAssign(c.id)}
                  disabled={assigning === c.id}
                >
                  {assigning === c.id ? '…' : 'Assign'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {msg && <div className="cm-flash">{msg}</div>}
    </div>
  );
}

// ── Clear Log section (shared) ────────────────────────────────────────────────

function ClearLogSection({ campaign, authFetch, onFlash }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleClear = async () => {
    setBusy(true);
    try {
      await authFetch(`/api/campaigns/${campaign.id}/posts`, { method: 'DELETE' });
      onFlash('Encounter log cleared.');
      setConfirming(false);
    } catch (e) {
      onFlash(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cm-section cm-section--danger">
      <h2 className="cm-section__title">Danger Zone</h2>
      {!confirming ? (
        <button className="btn btn--danger btn--sm" onClick={() => setConfirming(true)}>
          Clear Encounter Log
        </button>
      ) : (
        <div className="cm-confirm-row">
          <span className="cm-confirm-text">Delete all posts for this campaign? This cannot be undone.</span>
          <button className="btn btn--danger btn--sm" onClick={handleClear} disabled={busy}>
            {busy ? 'Clearing…' : 'Yes, clear it'}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)} disabled={busy}>
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const CampaignManagePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, authFetch } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState('');

  const showFlash = (text) => { setFlash(text); setTimeout(() => setFlash(''), 3500); };

  const { switchCampaign } = useGame();
  const isDm = user?.role === 'DM' || user?.role === 'SUPER_DM';

  useEffect(() => {
    if (!user || !isDm) return;
    Promise.all([
      authFetch(`/api/campaigns/${id}`),
      authFetch(`/api/campaigns/${id}/characters`),
    ]).then(([c, chars]) => {
      setCampaign(c);
      setRoster(Array.isArray(chars) ? chars : []);
    }).catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  const handlePlay = () => {
    switchCampaign(id);
    navigate('/game');
  };

  if (!user || !isDm) return null;
  if (loading) return <div className="cm-page"><p className="cm-empty">Loading…</p></div>;
  if (err || !campaign) return <div className="cm-page"><p className="cm-err">{err || 'Campaign not found.'}</p></div>;

  const canPlay = campaign.status === 'APPROVED';

  return (
    <div className="cm-page">
      <div className="cm-top-bar">
        <Link to="/campaigns" className="cm-back">← Campaigns</Link>
        <div className="cm-top-bar__actions">
          {canPlay && (
            <button className="btn btn--primary btn--sm" onClick={handlePlay}>▶ Play</button>
          )}
          <Link to={`/campaigns/${id}`} className="btn btn--ghost btn--sm">Edit</Link>
        </div>
      </div>

      <header className="cm-header">
        <div className="cm-header__row">
          <h1 className="cm-header__title">{campaign.name}</h1>
          <div className="cm-header__badges">
            {campaign.isAiGame && <Badge label="AI DM" color="#a78bfa" />}
            {campaign.isActive && <Badge label="Active" color="#4ade80" />}
            <Badge
              label={campaign.status === 'APPROVED' ? 'Approved' : campaign.status === 'DRAFT' ? 'Draft' : campaign.status.replace('_', ' ')}
              color={campaign.status === 'APPROVED' ? '#a8e6cf' : campaign.status === 'DRAFT' ? '#9aa0b8' : '#ffc857'}
            />
          </div>
        </div>
        {campaign.setting && (
          <p className="cm-header__setting">{campaign.setting.slice(0, 180)}{campaign.setting.length > 180 ? '…' : ''}</p>
        )}
      </header>

      {campaign.isAiGame ? (
        <AiRosterPanel
          campaign={campaign}
          roster={roster}
          onRosterChange={setRoster}
          authFetch={authFetch}
        />
      ) : (
        <ManualRosterPanel
          campaign={campaign}
          roster={roster}
          onRosterChange={setRoster}
          authFetch={authFetch}
        />
      )}

      <ClearLogSection campaign={campaign} authFetch={authFetch} onFlash={showFlash} />

      {flash && <div className="cm-flash">{flash}</div>}
    </div>
  );
};

export default CampaignManagePage;
