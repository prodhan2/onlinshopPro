import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiShoppingBag,
  FiDownload,
  FiSearch,
  FiRefreshCw,
  FiArrowLeft,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiTruck,
  FiDollarSign,
  FiFilter,
} from 'react-icons/fi';
import jsPDF from 'jspdf';

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

function getStatusClass(status) {
  return `status-${status}`;
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
      alert('Failed to update order status.');
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
      alert('Failed to delete order.');
    } finally {
      setBusyId(null);
    }
  }

  function downloadPDF() {
    const docPDF = new jsPDF();
    const pageWidth = docPDF.internal.pageSize.getWidth();

    // Header
    docPDF.setFillColor(250, 112, 154);
    docPDF.rect(0, 0, pageWidth, 40, 'F');
    docPDF.setTextColor(255, 255, 255);
    docPDF.setFontSize(22);
    docPDF.text('Order Status Report', pageWidth / 2, 18, { align: 'center' });
    docPDF.setFontSize(10);
    docPDF.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    docPDF.text(
      `Total Orders: ${filteredOrders.length} | Pending: ${orderStats.pending} | Confirmed: ${orderStats.confirmed} | Delivered: ${orderStats.delivered}`,
      pageWidth / 2,
      35,
      { align: 'center' }
    );

    // Summary
    docPDF.setTextColor(0, 0, 0);
    let y = 50;
    docPDF.setFontSize(14);
    docPDF.text('Order Summary', 14, y);
    y += 8;
    docPDF.setFontSize(10);
    docPDF.text(`Total Orders: ${orderStats.total}`, 14, y); y += 7;
    docPDF.text(`Pending: ${orderStats.pending}`, 14, y); y += 7;
    docPDF.text(`Processing: ${orderStats.processing}`, 14, y); y += 7;
    docPDF.text(`Confirmed: ${orderStats.confirmed}`, 14, y); y += 7;
    docPDF.text(`Delivered: ${orderStats.delivered}`, 14, y); y += 7;
    docPDF.text(`Cancelled: ${orderStats.cancelled}`, 14, y); y += 12;

    // Order Details
    docPDF.setFontSize(14);
    docPDF.text('Order Details', 14, y);
    y += 8;
    docPDF.setFontSize(9);

    filteredOrders.slice(0, 30).forEach((order, idx) => {
      if (y > 250) {
        docPDF.addPage();
        y = 20;
      }

      docPDF.setFillColor(240, 240, 240);
      docPDF.rect(10, y - 5, pageWidth - 20, 8, 'F');
      docPDF.setFont(undefined, 'bold');
      docPDF.text(`Order #${order.docId.substring(0, 8)}`, 12, y);
      docPDF.text(`Status: ${order.status}`, 100, y);
      docPDF.text(`৳${order.totalPrice.toFixed(2)}`, 150, y);
      docPDF.setFont(undefined, 'normal');
      y += 7;

      docPDF.text(`Customer: ${order.userName || 'N/A'} | Phone: ${order.userPhone || 'N/A'}`, 12, y); y += 6;
      docPDF.text(`Date: ${formatDate(order.createdAt)}`, 12, y); y += 6;
      docPDF.text(`Payment: ${order.paymentMethod || 'N/A'}`, 12, y); y += 6;
      docPDF.text(`Items: ${(order.items || []).map(i => i.name).join(', ') || 'N/A'}`, 12, y); y += 10;
    });

    if (filteredOrders.length > 30) {
      docPDF.text(`... and ${filteredOrders.length - 30} more orders`, 12, y + 5);
    }

    docPDF.save(`Order-Status-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  const totalRevenue = orders
    .filter(o => o.status === 'confirmed' || o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <section className="admin-sub-page">
      <div className="admin-sub-header">
        <button className="btn btn-back" onClick={() => navigate('/admin-dashboard')}>
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div className="admin-sub-header-title">
          <FiShoppingBag /> Order Status
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
          <FiShoppingBag className="sub-stat-icon" style={{ color: '#fa709a' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{orderStats.total}</span>
            <span className="sub-stat-label">Total Orders</span>
          </div>
        </div>
        <div className="sub-stat">
          <FiClock className="sub-stat-icon" style={{ color: '#fbbf24' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{orderStats.pending}</span>
            <span className="sub-stat-label">Pending</span>
          </div>
        </div>
        <div className="sub-stat">
          <FiTruck className="sub-stat-icon" style={{ color: '#3b82f6' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">{orderStats.processing}</span>
            <span className="sub-stat-label">Processing</span>
          </div>
        </div>
        <div className="sub-stat">
          <FiDollarSign className="sub-stat-icon" style={{ color: '#10b981' }} />
          <div className="sub-stat-info">
            <span className="sub-stat-value">৳{totalRevenue.toLocaleString()}</span>
            <span className="sub-stat-label">Revenue</span>
          </div>
        </div>
      </div>

      {/* Status Filter Buttons */}
      <div className="order-status-filters">
        <button
          className={`status-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All ({orderStats.total})
        </button>
        <button
          className={`status-filter-btn status-pending ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          <FiClock /> Pending ({orderStats.pending})
        </button>
        <button
          className={`status-filter-btn status-processing ${statusFilter === 'processing' ? 'active' : ''}`}
          onClick={() => setStatusFilter('processing')}
        >
          <FiTruck /> Processing ({orderStats.processing})
        </button>
        <button
          className={`status-filter-btn status-confirmed ${statusFilter === 'confirmed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('confirmed')}
        >
          <FiCheckCircle /> Confirmed ({orderStats.confirmed})
        </button>
        <button
          className={`status-filter-btn status-delivered ${statusFilter === 'delivered' ? 'active' : ''}`}
          onClick={() => setStatusFilter('delivered')}
        >
          <FiCheckCircle /> Delivered ({orderStats.delivered})
        </button>
        <button
          className={`status-filter-btn status-cancelled ${statusFilter === 'cancelled' ? 'active' : ''}`}
          onClick={() => setStatusFilter('cancelled')}
        >
          <FiXCircle /> Cancelled ({orderStats.cancelled})
        </button>
      </div>

      <div className="admin-filters">
        <div className="filter-group">
          <FiSearch className="filter-icon" />
          <input
            type="text"
            className="filter-input"
            placeholder="Search orders by name, phone, order ID, or product..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-container">
        {filteredOrders.length === 0 ? (
          <div className="admin-empty-state">
            <FiShoppingBag className="empty-icon" />
            <p>No orders found</p>
          </div>
        ) : (
          <div className="order-cards-list">
            {filteredOrders.map(order => (
              <div key={order.docId} className="order-card">
                <div className="order-card-header">
                  <div className="order-id">
                    <FiShoppingBag />
                    <span>Order #{order.docId.substring(0, 8)}</span>
                  </div>
                  <div className="order-header-right">
                    <span className={`order-status-badge ${getStatusClass(order.status)}`}>
                      {getStatusIcon(order.status)} {order.status}
                    </span>
                    <span className="order-total">৳{order.totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="order-card-body">
                  <div className="order-info-grid">
                    <div className="order-info-item">
                      <span className="order-info-label">Customer:</span>
                      <span className="order-info-value">{order.userName || 'N/A'}</span>
                    </div>
                    <div className="order-info-item">
                      <span className="order-info-label">Phone:</span>
                      <span className="order-info-value">{order.userPhone || 'N/A'}</span>
                    </div>
                    <div className="order-info-item">
                      <span className="order-info-label">Date:</span>
                      <span className="order-info-value">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="order-info-item">
                      <span className="order-info-label">Payment:</span>
                      <span className="order-info-value">{order.paymentMethod || 'N/A'}</span>
                    </div>
                    <div className="order-info-item full-width">
                      <span className="order-info-label">Items:</span>
                      <span className="order-info-value">
                        {(order.items || []).map((item, idx) => (
                          <span key={idx} className="order-item-tag">
                            {item.name} x{item.quantity || 1}
                          </span>
                        ))}
                      </span>
                    </div>
                    {order.statusMessage && (
                      <div className="order-info-item full-width">
                        <span className="order-info-label">Status:</span>
                        <span className="order-info-value order-status-msg">{order.statusMessage}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-card-actions">
                  {order.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-order btn-processing"
                        onClick={() => updateOrderStatus(order, 'processing')}
                        disabled={busyId === order.docId}
                      >
                        <FiTruck /> Processing
                      </button>
                      <button
                        className="btn btn-order btn-confirm"
                        onClick={() => updateOrderStatus(order, 'confirmed')}
                        disabled={busyId === order.docId}
                      >
                        <FiCheckCircle /> Confirm
                      </button>
                    </>
                  )}
                  {order.status === 'processing' && (
                    <>
                      <button
                        className="btn btn-order btn-confirm"
                        onClick={() => updateOrderStatus(order, 'confirmed')}
                        disabled={busyId === order.docId}
                      >
                        <FiCheckCircle /> Confirm
                      </button>
                      <button
                        className="btn btn-order btn-cancel"
                        onClick={() => updateOrderStatus(order, 'cancelled')}
                        disabled={busyId === order.docId}
                      >
                        <FiXCircle /> Cancel
                      </button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <>
                      <button
                        className="btn btn-order btn-deliver"
                        onClick={() => updateOrderStatus(order, 'delivered')}
                        disabled={busyId === order.docId}
                      >
                        <FiCheckCircle /> Deliver
                      </button>
                      <button
                        className="btn btn-order btn-cancel"
                        onClick={() => updateOrderStatus(order, 'cancelled')}
                        disabled={busyId === order.docId}
                      >
                        <FiXCircle /> Cancel
                      </button>
                    </>
                  )}
                  {order.status === 'delivered' && (
                    <span className="order-completed-text">
                      <FiCheckCircle /> Order Delivered
                    </span>
                  )}
                  {order.status === 'cancelled' && (
                    <span className="order-cancelled-text">
                      <FiXCircle /> Order Cancelled
                    </span>
                  )}
                  <button
                    className="btn btn-order btn-delete"
                    onClick={() => deleteOrder(order.docId)}
                    disabled={busyId === order.docId}
                  >
                    <FiXCircle /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
