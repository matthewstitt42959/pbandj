import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

function CampaignRow({ campaign, dmUsers, authFetch, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [dmId, setDmId] = useState(campaign.dm?.id ?? '');
  const [assigningDm, setAssigningDm] = useState(false);

  const handleActivate = async () => {
    setBusy(true);
    try {
      const updated = await authFetch(`/api/campaigns/${campaign.id}/activate`, { method: 'POST' });
      onUpdated(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivate = async () => {
    setBusy(true);
    try {
      const updated = await authFetch(`/api/campaigns/${campaign.id}/deactivate`, { method: 'POST' });
      onUpdated(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleAssignDm = async (newDmId) => {
    if (!newDmId) return;
    setDmId(newDmId);
    setAssigningDm(true);
    try {
      const updated = await authFetch(`/api/campaigns/${campaign.id}/assign-dm`, {
        method: 'POST',
        body: JSON.stringify({ userId: newDmId }),
      });
      onUpdated(updated);
    } catch {
      setDmId(campaign.dm?.id ?? '');
    } finally {
      setAssigningDm(false);
    }
  };

  return (
    <tr className={`admin-row ${campaign.isActive ? 'admin-row--active' : ''}`}>
      <td>
        <span className="admin-display-name">{campaign.name}</span>
        {campaign.isActive && <span className="admin-badge admin-badge--active">ACTIVE</span>}
      </td>
      <td>
        <select
          className="admin-role-select"
          value={dmId}
          disabled={assigningDm}
          onChange={e => handleAssignDm(e.target.value)}
        >
          <option value="" disabled>— Assign DM —</option>
          {dmUsers.map(u => (
            <option key={u.id} value={u.id}>{u.displayName}</option>
          ))}
        </select>
      </td>
      <td>{campaign.createdBy?.displayName}</td>
      <td className="admin-date">{new Date(campaign.createdAt).toLocaleDateString()}</td>
      <td>
        {campaign.isActive ? (
          <button className="btn btn--ghost btn--xs" onClick={handleDeactivate} disabled={busy}>
            {busy ? '...' : 'Deactivate'}
          </button>
        ) : (
          <button className="btn btn--primary btn--xs" onClick={handleActivate} disabled={busy}>
            {busy ? '...' : 'Set Active'}
          </button>
        )}
      </td>
    </tr>
  );
}

const ROLES = ['PLAYER', 'DM', 'SUPER_DM'];

const DAY_MS = 24 * 60 * 60 * 1000;
const toInputDate = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

function subscriberStatus(expiresAt) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY_MS);
  if (days < 0) return { label: 'Expired', cls: 'sub-badge--expired' };
  if (days <= 7) return { label: `${days}d left`, cls: 'sub-badge--soon' };
  return { label: 'Active', cls: 'sub-badge--active' };
}

function SubscriberRow({ sub, authFetch, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [expiresAt, setExpiresAt] = useState(toInputDate(sub.expiresAt));
  const [notes, setNotes] = useState(sub.notes ?? '');
  const [busy, setBusy] = useState(false);

  const status = subscriberStatus(sub.expiresAt);

  const handleSave = async () => {
    setBusy(true);
    try {
      const updated = await authFetch(`/api/admin/subscribers/${sub.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ expiresAt, notes }),
      });
      onUpdated(updated);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRenew = async () => {
    setBusy(true);
    try {
      const base = new Date(sub.expiresAt) > new Date() ? new Date(sub.expiresAt) : new Date();
      const newExpiry = addDays(base, 30);
      const updated = await authFetch(`/api/admin/subscribers/${sub.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ paidAt: new Date().toISOString(), expiresAt: newExpiry.toISOString() }),
      });
      onUpdated(updated);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remove subscriber record for @${sub.user.username}?`)) return;
    setBusy(true);
    try {
      await authFetch(`/api/admin/subscribers/${sub.id}`, { method: 'DELETE' });
      onDeleted(sub.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="admin-row">
      <td>
        <span className="admin-display-name">{sub.user.displayName}</span>
        <span className="admin-username">@{sub.user.username}</span>
      </td>
      <td className="admin-date">${sub.amount.toFixed(2)}</td>
      <td className="admin-date">{new Date(sub.paidAt).toLocaleDateString()}</td>
      <td>
        {editing ? (
          <input
            type="date"
            className="sub-date-input"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
          />
        ) : (
          new Date(sub.expiresAt).toLocaleDateString()
        )}
      </td>
      <td><span className={`sub-badge ${status.cls}`}>{status.label}</span></td>
      <td>
        {editing ? (
          <input
            type="text"
            className="sub-notes-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes"
          />
        ) : (
          <span className="admin-username">{sub.notes || '—'}</span>
        )}
      </td>
      <td className="sub-actions">
        {editing ? (
          <>
            <button className="btn btn--primary btn--xs" onClick={handleSave} disabled={busy}>Save</button>
            <button className="btn btn--ghost btn--xs" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
          </>
        ) : (
          <>
            <button className="btn btn--ghost btn--xs" onClick={handleRenew} disabled={busy}>+30d</button>
            <button className="btn btn--ghost btn--xs" onClick={() => setEditing(true)} disabled={busy}>Edit</button>
            <button className="btn btn--danger btn--xs" onClick={handleDelete} disabled={busy}>Remove</button>
          </>
        )}
      </td>
    </tr>
  );
}

function AddSubscriberForm({ users, authFetch, onAdded }) {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('5');
  const [paidAt, setPaidAt] = useState(toInputDate(new Date()));
  const [expiresAt, setExpiresAt] = useState(toInputDate(addDays(new Date(), 30)));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!userId) { setError('Pick a user'); return; }
    setBusy(true);
    setError('');
    try {
      const created = await authFetch('/api/admin/subscribers', {
        method: 'POST',
        body: JSON.stringify({ userId, amount, paidAt, expiresAt, notes }),
      });
      onAdded(created);
      setUserId('');
      setNotes('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sub-add-form">
      <select className="admin-role-select" value={userId} onChange={e => setUserId(e.target.value)}>
        <option value="">— Pick user —</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.displayName} (@{u.username})</option>)}
      </select>
      <input type="number" step="0.01" className="sub-amount-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5.00" />
      <label className="sub-date-label">Paid<input type="date" className="sub-date-input" value={paidAt} onChange={e => setPaidAt(e.target.value)} /></label>
      <label className="sub-date-label">Expires<input type="date" className="sub-date-input" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></label>
      <input type="text" className="sub-notes-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" />
      <button className="btn btn--primary btn--sm" onClick={handleAdd} disabled={busy}>{busy ? '...' : '+ Add Payment'}</button>
      {error && <span className="admin-error">{error}</span>}
    </div>
  );
}

function TempPasswordModal({ username, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <h3 className="admin-modal__title">Password Reset — @{username}</h3>
        <p className="admin-modal__body">Give this temporary password to the user. They should change it after logging in.</p>
        <div className="admin-modal__password">{password}</div>
        <div className="admin-modal__actions">
          <button className="btn btn--ghost btn--sm" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
          <button className="btn btn--primary btn--sm" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, currentUserId, authFetch, onUpdated }) {
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [tempPw, setTempPw] = useState(null);

  const isSelf = user.id === currentUserId;

  const handleRoleChange = async (newRole) => {
    setRole(newRole);
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      onUpdated({ ...user, role: res.user.role });
    } catch {
      setRole(user.role);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm(`Reset password for @${user.username}?`)) return;
    setResetting(true);
    try {
      const res = await authFetch(`/api/admin/users/${user.id}/password`, { method: 'PATCH' });
      setTempPw(res.tempPassword);
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <tr className={`admin-row ${isSelf ? 'admin-row--self' : ''}`}>
        <td>
          <span className="admin-display-name">{user.displayName}</span>
          <span className="admin-username">@{user.username}</span>
        </td>
        <td className="admin-email">{user.email}</td>
        <td>
          <select
            className="admin-role-select"
            value={role}
            disabled={isSelf || saving}
            onChange={e => handleRoleChange(e.target.value)}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </td>
        <td className="admin-date">{new Date(user.createdAt).toLocaleDateString()}</td>
        <td>
          <button
            className="btn btn--ghost btn--xs"
            onClick={handleResetPassword}
            disabled={resetting}
          >
            {resetting ? 'Resetting...' : 'Reset Password'}
          </button>
        </td>
      </tr>
      {tempPw && (
        <TempPasswordModal
          username={user.username}
          password={tempPw}
          onClose={() => setTempPw(null)}
        />
      )}
    </>
  );
}

const AdminPage = () => {
  const { user, authFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // AI password settings
  const [aiPasswordSet, setAiPasswordSet] = useState(false);
  const [aiPasswordInput, setAiPasswordInput] = useState('');
  const [aiPasswordMsg, setAiPasswordMsg] = useState(null);
  const [aiPasswordBusy, setAiPasswordBusy] = useState(false);

  // AI subscribers
  const [subscribers, setSubscribers] = useState([]);
  const [subscribersLoading, setSubscribersLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/admin/subscribers')
      .then(setSubscribers)
      .catch(() => {})
      .finally(() => setSubscribersLoading(false));
  }, []);

  useEffect(() => {
    authFetch('/api/admin/users')
      .then(data => setUsers(data.users))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    authFetch('/api/campaigns')
      .then(data => setCampaigns(data))
      .catch(() => {})
      .finally(() => setCampaignsLoading(false));

    authFetch('/api/admin/settings/ai-password')
      .then(data => setAiPasswordSet(data.isSet))
      .catch(() => {});
  }, []);

  const flashAi = (text, ok) => {
    setAiPasswordMsg({ text, ok });
    setTimeout(() => setAiPasswordMsg(null), 3500);
  };

  const handleSetAiPassword = async () => {
    if (!aiPasswordInput.trim()) return;
    setAiPasswordBusy(true);
    try {
      await authFetch('/api/admin/settings/ai-password', {
        method: 'POST',
        body: JSON.stringify({ password: aiPasswordInput.trim() }),
      });
      setAiPasswordSet(true);
      setAiPasswordInput('');
      flashAi('AI access code set', true);
    } catch (err) {
      flashAi(err.message, false);
    } finally {
      setAiPasswordBusy(false);
    }
  };

  const handleClearAiPassword = async () => {
    if (!window.confirm('Remove the AI access code? Anyone will be able to use the AI DM.')) return;
    setAiPasswordBusy(true);
    try {
      await authFetch('/api/admin/settings/ai-password', { method: 'DELETE' });
      setAiPasswordSet(false);
      flashAi('AI access code removed — AI is now open', true);
    } catch (err) {
      flashAi(err.message, false);
    } finally {
      setAiPasswordBusy(false);
    }
  };

  const handleCampaignUpdated = (updated) => {
    setCampaigns(prev => prev.map(c => {
      if (updated.isActive) return { ...c, isActive: c.id === updated.id };
      return c.id === updated.id ? updated : c;
    }));
  };

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'SUPER_DM') return <Navigate to="/dashboard" />;

  const counts = { PLAYER: 0, DM: 0, SUPER_DM: 0 };
  users.forEach(u => { counts[u.role] = (counts[u.role] ?? 0) + 1; });
  const dmUsers = users.filter(u => u.role === 'DM' || u.role === 'SUPER_DM');

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-header__title">Admin — User Management</h1>
        <div className="admin-stats">
          {Object.entries(counts).map(([role, n]) => (
            <span key={role} className="admin-stat">{n} {role}</span>
          ))}
        </div>
      </header>

      {error && <p className="admin-error">{error}</p>}

      {loading ? (
        <p className="admin-loading">Loading users...</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <UserRow
                  key={u.id}
                  user={u}
                  currentUserId={user.id}
                  authFetch={authFetch}
                  onUpdated={updated => setUsers(prev => prev.map(x => x.id === updated.id ? updated : x))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="admin-section">
        <h2 className="admin-section__title">Campaign Management</h2>
        <p className="admin-section__desc">Set which approved campaign is active on the Game Board.</p>
        {campaignsLoading ? (
          <p className="admin-loading">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <p className="admin-loading">No campaigns yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>DM</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <CampaignRow
                    key={c.id}
                    campaign={c}
                    dmUsers={dmUsers}
                    authFetch={authFetch}
                    onUpdated={handleCampaignUpdated}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">AI DM Settings</h2>
        <p className="admin-section__desc">
          Set an access code to restrict who can use the AI Dungeon Master. Leave unset to allow open access.
        </p>
        <div className="ai-pw-status">
          <span className={`ai-pw-badge ${aiPasswordSet ? 'ai-pw-badge--locked' : 'ai-pw-badge--open'}`}>
            {aiPasswordSet ? 'Locked — access code required' : 'Open — no access code set'}
          </span>
        </div>
        <div className="ai-pw-form">
          <input
            className="ai-pw-input"
            type="password"
            placeholder="New access code"
            value={aiPasswordInput}
            onChange={e => setAiPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetAiPassword()}
            disabled={aiPasswordBusy}
          />
          <button
            className="btn btn--primary btn--sm"
            onClick={handleSetAiPassword}
            disabled={aiPasswordBusy || !aiPasswordInput.trim()}
          >
            {aiPasswordBusy ? '...' : aiPasswordSet ? 'Update Code' : 'Set Code'}
          </button>
          {aiPasswordSet && (
            <button
              className="btn btn--ghost btn--sm ai-pw-clear"
              onClick={handleClearAiPassword}
              disabled={aiPasswordBusy}
            >
              Clear (Open Access)
            </button>
          )}
        </div>
        {aiPasswordMsg && (
          <p className={`ai-pw-msg ${aiPasswordMsg.ok ? 'ai-pw-msg--ok' : 'ai-pw-msg--err'}`}>
            {aiPasswordMsg.text}
          </p>
        )}
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">AI Subscribers</h2>
        <p className="admin-section__desc">
          Track who's paid for AI DM access and when they're due to renew. This is record-keeping only — it doesn't change the shared access code above.
        </p>
        <AddSubscriberForm
          users={users}
          authFetch={authFetch}
          onAdded={created => setSubscribers(prev => [...prev, created].sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt)))}
        />
        {subscribersLoading ? (
          <p className="admin-loading">Loading subscribers...</p>
        ) : subscribers.length === 0 ? (
          <p className="admin-loading">No subscribers tracked yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map(sub => (
                  <SubscriberRow
                    key={sub.id}
                    sub={sub}
                    authFetch={authFetch}
                    onUpdated={updated => setSubscribers(prev => prev.map(s => s.id === updated.id ? updated : s))}
                    onDeleted={id => setSubscribers(prev => prev.filter(s => s.id !== id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminPage;
