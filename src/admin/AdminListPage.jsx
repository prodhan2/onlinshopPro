import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiShield,
  FiDownload,
  FiRefreshCw,
  FiArrowLeft,
  FiMail,
  FiUser,
  FiStar,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import { AdminListTileAdmin } from './components';
import { AdminListView } from './components';

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

  const stats = [
    { icon: <FiShield className="w-6 h-6" />, value: admins.length, label: 'Total Admins', bgColor: 'bg-purple-100', color: 'text-purple-600' },
    { icon: <FiStar className="w-6 h-6" />, value: admins.filter(a => a.role === 'admin').length, label: 'Admins', bgColor: 'bg-rose-100', color: 'text-rose-600' },
    { icon: <FiUser className="w-6 h-6" />, value: admins.filter(a => a.role === 'subadmin').length, label: 'Subadmins', bgColor: 'bg-blue-100', color: 'text-blue-600' },
    { icon: <FiShield className="w-6 h-6" />, value: filteredAdmins.length, label: 'Filtered', bgColor: 'bg-indigo-100', color: 'text-indigo-600' },
  ];

  return (
    <div className="admin-list-page animate-fade-in pb-20">
      <AdminListView
        title="Admin List"
        subtitle="View all administrators"
        loading={loading}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search admins by name or email..."
        onRefresh={loadData}
        refreshLabel="Refresh"
        stats={stats}
        emptyIcon={FiShield}
        emptyMessage={searchQuery ? 'No admins match your search' : 'No admins found'}
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
        {filteredAdmins.map((admin, idx) => (
          <AdminListTileAdmin
            key={admin.docId}
            admin={admin}
            index={idx}
          />
        ))}
      </AdminListView>
    </div>
  );
}
