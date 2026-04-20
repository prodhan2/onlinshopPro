import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getCartState, subscribeCart } from '../bstoreapp/cardManager';
import { getWishlist } from '../utils/wishlistUtils.js';
import { db } from '../firebase';
import './AccountDashboard.css';

export default function AccountDashboardPage({ currentUser }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [runningOrders, setRunningOrders] = useState(0);
  const [openedTickets, setOpenedTickets] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load orders
  useEffect(() => {
    async function loadOrders() {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);

        // Calculate total spent
        const spent = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);
        setTotalSpent(spent);

        // Count running orders (pending, processing, shipped)
        const running = ordersData.filter(order => 
          ['pending', 'processing', 'shipped'].includes(order.status?.toLowerCase())
        ).length;
        setRunningOrders(running);
      } catch (error) {
        console.error('Error loading orders:', error);
      }
    }

    loadOrders();
  }, [currentUser?.uid]);

  // Load cart
  useEffect(() => {
    const unsubscribe = subscribeCart((state) => {
      setCartItems(state?.items || []);
    });
    return () => unsubscribe();
  }, []);

  // Load wishlist
  useEffect(() => {
    async function loadWishlist() {
      try {
        const items = await getWishlist();
        setWishlistItems(items || []);
      } catch (error) {
        console.error('Error loading wishlist:', error);
      }
    }
    loadWishlist();
  }, []);

  const stats = useMemo(() => [
    {
      label: 'Total Orders',
      value: orders.length,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)'
    },
    {
      label: 'Running Orders',
      value: runningOrders,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
    },
    {
      label: 'Items in Cart',
      value: cartItems.length,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
    },
    {
      label: 'Wishlist Items',
      value: wishlistItems.length,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
    },
    {
      label: 'Amount Spent',
      value: `৳${totalSpent.toFixed(2)}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
    },
    {
      label: 'Opened Tickets',
      value: openedTickets,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      gradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)'
    }
  ], [orders, runningOrders, cartItems, wishlistItems, totalSpent, openedTickets]);

  if (!currentUser) {
    return (
      <div className="account-dashboard-page">
        <div className="account-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3>Please Login</h3>
          <p>Login to view your account dashboard</p>
          <button className="account-btn account-btn-primary" onClick={() => navigate('/login')}>
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-dashboard-page">
      {/* User Profile Header */}
      <div className="account-user-header">
        <div className="account-avatar">
          {currentUser.photoURL ? (
            <img src={currentUser.photoURL} alt={currentUser.displayName || 'User'} />
          ) : (
            <span>{(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}</span>
          )}
        </div>
        <div className="account-user-info">
          <h2>{currentUser.displayName || 'User'}</h2>
          <p>{currentUser.email}</p>
        </div>
        <button className="account-edit-btn" onClick={() => navigate('/profile')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="account-stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="account-stat-card" style={{ background: stat.gradient }}>
            <div className="account-stat-content">
              <span className="account-stat-value">{stat.value}</span>
              <span className="account-stat-label">{stat.label}</span>
            </div>
            <div className="account-stat-icon">{stat.icon}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="account-section">
        <div className="account-section-header">
          <h3>Recent Orders</h3>
          <button className="account-section-link" onClick={() => navigate('/orders')}>
            View All →
          </button>
        </div>
        {orders.length > 0 ? (
          <div className="account-orders-list">
            {orders.slice(0, 3).map(order => (
              <div key={order.id} className="account-order-item">
                <div className="account-order-info">
                  <span className="account-order-id">Order #{order.id.slice(-6)}</span>
                  <span className="account-order-date">
                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="account-order-status">
                  <span className={`account-order-status-badge status-${order.status || 'pending'}`}>
                    {order.status || 'Pending'}
                  </span>
                  <span className="account-order-amount">৳{order.total?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="account-empty-box">
            <p>No Order Found</p>
          </div>
        )}
      </div>

      {/* Wishlist Items */}
      <div className="account-section">
        <div className="account-section-header">
          <h3>Wishlist Items</h3>
          <button className="account-section-link" onClick={() => navigate('/wishlist')}>
            View All →
          </button>
        </div>
        {wishlistItems.length > 0 ? (
          <div className="account-wishlist-grid">
            {wishlistItems.slice(0, 4).map(item => (
              <div key={item.id} className="account-wishlist-item">
                {item.image && (
                  <img src={item.image.split(',')[0]?.trim()} alt={item.name} />
                )}
                <span className="account-wishlist-name">{item.name}</span>
                <span className="account-wishlist-price">৳{item.price?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="account-empty-box">
            <p>No Product in Wishlist</p>
          </div>
        )}
      </div>
    </div>
  );
}
