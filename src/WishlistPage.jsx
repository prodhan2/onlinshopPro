import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWishlist, removeFromWishlist, clearWishlist } from './utils/wishlistUtils.js';
import ConfirmDialog from './components/ConfirmDialog';
import './styles.css';

const WishlistPage = ({ onBack, currentUser }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const navigate = useNavigate();

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
    await removeFromWishlist(productId);
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  const handleClearWishlist = async () => {
    await clearWishlist();
    setItems([]);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  if (!currentUser) {
    return (
      <div className="wishlist-page">
        <nav className="navbar navbar-expand-lg navbar-dark py-3 sticky-top category-navbar">
          <div className="container-fluid px-0">
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-link text-light p-0 d-flex align-items-center"
                type="button"
                aria-label="Go back"
                title="Back"
                onClick={handleBack}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span className="d-none d-sm-inline ms-1">Back</span>
              </button>
              <span className="navbar-brand fw-bold">My Wishlist</span>
            </div>
          </div>
        </nav>
        <div className="container py-5">
          <div className="glass-card p-5 text-center">
            <div className="mb-4" style={{ fontSize: '4rem' }}>🔐</div>
            <h2 className="h3 fw-bold mb-3">Sign in to view wishlist</h2>
            <p className="text-muted mb-4">Please sign in to see your saved items</p>
            <button className="btn btn-primary" onClick={handleBack}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wishlist-page">
        <div className="container py-5">
          <div className="glass-card p-5 text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="page-shell wishlist-page">
      <nav className="navbar navbar-expand-lg navbar-dark py-3 sticky-top category-navbar">
        <div className="container-fluid px-0">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-link text-light p-0 d-flex align-items-center"
              type="button"
              aria-label="Go back"
              title="Back"
              onClick={handleBack}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="d-none d-sm-inline ms-1">Back</span>
            </button>
            <span className="navbar-brand fw-bold">My Wishlist</span>
          </div>
        </div>
      </nav>

      <div className="container-fluid px-3 py-4">
        <div className="glass-card p-4 p-lg-5 mb-4">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
            <div>
              <h1 className="display-6 fw-bold mb-2">My Wishlist</h1>
              <p className="text-muted mb-0">
                {items.length === 0
                  ? 'Your wishlist is empty'
                  : `${items.length} item${items.length !== 1 ? 's' : ''} saved`}
              </p>
            </div>
            {items.length > 0 && (
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => setConfirmClear(true)}
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
              <button className="btn btn-primary" onClick={handleBack}>
                Start Shopping
              </button>
            </div>
          </div>
        ) : (
          <div className="row g-3 g-md-4">
            {items.map((item) => {
              const finalPrice = item.discount > 0
                ? item.price - (item.price * item.discount) / 100
                : item.price;
              const originalPrice = item.discount > 0
                ? item.price
                : Math.round(item.price * 1.08);

              return (
                <div key={item.id} className="col-6 col-sm-6 col-md-4 col-lg-3 col-xl-2">
                  <div className="glass-card product-card h-100 p-2 wishlist-item">
                    <div className="product-image-wrap">
                      <img
                        src={item.image || item.imageUrl || '/vite.svg'}
                        alt={item.name}
                        className="product-image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = '/vite.svg';
                        }}
                      />
                      {item.discount > 0 && (
                        <span className="product-badge product-badge--discount">
                          -{Math.round(item.discount)}%
                        </span>
                      )}
                      <button
                        className="wishlist-remove-btn"
                        onClick={() => setConfirmRemove(item)}
                        title="Remove from wishlist"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="product-body p-2 p-lg-3">
                      <h3 className="product-title mb-2">{item.name}</h3>

                      <div className="d-flex align-items-baseline gap-2 mb-2 flex-wrap">
                        <strong className="product-price">৳{finalPrice.toFixed(0)}</strong>
                        {item.discount > 0 && (
                          <span className="product-old-price">৳{originalPrice.toFixed(0)}</span>
                        )}
                      </div>

                      {item.seller && (
                        <p className="text-muted small mb-2 text-truncate">{item.seller}</p>
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
                        {item.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmClear === true}
        title="Clear Wishlist?"
        message="Are you sure you want to remove all items from your wishlist? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        type="danger"
        onConfirm={async () => {
          await handleClearWishlist();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />

      <ConfirmDialog
        isOpen={confirmRemove !== null}
        title="Remove from Wishlist?"
        message={confirmRemove ? `Are you sure you want to remove "${confirmRemove.name}" from your wishlist?` : ''}
        confirmText="Remove"
        cancelText="Cancel"
        type="warning"
        onConfirm={async () => {
          if (confirmRemove) {
            await handleRemoveItem(confirmRemove.id);
            setConfirmRemove(null);
          }
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </main>
  );
};

export default WishlistPage;
