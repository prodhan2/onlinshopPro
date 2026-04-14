import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { FaBox, FaShoppingCart, FaDollarSign, FaCheckCircle, FaEdit, FaTrash, FaPlus, FaChartLine, FaUsers, FaEye, FaArrowUp, FaArrowDown, FaStar, FaCalendar } from 'react-icons/fa';
import ShimmerImage from '../bstoreapp/ShimmerImage';
import { splitProductImages } from '../bstoreapp/models';
import './admin.css';

const SellerDashboardPage = ({ currentUser }) => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [animatedStats, setAnimatedStats] = useState(false);
  const navigate = useNavigate();

  // Fetch seller's products and orders
  useEffect(() => {
    const fetchSellerData = async () => {
      try {
        const productsSnapshot = await getDocs(collection(db, 'products'));
        const sellerProducts = [];
        productsSnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (data.createdBy?.uid === currentUser.uid || data.sellerId === currentUser.uid) {
            sellerProducts.push({ id: docSnapshot.id, ...data });
          }
        });

        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const sellerOrders = [];
        ordersSnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const hasSellerProduct = data.items?.some((item) =>
            sellerProducts.find((p) => p.id === item.id)
          );
          if (hasSellerProduct) {
            sellerOrders.push({ id: docSnapshot.id, ...data });
          }
        });

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
          pendingOrders: sellerOrders.filter((o) => o.status === 'pending').length,
          deliveredOrders: sellerOrders.filter((o) => o.status === 'delivered').length,
          conversionRate: sellerProducts.length > 0 ? ((confirmedOrders / sellerProducts.length) * 100).toFixed(1) : 0,
        };

        setProducts(sellerProducts);
        setOrders(sellerOrders);
        setStats(statsObj);
        setLoading(false);
        
        // Trigger animation
        setTimeout(() => setAnimatedStats(true), 100);
      } catch (error) {
        console.error('Error fetching seller data:', error);
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [currentUser.uid]);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const statusMessages = {
      processing: 'Your order has been confirmed and is being processed.',
      confirmed: 'Your order has been confirmed by seller.',
      delivered: 'Your order has been delivered successfully.',
      cancelled: 'Your order has been cancelled.',
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
      alert('Failed to update order status. Please try again.');
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') return orders;
    return orders.filter((order) => order.status === filterStatus);
  }, [orders, filterStatus]);

  const getStatusBadgeClass = (status) => {
    const badges = {
      pending: 'badge-pending',
      processing: 'badge-processing',
      confirmed: 'badge-confirmed',
      delivered: 'badge-delivered',
      cancelled: 'badge-cancelled',
    };
    return badges[status] || 'badge-pending';
  };

  if (loading) {
    return (
      <div className="seller-dashboard loading-state">
        <div className="modern-loader">
          <div className="loader-spinner"></div>
          <p className="loader-text">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard-pro">
      {/* Modern Gradient Navbar */}
      <nav className="seller-navbar-modern">
        <div className="seller-navbar-content">
          <div className="seller-navbar-left">
            <button
              className="btn-back-seller-modern"
              onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="btn-back-text">Back</span>
            </button>
            <div className="seller-info-modern">
              <div className="seller-avatar-modern">
                <img
                  src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email || 'Seller')}&background=667eea&color=fff`}
                  alt="Seller"
                  className="seller-avatar-img"
                />
                <div className="avatar-status-indicator"></div>
              </div>
              <div className="seller-details-modern">
                <h4 className="seller-name-modern">{currentUser.displayName || 'Seller'}</h4>
                <p className="seller-email-modern">{currentUser.email}</p>
                <span className="seller-badge-modern">Active Seller</span>
              </div>
            </div>
          </div>
          <div className="seller-navbar-right">
            <button 
              className="btn btn-add-product-modern" 
              onClick={() => window.dispatchEvent(new CustomEvent('open-catalog-admin'))}
            >
              <FaPlus /> <span className="btn-text">Add Product</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Modern Stats Cards with Glassmorphism */}
      <div className="stats-grid-modern">
        <div className={`stat-card-modern stat-card-gradient-blue ${animatedStats ? 'animate-in' : ''}`} style={{ animationDelay: '0ms' }}>
          <div className="stat-card-bg"></div>
          <div className="stat-icon-modern">
            <FaBox />
          </div>
          <div className="stat-content-modern">
            <div className="stat-value-modern">{stats.totalProducts}</div>
            <div className="stat-label-modern">Total Products</div>
            <div className="stat-trend">
              <FaArrowUp className="trend-icon" /> <span>Active</span>
            </div>
          </div>
        </div>

        <div className={`stat-card-modern stat-card-gradient-green ${animatedStats ? 'animate-in' : ''}`} style={{ animationDelay: '100ms' }}>
          <div className="stat-card-bg"></div>
          <div className="stat-icon-modern">
            <FaShoppingCart />
          </div>
          <div className="stat-content-modern">
            <div className="stat-value-modern">{stats.totalOrders}</div>
            <div className="stat-label-modern">Total Orders</div>
            <div className="stat-trend stat-trend-positive">
              <FaArrowUp className="trend-icon" /> <span>Growing</span>
            </div>
          </div>
        </div>

        <div className={`stat-card-modern stat-card-gradient-purple ${animatedStats ? 'animate-in' : ''}`} style={{ animationDelay: '200ms' }}>
          <div className="stat-card-bg"></div>
          <div className="stat-icon-modern">
            <FaCheckCircle />
          </div>
          <div className="stat-content-modern">
            <div className="stat-value-modern">{stats.confirmedOrders}</div>
            <div className="stat-label-modern">Completed</div>
            <div className="stat-trend stat-trend-positive">
              <FaStar className="trend-icon" /> <span>{stats.conversionRate}% rate</span>
            </div>
          </div>
        </div>

        <div className={`stat-card-modern stat-card-gradient-orange ${animatedStats ? 'animate-in' : ''}`} style={{ animationDelay: '300ms' }}>
          <div className="stat-card-bg"></div>
          <div className="stat-icon-modern">
            <FaDollarSign />
          </div>
          <div className="stat-content-modern">
            <div className="stat-value-modern">৳{stats.totalSales}</div>
            <div className="stat-label-modern">Total Revenue</div>
            <div className="stat-trend stat-trend-positive">
              <FaArrowUp className="trend-icon" /> <span>Earning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tab Navigation */}
      <div className="tabs-container-modern">
        <button 
          className={`tab-btn-modern ${activeTab === 'overview' ? 'active' : ''}`} 
          onClick={() => setActiveTab('overview')}
        >
          <FaChartLine className="tab-icon" /> 
          <span className="tab-label">Overview</span>
        </button>
        <button 
          className={`tab-btn-modern ${activeTab === 'orders' ? 'active' : ''}`} 
          onClick={() => setActiveTab('orders')}
        >
          <FaShoppingCart className="tab-icon" /> 
          <span className="tab-label">Orders</span>
          <span className="tab-badge">{orders.length}</span>
        </button>
        <button 
          className={`tab-btn-modern ${activeTab === 'products' ? 'active' : ''}`} 
          onClick={() => setActiveTab('products')}
        >
          <FaBox className="tab-icon" /> 
          <span className="tab-label">Products</span>
          <span className="tab-badge">{products.length}</span>
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="tab-content-modern">
          {/* Quick Stats with Glassmorphism */}
          <div className="quick-stats-modern">
            <div className="glass-card-modern">
              <div className="glass-card-icon pending-icon">
                <FaShoppingCart />
              </div>
              <div className="glass-card-content">
                <div className="glass-card-value">{stats.pendingOrders || 0}</div>
                <div className="glass-card-label">Pending</div>
              </div>
            </div>
            <div className="glass-card-modern">
              <div className="glass-card-icon processing-icon">
                <FaEdit />
              </div>
              <div className="glass-card-content">
                <div className="glass-card-value">{orders.filter((o) => o.status === 'processing').length}</div>
                <div className="glass-card-label">Processing</div>
              </div>
            </div>
            <div className="glass-card-modern">
              <div className="glass-card-icon delivered-icon">
                <FaCheckCircle />
              </div>
              <div className="glass-card-content">
                <div className="glass-card-value">{stats.deliveredOrders || 0}</div>
                <div className="glass-card-label">Delivered</div>
              </div>
            </div>
            <div className="glass-card-modern">
              <div className="glass-card-icon avg-icon">
                <FaDollarSign />
              </div>
              <div className="glass-card-content">
                <div className="glass-card-value">৳{orders.length > 0 ? (parseFloat(stats.totalSales) / orders.length).toFixed(2) : '0.00'}</div>
                <div className="glass-card-label">Avg Order</div>
              </div>
            </div>
          </div>

          {/* Recent Orders with Modern Design */}
          <div className="section-card-modern">
            <div className="section-header-modern">
              <h3 className="section-title-modern">
                <FaCalendar className="section-icon" />
                Recent Orders
              </h3>
              <button 
                className="btn-view-all-modern"
                onClick={() => setActiveTab('orders')}
              >
                View All →
              </button>
            </div>
            <div className="recent-orders-modern">
              {orders.slice(0, 5).map((order, index) => (
                <div key={order.id} className="recent-order-modern" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="recent-order-left">
                    <div className="order-avatar">
                      <FaShoppingCart />
                    </div>
                    <div className="recent-order-info">
                      <div className="recent-order-id">Order #{order.id.slice(0, 8)}</div>
                      <div className="recent-order-date">
                        {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="recent-order-right">
                    <div className="recent-order-total">৳{order.totalPrice?.toFixed(2) || '0.00'}</div>
                    <span className={`status-badge-modern status-${order.status}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="empty-state-modern">
                  <FaShoppingCart className="empty-icon-modern" />
                  <h4 className="empty-title">No Orders Yet</h4>
                  <p className="empty-text">Orders will appear here once customers place them</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab - Modern Design */}
      {activeTab === 'orders' && (
        <div className="tab-content-modern">
          <div className="filter-bar-modern">
            <div className="filter-bar-left">
              <FaShoppingCart className="filter-icon" />
              <label className="filter-label-modern">Filter Orders:</label>
            </div>
            <select 
              className="filter-select-modern" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="confirmed">Confirmed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="orders-grid-modern">
            {filteredOrders.length === 0 ? (
              <div className="empty-state-modern empty-state-large">
                <FaShoppingCart className="empty-icon-modern" />
                <h4 className="empty-title">No Orders Found</h4>
                <p className="empty-text">Orders will appear here once customers place them</p>
              </div>
            ) : (
              filteredOrders.map((order, index) => (
                <div key={order.id} className="order-card-modern" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="order-header-modern">
                    <div className="order-header-left">
                      <div className="order-id-modern">Order #{order.id.slice(0, 8)}</div>
                      <div className="order-meta-modern">
                        <span className="order-customer-modern">
                          <FaUsers /> {order.userName || order.customerName || 'Unknown'}
                        </span>
                        <span className="order-date-modern">
                          <FaCalendar /> {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span className={`status-badge-modern status-${order.status}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="order-items-list-modern">
                    {order.items?.map((item, idx) => {
                      const productImage = item.image ? item.image.split(',')[0]?.trim() : '';
                      return (
                        <div key={idx} className="order-item-row-modern">
                          <div className="order-item-left-modern">
                            {productImage ? (
                              <img 
                                src={productImage} 
                                alt={item.name} 
                                className="order-item-thumb-modern"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="order-item-thumb-placeholder-modern">
                                <FaBox />
                              </div>
                            )}
                            <div className="order-item-details-modern">
                              <div className="order-item-name-modern">{item.name}</div>
                              <div className="order-item-qty-modern">Quantity: {item.quantity}</div>
                            </div>
                          </div>
                          <div className="order-item-price-modern">৳{(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="order-footer-modern">
                    <div className="order-total-section-modern">
                      <div className="order-total-label-modern">Order Total:</div>
                      <div className="order-total-value-modern">৳{order.totalPrice?.toFixed(2) || '0.00'}</div>
                    </div>
                    <div className="order-actions-modern">
                      {order.status === 'pending' && (
                        <button 
                          className="btn-action-modern btn-warning-modern" 
                          onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                        >
                          <FaEdit /> Mark Processing
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <button 
                          className="btn-action-modern btn-success-modern" 
                          onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                        >
                          <FaCheckCircle /> Mark Confirmed
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button 
                          className="btn-action-modern btn-info-modern" 
                          onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                        >
                          <FaCheckCircle /> Mark Delivered
                        </button>
                      )}
                      {(order.status === 'pending' || order.status === 'processing') && (
                        <button 
                          className="btn-action-modern btn-danger-modern" 
                          onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                        >
                          <FaTrash /> Cancel
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

      {/* Products Tab - Modern Design */}
      {activeTab === 'products' && (
        <div className="tab-content-modern">
          <div className="products-header-modern">
            <h3 className="section-title-modern">
              <FaBox className="section-icon" />
              Your Products ({products.length})
            </h3>
            <button 
              className="btn-add-product-modern-main"
              onClick={() => window.dispatchEvent(new CustomEvent('open-catalog-admin'))}
            >
              <FaPlus /> Add New Product
            </button>
          </div>

          {products.length === 0 ? (
            <div className="empty-state-modern empty-state-large">
              <FaBox className="empty-icon-modern" />
              <h4 className="empty-title">No Products Yet</h4>
              <p className="empty-text">Start adding your products to sell them online</p>
              <button 
                className="btn-primary-modern"
                onClick={() => window.dispatchEvent(new CustomEvent('open-catalog-admin'))}
              >
                <FaPlus /> Add Your First Product
              </button>
            </div>
          ) : (
            <div className="products-grid-modern">
              {products.map((product, index) => {
                const productImages = splitProductImages(product);
                const mainImage = productImages.length > 0 ? productImages[0] : '';
                const finalPrice = product.discount > 0
                  ? product.price - (product.price * product.discount / 100)
                  : product.price;

                return (
                  <div key={product.id} className="product-card-modern" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="product-image-container-modern">
                      {mainImage ? (
                        <ShimmerImage
                          src={mainImage}
                          alt={product.name || 'Product'}
                          wrapperClassName="product-image-shell-modern"
                        />
                      ) : (
                        <div className="product-image-placeholder-modern">
                          <FaBox className="placeholder-icon-modern" />
                          <span>No Image</span>
                        </div>
                      )}
                      {product.discount > 0 && (
                        <span className="product-discount-badge-modern">-{Math.round(product.discount)}%</span>
                      )}
                      <div className="product-overlay-actions">
                        <button 
                          className="btn-view-product-modern"
                          onClick={() => handleViewProduct(product)}
                          title="View Product Details"
                        >
                          <FaEye />
                        </button>
                        <button 
                          className="btn-edit-product-modern"
                          onClick={() => window.dispatchEvent(new CustomEvent('open-catalog-admin'))}
                          title="Edit Product"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    </div>

                    <div className="product-info-section-modern">
                      <h4 className="product-name-modern">{product.name || 'Unnamed Product'}</h4>
                      
                      {product.description && (
                        <p className="product-description-modern">
                          {product.description.substring(0, 80)}
                          {product.description.length > 80 ? '...' : ''}
                        </p>
                      )}

                      <div className="product-pricing-modern">
                        {product.discount > 0 ? (
                          <>
                            <span className="product-final-price-modern">৳{Number(finalPrice).toFixed(2)}</span>
                            <span className="product-original-price-modern">৳{Number(product.price).toFixed(2)}</span>
                            <span className="discount-percent-modern">-{Math.round(product.discount)}%</span>
                          </>
                        ) : (
                          <span className="product-final-price-modern">৳{Number(product.price).toFixed(2)}</span>
                        )}
                      </div>

                      <div className="product-meta-modern">
                        <span className={`stock-badge-modern ${product.stock > 0 ? 'in-stock-modern' : 'out-of-stock-modern'}`}>
                          {product.stock > 0 ? `✓ ${product.stock} in stock` : '✗ Out of stock'}
                        </span>
                        {product.category && (
                          <span className="category-badge-modern">{product.category}</span>
                        )}
                      </div>

                      <div className="product-actions-modern">
                        <button 
                          className="btn-product-action-modern btn-edit-modern"
                          onClick={() => window.dispatchEvent(new CustomEvent('open-catalog-admin'))}
                        >
                          <FaEdit /> Edit
                        </button>
                        <button 
                          className="btn-product-action-modern btn-view-modern"
                          onClick={() => handleViewProduct(product)}
                        >
                          <FaEye /> View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Product Detail Modal - Modern Design */}
      {showProductModal && selectedProduct && (
        <div className="product-modal-overlay-modern" onClick={() => setShowProductModal(false)}>
          <div className="product-modal-content-modern" onClick={(e) => e.stopPropagation()}>
            <button className="btn-close-modal-modern" onClick={() => setShowProductModal(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="product-modal-header-modern">
              <div className="product-modal-images-modern">
                {splitProductImages(selectedProduct).map((img, idx) => (
                  <div key={idx} className="modal-image-wrapper">
                    <img 
                      src={img} 
                      alt={`${selectedProduct.name} ${idx + 1}`} 
                      className="modal-product-thumb-modern"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="product-modal-body-modern">
              <h2 className="modal-product-title">{selectedProduct.name || 'Unnamed Product'}</h2>
              <p className="modal-product-description">{selectedProduct.description}</p>
              <div className="modal-product-stats">
                <div className="modal-stat-row">
                  <div className="modal-stat-item">
                    <span className="modal-stat-icon">💰</span>
                    <div className="modal-stat-info">
                      <div className="modal-stat-label">Price</div>
                      <div className="modal-stat-value">৳{Number(selectedProduct.price).toFixed(2)}</div>
                    </div>
                  </div>
                  {selectedProduct.discount > 0 && (
                    <div className="modal-stat-item highlight">
                      <span className="modal-stat-icon">🏷️</span>
                      <div className="modal-stat-info">
                        <div className="modal-stat-label">Discount</div>
                        <div className="modal-stat-value discount-highlight">{Math.round(selectedProduct.discount)}% OFF</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-stat-row">
                  <div className="modal-stat-item">
                    <span className="modal-stat-icon">📦</span>
                    <div className="modal-stat-info">
                      <div className="modal-stat-label">Stock</div>
                      <div className={`modal-stat-value ${selectedProduct.stock > 0 ? 'text-success' : 'text-danger'}`}>
                        {selectedProduct.stock || 0} units
                      </div>
                    </div>
                  </div>
                  {selectedProduct.category && (
                    <div className="modal-stat-item">
                      <span className="modal-stat-icon">📂</span>
                      <div className="modal-stat-info">
                        <div className="modal-stat-label">Category</div>
                        <div className="modal-stat-value">{selectedProduct.category}</div>
                      </div>
                    </div>
                  )}
                </div>
                {selectedProduct.rating && (
                  <div className="modal-stat-row">
                    <div className="modal-stat-item">
                      <span className="modal-stat-icon">⭐</span>
                      <div className="modal-stat-info">
                        <div className="modal-stat-label">Rating</div>
                        <div className="modal-stat-value">{selectedProduct.rating} / 5.0</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboardPage;
