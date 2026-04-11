import React, { useState, useEffect } from 'react';
import { getWishlist, removeFromWishlist, clearWishlist } from './utils/wishlistUtils.js';
import './styles.css';

const WishlistPage = ({ onBack, currentUser }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const wishlistItems = await getWishlist();
      setItems(wishlistItems);
      setLoading(false);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      setLoading(false);
    }
  };

  const handleRemoveItem = async (productId) => {
    if (window.confirm('Remove from wishlist?')) {
      await removeFromWishlist(productId);
      setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    }
  };

  const handleClearWishlist = async () => {
    if (window.confirm('Clear entire wishlist?')) {
      await clearWishlist();
      setItems([]);
    }
  };

  if (!currentUser) {
    return (
      <div className="wishlist-page">
        <div className="glass-card p-5 text-center">
          <h2 className="h3 fw-bold mb-3">Sign in to view wishlist</h2>
          <button className="btn btn-primary" onClick={onBack}>
            Back to shopping
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="wishlist-page"><div className="spinner">Loading...</div></div>;
  }

  return (
    <main className="page-shell wishlist-page">
      <nav className="navbar navbar-expand-lg navbar-dark py-3 sticky-top category-navbar">
        <div className="container-fluid px-0">
          <span className="navbar-brand fw-bold">My Wishlist</span>
          <button className="btn btn-outline-light ms-auto" onClick={onBack}>
            Back to Shopping
          </button>
        </div>
      </nav>

      <div className="container-fluid px-0 py-4">
        <div className="glass-card p-4 p-lg-5 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="display-5 fw-bold mb-2">Wishlist</h1>
              <p className="text-muted mb-0">
                {items.length === 0
                  ? 'Your wishlist is empty'
                  : `${items.length} item${items.length !== 1 ? 's' : ''} in your wishlist`}
              </p>
            </div>
            {items.length > 0 && (
              <button
                className="btn btn-outline-danger"
                onClick={handleClearWishlist}
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="glass-card p-5 text-center">
            <div className="empty-wishlist">
              <div className="heart-icon mb-3">❤️</div>
              <h2 className="h3 fw-bold mb-2">Your wishlist is empty</h2>
              <p className="text-muted mb-4">
                Add items to your wishlist to save them for later
              </p>
              <button className="btn btn-primary" onClick={onBack}>
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <div className="wishlist-items">
            <div className="row g-4">
              {items.map((item) => {
                const finalPrice = item.discount > 0
                  ? item.price - (item.price * item.discount) / 100
                  : item.price;
                const originalPrice = item.discount > 0
                  ? item.price
                  : Math.round(item.price * 1.08);

                return (
                  <div key={item.id} className="col-12 col-sm-6 col-lg-3">
                    <div className="glass-card product-card h-100 p-2 wishlist-item">
                      <div className="product-image-wrap">
                        <img
                          src={item.image || item.imageUrl || '/vite.svg'}
                          alt={item.name}
                          className="product-image"
                          loading="lazy"
                        />
                        {item.discount > 0 && (
                          <span className="product-badge product-badge--discount">
                            -{Math.round(item.discount)}%
                          </span>
                        )}
                        <button
                          className="wishlist-remove-btn"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove from wishlist"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="product-body p-2 p-lg-3">
                        <h3 className="product-title mb-2">{item.name}</h3>

                        <div className="d-flex align-items-baseline gap-2 mb-2">
                          <strong className="product-price">৳{finalPrice.toFixed(0)}</strong>
                          {item.discount > 0 && (
                            <span className="product-old-price">৳{originalPrice.toFixed(0)}</span>
                          )}
                        </div>

                        {item.seller && (
                          <p className="text-muted small mb-2">{item.seller}</p>
                        )}

                        {item.stock !== undefined && (
                          <p className={`small mb-2 ${item.stock > 0 ? 'text-success' : 'text-danger'}`}>
                            {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                          </p>
                        )}

                        <button
                          type="button"
                          className="btn product-cta w-100"
                          disabled={item.stock === 0}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .wishlist-page {
          min-height: 100vh;
          background: var(--bg);
        }

        .empty-wishlist {
          padding: 40px 20px;
        }

        .heart-icon {
          font-size: 4rem;
          animation: heartBeat 1.3s ease-in-out infinite;
        }

        @keyframes heartBeat {
          0%, 100% {
            transform: scale(1);
          }
          14% {
            transform: scale(1.3);
          }
          28% {
            transform: scale(1);
          }
          42% {
            transform: scale(1.3);
          }
          70% {
            transform: scale(1);
          }
        }

        .wishlist-items {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .wishlist-item {
          position: relative;
          transition: all 0.3s ease;
        }

        .wishlist-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.1);
        }

        .wishlist-remove-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #dc3545;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .wishlist-remove-btn:hover {
          background: white;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
        }

        .product-card.wishlist-item .product-image-wrap {
          position: relative;
        }

        @media (max-width: 767px) {
          .heart-icon {
            font-size: 3rem;
          }

          .wishlist-items .row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </main>
  );
};

export default WishlistPage;
