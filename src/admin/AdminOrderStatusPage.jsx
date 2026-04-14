import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiShoppingBag,
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiTruck,
  FiDollarSign,
  FiFilter,
  FiCalendar,
  FiUser,
  FiPhone,
  FiCreditCard,
  FiTrash2,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import './admin.css';

const CACHE_KEY = 'admin-orders-page-data';

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

function formatDate(value) {
  if (!value) return 'N/A';
  let ms = 0;
  if (typeof value?.toMillis === 'function') ms = value.toMillis();
  else if (typeof value === 'string') ms = new Date(value).getTime();
  if (!ms || !Number.isFinite(ms)) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

function getStatusIcon(status) {
  switch (status) {
    case 'pending': return <FiClock />;
    case 'processing': return <FiTruck />;
    case 'confirmed': return <FiCheckCircle />;
    case 'delivered': return <FiCheckCircle />;
    case 'cancelled': return <FiXCircle />;
    default: return <FiClock />;
  }
}

export default function AdminOrderStatusPage({ currentUser }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const items = snap.docs.map(d => ({
        docId: d.id,
        userUid: d.data()?.userUid || '',
        userName: d.data()?.userName || '',
        userPhone: d.data()?.userPhone || '',
        userEmail: d.data()?.userEmail || '',
        totalPrice: Number(d.data()?.totalPrice || 0),
        paymentMethod: d.data()?.paymentMethod || '',
        status: d.data()?.status || 'pending',
        statusMessage: d.data()?.statusMessage || '',
        createdAt: d.data()?.createdAt || null,
        items: Array.isArray(d.data()?.items) ? d.data().items : [],
        shipping: d.data()?.shipping || {},
      }));

      items.sort((a, b) => {
        const aTime = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const bTime = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setOrders(items);
      writeCache(items);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = orders.filter(order => {
    const byStatus = statusFilter === 'all' || order.status === statusFilter;
    if (!byStatus) return false;

    const query = searchQuery.toLowerCase();
    if (!query) return true;

    return (
      order.userName.toLowerCase().includes(query) ||
      order.userPhone.toLowerCase().includes(query) ||
      order.docId.toLowerCase().includes(query) ||
      (order.items || []).some(item => String(item.name || '').toLowerCase().includes(query))
    );
  });

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  async function updateOrderStatus(order, newStatus) {
    const statusMessages = {
      pending: 'Order placed. Waiting for confirmation.',
      processing: 'Order is now processing by seller/admin.',
      confirmed: 'Order confirmed by seller/admin.',
      delivered: 'Order delivered successfully.',
      cancelled: 'Order cancelled by seller/admin.',
    };

    setBusyId(order.docId);
    try {
      const payload = {
        status: newStatus,
        statusMessage: statusMessages[newStatus] || 'Status updated.',
        statusUpdatedAt: new Date().toISOString(),
      };

      if (newStatus === 'confirmed') payload.confirmedAt = new Date().toISOString();
      if (newStatus === 'delivered') payload.deliveredAt = new Date().toISOString();

      await updateDoc(doc(db, 'orders', order.docId), payload);
      setOrders(prev => prev.map(o => (o.docId === order.docId ? { ...o, ...payload } : o)));
    } catch (err) {
      console.error('Failed to update order:', err);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteOrder(orderId) {
    if (!window.confirm(`Delete order ${orderId.substring(0, 8)}?`)) return;

    setBusyId(orderId);
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(o => o.docId !== orderId));
    } catch (err) {
      console.error('Failed to delete order:', err);
    } finally {
      setBusyId(null);
    }
  }

  function downloadPDF() {
    const docPDF = new jsPDF();
    const pageWidth = docPDF.internal.pageSize.getWidth();
    docPDF.setFillColor(99, 102, 241);
    docPDF.rect(0, 0, pageWidth, 40, 'F');
    docPDF.setTextColor(255, 255, 255);
    docPDF.setFontSize(22);
    docPDF.text('Order Status Report', pageWidth / 2, 18, { align: 'center' });
    docPDF.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });
    docPDF.save(`Order-Status-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  const totalRevenue = orders
    .filter(o => o.status === 'confirmed' || o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="admin-orders-page animate-fade-in">
      <div className="card-header-flex mb-4">
        <div>
          <h2 className="admin-page-title" style={{ background: 'none', webkitTextFillColor: 'initial', color: 'var(--admin-text-main)' }}>
            Order Management
          </h2>
          <p className="admin-text-muted">Track and update customer orders.</p>
        </div>
        <div className="admin-header-actions">
          <button className="btn-modern btn-primary-modern" onClick={loadData} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Orders'}
          </button>
          <button className="btn-modern" style={{ background: 'white', border: '1px solid #e2e8f0' }} onClick={downloadPDF}>
            <FiDownload /> Export
          </button>
        </div>
      </div>

      <div className="stats-row mb-4">
        <div className="stat-box">
          <div className="stat-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <FiShoppingBag />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-val">{orderStats.total}</span>
            <span className="stat-lab">Total Orders</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <FiClock />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-val">{orderStats.pending}</span>
            <span className="stat-lab">Pending</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <FiDollarSign />
          </div>
          <div className="stat-info-wrap">
            <span className="stat-val">৳{totalRevenue.toLocaleString()}</span>
            <span className="stat-lab">Revenue</span>
          </div>
        </div>
      </div>

      {/* Modern Status Filters */}
      <div className="admin-card-modern mb-4">
        <div className="d-flex flex-wrap gap-2 mb-4">
          <button
            className={`btn-modern ${statusFilter === 'all' ? 'btn-primary-modern' : ''}`}
            style={statusFilter !== 'all' ? { background: '#f1f5f9', color: '#64748b' } : {}}
            onClick={() => setStatusFilter('all')}
          >
            All Orders
          </button>
          {['pending', 'processing', 'confirmed', 'delivered', 'cancelled'].map(status => (
            <button
              key={status}
              className={`btn-modern ${statusFilter === status ? 'btn-primary-modern' : ''}`}
              style={statusFilter !== status ? { background: '#f1f5f9', color: '#64748b' } : {}}
              onClick={() => setStatusFilter(status)}
            >
              {getStatusIcon(status)}
              <span className="text-capitalize">{status}</span>
            </button>
          ))}
        </div>

        <div className="filter-group mb-0" style={{ minWidth: '100%' }}>
          <FiSearch className="filter-icon" />
          <input
            type="text"
            className="filter-input admin-input"
            placeholder="Search by ID, customer name, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="order-cards-list">
        {filteredOrders.length === 0 ? (
          <div className="admin-card-modern text-center py-5">
            <FiShoppingBag size={48} className="text-muted mb-3" />
            <p className="h5">No orders found</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.docId} className="admin-card-modern">
              <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="stat-icon-wrap" style={{ background: 'var(--admin-bg)', color: 'var(--admin-primary)', width: '48px', height: '48px' }}>
                    <FiShoppingBag />
                  </div>
                  <div>
                    <h3 className="h6 mb-0">Order #{order.docId.substring(0, 8)}</h3>
                    <span className="admin-text-muted" style={{ fontSize: '0.8rem' }}>
                      <FiCalendar size={12} /> {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className={`role-badge role-${order.status}`} style={{ padding: '0.5rem 1rem' }}>
                    {order.status}
                  </span>
                  <span className="stat-val" style={{ fontSize: '1.25rem' }}>৳{order.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-12 col-md-4">
                  <div className="d-flex flex-column gap-2">
                    <span className="stat-lab">Customer Information</span>
                    <div className="d-flex align-items-center gap-2"><FiUser size={14} className="text-primary" /> <strong>{order.userName}</strong></div>
                    <div className="d-flex align-items-center gap-2"><FiPhone size={14} className="text-primary" /> {order.userPhone}</div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="d-flex flex-column gap-2">
                    <span className="stat-lab">Payment & Shipping</span>
                    <div className="d-flex align-items-center gap-2"><FiCreditCard size={14} className="text-primary" /> {order.paymentMethod}</div>
                    <div className="admin-text-muted" style={{ fontSize: '0.85rem' }}>{order.statusMessage}</div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="d-flex flex-column gap-2">
                    <span className="stat-lab">Items Ordered ({order.items?.length})</span>
                    <div className="d-flex flex-wrap gap-2">
                      {order.items?.map((item, i) => (
                        <span key={i} className="badge bg-light text-dark border" style={{ fontWeight: 500 }}>
                          {item.name} x{item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 flex-wrap border-top pt-3">
                {order.status === 'pending' && (
                  <>
                    <button className="btn-modern btn-primary-modern" onClick={() => updateOrderStatus(order, 'processing')} disabled={busyId === order.docId}>
                      <FiTruck /> Process
                    </button>
                    <button className="btn-modern" style={{ background: '#ecfdf5', color: '#059669' }} onClick={() => updateOrderStatus(order, 'confirmed')} disabled={busyId === order.docId}>
                      <FiCheckCircle /> Confirm
                    </button>
                  </>
                )}
                {order.status === 'processing' && (
                  <button className="btn-modern" style={{ background: '#ecfdf5', color: '#059669' }} onClick={() => updateOrderStatus(order, 'confirmed')} disabled={busyId === order.docId}>
                    <FiCheckCircle /> Confirm
                  </button>
                )}
                {order.status === 'confirmed' && (
                  <button className="btn-modern" style={{ background: '#f0f9ff', color: '#0ea5e9' }} onClick={() => updateOrderStatus(order, 'delivered')} disabled={busyId === order.docId}>
                    <FiCheckCircle /> Deliver
                  </button>
                )}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <button className="btn-modern" style={{ background: '#fef2f2', color: '#ef4444' }} onClick={() => updateOrderStatus(order, 'cancelled')} disabled={busyId === order.docId}>
                    <FiXCircle /> Cancel
                  </button>
                )}
                <button className="btn-modern ms-auto" style={{ background: '#fff1f2', color: '#e11d48' }} onClick={() => deleteOrder(order.docId)} disabled={busyId === order.docId}>
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
