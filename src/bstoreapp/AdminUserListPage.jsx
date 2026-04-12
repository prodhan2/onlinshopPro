import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiUsers,
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiArrowLeft,
  FiMail,
  FiUser,
} from 'react-icons/fi';
import jsPDF from 'jspdf';

const CACHE_KEY = 'admin-users-page-data';

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

export default function AdminUserListPage({ currentUser }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

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
        bloodGroup: d.data()?.bloodGroup || '',
        village: d.data()?.village || '',
        upazilla: d.data()?.upazilla || '',
        zilla: d.data()?.zilla || '',
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
      user.uid.toLowerCase().includes(query) ||
      user.phone.toLowerCase().includes(query)
    );
  });

  function downloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('User List Report', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Total Users: ${filteredUsers.length}`, pageWidth / 2, 35, { align: 'center' });

    // Table Header
    doc.setTextColor(0, 0, 0);
    let y = 50;
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 5, pageWidth - 20, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Name', 12, y);
    doc.text('Email', 60, y);
    doc.text('Phone', 110, y);
    doc.text('Role', 150, y);
    doc.setFont(undefined, 'normal');
    y += 8;

    // Table Rows
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
      doc.text(user.email.substring(0, 25), 60, y);
      doc.text(user.phone.substring(0, 18), 110, y);
      doc.text(user.role, 150, y);
      y += 7;
    });

    if (filteredUsers.length > 50) {
      doc.text(`... and ${filteredUsers.length - 50} more users`, 12, y + 5);
    }

    doc.save(`User-List-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  return (
    <section className="admin-sub-page">
      {/* Header */}
      <div className="admin-sub-header">
        <button className="btn btn-back" onClick={() => navigate('/admin-dashboard')}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div className="admin-sub-header-title">
          <FiUsers /> User List
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

      {/* Stats */}
      <div className="admin-sub-stats">
        <div className="sub-stat">
          <FiUsers className="sub-stat-icon" />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{users.length}</span>
            <span className="sub-stat-label">Total Users</span>
          </div>
        </div>
        <div className="sub-stat">
          <span className="sub-stat-value">{filteredUsers.length}</span>
          <span className="sub-stat-label">Filtered Results</span>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="filter-group">
          <FiSearch className="filter-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by name, email, phone, or UID..."
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
          <option value="admin">Admins</option>
          <option value="subadmin">Subadmins</option>
          <option value="seller">Sellers</option>
          <option value="user">Users</option>
        </select>
      </div>

      {/* User List */}
      <div className="admin-table-container">
        {filteredUsers.length === 0 ? (
          <div className="admin-empty-state">
            <FiUsers className="empty-icon" />
            <p>No users found</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => (
                <tr key={user.docId}>
                  <td>{idx + 1}</td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.fullName} />
                        ) : (
                          <FiUser />
                        )}
                      </div>
                      <span className="user-name">{user.fullName || 'No Name'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="email-cell">
                      <FiMail className="email-icon" />
                      {user.email || '-'}
                    </div>
                  </td>
                  <td>{user.phone || '-'}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.village || user.upazilla || user.zilla
                      ? `${user.village || ''}, ${user.upazilla || ''}, ${user.zilla || ''}`.replace(/^, |, $/g, '')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
