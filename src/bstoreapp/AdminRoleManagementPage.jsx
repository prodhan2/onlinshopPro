import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiAward,
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiArrowLeft,
  FiUser,
  FiShield,
  FiCheck,
  FiX,
  FiUsers,
} from 'react-icons/fi';
import jsPDF from 'jspdf';

const CACHE_KEY = 'admin-roles-page-data';
const ROLE_OPTIONS = ['user', 'seller', 'subadmin', 'admin'];

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

const ROLE_COLORS = {
  admin: '#f5576c',
  subadmin: '#f093fb',
  seller: '#43e97b',
  user: '#4facfe',
};

const ROLE_ICONS = {
  admin: <FiShield />,
  subadmin: <FiShield />,
  seller: <FiAward />,
  user: <FiUser />,
};

export default function AdminRoleManagementPage({ currentUser }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrMsg] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      const items = snap.docs.map(d => ({
        docId: d.id,
        uid: d.data()?.uid || d.id,
        fullName: d.data()?.fullName || d.data()?.displayName || '',
        email: d.data()?.email || '',
        phone: d.data()?.phone || '',
        photoURL: d.data()?.photoURL || '',
        role: d.data()?.role || (d.data()?.admin ? 'admin' : 'user'),
        admin: d.data()?.admin || false,
      }));

      items.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setUsers(items);
      writeCache(items);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = users.filter(user => {
    const byRole = roleFilter === 'all' || user.role === roleFilter;
    if (!byRole) return false;

    const query = searchQuery.toLowerCase();
    if (!query) return true;

    return (
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const roleCounts = users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    },
    { admin: 0, subadmin: 0, seller: 0, user: 0 }
  );

  async function changeRole(user, newRole) {
    if (user.uid === currentUser?.uid) {
      setErrMsg('You cannot change your own role.');
      setTimeout(() => setErrMsg(''), 3000);
      return;
    }

    setBusyId(user.docId);
    setSuccessMsg('');
    setErrMsg('');

    try {
      await updateDoc(doc(db, 'profiles', user.docId), {
        role: newRole,
        admin: newRole === 'admin',
      });

      setUsers(prev => prev.map(u =>
        u.docId === user.docId ? { ...u, role: newRole, admin: newRole === 'admin' } : u
      ));
      setSuccessMsg(`${user.fullName || user.email} is now ${newRole}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to update role:', err);
      setErrMsg('Failed to update role.');
      setTimeout(() => setErrMsg(''), 3000);
    } finally {
      setBusyId(null);
    }
  }

  function downloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(79, 172, 254);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Role Management Report', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(
      `Admin: ${roleCounts.admin} | Subadmin: ${roleCounts.subadmin} | Seller: ${roleCounts.seller} | User: ${roleCounts.user}`,
      pageWidth / 2,
      35,
      { align: 'center' }
    );

    // Summary
    doc.setTextColor(0, 0, 0);
    let y = 50;
    doc.setFontSize(14);
    doc.text('Role Distribution', 14, y);
    y += 8;
    doc.setFontSize(10);
    ROLE_OPTIONS.forEach(role => {
      doc.text(`${role.toUpperCase()}: ${roleCounts[role] || 0} users`, 14, y);
      y += 7;
    });
    y += 5;

    // User Roles Table
    doc.setFontSize(14);
    doc.text('User Role Assignments', 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 5, pageWidth - 20, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Name', 12, y);
    doc.text('Email', 60, y);
    doc.text('Current Role', 120, y);
    doc.setFont(undefined, 'normal');
    y += 8;

    filteredUsers.slice(0, 50).forEach((user, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(10, y - 5, pageWidth - 20, 7, 'F');
      }

      doc.text(user.fullName.substring(0, 25), 12, y);
      doc.text(user.email.substring(0, 30), 60, y);
      doc.text(user.role, 120, y);
      y += 7;
    });

    if (filteredUsers.length > 50) {
      doc.text(`... and ${filteredUsers.length - 50} more users`, 12, y + 5);
    }

    doc.save(`Role-Management-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  return (
    <section className="admin-sub-page">
      <div className="admin-sub-header">
        <button className="btn btn-back" onClick={() => navigate('/admin-dashboard')}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div className="admin-sub-header-title">
          <FiAward /> Role Management
        </div>
        <div className="admin-sub-header-actions">
          <button className="btn btn-refresh" onClick={loadData} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button className="btn btn-download" onClick={downloadPDF}>
            <FiDownload /> Download PDF
          </button>
        </div>
      </div>

      {successMsg && <div className="admin-alert admin-alert-success">{successMsg}</div>}
      {errorMsg && <div className="admin-alert admin-alert-error">{errorMsg}</div>}

      {/* Role Stats */}
      <div className="role-stats-grid">
        {ROLE_OPTIONS.map(role => (
          <div
            key={role}
            className="role-stat-card"
            style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[role]} 0%, ${ROLE_COLORS[role]}dd 100%)` }}
          >
            <div className="role-stat-icon">{ROLE_ICONS[role]}</div>
            <div className="role-stat-info">
              <span className="role-stat-value">{roleCounts[role] || 0}</span>
              <span className="role-stat-label">{role.charAt(0).toUpperCase() + role.slice(1)}s</span>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-filters">
        <div className="filter-group">
          <FiSearch className="filter-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="Search users by name, email, or role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map(role => (
            <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}s</option>
          ))}
        </select>
      </div>

      <div className="admin-table-container">
        {filteredUsers.length === 0 ? (
          <div className="admin-empty-state">
            <FiUsers className="empty-icon" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="role-users-list">
            {filteredUsers.map(user => (
              <div key={user.docId} className="role-user-card">
                <div className="role-user-header">
                  <div className="role-user-avatar">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.fullName} />
                    ) : (
                      <FiUser />
                    )}
                  </div>
                  <div className="role-user-info">
                    <h3 className="role-user-name">{user.fullName || 'No Name'}</h3>
                    <p className="role-user-email">{user.email || 'No email'}</p>
                  </div>
                  <span
                    className="role-badge-current"
                    style={{ background: ROLE_COLORS[user.role] || '#999' }}
                  >
                    {ROLE_ICONS[user.role]} {user.role}
                  </span>
                </div>

                <div className="role-actions">
                  <p className="role-actions-label">Change Role:</p>
                  <div className="role-buttons">
                    {ROLE_OPTIONS.map(role => (
                      <button
                        key={role}
                        className={`role-btn ${user.role === role ? 'active' : ''}`}
                        style={{
                          borderColor: ROLE_COLORS[role],
                          background: user.role === role ? ROLE_COLORS[role] : 'transparent',
                          color: user.role === role ? '#fff' : ROLE_COLORS[role],
                        }}
                        onClick={() => changeRole(user, role)}
                        disabled={busyId === user.docId || user.uid === currentUser?.uid}
                      >
                        {user.role === role ? <FiCheck /> : <FiX />}
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {user.uid === currentUser?.uid && (
                  <div className="role-notice">
                    <small>You cannot change your own role.</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
