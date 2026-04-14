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
  FiChevronRight,
  FiGrid,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import './admin.css';

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
    doc.setFillColor(99, 102, 241);
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
      title: 'User Management',
      subtitle: 'Manage all platform users',
      icon: FiUsers,
      color: '#6366f1',
      route: '/admin-users',
      badge: stats.roleCounts.total,
    },
    {
      title: 'Admin List',
      subtitle: 'System administrators',
      icon: FiShield,
      color: '#f43f5e',
      route: '/admin-list',
      badge: stats.roleCounts.admin + stats.roleCounts.subadmin,
    },
    {
      title: 'Role Management',
      subtitle: 'Assign user permissions',
      icon: FiAward,
      color: '#8b5cf6',
      route: '/admin-roles',
      badge: 'Edit',
    },
    {
      title: 'Sellers',
      subtitle: 'Monitor seller performance',
      icon: FiTrendingUp,
      color: '#10b981',
      route: '/admin-sellers',
      badge: stats.roleCounts.seller,
    },
    {
      title: 'Orders',
      subtitle: 'Track and manage orders',
      icon: FiShoppingBag,
      color: '#f59e0b',
      route: '/admin-orders',
      badge: orders.length,
    },
    {
      title: 'Analytics',
      subtitle: 'Revenue & growth data',
      icon: FiBarChart2,
      color: '#06b6d4',
      route: '/admin-analytics',
      badge: '৳' + stats.totalRevenue.toLocaleString(),
    },
    {
      title: 'Banner Management',
      subtitle: 'Manage homepage banners',
      icon: FiPackage,
      color: '#ec4899',
      route: '/admin-banners',
      badge: 'Edit',
    },
  ];

  return (
    <div className="admin-dashboard-home animate-fade-in">
      {/* Action Header */}
      <div className="card-header-flex mb-4">
        <div>
          <h2 className="admin-page-title" style={{ background: 'none', webkitTextFillColor: 'initial', color: 'var(--admin-text-main)' }}>
            Welcome back, {currentUser?.displayName?.split(' ')[0] || 'Admin'}
          </h2>
          <p className="admin-text-muted">Here's what's happening with your store today.</p>
        </div>
        <div className="admin-header-actions">
          <button className="btn-modern btn-primary-modern" onClick={loadData} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button className="btn-modern" style={{ background: 'white', border: '1px solid #e2e8f0' }} onClick={downloadDashboardPDF}>
            <FiDownload /> Report
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <FiUsers />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-val">{stats.roleCounts.total}</span>
            <span className="stat-lab">Total Users</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <FiPackage />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-val">{products.length}</span>
            <span className="stat-lab">Products</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <FiShoppingBag />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-val">{orders.length}</span>
            <span className="stat-lab">Total Orders</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
            <FiDollarSign />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-val">৳{stats.totalRevenue.toLocaleString()}</span>
            <span className="stat-lab">Revenue</span>
          </div>
        </div>
      </div>

      {/* Quick Status Section */}
      <div className="admin-card-modern">
        <h3 className="h5 mb-4 d-flex align-items-center gap-2">
          <FiTrendingUp className="text-primary" /> Order Status Overview
        </h3>
        <div className="quick-stat-row">
          <div className="quick-stat quick-stat-pending">
            <div className="quick-stat-icon"><FiShoppingBag /></div>
            <div>
              <div className="quick-stat-value">{stats.pendingOrders}</div>
              <div className="quick-stat-label">Pending</div>
            </div>
          </div>
          <div className="quick-stat quick-stat-processing">
            <div className="quick-stat-icon"><FiRefreshCw /></div>
            <div>
              <div className="quick-stat-value">{stats.processingOrders}</div>
              <div className="quick-stat-label">Processing</div>
            </div>
          </div>
          <div className="quick-stat quick-stat-delivered">
            <div className="quick-stat-icon"><FiAward /></div>
            <div>
              <div className="quick-stat-value">
                {orders.filter(o => o.status === 'delivered').length}
              </div>
              <div className="quick-stat-label">Delivered</div>
            </div>
          </div>
          <div className="quick-stat quick-stat-sellers">
            <div className="quick-stat-icon"><FiUsers /></div>
            <div>
              <div className="quick-stat-value">{stats.roleCounts.seller}</div>
              <div className="quick-stat-label">Active Sellers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Management Sections Grid */}
      <h3 className="h5 mb-4 mt-5 d-flex align-items-center gap-2">
        <FiGrid className="text-primary" /> Quick Management
      </h3>
      <div className="admin-nav-grid">
        {navCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="admin-nav-card"
              onClick={() => navigate(card.route)}
              style={{ 
                background: 'white', 
                border: '1px solid #e2e8f0', 
                color: 'var(--admin-text-main)',
                boxShadow: 'var(--admin-shadow)'
              }}
            >
              <div className="admin-nav-card-content" style={{ width: '100%' }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="admin-nav-icon" style={{ color: card.color, marginBottom: 0, background: `${card.color}15`, padding: '12px', borderRadius: '12px' }}>
                    <Icon />
                  </div>
                  <span className="admin-nav-badge" style={{ background: `${card.color}15`, color: card.color }}>
                    {card.badge}
                  </span>
                </div>
                <h3 className="admin-nav-title">{card.title}</h3>
                <p className="admin-nav-subtitle">{card.subtitle}</p>
              </div>
              <div className="admin-nav-card-overlay" style={{ background: 'rgba(0,0,0,0.02)' }}></div>
            </div>
          );
        })}
      </div>

      {/* Footer Quick Access */}
      <div className="admin-card-modern mt-5" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white', border: 'none' }}>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-4">
          <div>
            <h3 className="h4 mb-1">System Shortcuts</h3>
            <p className="mb-0" style={{ opacity: 0.7 }}>Access frequent tools directly.</p>
          </div>
          <div className="d-flex gap-3 flex-wrap">
            <button className="btn-modern" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => navigate('/catalog-admin')}>
              <FiPackage /> Catalog
            </button>
            <button className="btn-modern" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => navigate('/poster-builder')}>
              <FiBarChart2 /> Builder
            </button>
            <button className="btn-modern" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => navigate('/orders')}>
              <FiShoppingBag /> Store Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
