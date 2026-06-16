import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import './CampaignListPage.css';

const STATUS_META = {
  DRAFT:          { label: 'Draft',          color: '#9aa0b8' },
  PENDING_REVIEW: { label: 'Pending Review', color: '#ffc857' },
  APPROVED:       { label: 'Approved',       color: '#a8e6cf' },
  REJECTED:       { label: 'Rejected',       color: '#ff8a80' },
  ARCHIVED:       { label: 'Archived',       color: '#6a7088' },
};

function StatusBadge({ status }) {
  const s = STATUS_META[status] ?? STATUS_META.DRAFT;
  return <span className="cl-badge" style={{ color: s.color, borderColor: s.color + '44' }}>{s.label}</span>;
}

function AiBadge() {
  return <span className="cl-badge cl-badge--ai">AI DM</span>;
}

function ActiveBadge() {
  return <span className="cl-badge cl-badge--active">Active</span>;
}

// ── Player browse view ─────────────────────────────────────────────────────

function BrowseCard({ campaign, onJoin, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showMsg, setShowMsg] = useState(false);

  const flash = (text, ok) => { setMsg({ text, ok }); setShowMsg(true); setTimeout(() => setShowMsg(false), 3500); };

  const handleJoin = async () => {
    setBusy(true);
    const msgText = document.getElementById(`join-msg-${campaign.id}`)?.value?.trim() || '';
    try {
      await onJoin(campaign.id, msgText);
      flash('Request sent! The DM will review it.', true);
    } catch (e) {
      flash(e.message, false);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await onCancel(campaign.id);
      flash('Request cancelled.', true);
    } catch (e) {
      flash(e.message, false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`cl-browse-card ${campaign.isMember ? 'cl-browse-card--member' : ''}`}>
      <div className="cl-browse-card__header">
        <span className="cl-browse-card__name">{campaign.name}</span>
        <div className="cl-browse-card__badges">
          {campaign.isAiGame && <AiBadge />}
          <ActiveBadge />
          {campaign.isMember && <span className="cl-badge cl-badge--member">Joined</span>}
        </div>
      </div>
      {campaign.dm && (
        <p className="cl-browse-card__dm">DM: {campaign.dm.displayName}</p>
      )}
      {campaign.setting && (
        <p className="cl-browse-card__setting">{campaign.setting.slice(0, 140)}{campaign.setting.length > 140 ? '…' : ''}</p>
      )}
      <div className="cl-browse-card__footer">
        <span className="cl-browse-card__players">{campaign._count?.characters ?? 0} player{campaign._count?.characters !== 1 ? 's' : ''}</span>
        {!campaign.isMember && campaign.joinStatus === null && (
          <div className="cl-browse-card__join">
            <input
              id={`join-msg-${campaign.id}`}
              className="cl-join-msg"
              type="text"
              placeholder="Say hi to the DM (optional)"
              maxLength={200}
            />
            <button className="btn btn--primary btn--sm" onClick={handleJoin} disabled={busy}>
              {busy ? '…' : 'Ask to Join'}
            </button>
          </div>
        )}
        {!campaign.isMember && campaign.joinStatus === 'PENDING' && (
          <div className="cl-browse-card__join">
            <span className="cl-join-pending">Request pending…</span>
            <button className="btn btn--ghost btn--xs" onClick={handleCancel} disabled={busy}>Cancel</button>
          </div>
        )}
        {!campaign.isMember && campaign.joinStatus === 'APPROVED' && (
          <span className="cl-join-approved">Approved — waiting for character assignment</span>
        )}
        {!campaign.isMember && campaign.joinStatus === 'DENIED' && (
          <div className="cl-browse-card__join">
            <span className="cl-join-denied">Request denied</span>
            <button className="btn btn--ghost btn--xs" onClick={handleJoin} disabled={busy}>Ask Again</button>
          </div>
        )}
        {campaign.isMember && (
          <Link to="/game" className="btn btn--primary btn--sm">Play</Link>
        )}
      </div>
      {showMsg && msg && (
        <p className={`cl-browse-msg ${msg.ok ? 'cl-browse-msg--ok' : 'cl-browse-msg--err'}`}>{msg.text}</p>
      )}
    </div>
  );
}

// ── DM approval modal ──────────────────────────────────────────────────────

function ApprovalModal({ campaign, onClose, onDone, authFetch }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const act = async (action) => {
    if (action === 'reject' && !note.trim()) { setErr('Rejection note is required'); return; }
    setBusy(true);
    setErr('');
    try {
      await authFetch(`/api/campaigns/${campaign.id}/${action}`, {
        method: 'POST',
        body: action === 'reject' ? JSON.stringify({ note }) : undefined,
      });
      onDone(action);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="cl-modal-backdrop" onClick={onClose}>
      <div className="cl-modal" onClick={e => e.stopPropagation()}>
        <h2 className="cl-modal__title">Review: {campaign.name}</h2>
        <StatusBadge status={campaign.status} />
        {campaign.isAiGame && <AiBadge />}

        <div className="cl-modal__section">
          <h3 className="cl-modal__h3">Setting</h3>
          <p className="cl-modal__text">{campaign.setting || <em className="cl-empty">Not provided</em>}</p>
        </div>
        <div className="cl-modal__section">
          <h3 className="cl-modal__h3">Opening Scene</h3>
          <p className="cl-modal__text">{campaign.openingScene || <em className="cl-empty">Not provided</em>}</p>
        </div>
        {Array.isArray(campaign.hooks) && campaign.hooks.length > 0 && (
          <div className="cl-modal__section">
            <h3 className="cl-modal__h3">Adventure Hooks</h3>
            <ol className="cl-modal__list">{campaign.hooks.map((h, i) => <li key={i}>{h}</li>)}</ol>
          </div>
        )}
        {Array.isArray(campaign.npcs) && campaign.npcs.length > 0 && (
          <div className="cl-modal__section">
            <h3 className="cl-modal__h3">Key NPCs</h3>
            <ul className="cl-modal__list">
              {campaign.npcs.map((n, i) => (
                <li key={i}><strong>{n.name}</strong>{n.description ? ` — ${n.description}` : ''}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="cl-modal__section">
          <h3 className="cl-modal__h3">DM Notes</h3>
          <p className="cl-modal__text">{campaign.dmNotes || <em className="cl-empty">None</em>}</p>
        </div>
        {campaign.rejectedNote && (
          <div className="cl-modal__rejected-note">
            <strong>Previous rejection:</strong> {campaign.rejectedNote}
          </div>
        )}
        {campaign.status === 'PENDING_REVIEW' && (
          <div className="cl-modal__actions">
            <div className="cl-modal__reject-group">
              <input
                className="cl-modal__note-input"
                placeholder="Rejection note (required if rejecting)..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
              <button className="btn btn--danger btn--sm" onClick={() => act('reject')} disabled={busy}>Reject</button>
            </div>
            {err && <p className="cl-modal__err">{err}</p>}
            <button className="btn btn--approve btn--sm" onClick={() => act('approve')} disabled={busy}>
              {busy ? 'Processing...' : 'Approve Campaign'}
            </button>
          </div>
        )}
        <button className="cl-modal__close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ── DM campaign row ────────────────────────────────────────────────────────

function CampaignRow({ campaign, user, isSuperDm, onReview, onPlay }) {
  const canEdit = ['DRAFT', 'REJECTED'].includes(campaign.status) || isSuperDm;
  const isPending = campaign.status === 'PENDING_REVIEW';
  const isOwn = campaign.createdBy?.id === user.id;
  const canPlay = campaign.status === 'APPROVED';

  return (
    <div className="cl-campaign-row">
      <div className="cl-campaign-row__main">
        <span className="cl-campaign-row__name">{campaign.name}</span>
        {!isOwn && campaign.createdBy && (
          <span className="cl-campaign-row__author">by @{campaign.createdBy.username}</span>
        )}
        <StatusBadge status={campaign.status} />
        {campaign.isAiGame && <AiBadge />}
        {campaign.isActive && <ActiveBadge />}
      </div>
      <div className="cl-campaign-row__meta">
        {campaign.setting && (
          <p className="cl-campaign-row__setting">{campaign.setting.slice(0, 100)}{campaign.setting.length > 100 ? '…' : ''}</p>
        )}
      </div>
      <div className="cl-campaign-row__actions">
        {canPlay && (
          <button className="btn btn--primary btn--xs" onClick={() => onPlay(campaign.id)}>Play</button>
        )}
        {canPlay && isOwn && (
          <Link to={`/campaigns/${campaign.id}/manage`} className="btn btn--ghost btn--xs">Manage</Link>
        )}
        {canEdit && (
          <Link to={`/campaigns/${campaign.id}`} className="btn btn--ghost btn--xs">Edit</Link>
        )}
        {isSuperDm && isPending && (
          <button className="btn btn--review btn--xs" onClick={onReview}>Review</button>
        )}
        {isSuperDm && !isPending && (
          <button className="btn btn--ghost btn--xs" onClick={onReview}>View</button>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

const CampaignListPage = () => {
  const { user, authFetch } = useAuth();
  const { switchCampaign } = useGame();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [browseCampaigns, setBrowseCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [reviewing, setReviewing] = useState(null);

  const isDm = user?.role === 'DM' || user?.role === 'SUPER_DM';
  const isSuperDm = user?.role === 'SUPER_DM';

  useEffect(() => {
    if (!user) return;
    if (isDm) {
      authFetch('/api/campaigns')
        .then(data => setCampaigns(Array.isArray(data) ? data : []))
        .catch(e => setErr(e.message))
        .finally(() => setLoading(false));
    } else {
      // Players see the public browse view
      authFetch('/api/campaigns/browse')
        .then(data => { setBrowseCampaigns(Array.isArray(data) ? data : []); setLoading(false); })
        .catch(e => { setErr(e.message); setLoading(false); });
    }
  }, [user?.role]);

  const handlePlay = (campaignId) => {
    switchCampaign(campaignId);
    navigate('/game');
  };

  const handleReviewDone = (action) => {
    setCampaigns(prev => prev.map(c =>
      c.id === reviewing.id ? { ...c, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : c
    ));
    setReviewing(null);
  };

  const handleJoinRequest = async (campaignId, message) => {
    await authFetch(`/api/campaigns/${campaignId}/join-request`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    setBrowseCampaigns(prev => prev.map(c =>
      c.id === campaignId ? { ...c, joinStatus: 'PENDING' } : c
    ));
  };

  const handleCancelRequest = async (campaignId) => {
    await authFetch(`/api/campaigns/${campaignId}/join-request`, { method: 'DELETE' });
    setBrowseCampaigns(prev => prev.map(c =>
      c.id === campaignId ? { ...c, joinStatus: null } : c
    ));
  };

  if (!user) return <Navigate to="/login" />;

  // ── Player browse view ───────────────────────────────────────────────────
  if (!isDm) {
    return (
      <div className="cl-page">
        <header className="cl-header">
          <h1 className="cl-header__title">Active Campaigns</h1>
          <p className="cl-header__sub">Ask to join a campaign. The DM will review your request and assign you a character slot.</p>
        </header>
        {loading && <p className="cl-loading">Loading campaigns…</p>}
        {err && <p className="cl-err">{err}</p>}
        {!loading && browseCampaigns.length === 0 && (
          <p className="cl-loading">No active campaigns right now. Check back later.</p>
        )}
        <div className="cl-browse-grid">
          {browseCampaigns.map(c => (
            <BrowseCard
              key={c.id}
              campaign={c}
              onJoin={handleJoinRequest}
              onCancel={handleCancelRequest}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── DM / SuperDM management view ─────────────────────────────────────────
  const pending = campaigns.filter(c => c.status === 'PENDING_REVIEW');
  const mine = campaigns.filter(c => c.createdBy?.id === user.id && c.status !== 'PENDING_REVIEW');
  const others = campaigns.filter(c => c.createdBy?.id !== user.id && c.status !== 'PENDING_REVIEW');

  return (
    <div className="cl-page">
      <div className="cl-top-bar">
        <Link to="/dm" className="cs-back-link">← DM Panel</Link>
        <Link to="/campaigns/new" className="btn btn--primary btn--sm">+ New Campaign</Link>
      </div>
      <header className="cl-header">
        <h1 className="cl-header__title">Campaigns</h1>
        <p className="cl-header__sub">
          {isSuperDm ? 'All campaigns — review and approve submissions.' : 'Your campaigns.'}
        </p>
      </header>
      {loading && <p className="cl-loading">Loading campaigns...</p>}
      {err && <p className="cl-err">{err}</p>}

      {isSuperDm && pending.length > 0 && (
        <section className="cl-section">
          <h2 className="cl-section__title">Awaiting Review</h2>
          <div className="cl-campaign-list">
            {pending.map(c => (
              <CampaignRow key={c.id} campaign={c} user={user} isSuperDm={isSuperDm} onReview={() => setReviewing(c)} onPlay={handlePlay} />
            ))}
          </div>
        </section>
      )}
      {mine.length > 0 && (
        <section className="cl-section">
          <h2 className="cl-section__title">My Campaigns</h2>
          <div className="cl-campaign-list">
            {mine.map(c => (
              <CampaignRow key={c.id} campaign={c} user={user} isSuperDm={isSuperDm} onReview={() => setReviewing(c)} onPlay={handlePlay} />
            ))}
          </div>
        </section>
      )}
      {isSuperDm && others.length > 0 && (
        <section className="cl-section">
          <h2 className="cl-section__title">Other Campaigns</h2>
          <div className="cl-campaign-list">
            {others.map(c => (
              <CampaignRow key={c.id} campaign={c} user={user} isSuperDm={isSuperDm} onReview={() => setReviewing(c)} onPlay={handlePlay} />
            ))}
          </div>
        </section>
      )}
      {!loading && campaigns.length === 0 && (
        <div className="cl-empty-state">
          <p>No campaigns yet.</p>
          <Link to="/campaigns/new" className="btn btn--primary btn--sm">Create your first campaign</Link>
        </div>
      )}

      {reviewing && (
        <ApprovalModal campaign={reviewing} onClose={() => setReviewing(null)} onDone={handleReviewDone} authFetch={authFetch} />
      )}
    </div>
  );
};

export default CampaignListPage;
