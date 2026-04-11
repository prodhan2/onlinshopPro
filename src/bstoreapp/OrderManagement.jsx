import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

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
  if (!ms) {
    return 'No date';
  }

  return new Intl.DateTimeFormat('bn-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms));
}

function getStatusClass(status) {
  if (status === 'confirmed' || status === 'delivered') return 'text-bg-success';
  if (status === 'processing') return 'text-bg-primary';
  if (status === 'cancelled') return 'text-bg-danger';
  return 'text-bg-warning';
}

export default function OrderManagementPage({ onBack, currentUser, isAdmin = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const orderQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(orderQuery, snapshot => {
      setOrders(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const visibleOrders = useMemo(() => {
    if (isAdmin) {
      return orders;
    }

    return orders.filter(order => {
      if (!currentUser?.uid) return false;
      return order.userUid === currentUser.uid;
    });
  }, [orders, isAdmin, currentUser?.uid]);

  const filteredOrders = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) {
      return visibleOrders;
    }

    return visibleOrders.filter(order => {
      const phone = String(order.userPhone ?? '').toLowerCase();
      const userName = String(order.userName ?? '').toLowerCase();
      const itemMatch = Array.isArray(order.items)
        ? order.items.some(item => String(item.name ?? '').toLowerCase().includes(queryText))
        : false;
      return phone.includes(queryText) || userName.includes(queryText) || itemMatch;
    });
  }, [visibleOrders, searchQuery]);

  const loadingCards = Array.from({ length: 4 }, (_, index) => index);

  return (
    <section className="bstore-page">
      <div className="order-appbar">
        <div className="order-appbar__left">
          <p className="bstore-kicker mb-1">Order Management</p>
          <h1 className="h3 mb-1">{isAdmin ? 'All Orders' : 'My Orders'}</h1>
          <p className="bstore-muted mb-0">Track live order status updates from seller/admin.</p>
        </div>
        <button className="btn btn-outline-light order-appbar__back" type="button" onClick={onBack}>
          Back
        </button>
      </div>
      <style>{`
        .order-appbar {
          width: 100vw;
          margin-left: calc(-50vw + 50%);
          margin-right: calc(-50vw + 50%);
          background: linear-gradient(90deg, #1976d2 0%, #1565c0 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 1.1rem 2.5vw 1.1rem 2.5vw;
          box-shadow: 0 2px 12px 0 rgba(25, 118, 210, 0.10);
          border-bottom: 2px solid #1976d2;
          min-height: 56px;
        }
        .order-appbar__left {
          display: flex;
          flex-direction: column;
        }
        .order-appbar__back {
          color: #fff;
          border-color: #fff;
        }
        .order-appbar__back:hover {
          background: #1565c0;
          color: #fff;
        }
      `}</style>

      <div className="bstore-card mb-4">
        <input
          className="form-control order-input-white"
          type="search"
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
          placeholder="Search order by phone, name, or product"
        />
      </div>
      <style>{`
        .order-input-white,
        .order-input-white:focus {
          background: #fff !important;
          color: #111 !important;
          border: 1.5px solid #d0d7e3;
          box-shadow: 0 1px 4px 0 rgba(60, 80, 120, 0.04);
        }
      `}</style>

      {loading ? (
        <div className="d-grid gap-3">
          {loadingCards.map(index => (
            <div className="bstore-card" key={index}>
              <div className="bstore-skeleton bstore-skeleton--title mb-3" />
              <div className="bstore-skeleton bstore-skeleton--text mb-2" />
              <div className="bstore-skeleton bstore-skeleton--text bstore-skeleton--text-short mb-3" />
              <div className="bstore-skeleton bstore-skeleton--row" />
            </div>
          ))}
        </div>
      ) : !filteredOrders.length ? (
        <div className="bstore-card">No orders found.</div>
      ) : (
        <div className="d-grid gap-3">
          {filteredOrders.map(order => (
            <article className="bstore-card" key={order.id}>
              <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                <div>
                  <h2 className="h5 mb-1">{order.userName || 'Customer order'}</h2>
                  <p className="bstore-muted mb-1">Phone: {order.userPhone || 'N/A'}</p>
                  <p className="bstore-muted mb-1">Created: {formatDate(order.createdAt)}</p>
                  <span className={`badge ${getStatusClass(order.status || 'pending')}`}>
                    {order.status || 'pending'}
                  </span>
                  {order.statusMessage ? <p className="bstore-muted mt-2 mb-0">{order.statusMessage}</p> : null}
                 {order.statusUpdatedBy ? (
                   <p className="bstore-muted mt-2 mb-0">
                     <small>Confirmed by: {order.statusUpdatedBy.displayName} on {formatDate(order.statusUpdatedAt)}</small>
                   </p>
                 ) : null}
                 </div>
                <div className="text-lg-end">
                  <strong className="d-block">৳{Number(order.totalPrice ?? 0).toFixed(2)}</strong>
                  <span className="badge text-bg-light">{order.paymentMethod || 'Unknown method'}</span>
                </div>
              </div>

              <div className="bstore-order-items mt-3">
                {(order.items ?? []).map((item, index) => (
                  <div className="bstore-order-item" key={`${order.id}-${index}`}>
                    <strong>{item.name}</strong>
                    <span>Qty: {item.quantity}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
