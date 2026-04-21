import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiUsers,
  FiDownload,
  FiRefreshCw,
  FiMail,
  FiPhone,
  FiMapPin,
  FiShield,
  FiAward,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import { AdminListTileUser, UserDetailModal } from './components';
import { AdminListView } from './components';

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
  const [selectedUser, setSelectedUser] = useState(null);

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

    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('User List Report', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Total Users: ${filteredUsers.length}`, pageWidth / 2, 35, { align: 'center' });

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

  const stats = [
    { icon: <FiUsers className="w-6 h-6" />, value: users.length, label: 'Total Users', bgColor: 'bg-indigo-100', color: 'text-indigo-600' },
    { icon: <FiShield className="w-6 h-6" />, value: users.filter(u => u.role === 'admin').length, label: 'Admins', bgColor: 'bg-rose-100', color: 'text-rose-600' },
    { icon: <FiAward className="w-6 h-6" />, value: users.filter(u => u.role === 'seller').length, label: 'Sellers', bgColor: 'bg-emerald-100', color: 'text-emerald-600' },
    { icon: <FiUsers className="w-6 h-6" />, value: filteredUsers.length, label: 'Filtered', bgColor: 'bg-blue-100', color: 'text-blue-600' },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admins' },
    { value: 'subadmin', label: 'Subadmins' },
    { value: 'seller', label: 'Sellers' },
    { value: 'user', label: 'Users' },
  ];

  return (
    <div className="admin-user-list-page animate-fade-in pb-20">
      <AdminListView
        title="User Management"
        subtitle="Manage all registered users and their roles"
        loading={loading}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, email, phone, or UID..."
        filterOptions={filterOptions}
        selectedFilter={roleFilter}
        onFilterChange={setRoleFilter}
        onRefresh={loadData}
        refreshLabel="Refresh"
        stats={stats}
        emptyIcon={FiUsers}
        emptyMessage={searchQuery || roleFilter !== 'all' ? 'No users match your search' : 'No users found'}
        actions={
          <button 
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            onClick={downloadPDF}
          >
            <FiDownload className="w-4 h-4" />
            Export PDF
          </button>
        }
      >
        {filteredUsers.map(user => (
          <AdminListTileUser
            key={user.docId}
            user={user}
            onClick={() => setSelectedUser(user)}
          />
        ))}
      </AdminListView>

      <UserDetailModal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  );
}
