import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiAward,
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiArrowLeft,
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiUser,
  FiMail,
  FiTrendingUp,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import './admin.css';

const CACHE_KEYS = {
  profiles: 'admin-sellers-profiles',
  products: 'admin-sellers-products',
  orders: 'admin-sellers-orders',
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

export default function AdminSellerOverviewPage({ currentUser }) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(() => readCache(CACHE_KEYS.profiles, []));
  const [products, setProducts] = useState(() => readCache(CACHE_KEYS.products, []));
  const [orders, setOrders] = useState(() => readCache(CACHE_KEYS.orders, []));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSeller, setExpandedSeller] = useState(null);

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
        phone: d.data()?.phone || '',
        photoURL: d.data()?.photoURL || '',
        role: d.data()?.role || 'user',
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

  const sellers = useMemo(
    () => profiles.filter(p => p.role === 'seller'),
    [profiles]
  );

  const sellerStats = useMemo(() => {
    const productIdsBySeller = new Map();
    products.forEach(p => {
      if (!p.createdByUid) return;
      if (!productIdsBySeller.has(p.createdByUid)) {
        productIdsBySeller.set(p.createdByUid, new Set());
      }
      productIdsBySeller.get(p.createdByUid).add(p.id);
    });

    const stats = sellers.map(seller => {
      const sellerProductIds = productIdsBySeller.get(seller.uid) || new Set();
      const productCount = sellerProductIds.size;

      let orderCount = 0;
      let totalRevenue = 0;
      let confirmedRevenue = 0;

      orders.forEach(order => {
        const hasSellerProduct = (order.items || []).some(item => sellerProductIds.has(item.id));
        if (hasSellerProduct) {
          orderCount++;
          totalRevenue += Number(order.totalPrice || 0);
          if (order.status === 'confirmed' || order.status === 'delivered') {
            confirmedRevenue += Number(order.totalPrice || 0);
          }
        }
      });

      return {
        ...seller,
        productCount,
        orderCount,
        totalRevenue,
        confirmedRevenue,
      };
    });

    return stats.sort((a, b) => b.confirmedRevenue - a.confirmedRevenue);
  }, [sellers, products, orders]);

  const filteredSellers = sellerStats.filter(seller => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    return (
      seller.fullName.toLowerCase().includes(query) ||
      seller.email.toLowerCase().includes(query) ||
      seller.phone.toLowerCase().includes(query)
    );
  });

  function downloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(67, 233, 123);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Seller Overview Report', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Total Sellers: ${filteredSellers.length}`, pageWidth / 2, 35, { align: 'center' });

    // Summary
    doc.setTextColor(0, 0, 0);
    let y = 50;
    doc.setFontSize(14);
    doc.text('Summary', 14, y);
    y += 8;
    doc.setFontSize(10);
    const totalProducts = filteredSellers.reduce((sum, s) => sum + s.productCount, 0);
    const totalOrders = filteredSellers.reduce((sum, s) => sum + s.orderCount, 0);
    const totalRevenue = filteredSellers.reduce((sum, s) => sum + s.confirmedRevenue, 0);
    doc.text(`Total Products: ${totalProducts}`, 14, y); y += 7;
    doc.text(`Total Orders: ${totalOrders}`, 14, y); y += 7;
    doc.text(`Total Confirmed Revenue: ৳${totalRevenue.toLocaleString()}`, 14, y); y += 12;

    // Seller Details
    doc.setFontSize(14);
    doc.text('Seller Details', 14, y);
    y += 8;
    doc.setFontSize(9);

    filteredSellers.forEach((seller, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(10, y - 5, pageWidth - 20, 8, 'F');
      doc.setFont(undefined, 'bold');
      doc.text(`${idx + 1}. ${seller.fullName}`, 12, y);
      doc.setFont(undefined, 'normal');
      y += 7;

      doc.text(`   Email: ${seller.email || 'N/A'}`, 12, y); y += 6;
      doc.text(`   Products: ${seller.productCount}`, 12, y); y += 6;
      doc.text(`   Orders: ${seller.orderCount}`, 12, y); y += 6;
      doc.text(`   Confirmed Revenue: ৳${seller.confirmedRevenue.toLocaleString()}`, 12, y); y += 10;
    });

    doc.save(`Seller-Overview-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  const totalProducts = filteredSellers.reduce((sum, s) => sum + s.productCount, 0);
  const totalOrders = filteredSellers.reduce((sum, s) => sum + s.orderCount, 0);
  const totalRevenue = filteredSellers.reduce((sum, s) => sum + s.confirmedRevenue, 0);

  return (
    <section className="admin-sub-page">
      <div className="admin-sub-header">
        <button className="btn btn-back" onClick={() => navigate('/admin-dashboard')}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div className="admin-sub-header-title">
          <FiAward /> Seller Overview
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
          <FiAward className="sub-stat-icon" style={{ color: '#43e97b' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{filteredSellers.length}</span>
            <span className="sub-stat-label">Total Sellers</span>
          </div>
        </div>
        <div className="sub-stat">
          <FiPackage className="sub-stat-icon" style={{ color: '#4facfe' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{totalProducts}</span>
            <span className="sub-stat-label">Products</span>
          </div>
        </div>
        <div className="sub-stat">
          <FiShoppingBag className="sub-stat-icon" style={{ color: '#fa709a' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{totalOrders}</span>
            <span className="sub-stat-label">Orders</span>
          </div>
        </div>
        <div className="sub-stat">
          <FiDollarSign className="sub-stat-icon" style={{ color: '#fee140' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">৳{totalRevenue.toLocaleString()}</span>
            <span className="sub-stat-label">Revenue</span>
          </div>
        </div>
      </div>

      <div className="admin-filters">
        <div className="filter-group">
          <FiSearch className="filter-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="Search sellers by name, email, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-container">
        {filteredSellers.length === 0 ? (
          <div className="admin-empty-state">
            <FiAward className="empty-icon" />
            <p>No sellers found</p>
          </div>
        ) : (
          <div className="seller-cards-grid">
            {filteredSellers.map((seller, idx) => (
              <div
                key={seller.docId}
                className={`seller-card ${expandedSeller === seller.uid ? 'expanded' : ''}`}
                onClick={() => setExpandedSeller(expandedSeller === seller.uid ? null : seller.uid)}
              >
                <div className="seller-card-header">
                  <div className="seller-avatar">
                    {seller.photoURL ? (
                      <img src={seller.photoURL} alt={seller.fullName} />
                    ) : (
                      <FiUser />
                    )}
                  </div>
                  <div className="seller-info">
                    <h3 className="seller-name">{seller.fullName || 'No Name'}</h3>
                    <p className="seller-email">
                      <FiMail /> {seller.email || 'No email'}
                    </p>
                  </div>
                  <span className="seller-rank">#{idx + 1}</span>
                </div>

                <div className="seller-stats">
                  <div className="seller-stat-item">
                    <FiPackage className="seller-stat-icon" />
                    <span className="seller-stat-value">{seller.productCount}</span>
                    <span className="seller-stat-label">Products</span>
                  </div>
                  <div className="seller-stat-item">
                    <FiShoppingBag className="seller-stat-icon" />
                    <span className="seller-stat-value">{seller.orderCount}</span>
                    <span className="seller-stat-label">Orders</span>
                  </div>
                  <div className="seller-stat-item">
                    <FiTrendingUp className="seller-stat-icon" />
                    <span className="seller-stat-value">৳{seller.confirmedRevenue.toLocaleString()}</span>
                    <span className="seller-stat-label">Revenue</span>
                  </div>
                </div>

                {expandedSeller === seller.uid && (
                  <div className="seller-expanded">
                    <div className="seller-detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{seller.phone || 'N/A'}</span>
                    </div>
                    <div className="seller-detail-row">
                      <span className="detail-label">UID:</span>
                      <span className="detail-value">{seller.uid.substring(0, 20)}...</span>
                    </div>
                    <div className="seller-detail-row">
                      <span className="detail-label">Total Sales:</span>
                      <span className="detail-value">৳{seller.totalRevenue.toLocaleString()}</span>
                    </div>
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
