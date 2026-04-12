import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiShield,
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiArrowLeft,
  FiMail,
  FiUser,
  FiStar,
} from 'react-icons/fi';
import jsPDF from 'jspdf';

const CACHE_KEY = 'admin-list-page-data';

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

export default function AdminListPage({ currentUser }) {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      const items = snap.docs
        .map(d => {
          const data = d.data();
          const role = data?.role || (data?.admin ? 'admin' : 'user');
          return {
            docId: d.id,
            uid: data?.uid || d.id,
            fullName: data?.fullName || data?.displayName || '',
            email: data?.email || '',
            phone: data?.phone || '',
            photoURL: data?.photoURL || '',
            role,
            admin: data?.admin || false,
          };
        })
        .filter(u => u.role === 'admin' || u.role === 'subadmin');

      items.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setAdmins(items);
      writeCache(items);
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredAdmins = admins.filter(admin => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    return (
      admin.fullName.toLowerCase().includes(query) ||
      admin.email.toLowerCase().includes(query) ||
      admin.role.toLowerCase().includes(query)
    );
  });

  function downloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(240, 147, 251);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Admin List Report', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(
      `Total Admins: ${filteredAdmins.length} (Admin: ${filteredAdmins.filter(a => a.role === 'admin').length}, Subadmin: ${filteredAdmins.filter(a => a.role === 'subadmin').length})`,
      pageWidth / 2,
      35,
      { align: 'center' }
    );

    // Table
    doc.setTextColor(0, 0, 0);
    let y = 50;
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(10, y - 5, pageWidth - 20, 8, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Name', 12, y);
    doc.text('Email', 60, y);
    doc.text('Role', 120, y);
    doc.setFont(undefined, 'normal');
    y += 8;

    filteredAdmins.forEach((admin, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(10, y - 5, pageWidth - 20, 7, 'F');
      }

      doc.text(admin.fullName.substring(0, 25), 12, y);
      doc.text(admin.email.substring(0, 30), 60, y);
      doc.text(admin.role, 120, y);
      y += 7;
    });

    doc.save(`Admin-List-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  return (
    <section className="admin-sub-page">
      <div className="admin-sub-header">
        <button className="btn btn-back" onClick={() => navigate('/admin-dashboard')}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div className="admin-sub-header-title">
          <FiShield /> Admin List
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

      <div className="admin-sub-stats">
        <div className="sub-stat">
          <FiShield className="sub-stat-icon" style={{ color: '#f093fb' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{admins.length}</span>
            <span className="sub-stat-label">Total Admins</span>
          </div>
        </div>
        <div className="sub-stat">
          <FiStar className="sub-stat-icon" style={{ color: '#f5576c' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{admins.filter(a => a.role === 'admin').length}</span>
            <span className="sub-stat-label">Admins</span>
          </div>
        </div>
        <div className="sub-stat">
          <FiUser className="sub-stat-icon" style={{ color: '#4facfe' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{admins.filter(a => a.role === 'subadmin').length}</span>
            <span className="sub-stat-label">Subadmins</span>
          </div>
        </div>
      </div>

      <div className="admin-filters">
        <div className="filter-group">
          <FiSearch className="filter-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="Search admins by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-container">
        {filteredAdmins.length === 0 ? (
          <div className="admin-empty-state">
            <FiShield className="empty-icon" />
            <p>No admins found</p>
          </div>
        ) : (
          <div className="admin-cards-grid">
            {filteredAdmins.map((admin, idx) => (
              <div key={admin.docId} className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-avatar">
                    {admin.photoURL ? (
                      <img src={admin.photoURL} alt={admin.fullName} />
                    ) : (
                      <FiUser />
                    )}
                  </div>
                  <span className={`role-badge role-${admin.role}`}>
                    {admin.role}
                  </span>
                </div>
                <div className="admin-card-body">
                  <h3 className="admin-name">{admin.fullName || 'No Name'}</h3>
                  <p className="admin-email">
                    <FiMail /> {admin.email || 'No email'}
                  </p>
                  <p className="admin-uid">
                    <small>UID: {admin.uid.substring(0, 15)}...</small>
                  </p>
                </div>
                <div className="admin-card-footer">
                  <span className="admin-index">#{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
