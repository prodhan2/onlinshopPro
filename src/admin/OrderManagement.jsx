import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { FiArrowLeft, FiShoppingBag, FiClock, FiTruck, FiCheckCircle, FiXCircle, FiPackage, FiChevronDown, FiChevronUp, FiSearch, FiMapPin, FiPhone, FiCreditCard } from 'react-icons/fi';
import logo from '../bstoreapp/assets/images/logo.png';
import './OrderManagement.css';

function toMillis(v) {
  if (!v) return 0;
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (typeof v === 'string') { const ms = new Date(v).getTime(); return isFinite(ms) ? ms : 0; }
  return 0;
}

function formatDate(v) {
  const ms = toMillis(v);
  if (!ms) return '—';
  return new Intl.DateTimeFormat('en-BD', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
}

const STATUS = {
  pending:    { label: 'Pending',    bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  processing: { label: 'Processing', bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  confirmed:  { label: 'Confirmed',  bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  delivered:  { label: 'Delivered',  bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  cancelled:  { label: 'Cancelled',  bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
};

const TABS = [
  { key: 'all',        label: 'All',        icon: <FiShoppingBag /> },
  { key: 'pending',    label: 'Pending',    icon: <FiClock /> },
  { key: 'processing', label: 'Processing', icon: <FiTruck /> },
  { key: 'confirmed',  label: 'Confirmed',  icon: <FiCheckCircle /> },
  { key: 'delivered',  label: 'Delivered',  icon: <FiCheckCircle /> },
  { key: 'cancelled',  label: 'Cancelled',  icon: <FiXCircle /> },
];

export default function OrderManagementPage({ onBack, currentUser, isAdmin = false }) {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [tab, setTab]             = useState('all');
  const [expanded, setExpanded]   = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const mine = useMemo(() =>
    isAdmin ? orders : orders.filter(o => o.userUid === currentUser?.uid),
    [orders, isAdmin, currentUser?.uid]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = tab === 'all' ? mine : mine.filter(o => o.status === tab);
    if (!q) return base;
    return base.filter(o =>
      String(o.userName ?? '').toLowerCase().includes(q) ||
      String(o.userPhone ?? '').toLowerCase().includes(q) ||
      (o.items ?? []).some(i => String(i.name ?? '').toLowerCase().includes(q))
    );
  }, [mine, tab, search]);

  const counts = useMemo(() => ({
    all: mine.length,
    pending: mine.filter(o => o.status === 'pending').length,
    processing: mine.filter(o => o.status === 'processing').length,
    confirmed: mine.filter(o => o.status === 'confirmed').length,
    delivered: mine.filter(o => o.status === 'delivered').length,
    cancelled: mine.filter(o => o.status === 'cancelled').length,
  }), [mine]);

  return (
    <div className="om-page">
      {/* App Bar */}
      <div className="om-appbar">
        <button className="om-back" onClick={onBack || (() => window.history.back())}>
          <FiArrowLeft />
        </button>
        <div className="om-appbar-center">
          <img src={logo} alt="Logo" className="om-appbar-logo" />
          <span className="om-appbar-title">{isAdmin ? 'All Orders' : 'My Orders'}</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Search */}
      <div className="om-search-wrap">
        <FiSearch className="om-search-icon" />
        <input
          className="om-search"
          type="text"
          placeholder="Search by name, phone or product..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="om-search-clear" onClick={() => setSearch('')}>×</button>}
      </div>

      {/* Tabs */}
      <div className="om-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`om-tab ${tab === t.key ? 'om-tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
            {counts[t.key] > 0 && <span className="om-tab-count">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="om-body">
        {loading ? (
          <div className="om-center">
            <div className="om-spinner" />
            <p>Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="om-center">
            <FiShoppingBag className="om-empty-icon" />
            <p>{search ? 'No results found.' : 'No orders yet.'}</p>
          </div>
        ) : (
          filtered.map(order => {
            const s = STATUS[order.status] || STATUS.pending;
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} className={`om-card ${isOpen ? 'om-card-open' : ''}`}>
                {/* Card Header */}
                <button className="om-card-head" onClick={() => setExpanded(isOpen ? null : order.id)}>
                  <div className="om-card-head-left">
                    <FiPackage className="om-card-pkg" />
                    <div>
                      <p className="om-card-id">#{order.id.slice(-8).toUpperCase()}</p>
                      <p className="om-card-date">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="om-card-head-right">
                    <span className="om-status" style={{ background: s.bg, color: s.text }}>
                      <span className="om-status-dot" style={{ background: s.dot }} />
                      {s.label}
                    </span>
                    <span className="om-card-total">৳{Number(order.totalPrice ?? 0).toFixed(0)}</span>
                    {isOpen ? <FiChevronUp className="om-chevron" /> : <FiChevronDown className="om-chevron" />}
                  </div>
                </button>

                {/* Quick info row */}
                <div className="om-card-meta">
                  <span><FiPhone size={12} /> {order.userPhone || '—'}</span>
                  <span><FiCreditCard size={12} /> {order.paymentMethod || '—'}</span>
                  <span><FiPackage size={12} /> {(order.items ?? []).length} item{(order.items ?? []).length !== 1 ? 's' : ''}</span>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="om-card-body">
                    {/* Items */}
                    <p className="om-section-label">Items</p>
                    {(order.items ?? []).map((item, i) => (
                      <div key={i} className="om-item-row">
                        <span className="om-item-name">{item.name}</span>
                        <span className="om-item-right">
                          <span className="om-item-qty">×{item.quantity || 1}</span>
                          <span className="om-item-price">৳{Number(item.price ?? 0).toFixed(0)}</span>
                        </span>
                      </div>
                    ))}

                    <div className="om-divider" />

                    {/* Delivery */}
                    <p className="om-section-label">Delivery</p>
                    <div className="om-info-row"><FiMapPin size={13} /><span>{order.street || '—'}, {order.area || '—'}</span></div>
                    <div className="om-info-row"><FiPhone size={13} /><span>{order.userPhone || '—'}</span></div>

                    <div className="om-divider" />

                    {/* Total */}
                    <div className="om-summary-row"><span>Shipping</span><span>৳{Number(order.shippingCharge ?? 0).toFixed(0)}</span></div>
                    <div className="om-summary-row om-summary-total"><span>Total</span><span>৳{Number(order.totalPrice ?? 0).toFixed(0)}</span></div>

                    {/* Status message */}
                    {order.statusMessage && (
                      <div className="om-status-msg">{order.statusMessage}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
