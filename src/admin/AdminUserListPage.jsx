import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiUsers,
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiMail,
  FiUser,
  FiFilter,
  FiMapPin,
  FiPhone,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import './admin.css';

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
    doc.setFillColor(99, 102, 241);
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

    doc.save(`User-List-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  return (
    <div className="admin-user-list-page animate-fade-in">
      {/* Page Header */}
      <div className="card-header-flex mb-4">
        <div>
          <h2 className="admin-page-title" style={{ background: 'none', webkitTextFillColor: 'initial', color: 'var(--admin-text-main)' }}>
            User Management
          </h2>
          <p className="admin-text-muted">Manage all registered users and their roles.</p>
        </div>
        <div className="admin-header-actions">
          <button className="btn-modern btn-primary-modern" onClick={loadData} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh List'}
          </button>
          <button className="btn-modern" style={{ background: 'white', border: '1px solid #e2e8f0' }} onClick={downloadPDF}>
            <FiDownload /> Export PDF
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-row mb-4">
        <div className="stat-box">
          <div className="stat-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <FiUsers />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-val">{users.length}</span>
            <span className="stat-lab">Total Registered</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <FiFilter />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-val">{filteredUsers.length}</span>
            <span className="stat-lab">Filtered Results</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="admin-card-modern mb-4">
        <div className="row g-3">
          <div className="col-12 col-md-8">
            <div className="filter-group mb-0" style={{ minWidth: '100%' }}>
              <FiSearch className="filter-icon" />
              <input
                type="text"
                className="filter-input admin-input"
                placeholder="Search by name, email, phone, or UID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="filter-group mb-0" style={{ minWidth: '100%' }}>
              <FiFilter className="filter-icon" />
              <select
                className="filter-select admin-input"
                style={{ paddingLeft: '3rem' }}
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
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-card-modern" style={{ padding: '0.5rem' }}>
        {filteredUsers.length === 0 ? (
          <div className="admin-empty-state">
            <FiUsers className="empty-icon" />
            <p className="h5">No users found</p>
            <p className="admin-text-muted">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table-modern">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Contact Information</th>
                  <th>System Role</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.docId}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{ width: '40px', height: '40px' }}>
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.fullName} />
                          ) : (
                            <span>{user.fullName?.[0] || 'U'}</span>
                          )}
                        </div>
                        <div className="d-flex flex-column">
                          <span className="user-name">{user.fullName || 'No Name'}</span>
                          <small className="admin-text-muted" style={{ fontSize: '0.7rem' }}>UID: {user.uid.substring(0, 10)}...</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-1">
                        <div className="email-cell" style={{ fontSize: '0.85rem' }}>
                          <FiMail className="email-icon" />
                          {user.email || 'N/A'}
                        </div>
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                          <FiPhone size={12} />
                          {user.phone || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge role-${user.role}`} style={{ fontSize: '0.65rem' }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-start gap-2" style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', maxWidth: '200px' }}>
                        <FiMapPin size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>
                          {user.village || user.upazilla || user.zilla
                            ? `${user.village || ''}, ${user.upazilla || ''}, ${user.zilla || ''}`.replace(/^, |, $/g, '').replace(/, , /g, ', ')
                            : 'Location not set'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
