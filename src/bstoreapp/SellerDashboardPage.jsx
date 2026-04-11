import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import './bstoreapp.css';

const SellerDashboardPage = ({ currentUser, onBack }) => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [editingProduct, setEditingProduct] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  // Fetch seller's products and orders with localStorage cache
  useEffect(() => {
    const cacheKey = `seller-dashboard-cache-${currentUser.uid}`;
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        setProducts(parsed.products || []);
        setOrders(parsed.orders || []);
        setStats(parsed.stats || {});
        setLoading(false);
      } catch {}
    }

    const fetchSellerData = async () => {
      try {
        // Fetch products created by this seller
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const sellerProducts = [];
        productsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.createdBy?.uid === currentUser.uid) {
            sellerProducts.push({ id: doc.id, ...data });
          }
        });

        // Fetch all orders and filter by seller's products
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const sellerOrders = [];
        ordersSnapshot.forEach((doc) => {
          const data = doc.data();
          const hasSellerProduct = data.items?.some((item) =>
            sellerProducts.find((p) => p.id === item.id)
          );
          if (hasSellerProduct) {
            sellerOrders.push({ id: doc.id, ...data });
          }
        });

        // Calculate stats
        const totalSales = sellerOrders.reduce((sum, order) => {
          const sellerItems = order.items?.filter((item) =>
            sellerProducts.find((p) => p.id === item.id)
          ) || [];
          return sum + sellerItems.reduce((s, item) => s + (item.price * item.quantity || 0), 0);
        }, 0);

        const confirmedOrders = sellerOrders.filter(
          (o) => o.status === 'confirmed' || o.status === 'delivered'
        ).length;

        const statsObj = {
          totalProducts: sellerProducts.length,
          totalOrders: sellerOrders.length,
          confirmedOrders,
          totalSales: totalSales.toFixed(2),
        };

        setProducts(sellerProducts);
        setOrders(sellerOrders);
        setStats(statsObj);
        setLoading(false);

        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({
          products: sellerProducts,
          orders: sellerOrders,
          stats: statsObj,
          cachedAt: Date.now(),
        }));
      } catch (error) {
        console.error('Error fetching seller data:', error);
        setLoading(false);
      }
    };

    // Always fetch in background to update cache
    fetchSellerData();
  }, [currentUser.uid]);

  // Update order status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const statusMessages = {
      processing: 'Processing your order...',
      confirmed: 'Your order has been confirmed by seller.',
      delivered: 'Your order has been delivered.',
      cancelled: 'Your order has been cancelled by seller.',
    };

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        statusMessage: statusMessages[newStatus] || '',
        statusUpdatedBy: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'Seller',
        },
        statusUpdatedAt: new Date(),
      });

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                statusMessage: statusMessages[newStatus],
                statusUpdatedBy: {
                  uid: currentUser.uid,
                  displayName: currentUser.displayName || 'Seller',
                },
                statusUpdatedAt: new Date(),
              }
            : order
        )
      );
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') return orders;
    return orders.filter((order) => order.status === filterStatus);
  }, [orders, filterStatus]);

  if (loading) {
    return <div className="seller-dashboard loading">Loading...</div>;
  }

  return (
    <div className="seller-dashboard">
      <div className="dashboard-header">
        <div className="seller-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.displayName || currentUser.email || 'Seller')}
            alt="Seller"
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #764ba2' }}
          />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{currentUser.displayName || 'Seller'}</div>
            <div style={{ color: '#666' }}>{currentUser.email}</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <h2 style={{ margin: 0 }}>Seller Dashboard</h2>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: 8 }}>
            Back
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalProducts}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.confirmedOrders}</div>
          <div className="stat-label">Confirmed Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${stats.totalSales}</div>
          <div className="stat-label">Total Sales</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders ({filteredOrders.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products ({products.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="overview-section">
            <h3>Quick Stats</h3>
            <div className="quick-stats">
              <div className="quick-stat">
                <span className="label">Pending Orders:</span>
                <span className="value">{orders.filter((o) => o.status === 'pending').length}</span>
              </div>
              <div className="quick-stat">
                <span className="label">Processing:</span>
                <span className="value">{orders.filter((o) => o.status === 'processing').length}</span>
              </div>
              <div className="quick-stat">
                <span className="label">Delivered:</span>
                <span className="value">{orders.filter((o) => o.status === 'delivered').length}</span>
              </div>
              <div className="quick-stat">
                <span className="label">Avg Order Value:</span>
                <span className="value">
                  ${orders.length > 0 ? (stats.totalSales / orders.length).toFixed(2) : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="tab-content">
          <div className="filter-section">
            <label>Filter by Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="confirmed">Confirmed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="orders-list">
            {filteredOrders.length === 0 ? (
              <p className="empty-state">No orders found</p>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="order-card seller-order">
                  <div className="order-header">
                    <div className="order-meta">
                      <strong>Order ID:</strong> <code>{order.id.slice(0, 8)}</code>
                      <strong>Customer:</strong> {order.userName || 'Unknown'}
                      <strong>Date:</strong> {new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}
                    </div>
                    <span className={`status-badge status-${order.status}`}>{order.status}</span>
                  </div>

                  <div className="order-items">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="item-row">
                        <span>{item.name}</span>
                        <span>×{item.quantity}</span>
                        <span className="price">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="order-footer">
                    <div className="total">Total: ${order.totalPrice?.toFixed(2) || 0}</div>
                    <div className="action-buttons">
                      {order.status === 'pending' && (
                        <button
                          className="btn btn-warning"
                          onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                        >
                          Mark Processing
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <button
                          className="btn btn-success"
                          onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                        >
                          Mark Confirmed
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          className="btn btn-info"
                          onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                        >
                          Mark Delivered
                        </button>
                      )}
                      {(order.status === 'pending' || order.status === 'processing') && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="tab-content">
          <div className="products-list">
            {products.length === 0 ? (
              <p className="empty-state">No products yet</p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="product-row seller-product">
                  <div className="product-info">
                    <img
                      src={product.imageUrl || product.Image || 'https://via.placeholder.com/60'}
                      alt={product.name}
                      className="product-thumb"
                    />
                    <div className="product-details">
                      <strong>{product.name}</strong>
                      <p>{product.description?.slice(0, 100)}</p>
                    </div>
                  </div>
                  <div className="product-pricing">
                    <span className="price">${product.price}</span>
                    {product.oldPrice && <span className="old-price">${product.oldPrice}</span>}
                  </div>
                  <div className="product-stats">
                    <span>{product.category}</span>
                    <span>Stock: {product.stock || 0}</span>
                  </div>
                  <div className="product-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setEditingProduct(product)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .seller-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .stat-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .tab-navigation {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e9ecef;
        }

        .tab-btn {
          padding: 10px 20px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 1rem;
          color: #6c757d;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
        }

        .tab-btn.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .tab-content {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .quick-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .quick-stat {
          display: flex;
          justify-content: space-between;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .quick-stat .label {
          font-weight: 500;
          color: #666;
        }

        .quick-stat .value {
          font-weight: bold;
          color: #667eea;
          font-size: 1.2rem;
        }

        .filter-section {
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .orders-list, .products-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .order-card {
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 15px;
          background: white;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .order-meta {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          font-size: 0.9rem;
        }

        .order-meta code {
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
        }

        .status-badge {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: bold;
          color: white;
        }

        .status-pending { background: #ffc107; color: black; }
        .status-processing { background: #17a2b8; }
        .status-confirmed { background: #28a745; }
        .status-delivered { background: #6c757d; }
        .status-cancelled { background: #dc3545; }

        .order-items {
          background: #f8f9fa;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 15px;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 0.9rem;
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
          border-top: 1px solid #e9ecef;
          flex-wrap: wrap;
          gap: 15px;
        }

        .total {
          font-weight: bold;
          font-size: 1.1rem;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .btn-sm {
          padding: 6px 10px;
          font-size: 0.85rem;
        }

        .btn-warning {
          background: #ffc107;
          color: black;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-info {
          background: #17a2b8;
          color: white;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .product-row {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background: white;
        }

        .product-info {
          display: flex;
          gap: 15px;
          flex: 1;
          align-items: center;
        }

        .product-thumb {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
        }

        .product-details {
          flex: 1;
        }

        .product-details strong {
          display: block;
          margin-bottom: 5px;
        }

        .product-details p {
          margin: 0;
          font-size: 0.85rem;
          color: #666;
        }

        .product-pricing {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .product-pricing .price {
          font-weight: bold;
          font-size: 1.1rem;
        }

        .product-pricing .old-price {
          text-decoration: line-through;
          color: #999;
        }

        .product-stats {
          display: flex;
          gap: 10px;
          font-size: 0.9rem;
          color: #666;
        }

        .product-actions {
          display: flex;
          gap: 8px;
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: #999;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 500px;
          font-size: 1.2rem;
          color: #666;
        }

        @media (max-width: 768px) {
          .order-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .order-footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .product-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SellerDashboardPage;
