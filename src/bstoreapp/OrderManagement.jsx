import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiShoppingBag,
  FiSearch,
  FiClock,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiPackage,
  FiArrowLeft,
  FiMapPin,
  FiPhone,
  FiCreditCard,
  FiCalendar,
  FiUser,
  FiDollarSign,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

function formatDate(value) {
  const ms = toMillis(value);
  if (!ms) return 'No date';

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

function getStatusColor(status) {
  switch (status) {
    case 'pending': return { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' };
    case 'processing': return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
    case 'confirmed': return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
    case 'delivered': return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
    case 'cancelled': return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
    default: return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'pending': return 'Pending';
    case 'processing': return 'Processing';
    case 'confirmed': return 'Confirmed';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return 'Unknown';
  }
}

export default function OrderManagementPage({ onBack, currentUser, isAdmin = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    const orderQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(orderQuery, snapshot => {
      setOrders(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const visibleOrders = useMemo(() => {
    if (isAdmin) return orders;
    return orders.filter(order => order.userUid === currentUser?.uid);
  }, [orders, isAdmin, currentUser?.uid]);

  const filteredOrders = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    const base = statusFilter === 'all' ? visibleOrders : visibleOrders.filter(o => o.status === statusFilter);

    if (!queryText) return base;

    return base.filter(order => {
      const phone = String(order.userPhone ?? '').toLowerCase();
      const userName = String(order.userName ?? '').toLowerCase();
      const itemMatch = Array.isArray(order.items)
        ? order.items.some(item => String(item.name ?? '').toLowerCase().includes(queryText))
        : false;
      return phone.includes(queryText) || userName.includes(queryText) || itemMatch;
    });
  }, [visibleOrders, searchQuery, statusFilter]);

  const orderStats = useMemo(() => ({
    total: visibleOrders.length,
    pending: visibleOrders.filter(o => o.status === 'pending').length,
    processing: visibleOrders.filter(o => o.status === 'processing').length,
    confirmed: visibleOrders.filter(o => o.status === 'confirmed').length,
    delivered: visibleOrders.filter(o => o.status === 'delivered').length,
    cancelled: visibleOrders.filter(o => o.status === 'cancelled').length,
    totalRevenue: visibleOrders.filter(o => o.status === 'delivered' || o.status === 'confirmed')
      .reduce((sum, o) => sum + Number(o.totalPrice ?? 0), 0),
  }), [visibleOrders]);

  const statusTabs = [
    { key: 'all', label: 'All Orders', count: orderStats.total, icon: <FiShoppingBag /> },
    { key: 'pending', label: 'Pending', count: orderStats.pending, icon: <FiClock /> },
    { key: 'processing', label: 'Processing', count: orderStats.processing, icon: <FiTruck /> },
    { key: 'confirmed', label: 'Confirmed', count: orderStats.confirmed, icon: <FiCheckCircle /> },
    { key: 'delivered', label: 'Delivered', count: orderStats.delivered, icon: <FiCheckCircle /> },
    { key: 'cancelled', label: 'Cancelled', count: orderStats.cancelled, icon: <FiXCircle /> },
  ];

  function toggleOrderExpand(orderId) {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  }

  return (
    <div className="pro-order-page">
      {/* Hero Header */}
      <div className="pro-order-header">
        <div className="pro-order-header-bg"></div>
        <div className="pro-order-header-content">
          <div className="pro-order-header-left">
            <button className="pro-order-back-btn" onClick={onBack || (() => window.history.back())}>
              <FiArrowLeft /> Back
            </button>
            <div className="pro-order-title-section">
              <FiShoppingBag className="pro-order-title-icon" />
              <div>
                <h1 className="pro-order-title">{isAdmin ? 'All Orders' : 'My Orders'}</h1>
                <p className="pro-order-subtitle">
                  {isAdmin ? 'Manage and track all customer orders' : 'Track your order status in real-time'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pro-order-content">
        {/* Stats Cards */}
        <div className="pro-order-stats">
          <div className="pro-order-stat-card">
            <div className="pro-order-stat-icon" style={{ background: '#eff6ff', color: '#1e40af' }}>
              <FiShoppingBag />
            </div>
            <div className="pro-order-stat-info">
              <span className="pro-order-stat-value">{orderStats.total}</span>
              <span className="pro-order-stat-label">Total Orders</span>
            </div>
          </div>
          <div className="pro-order-stat-card">
            <div className="pro-order-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <FiClock />
            </div>
            <div className="pro-order-stat-info">
              <span className="pro-order-stat-value">{orderStats.pending}</span>
              <span className="pro-order-stat-label">Pending</span>
            </div>
          </div>
          <div className="pro-order-stat-card">
            <div className="pro-order-stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <FiTruck />
            </div>
            <div className="pro-order-stat-info">
              <span className="pro-order-stat-value">{orderStats.processing}</span>
              <span className="pro-order-stat-label">Processing</span>
            </div>
          </div>
          <div className="pro-order-stat-card">
            <div className="pro-order-stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
              <FiDollarSign />
            </div>
            <div className="pro-order-stat-info">
              <span className="pro-order-stat-value">৳{orderStats.totalRevenue.toLocaleString()}</span>
              <span className="pro-order-stat-label">Revenue</span>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="pro-order-tabs">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              className={`pro-order-tab ${statusFilter === tab.key ? 'pro-order-tab-active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="pro-order-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="pro-order-search">
          <FiSearch className="pro-order-search-icon" />
          <input
            type="text"
            className="pro-order-search-input"
            placeholder="Search by phone, name, or product..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="pro-order-search-clear" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="pro-order-loading">
            <div className="pro-order-spinner" />
            <p>Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="pro-order-empty">
            <FiShoppingBag className="pro-order-empty-icon" />
            <h3>No orders found</h3>
            <p>{searchQuery ? 'Try adjusting your search criteria.' : isAdmin ? 'No orders in the system yet.' : 'You have no orders yet.'}</p>
          </div>
        ) : (
          <div className="pro-orders-list">
            {filteredOrders.map(order => {
              const statusColor = getStatusColor(order.status || 'pending');
              const isExpanded = expandedOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className={`pro-order-card ${isExpanded ? 'pro-order-card-expanded' : ''}`}
                >
                  {/* Order Header */}
                  <div className="pro-order-card-header" onClick={() => toggleOrderExpand(order.id)}>
                    <div className="pro-order-header-main">
                      <div className="pro-order-id-section">
                        <FiPackage className="pro-order-id-icon" />
                        <span className="pro-order-id">#{order.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <span
                        className="pro-order-status-badge"
                        style={{
                          background: statusColor.bg,
                          color: statusColor.text,
                          borderColor: statusColor.border,
                        }}
                      >
                        {getStatusIcon(order.status)} {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="pro-order-header-right">
                      <span className="pro-order-total">৳{Number(order.totalPrice ?? 0).toFixed(2)}</span>
                      <button className="pro-order-expand-btn">
                        {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </button>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="pro-order-card-summary">
                    <div className="pro-order-summary-item">
                      <FiUser className="pro-order-summary-icon" />
                      <div>
                        <span className="pro-order-summary-label">Customer</span>
                        <span className="pro-order-summary-value">{order.userName || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="pro-order-summary-item">
                      <FiPhone className="pro-order-summary-icon" />
                      <div>
                        <span className="pro-order-summary-label">Phone</span>
                        <span className="pro-order-summary-value">{order.userPhone || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="pro-order-summary-item">
                      <FiCalendar className="pro-order-summary-icon" />
                      <div>
                        <span className="pro-order-summary-label">Date</span>
                        <span className="pro-order-summary-value">{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="pro-order-summary-item">
                      <FiCreditCard className="pro-order-summary-icon" />
                      <div>
                        <span className="pro-order-summary-label">Payment</span>
                        <span className="pro-order-summary-value">{order.paymentMethod || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="pro-order-details">
                      {/* Order Items */}
                      <div className="pro-order-items-section">
                        <h4 className="pro-order-section-title">
                          <FiPackage /> Order Items ({(order.items ?? []).length})
                        </h4>
                        <div className="pro-order-items-list">
                          {(order.items ?? []).map((item, idx) => (
                            <div key={idx} className="pro-order-item-row">
                              <div className="pro-order-item-info">
                                <span className="pro-order-item-name">{item.name}</span>
                                {item.variant && <span className="pro-order-item-variant">{item.variant}</span>}
                              </div>
                              <div className="pro-order-item-meta">
                                <span className="pro-order-item-qty">× {item.quantity || 1}</span>
                                <span className="pro-order-item-price">৳{Number(item.price ?? 0).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping Info */}
                      {order.shipping && (
                        <div className="pro-order-shipping-section">
                          <h4 className="pro-order-section-title">
                            <FiMapPin /> Shipping Information
                          </h4>
                          <div className="pro-order-shipping-info">
                            {order.shipping.address && (
                              <div className="pro-order-shipping-row">
                                <span className="pro-order-shipping-label">Address:</span>
                                <span className="pro-order-shipping-value">{order.shipping.address}</span>
                              </div>
                            )}
                            {order.shipping.city && (
                              <div className="pro-order-shipping-row">
                                <span className="pro-order-shipping-label">City:</span>
                                <span className="pro-order-shipping-value">{order.shipping.city}</span>
                              </div>
                            )}
                            {order.shipping.phone && (
                              <div className="pro-order-shipping-row">
                                <span className="pro-order-shipping-label">Contact:</span>
                                <span className="pro-order-shipping-value">{order.shipping.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Status Message */}
                      {order.statusMessage && (
                        <div className="pro-order-status-message">
                          <span className="pro-order-status-label">Status Update:</span>
                          <p>{order.statusMessage}</p>
                          {order.statusUpdatedAt && (
                            <small className="pro-order-status-time">
                              Updated: {formatDate(order.statusUpdatedAt)}
                              {order.statusUpdatedBy?.displayName ? ` by ${order.statusUpdatedBy.displayName}` : ''}
                            </small>
                          )}
                        </div>
                      )}

                      {/* Order Total Summary */}
                      <div className="pro-order-total-summary">
                        <div className="pro-order-total-row">
                          <span>Total Amount</span>
                          <strong>৳{Number(order.totalPrice ?? 0).toFixed(2)}</strong>
                        </div>
                        <div className="pro-order-total-row">
                          <span>Payment Method</span>
                          <span>{order.paymentMethod || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
