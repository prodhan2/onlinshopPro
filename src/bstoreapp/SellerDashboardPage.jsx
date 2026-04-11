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
      <nav className="navbar navbar-expand-lg seller-appbar-pro mb-4">
        <div className="container-fluid">
          <button
            className="btn btn-light btn-sm me-2"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/';
              }
            }}
          >
            ← Back
          </button>
          <img
            src={currentUser.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.displayName || currentUser.email || 'Seller')}
            alt="Seller"
            className="rounded-circle border border-2 border-light me-2"
            style={{ width: 48, height: 48, objectFit: 'cover' }}
          />
          <div className="flex-grow-1">
            <div className="fw-bold text-white">{currentUser.displayName || 'Seller'}</div>
            <div className="small text-white-50">{currentUser.email}</div>
          </div>
          <button className="btn btn-success ms-auto" onClick={() => window.dispatchEvent(new CustomEvent('open-catalog-admin'))}>
            + Add Product
          </button>
        </div>
      </nav>
      <style>{`
        .seller-appbar-pro {
          background: linear-gradient(90deg, #1976d2 0%, #1565c0 100%);
          color: #fff;
        }
      `}</style>
      <style>{`
        .seller-appbar-pro {
          background: linear-gradient(90deg, #1976d2 0%, #1565c0 100%);
          color: #fff;
          padding: 0 0 0 0;
          margin-bottom: 32px;
          box-shadow: 0 4px 16px rgba(21,101,192,0.08);
        }
        .seller-appbar-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
          padding: 18px 24px;
        }
        .seller-appbar-left {
          display: flex;
          align-items: center;
        }
        .seller-avatar-pro {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #fff;
          margin-right: 16px;
        }
        .seller-info-pro {
          display: flex;
          flex-direction: column;
        }
        .seller-name-pro {
          font-weight: 700;
          font-size: 1.15rem;
        }
        .seller-email-pro {
          font-size: 0.95rem;
          color: #e3e3e3;
        }
        .seller-appbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>

      {/* Stats Section - Mobile List View */}
      <div className="container-fluid mb-3">
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="card text-center bg-primary text-white h-100">
              <div className="card-body">
                <div className="display-6 fw-bold">{stats.totalProducts}</div>
                <div className="card-title">Total Products</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card text-center bg-success text-white h-100">
              <div className="card-body">
                <div className="display-6 fw-bold">{stats.totalOrders}</div>
                <div className="card-title">Total Orders</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card text-center bg-info text-white h-100">
              <div className="card-body">
                <div className="display-6 fw-bold">{stats.confirmedOrders}</div>
                <div className="card-title">Confirmed Orders</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card text-center bg-warning text-dark h-100">
              <div className="card-body">
                <div className="display-6 fw-bold">${stats.totalSales}</div>
                <div className="card-title">Total Sales</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-3 container-fluid">
        <li className="nav-item">
          <button className={`nav-link${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link${activeTab === 'orders' ? ' active' : ''}`} onClick={() => setActiveTab('orders')}>Orders ({filteredOrders.length})</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link${activeTab === 'products' ? ' active' : ''}`} onClick={() => setActiveTab('products')}>Products ({products.length})</button>
        </li>
      </ul>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="container-fluid tab-content">
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <div className="fw-bold">Pending Orders</div>
                  <div className="display-6">{orders.filter((o) => o.status === 'pending').length}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <div className="fw-bold">Processing</div>
                  <div className="display-6">{orders.filter((o) => o.status === 'processing').length}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <div className="fw-bold">Delivered</div>
                  <div className="display-6">{orders.filter((o) => o.status === 'delivered').length}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card text-center">
                <div className="card-body">
                  <div className="fw-bold">Avg Order Value</div>
                  <div className="display-6">${orders.length > 0 ? (stats.totalSales / orders.length).toFixed(2) : 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="container-fluid tab-content">
          <div className="row mb-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Filter by Status:</label>
              <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="confirmed">Confirmed</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="row g-3">
            {filteredOrders.length === 0 ? (
              <div className="col-12"><p className="text-center text-muted py-5">No orders found</p></div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <div>
                        <strong>Order ID:</strong> <code>{order.id.slice(0, 8)}</code><br/>
                        <strong>Customer:</strong> {order.userName || 'Unknown'}<br/>
                        <strong>Date:</strong> {new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}
                      </div>
                      <span className={`badge status-badge status-${order.status}`}>{order.status}</span>
                    </div>
                    <div className="card-body">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="d-flex justify-content-between border-bottom py-1 small">
                          <span>{item.name}</span>
                          <span>×{item.quantity}</span>
                          <span className="fw-bold">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div className="fw-bold">Total: ${order.totalPrice?.toFixed(2) || 0}</div>
                      <div className="d-flex flex-wrap gap-2">
                        {order.status === 'pending' && (
                          <button className="btn btn-warning btn-sm" onClick={() => handleUpdateOrderStatus(order.id, 'processing')}>Mark Processing</button>
                        )}
                        {order.status === 'processing' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}>Mark Confirmed</button>
                        )}
                        {order.status === 'confirmed' && (
                          <button className="btn btn-info btn-sm" onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}>Mark Delivered</button>
                        )}
                        {(order.status === 'pending' || order.status === 'processing') && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}>Cancel Order</button>
                        )}
                      </div>
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
        <div className="container-fluid tab-content">
          <div className="row g-3">
            {products.length === 0 ? (
              <div className="col-12 text-center text-muted py-5">
                No products yet<br/>
                <button className="btn btn-success mt-3" onClick={() => window.dispatchEvent(new CustomEvent('open-catalog-admin'))}>Add Product</button>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100">
                    <div className="card-body d-flex flex-column align-items-start">
                      <div className="d-flex align-items-center w-100 mb-2">
                        <img
                          src={product.imageUrl || product.Image || 'https://via.placeholder.com/60'}
                          alt={product.name}
                          className="rounded me-2"
                          style={{ width: 60, height: 60, objectFit: 'cover' }}
                        />
                        <div className="flex-grow-1">
                          <strong>{product.name}</strong>
                          <p className="mb-1 small text-muted">{product.description?.slice(0, 100)}</p>
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="fw-bold">${product.price}</span>
                        {product.oldPrice && <span className="text-decoration-line-through text-muted ms-2">${product.oldPrice}</span>}
                      </div>
                      <div className="mb-2 small text-muted">
                        <span>{product.category}</span> | <span>Stock: {product.stock || 0}</span>
                      </div>
                      {/* Edit button and inline edit form removed as requested */}
                    </div>
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

        /* Stats Grid - Desktop */
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

        /* ========== MOBILE SPECIFIC STYLES ========== */
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .dashboard-header > div:last-child {
            width: 100%;
            flex-wrap: wrap;
          }

          /* Stats Mobile List View */
          .stats-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .stat-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px;
            border-radius: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .stat-card .stat-value {
            font-size: 1.8rem;
            margin: 0;
            font-weight: 700;
          }

          .stat-card .stat-label {
            font-size: 1rem;
            opacity: 1;
            font-weight: 500;
            text-align: right;
          }

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

          .product-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .tab-navigation {
            overflow-x: auto;
            padding-bottom: 5px;
          }

          .tab-btn {
            white-space: nowrap;
            padding: 10px 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default SellerDashboardPage;