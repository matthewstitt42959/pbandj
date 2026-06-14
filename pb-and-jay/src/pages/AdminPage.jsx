import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

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

  useEffect(() => {
    authFetch('/api/admin/users')
      .then(data => setUsers(data.users))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'SUPER_DM') return <Navigate to="/dashboard" />;

  const counts = { PLAYER: 0, DM: 0, SUPER_DM: 0 };
  users.forEach(u => { counts[u.role] = (counts[u.role] ?? 0) + 1; });

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
    </div>
  );
};

export default AdminPage;
