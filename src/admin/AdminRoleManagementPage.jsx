import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiAward,
  FiDownload,
  FiRefreshCw,
  FiArrowLeft,
  FiUser,
  FiShield,
  FiCheck,
  FiUsers,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import { AdminListTileRole } from './components';
import { AdminListView } from './components';

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
  admin: 'bg-rose-500',
  subadmin: 'bg-purple-500',
  seller: 'bg-emerald-500',
  user: 'bg-blue-500',
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

  const stats = [
    { icon: <FiShield className="w-6 h-6" />, value: roleCounts.admin || 0, label: 'Admins', bgColor: 'bg-rose-100', color: 'text-rose-600' },
    { icon: <FiShield className="w-6 h-6" />, value: roleCounts.subadmin || 0, label: 'Subadmins', bgColor: 'bg-purple-100', color: 'text-purple-600' },
    { icon: <FiAward className="w-6 h-6" />, value: roleCounts.seller || 0, label: 'Sellers', bgColor: 'bg-emerald-100', color: 'text-emerald-600' },
    { icon: <FiUser className="w-6 h-6" />, value: roleCounts.user || 0, label: 'Users', bgColor: 'bg-blue-100', color: 'text-blue-600' },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admins' },
    { value: 'subadmin', label: 'Subadmins' },
    { value: 'seller', label: 'Sellers' },
    { value: 'user', label: 'Users' },
  ];

  return (
    <div className="admin-role-management-page animate-fade-in pb-20">
      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <AdminListView
        title="Role Management"
        subtitle="Assign and manage user roles"
        loading={loading}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search users by name, email, or role..."
        filterOptions={filterOptions}
        selectedFilter={roleFilter}
        onFilterChange={setRoleFilter}
        onRefresh={loadData}
        refreshLabel="Refresh"
        stats={stats}
        emptyIcon={FiUsers}
        emptyMessage={searchQuery || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}
        actions={
          <button 
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            onClick={downloadPDF}
          >
            <FiDownload className="w-4 h-4" />
            Download PDF
          </button>
        }
      >
        {filteredUsers.map(user => (
          <AdminListTileRole
            key={user.docId}
            user={user}
            onChangeRole={changeRole}
            isCurrentUser={user.uid === currentUser?.uid}
            busyId={busyId}
          />
        ))}
      </AdminListView>
    </div>
  );
}
