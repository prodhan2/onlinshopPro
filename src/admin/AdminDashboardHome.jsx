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
  FiPackage,
  FiChevronRight,
  FiGrid,
  FiList,
} from 'react-icons/fi';
import jsPDF from 'jspdf';

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

export default function AdminDashboardHome({ currentUser }) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(() => readCache(CACHE_KEYS.profiles, []));
  const [products, setProducts] = useState(() => readCache(CACHE_KEYS.products, []));
  const [orders, setOrders] = useState(() => readCache(CACHE_KEYS.orders, []));
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [navView, setNavView] = useState('grid');

  const stats = useMemo(() => {
    const roleCounts = profiles.reduce(
      (acc, item) => {
        const role = item.role || 'user';
        acc.total += 1;
        if (acc[role] !== undefined) acc[role] += 1;
        return acc;
      },
      { total: 0, admin: 0, subadmin: 0, seller: 0, user: 0 },
    );

    const totalRevenue = orders
      .filter((o) => o.status === 'confirmed' || o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const processingOrders = orders.filter((o) => o.status === 'processing').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;

    return { roleCounts, totalRevenue, pendingOrders, processingOrders, deliveredOrders };
  }, [profiles, orders]);

  async function loadData() {
    setLoading(true);
    try {
      const [profileSnap, productSnap, orderSnap] = await Promise.all([
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders')),
      ]);

      const profileItems = profileSnap.docs.map((d) => ({
        docId: d.id,
        uid: d.data()?.uid || d.id,
        fullName: d.data()?.fullName || d.data()?.displayName || '',
        email: d.data()?.email || '',
        photoURL: d.data()?.photoURL || '',
        role: d.data()?.role || (d.data()?.admin ? 'admin' : 'user'),
        admin: d.data()?.admin || false,
      }));

      const productItems = productSnap.docs.map((d) => ({
        docId: d.id,
        id: d.data()?.id || d.id,
        name: d.data()?.name || 'Unnamed',
        price: Number(d.data()?.price || 0),
        createdByUid: d.data()?.createdBy?.uid || '',
      }));

      const orderItems = orderSnap.docs.map((d) => ({
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

    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Admin Dashboard Report', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text('Beautiful Dinajpur', pageWidth / 2, 35, { align: 'center' });

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
      `Total Revenue: Tk ${stats.totalRevenue.toLocaleString()}`,
      `Pending Orders: ${stats.pendingOrders}`,
      `Processing Orders: ${stats.processingOrders}`,
    ];

    lines.forEach((line) => {
      doc.text(line, 14, y);
      y += 8;
    });

    doc.save(`Admin-Dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  const navItems = [
    {
      title: 'User Management',
      subtitle: 'Manage all platform users',
      icon: FiUsers,
      color: '#4f46e5',
      route: '/admin-users',
      badge: stats.roleCounts.total,
    },
    {
      title: 'Admin List',
      subtitle: 'System administrators',
      icon: FiShield,
      color: '#dc2626',
      route: '/admin-list',
      badge: stats.roleCounts.admin + stats.roleCounts.subadmin,
    },
    {
      title: 'Role Management',
      subtitle: 'Assign user permissions',
      icon: FiAward,
      color: '#7c3aed',
      route: '/admin-roles',
      badge: 'Edit',
    },
    {
      title: 'Sellers',
      subtitle: 'Monitor seller performance',
      icon: FiTrendingUp,
      color: '#059669',
      route: '/admin-sellers',
      badge: stats.roleCounts.seller,
    },
    {
      title: 'Orders',
      subtitle: 'Track and manage orders',
      icon: FiShoppingBag,
      color: '#d97706',
      route: '/admin-orders',
      badge: orders.length,
    },
    {
      title: 'Analytics',
      subtitle: 'Revenue and growth data',
      icon: FiBarChart2,
      color: '#0284c7',
      route: '/admin-analytics',
      badge: `Tk ${stats.totalRevenue.toLocaleString()}`,
    },
    {
      title: 'Banner Management',
      subtitle: 'Manage homepage banners',
      icon: FiPackage,
      color: '#db2777',
      route: '/admin-banners',
      badge: 'Edit',
    },
  ];

  const shortcutActions = [
    { label: 'Catalog', icon: FiPackage, route: '/catalog-admin' },
    { label: 'Builder', icon: FiBarChart2, route: '/poster-builder' },
    { label: 'Orders', icon: FiShoppingBag, route: '/orders' },
  ];

  return (
    <div className="admin-dashboard-home admin-dashboard-flat animate-fade-in">
      <section className="admin-flat-section admin-flat-hero">
        <div className="admin-flat-hero-copy">
          <p className="admin-flat-eyebrow">Admin Workspace</p>
          <h2 className="admin-flat-title">
            Welcome back, {currentUser?.displayName?.split(' ')[0] || 'Admin'}
          </h2>
          <p className="admin-flat-subtitle">
            Full-width operational overview with simple spacing, crisp typography, and no card feel.
          </p>
        </div>
        <div className="admin-flat-actions">
          <button type="button" className="admin-flat-action-btn" onClick={loadData} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button type="button" className="admin-flat-action-btn" onClick={downloadDashboardPDF}>
            <FiDownload />
            Report
          </button>
        </div>
      </section>

      <div className="admin-flat-divider" />

      <section className="admin-flat-section">
        <div className="admin-flat-section-head">
          <h3 className="admin-flat-section-title">Overview</h3>
          <p className="admin-flat-section-note">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading latest summary'}
          </p>
        </div>
        <div className="admin-flat-kpi-grid">
          <div className="admin-flat-kpi-item">
            <span className="admin-flat-kpi-label">Total Users</span>
            <strong className="admin-flat-kpi-value">{stats.roleCounts.total}</strong>
          </div>
          <div className="admin-flat-kpi-item">
            <span className="admin-flat-kpi-label">Products</span>
            <strong className="admin-flat-kpi-value">{products.length}</strong>
          </div>
          <div className="admin-flat-kpi-item">
            <span className="admin-flat-kpi-label">Orders</span>
            <strong className="admin-flat-kpi-value">{orders.length}</strong>
          </div>
          <div className="admin-flat-kpi-item">
            <span className="admin-flat-kpi-label">Revenue</span>
            <strong className="admin-flat-kpi-value">Tk {stats.totalRevenue.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <div className="admin-flat-divider" />

      <section className="admin-flat-section">
        <div className="admin-flat-section-head">
          <h3 className="admin-flat-section-title">Order Status</h3>
          <p className="admin-flat-section-note">Current order flow and seller activity</p>
        </div>
        <div className="admin-flat-status-list">
          <div className="admin-flat-status-row">
            <span className="admin-flat-status-label">Pending</span>
            <strong className="admin-flat-status-value">{stats.pendingOrders}</strong>
          </div>
          <div className="admin-flat-status-row">
            <span className="admin-flat-status-label">Processing</span>
            <strong className="admin-flat-status-value">{stats.processingOrders}</strong>
          </div>
          <div className="admin-flat-status-row">
            <span className="admin-flat-status-label">Delivered</span>
            <strong className="admin-flat-status-value">{stats.deliveredOrders}</strong>
          </div>
          <div className="admin-flat-status-row">
            <span className="admin-flat-status-label">Active Sellers</span>
            <strong className="admin-flat-status-value">{stats.roleCounts.seller}</strong>
          </div>
        </div>
      </section>

      <div className="admin-flat-divider" />

      <section className="admin-flat-section">
        <div className="admin-flat-section-head">
          <div>
            <h3 className="admin-flat-section-title">Quick Management</h3>
            <p className="admin-flat-section-note">Flat responsive actions in grid or list view</p>
          </div>
          <div className="admin-flat-view-switch" aria-label="Switch action layout">
            <button
              type="button"
              className={`admin-flat-view-btn ${navView === 'grid' ? 'active' : ''}`}
              onClick={() => setNavView('grid')}
            >
              <FiGrid />
              Grid
            </button>
            <button
              type="button"
              className={`admin-flat-view-btn ${navView === 'list' ? 'active' : ''}`}
              onClick={() => setNavView('list')}
            >
              <FiList />
              List
            </button>
          </div>
        </div>

        <div className={`admin-flat-action-list ${navView === 'grid' ? 'is-grid' : 'is-list'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.route}
                type="button"
                className="admin-flat-nav-row"
                onClick={() => navigate(item.route)}
              >
                <span className="admin-flat-nav-icon" style={{ color: item.color }}>
                  <Icon />
                </span>
                <span className="admin-flat-nav-copy">
                  <span className="admin-flat-nav-title">{item.title}</span>
                  <span className="admin-flat-nav-subtitle">{item.subtitle}</span>
                </span>
                <span className="admin-flat-nav-meta">{item.badge}</span>
                <FiChevronRight className="admin-flat-nav-arrow" />
              </button>
            );
          })}
        </div>
      </section>

      <div className="admin-flat-divider" />

      <section className="admin-flat-section">
        <div className="admin-flat-section-head">
          <h3 className="admin-flat-section-title">System Shortcuts</h3>
          <p className="admin-flat-section-note">Direct access to the tools you open most</p>
        </div>
        <div className="admin-flat-shortcuts">
          {shortcutActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.route}
                type="button"
                className="admin-flat-shortcut"
                onClick={() => navigate(action.route)}
              >
                <Icon />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
