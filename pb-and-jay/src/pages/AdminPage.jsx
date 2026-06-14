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

  useEffect(() => {
    authFetch('/api/admin/users')
      .then(data => setUsers(data.users))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    authFetch('/api/campaigns')
      .then(data => setCampaigns(data))
      .catch(() => {})
      .finally(() => setCampaignsLoading(false));
  }, []);

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
    </div>
  );
};

export default AdminPage;
