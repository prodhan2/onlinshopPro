import { useEffect, useMemo, useRef, useState } from 'react';
import { FaUserCircle, FaSearch, FaBars, FaStore, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { FiShoppingCart, FiLogIn, FiUser, FiHeart, FiGrid, FiChevronRight, FiArrowRight } from 'react-icons/fi';
import { collection, getDocs } from 'firebase/firestore';
import { addToCart, getCartState, loadCart, subscribeCart } from './cardManager';
import { createBannerItem, createCategory, createProduct, getDiscountedUnitPrice } from './models';
import { db } from '../firebase';
import ShimmerImage from './ShimmerImage';
import dinLogo from './dinlogo.png';

const CACHE_KEYS = {
  categories: 'bstoreapp-categories',
  products: 'bstoreapp-products',
  banners: 'bstoreapp-banners',
  notice: 'bstoreapp-notice',
};

function readCache(key, mapper = item => item) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(mapper) : [];
  } catch {
    return [];
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to write to cache', e);
  }
}

function ProductCardSkeleton({ index }) {
  return (
    <div className="pro-product-card pro-skeleton" key={index}>
      <div className="pro-product-image-shell pro-skeleton-block" />
      <div className="pro-product-info">
        <div className="pro-skeleton-line pro-skeleton-line--sm" />
        <div className="pro-skeleton-line" />
        <div className="pro-skeleton-line pro-skeleton-line--sm" />
      </div>
    </div>
  );
}

export default function CategoryPage({
  currentUser,
  onOpenCart,
  onOpenProduct,
  onOpenPosterBuilder,
  onOpenPosterHistory,
  onOpenAdminDashboard,
  onOpenCatalogManager,
  canOpenCatalogManager,
  canOpenAdminDashboard,
  onOpenLogin,
  onOpenProfile,
  onSignOutUser,
  onOpenOrders,
  onOpenSellerOrders,
  onOpenWishlist,
}) {
  const [categories, setCategories] = useState(() => readCache(CACHE_KEYS.categories, createCategory));
  const [products, setProducts] = useState(() => readCache(CACHE_KEYS.products, createProduct));
  const [banners, setBanners] = useState(() => readCache(CACHE_KEYS.banners, createBannerItem));
  const [noticeText, setNoticeText] = useState(() => localStorage.getItem(CACHE_KEYS.notice) ?? '');

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(() => {
    const cachedProds = localStorage.getItem(CACHE_KEYS.products);
    return !cachedProds || cachedProds === '[]';
  });

  const [offline, setOffline] = useState(false);
  const [cartState, setCartState] = useState(() => loadCart());
  const [clickedProductId, setClickedProductId] = useState(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCartHot, setIsCartHot] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const clickAnimationTimerRef = useRef(null);
  const cartHotTimerRef = useRef(null);
  const cartButtonRef = useRef(null);

  function handleProductCardClick(productId) {
    setClickedProductId(productId);
    if (clickAnimationTimerRef.current) {
      window.clearTimeout(clickAnimationTimerRef.current);
    }
    clickAnimationTimerRef.current = window.setTimeout(() => {
      setClickedProductId(null);
    }, 450);
  }

  function triggerFlyToCart(fromElement) {
    if (!fromElement || !cartButtonRef.current) return;

    const sourceRect = fromElement.getBoundingClientRect();
    const targetRect = cartButtonRef.current.getBoundingClientRect();
    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    const dot = document.createElement('span');
    dot.className = 'pro-fly-to-cart-dot';
    dot.style.left = `${startX}px`;
    dot.style.top = `${startY}px`;
    dot.style.setProperty('--fly-x', `${endX - startX}px`);
    dot.style.setProperty('--fly-y', `${endY - startY}px`);
    document.body.appendChild(dot);

    dot.addEventListener('animationend', () => {
      dot.remove();
    });
  }

  function activateCartHotState() {
    setIsCartHot(true);
    if (cartHotTimerRef.current) {
      window.clearTimeout(cartHotTimerRef.current);
    }
    cartHotTimerRef.current = window.setTimeout(() => {
      setIsCartHot(false);
    }, 800);
  }

  function handleAddToCart(product, event) {
    event.stopPropagation();
    if (!currentUser) {
      onOpenLogin?.();
      return;
    }

    const added = addToCart(product, 1);
    if (!added) {
      onOpenLogin?.();
      return;
    }

    triggerFlyToCart(event.currentTarget);
    activateCartHotState();
  }

  useEffect(() => {
    const unsubscribe = subscribeCart(setCartState);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) {
      setActiveBanner(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveBanner(previous => (previous + 1) % banners.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    return () => {
      if (clickAnimationTimerRef.current) window.clearTimeout(clickAnimationTimerRef.current);
      if (cartHotTimerRef.current) window.clearTimeout(cartHotTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      if (products.length === 0 && categories.length === 0) {
        setLoading(true);
      }

      try {
        const [categorySnap, productSnap, bannerSnap, noticeSnap] = await Promise.all([
          getDocs(collection(db, 'categories')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'banners')),
          getDocs(collection(db, 'notices')),
        ]);

        if (ignore) return;

        const categoryData = categorySnap.docs.map(docSnap => docSnap.data());
        const productData = productSnap.docs.map(docSnap => docSnap.data());
        const bannerData = bannerSnap.docs.map(docSnap => docSnap.data());
        const noticeData = noticeSnap.docs.map(docSnap => docSnap.data());

        const nextCategories = Array.isArray(categoryData) ? categoryData.map(createCategory) : [];
        const nextProducts = Array.isArray(productData) ? productData.map(createProduct) : [];
        const nextBanners = Array.isArray(bannerData)
          ? bannerData.map(createBannerItem).filter(item => item && item.show)
          : [];

        const noticeObj = Array.isArray(noticeData) && noticeData[0] ? noticeData[0] : {};
        const nextNotice = noticeObj.Notice ?? noticeObj.notice ?? noticeObj.text ?? noticeObj.title ?? '';

        setCategories(nextCategories);
        setProducts(nextProducts);
        setBanners(nextBanners);
        setNoticeText(nextNotice);
        setOffline(false);

        writeCache(CACHE_KEYS.categories, nextCategories);
        writeCache(CACHE_KEYS.products, nextProducts);
        writeCache(CACHE_KEYS.banners, nextBanners);
        localStorage.setItem(CACHE_KEYS.notice, nextNotice);
      } catch (error) {
        console.error("Error loading store data:", error);
        if (!ignore) {
          setOffline(true);
          if (products.length === 0) setLoading(false);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const base = selectedCategory === 'all'
      ? products
      : products.filter(product => product.categoryId === selectedCategory);

    if (!searchQuery.trim()) {
      return base;
    }

    const query = searchQuery.toLowerCase();
    return base.filter(product =>
      (product.name && product.name.toLowerCase().includes(query)) ||
      (product.description && product.description.toLowerCase().includes(query))
    );
  }, [products, searchQuery, selectedCategory]);

  const featuredProducts = useMemo(() => {
    return products.filter(p => p.discount > 0).slice(0, 8);
  }, [products]);

  const newProducts = useMemo(() => {
    return [...products].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8);
  }, [products]);

  const drawerUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest User';
  const drawerUserEmail = currentUser?.email || 'Please login to continue';
  const drawerAvatarText = (drawerUserName || 'G').slice(0, 1).toUpperCase();
  const drawerRoleLabel = currentUser
    ? (canOpenAdminDashboard ? 'Admin' : canOpenCatalogManager ? 'Seller' : 'User')
    : 'Guest';

  return (
    <div className="pro-store-page">
      {/* Inline Styles */}
      <style>{`
        .pro-fly-to-cart-dot {
          position: fixed;
          width: 10px;
          height: 10px;
          background-color: #ef4444;
          border-radius: 50%;
          z-index: 9999;
          pointer-events: none;
          animation: proFlyToCart 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes proFlyToCart {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--fly-x), var(--fly-y)) scale(0.2); opacity: 0; }
        }
      `}</style>

      {/* ===== TOP NAVIGATION ===== */}
      <header className="pro-store-header">
        {/* Top Info Bar */}
        <div className="pro-top-bar">
          <div className="pro-top-bar-content">
            <div className="pro-top-bar-left">
              <span className="pro-top-bar-item">
                <FaMapMarkerAlt /> Dinajpur, Bangladesh
              </span>
              <span className="pro-top-bar-divider">|</span>
              <span className="pro-top-bar-item">
                <FaPhone /> 24/7 Support
              </span>
            </div>
            <div className="pro-top-bar-right">
              {currentUser ? (
                <>
                  <button className="pro-top-btn" onClick={onOpenOrders}>
                    <FiGrid size={14} /> Orders
                  </button>
                  {canOpenCatalogManager && (
                    <button className="pro-top-btn" onClick={onOpenCatalogManager}>
                      <FiGrid size={14} /> Catalog
                    </button>
                  )}
                  {canOpenAdminDashboard && (
                    <button className="pro-top-btn" onClick={onOpenAdminDashboard}>
                      <FiGrid size={14} /> Admin
                    </button>
                  )}
                </>
              ) : (
                <span className="pro-top-bar-item">Free delivery on orders over ৳500</span>
              )}
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="pro-main-header">
          <div className="pro-main-header-content">
            {/* Logo */}
            <div className="pro-logo">
              <img src={dinLogo} alt="Beautiful Dinajpur" className="pro-logo-img" />
              <div className="pro-logo-text">
                <span className="pro-logo-title">Beautiful Dinajpur</span>
                <span className="pro-logo-subtitle">Online Marketplace</span>
              </div>
            </div>

            {/* Search Bar */}
            <div className={`pro-search-container ${searchFocused ? 'pro-search-focused' : ''}`}>
              <div className="pro-search-wrapper">
                <FaSearch className="pro-search-icon" />
                <input
                  type="text"
                  className="pro-search-input"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                {searchQuery && (
                  <button
                    className="pro-search-clear"
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="pro-header-actions">
              {currentUser ? (
                <>
                  <button className="pro-icon-btn" onClick={onOpenWishlist} title="Wishlist">
                    <FiHeart />
                  </button>
                  <button
                    ref={cartButtonRef}
                    className={`pro-icon-btn pro-cart-btn ${isCartHot || cartState.totalItems > 0 ? 'pro-cart-hot' : ''}`}
                    onClick={onOpenCart}
                    title="Cart"
                  >
                    <FiShoppingCart />
                    {cartState.totalItems > 0 && (
                      <span className="pro-cart-badge">{cartState.totalItems}</span>
                    )}
                  </button>
                  <button className="pro-user-btn" onClick={onOpenProfile} title="Profile">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Profile" className="pro-user-avatar" />
                    ) : (
                      <FaUserCircle size={28} />
                    )}
                  </button>
                </>
              ) : (
                <button className="pro-login-btn" onClick={onOpenLogin}>
                  <FiLogIn /> Login
                </button>
              )}
              <button
                className="pro-menu-btn"
                onClick={() => setIsDrawerOpen(true)}
              >
                <FaBars />
              </button>
            </div>
          </div>
        </div>

        {/* Category Navigation Bar */}
        {categories.length > 0 && (
          <div className="pro-category-nav">
            <div className="pro-category-nav-content">
              <button
                className={`pro-category-pill ${selectedCategory === 'all' ? 'pro-category-active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                <FaStore /> All Products
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`pro-category-pill ${selectedCategory === cat.id ? 'pro-category-active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.iconUrl ? (
                    <img src={cat.iconUrl} alt={cat.name} className="pro-category-icon" />
                  ) : (
                    <FaStore />
                  )}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ===== SIDE DRAWER ===== */}
      <div
        className={`pro-drawer-backdrop ${isDrawerOpen ? 'pro-drawer-backdrop-show' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <aside className={`pro-drawer ${isDrawerOpen ? 'pro-drawer-open' : ''}`}>
        <div className="pro-drawer-header">
          <div className="pro-drawer-user">
            <div className="pro-drawer-avatar">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt={drawerUserName} />
              ) : (
                <span>{drawerAvatarText}</span>
              )}
            </div>
            <div className="pro-drawer-user-info">
              <strong>{drawerUserName}</strong>
              <small>{drawerUserEmail}</small>
              <span className="pro-drawer-role">{drawerRoleLabel}</span>
            </div>
          </div>
          <button className="pro-drawer-close" onClick={() => setIsDrawerOpen(false)}>×</button>
        </div>

        <nav className="pro-drawer-nav">
          <button onClick={() => { setIsDrawerOpen(false); onOpenProfile?.(); }}>
            <FiUser /> My Profile
          </button>
          {currentUser && (
            <button onClick={() => { setIsDrawerOpen(false); onOpenOrders?.(); }}>
              <FiGrid /> My Orders
            </button>
          )}
          <button onClick={() => { setIsDrawerOpen(false); onOpenWishlist?.(); }}>
            <FiHeart /> Wishlist
          </button>
          {canOpenCatalogManager && (
            <button onClick={() => { setIsDrawerOpen(false); onOpenCatalogManager?.(); }}>
              <FiGrid /> Catalog Manager
            </button>
          )}
          {canOpenAdminDashboard && (
            <button onClick={() => { setIsDrawerOpen(false); onOpenAdminDashboard?.(); }}>
              <FiGrid /> Admin Dashboard
            </button>
          )}
          <button onClick={() => { setIsDrawerOpen(false); onOpenCart(); }}>
            <FiShoppingCart /> Shopping Cart
          </button>
          {currentUser ? (
            <button className="pro-drawer-logout" onClick={() => { setIsDrawerOpen(false); onSignOutUser?.(); }}>
              <FiLogIn /> Logout
            </button>
          ) : (
            <button className="pro-drawer-login" onClick={() => { setIsDrawerOpen(false); onOpenLogin?.(); }}>
              <FiLogIn /> Login
            </button>
          )}
        </nav>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="pro-main-content">
        {/* Notice Banner */}
        {noticeText && (
          <div className="pro-notice-banner">
            <span className="pro-notice-icon">📢</span>
            <span className="pro-notice-text">{noticeText}</span>
          </div>
        )}

        {/* Offline Notice */}
        {offline && (
          <div className="pro-offline-banner">
            ⚠️ Offline mode: showing cached content.
          </div>
        )}

        {/* Hero Banner Slider */}
        {banners.length > 0 && (
          <section className="pro-hero-slider pro-hero-full-width">
            <div
              className="pro-hero-track"
              style={{ transform: `translateX(-${activeBanner * 100}%)` }}
            >
              {banners.map((banner, index) => (
                <div className="pro-hero-slide" key={`${banner.imageUrl}-${index}`}>
                  <div className="pro-hero-card pro-hero-auto-cover">
                    <ShimmerImage
                      src={banner.imageUrl}
                      alt={banner.description || 'Banner'}
                      wrapperClassName="pro-hero-image-shell pro-hero-auto-shell"
                    />
                    {banner.description && (
                      <div className="pro-hero-overlay">
                        <h3>{banner.description}</h3>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {banners.length > 1 && (
              <div className="pro-hero-dots">
                {banners.map((banner, index) => (
                  <button
                    key={`${banner.imageUrl}-dot-${index}`}
                    className={`pro-hero-dot ${index === activeBanner ? 'pro-hero-dot-active' : ''}`}
                    onClick={() => setActiveBanner(index)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Features Bar */}
        <section className="pro-features-bar">
          <div className="pro-feature-card">
            <div className="pro-feature-icon pro-feature-icon--primary">
              <FaStore />
            </div>
            <div className="pro-feature-text">
              <strong>Wide Selection</strong>
              <span>Quality Products</span>
            </div>
          </div>
          <div className="pro-feature-card">
            <div className="pro-feature-icon pro-feature-icon--success">
              <FiGrid />
            </div>
            <div className="pro-feature-text">
              <strong>Fast Delivery</strong>
              <span>Across Dinajpur</span>
            </div>
          </div>
          <div className="pro-feature-card">
            <div className="pro-feature-icon pro-feature-icon--warning">
              <FaPhone />
            </div>
            <div className="pro-feature-text">
              <strong>24/7 Support</strong>
              <span>Always Available</span>
            </div>
          </div>
          <div className="pro-feature-card">
            <div className="pro-feature-icon pro-feature-icon--info">
              <FiUser />
            </div>
            <div className="pro-feature-text">
              <strong>Secure Shopping</strong>
              <span>Trusted Platform</span>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        {categories.length > 0 && (
          <section className="pro-section pro-categories-section">
            <div className="pro-section-header">
              <h2 className="pro-section-title">Shop by Category</h2>
              <button
                className="pro-section-link"
                onClick={() => setSelectedCategory('all')}
              >
                View All <FiChevronRight />
              </button>
            </div>
            <div className="pro-categories-grid">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`pro-category-card ${selectedCategory === cat.id ? 'pro-category-card-active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <div className="pro-category-card-icon">
                    {cat.iconUrl ? (
                      <img src={cat.iconUrl} alt={cat.name} />
                    ) : (
                      <FaStore />
                    )}
                  </div>
                  <span className="pro-category-card-name">{cat.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products (Discounted) */}
        {featuredProducts.length > 0 && selectedCategory === 'all' && !searchQuery && (
          <section className="pro-section pro-featured-section">
            <div className="pro-section-header">
              <h2 className="pro-section-title">
                🔥 Featured Deals
              </h2>
              <button className="pro-section-link" onClick={() => {}}>
                View All <FiChevronRight />
              </button>
            </div>
            <div className="pro-products-scroll">
              {featuredProducts.map(product => {
                const mainImage = product.image ? product.image.split(',')[0]?.trim() : '';
                return (
                  <article
                    key={`featured-${product.id}`}
                    className={`pro-product-card ${clickedProductId === product.id ? 'pro-product-card-clicked' : ''}`}
                    onClick={() => {
                      handleProductCardClick(product.id);
                      onOpenProduct(product);
                    }}
                  >
                    <div className="pro-product-image">
                      {product.discount > 0 && (
                        <span className="pro-discount-badge">-{product.discount}%</span>
                      )}
                      <ShimmerImage
                        src={mainImage}
                        alt={product.name}
                        wrapperClassName="pro-product-image-shell"
                      />
                    </div>
                    <div className="pro-product-info">
                      <h3 className="pro-product-name">{product.name}</h3>
                      <div className="pro-product-prices">
                        {product.discount > 0 && (
                          <span className="pro-product-old-price">৳{Number(product.price).toFixed(2)}</span>
                        )}
                        <span className="pro-product-price">৳{getDiscountedUnitPrice(product).toFixed(2)}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* All Products Section */}
        <section className="pro-section pro-products-section">
          <div className="pro-section-header">
            <h2 className="pro-section-title">
              {selectedCategory === 'all'
                ? (searchQuery ? `Search: "${searchQuery}"` : 'All Products')
                : categories.find(c => c.id === selectedCategory)?.name || 'Products'}
            </h2>
            <span className="pro-product-count">{filteredProducts.length} items</span>
          </div>

          {loading ? (
            <>
              <div className="pro-loading-banner">
                <div className="pro-spinner" />
                <p>Loading products...</p>
              </div>
              <div className="pro-products-grid">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ProductCardSkeleton key={index} index={index} />
                ))}
              </div>
            </>
          ) : filteredProducts.length > 0 ? (
            <div className="pro-products-grid">
              {filteredProducts.map(product => {
                const mainImage = product.image ? product.image.split(',')[0]?.trim() : '';
                return (
                  <article
                    key={product.id}
                    className={`pro-product-card ${clickedProductId === product.id ? 'pro-product-card-clicked' : ''}`}
                    onClick={() => {
                      handleProductCardClick(product.id);
                      onOpenProduct(product);
                    }}
                  >
                    <div className="pro-product-image">
                      {product.discount > 0 && (
                        <span className="pro-discount-badge">-{product.discount}%</span>
                      )}
                      <ShimmerImage
                        src={mainImage}
                        alt={product.name}
                        wrapperClassName="pro-product-image-shell"
                      />
                    </div>
                    <div className="pro-product-info">
                      <h3 className="pro-product-name">{product.name}</h3>
                      <div className="pro-product-prices">
                        {product.discount > 0 && (
                          <span className="pro-product-old-price">৳{Number(product.price).toFixed(2)}</span>
                        )}
                        <span className="pro-product-price">৳{getDiscountedUnitPrice(product).toFixed(2)}</span>
                      </div>
                      {currentUser && (
                        <button
                          className="pro-add-to-cart-btn"
                          onClick={(e) => handleAddToCart(product, e)}
                        >
                          <FiShoppingCart /> Add to Cart
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="pro-empty-state">
              <FaSearch className="pro-empty-icon" />
              <h3>No products found</h3>
              <p>Try adjusting your search or filter criteria.</p>
              <button className="pro-empty-cta" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                Clear Filters
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="pro-store-footer">
        <div className="pro-footer-content">
          <div className="pro-footer-brand">
            <img src={dinLogo} alt="Beautiful Dinajpur" className="pro-footer-logo" />
            <div>
              <h4>Beautiful Dinajpur</h4>
              <p>Connecting Sellers & Customers</p>
            </div>
          </div>
          <div className="pro-footer-links">
            <button onClick={() => onOpenLogin?.()}>Login</button>
            <button onClick={() => onOpenProfile?.()}>Profile</button>
            <button onClick={() => onOpenCart?.()}>Cart</button>
            {currentUser && <button onClick={() => onOpenOrders?.()}>Orders</button>}
          </div>
          <div className="pro-footer-bottom">
            <p>© 2026 Beautiful Dinajpur. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
