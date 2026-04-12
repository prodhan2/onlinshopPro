import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiUsers,
  FiShield,
  FiAward,
  FiShoppingBag,
  FiBarChart2,
  FiDownload,
  FiRefreshCw,
  FiTrendingUp,
  FiDollarSign,
  FiPackage,
} from 'react-icons/fi';
import jsPDF from 'jspdf';

// Cache helpers
const CACHE_KEYS = {
  profiles: 'admin-dashboard-profiles',
  products: 'admin-dashboard-products',
  orders: 'admin-dashboard-orders',
};

function readCache(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

export default function AdminDashboardHome({ currentUser }) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(() => readCache(CACHE_KEYS.profiles, []));
  const [products, setProducts] = useState(() => readCache(CACHE_KEYS.products, []));
  const [orders, setOrders] = useState(() => readCache(CACHE_KEYS.orders, []));
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const stats = useMemo(() => {
    const roleCounts = profiles.reduce(
      (acc, item) => {
        const role = item.role || 'user';
        acc.total += 1;
        if (acc[role] !== undefined) acc[role] += 1;
        return acc;
      },
      { total: 0, admin: 0, subadmin: 0, seller: 0, user: 0 }
    );

    const totalRevenue = orders
      .filter(o => o.status === 'confirmed' || o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;

    return { roleCounts, totalRevenue, pendingOrders, processingOrders };
  }, [profiles, orders]);

  async function loadData() {
    setLoading(true);
    try {
      const [profileSnap, productSnap, orderSnap] = await Promise.all([
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders')),
      ]);

      const profileItems = profileSnap.docs.map(d => ({
        docId: d.id,
        uid: d.data()?.uid || d.id,
        fullName: d.data()?.fullName || d.data()?.displayName || '',
        email: d.data()?.email || '',
        photoURL: d.data()?.photoURL || '',
        role: d.data()?.role || (d.data()?.admin ? 'admin' : 'user'),
        admin: d.data()?.admin || false,
      }));

      const productItems = productSnap.docs.map(d => ({
        docId: d.id,
        id: d.data()?.id || d.id,
        name: d.data()?.name || 'Unnamed',
        price: Number(d.data()?.price || 0),
        createdByUid: d.data()?.createdBy?.uid || '',
      }));

      const orderItems = orderSnap.docs.map(d => ({
        docId: d.id,
        userUid: d.data()?.userUid || '',
        userName: d.data()?.userName || '',
        userPhone: d.data()?.userPhone || '',
        totalPrice: Number(d.data()?.totalPrice || 0),
        status: d.data()?.status || 'pending',
        createdAt: d.data()?.createdAt || null,
        items: Array.isArray(d.data()?.items) ? d.data().items : [],
      }));

      setProfiles(profileItems);
      setProducts(productItems);
      setOrders(orderItems);
      setLastUpdated(new Date());

      writeCache(CACHE_KEYS.profiles, profileItems);
      writeCache(CACHE_KEYS.products, productItems);
      writeCache(CACHE_KEYS.orders, orderItems);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function downloadDashboardPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Admin Dashboard Report', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text('Beautiful Dinajpur', pageWidth / 2, 35, { align: 'center' });

    // Content
    doc.setTextColor(0, 0, 0);
    let y = 55;

    doc.setFontSize(16);
    doc.text('Overview Statistics', 14, y);
    y += 10;

    doc.setFontSize(11);
    const lines = [
      `Total Users: ${stats.roleCounts.total}`,
      `Admins: ${stats.roleCounts.admin}`,
      `Subadmins: ${stats.roleCounts.subadmin}`,
      `Sellers: ${stats.roleCounts.seller}`,
      `Regular Users: ${stats.roleCounts.user}`,
      `Total Products: ${products.length}`,
      `Total Orders: ${orders.length}`,
      `Total Revenue: ৳${stats.totalRevenue.toLocaleString()}`,
      `Pending Orders: ${stats.pendingOrders}`,
      `Processing Orders: ${stats.processingOrders}`,
    ];

    lines.forEach(line => {
      doc.text(line, 14, y);
      y += 8;
    });

    doc.save(`Admin-Dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  const navCards = [
    {
      title: 'User List',
      subtitle: 'View and manage all users',
      icon: FiUsers,
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      route: '/admin-users',
      badge: stats.roleCounts.total,
    },
    {
      title: 'Admin List',
      subtitle: 'Manage admin and subadmin users',
      icon: FiShield,
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      route: '/admin-list',
      badge: stats.roleCounts.admin + stats.roleCounts.subadmin,
    },
    {
      title: 'Role Management',
      subtitle: 'Assign and update user roles',
      icon: FiAward,
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      route: '/admin-roles',
      badge: 'Manage',
    },
    {
      title: 'Seller Overview',
      subtitle: 'Track sellers and their sales',
      icon: FiAward,
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      route: '/admin-sellers',
      badge: stats.roleCounts.seller,
    },
    {
      title: 'Order Status',
      subtitle: 'Monitor and manage all orders',
      icon: FiShoppingBag,
      color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      route: '/admin-orders',
      badge: orders.length,
    },
    {
      title: 'Analytics',
      subtitle: 'Revenue and performance metrics',
      icon: FiBarChart2,
      color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      route: '/admin-analytics',
      badge: '৳' + stats.totalRevenue.toLocaleString(),
    },
  ];

  return (
    <section className="admin-dashboard-home">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1 className="admin-title">
              <FiBarChart2 className="admin-title-icon" />
              Admin Dashboard
            </h1>
            <p className="admin-subtitle">Manage your store with powerful admin tools</p>
          </div>
          <div className="admin-header-actions">
            <span className="admin-last-updated">
              {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
            </span>
            <button className="btn btn-refresh" onClick={loadData} disabled={loading}>
              <FiRefreshCw className={loading ? 'spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button className="btn btn-download" onClick={downloadDashboardPDF}>
              <FiDownload /> Download Report
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="admin-stat-icon"><FiUsers /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-value">{stats.roleCounts.total}</span>
            <span className="admin-stat-label">Total Users</span>
          </div>
        </div>
        <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <div className="admin-stat-icon"><FiPackage /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-value">{products.length}</span>
            <span className="admin-stat-label">Products</span>
          </div>
        </div>
        <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
          <div className="admin-stat-icon"><FiShoppingBag /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-value">{orders.length}</span>
            <span className="admin-stat-label">Orders</span>
          </div>
        </div>
        <div className="admin-stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <div className="admin-stat-icon"><FiDollarSign /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-value">৳{stats.totalRevenue.toLocaleString()}</span>
            <span className="admin-stat-label">Revenue</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="admin-quick-stats">
        <div className="quick-stat">
          <FiTrendingUp className="quick-stat-icon" />
          <div>
            <div className="quick-stat-value">{stats.pendingOrders}</div>
            <div className="quick-stat-label">Pending Orders</div>
          </div>
        </div>
        <div className="quick-stat">
          <FiTrendingUp className="quick-stat-icon" />
          <div>
            <div className="quick-stat-value">{stats.processingOrders}</div>
            <div className="quick-stat-label">Processing Orders</div>
          </div>
        </div>
        <div className="quick-stat">
          <FiAward className="quick-stat-icon" />
          <div>
            <div className="quick-stat-value">{stats.roleCounts.seller}</div>
            <div className="quick-stat-label">Active Sellers</div>
          </div>
        </div>
        <div className="quick-stat">
          <FiShield className="quick-stat-icon" />
          <div>
            <div className="quick-stat-value">{stats.roleCounts.admin + stats.roleCounts.subadmin}</div>
            <div className="quick-stat-label">Admins</div>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <h2 className="section-title">
        <FiBarChart2 /> Management Sections
      </h2>
      <div className="admin-nav-grid">
        {navCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="admin-nav-card"
              onClick={() => navigate(card.route)}
              style={{ background: card.color }}
            >
              <div className="admin-nav-card-overlay"></div>
              <div className="admin-nav-card-content">
                <div className="admin-nav-icon">
                  <Icon />
                </div>
                <h3 className="admin-nav-title">{card.title}</h3>
                <p className="admin-nav-subtitle">{card.subtitle}</p>
                <span className="admin-nav-badge">{card.badge}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access Buttons */}
      <div className="admin-quick-access">
        <h2 className="section-title">
          <FiPackage /> Quick Access
        </h2>
        <div className="admin-quick-buttons">
          <button className="btn btn-quick" onClick={() => navigate('/catalog-admin')}>
            <FiPackage /> Catalog Manager
          </button>
          <button className="btn btn-quick" onClick={() => navigate('/poster-builder')}>
            <FiBarChart2 /> Poster Builder
          </button>
          <button className="btn btn-quick" onClick={() => navigate('/poster-history')}>
            <FiBarChart2 /> Poster History
          </button>
          <button className="btn btn-quick" onClick={() => navigate('/orders')}>
            <FiShoppingBag /> Orders Page
          </button>
        </div>
      </div>
    </section>
  );
}
