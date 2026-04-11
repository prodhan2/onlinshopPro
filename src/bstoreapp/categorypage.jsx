import { useEffect, useMemo, useRef, useState } from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { MdCategory } from 'react-icons/md';
import { FiShoppingCart, FiLogIn } from 'react-icons/fi';
import { collection, getDocs } from 'firebase/firestore';
// Ensure this path is correct. If your file is named cartManager.js, change 'cardManager' to 'cartManager'
import { addToCart, getCartState, loadCart, subscribeCart } from './cardManager'; 
import { createBannerItem, createCategory, createProduct, getDiscountedUnitPrice } from './models';
import { db } from '../firebase';
import ShimmerImage from './ShimmerImage';
import dinLogo from '../utils/dinlogo.png';

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
    <div className="bstore-product-card bstore-skeleton-card" key={index}>
      <div className="bstore-skeleton bstore-skeleton--image" />
      <div className="bstore-product-card__body">
        <div className="bstore-skeleton bstore-skeleton--title" />
        <div className="bstore-skeleton bstore-skeleton--text" />
        <div className="bstore-skeleton bstore-skeleton--text bstore-skeleton--text-short" />
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="bstore-skeleton bstore-skeleton--price" />
          <div className="bstore-skeleton bstore-skeleton--chip" />
        </div>
        <div className="d-flex gap-2">
          <div className="bstore-skeleton bstore-skeleton--button w-100" />
          <div className="bstore-skeleton bstore-skeleton--button w-100" />
        </div>
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
}) {
  // Initialize state from cache immediately for perceived performance
  const [categories, setCategories] = useState(() => readCache(CACHE_KEYS.categories, createCategory));
  const [products, setProducts] = useState(() => readCache(CACHE_KEYS.products, createProduct));
  const [banners, setBanners] = useState(() => readCache(CACHE_KEYS.banners, createBannerItem));
  const [noticeText, setNoticeText] = useState(() => localStorage.getItem(CACHE_KEYS.notice) ?? '');
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Only show loading spinner if we have NO cached data at all
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
  
  const clickAnimationTimerRef = useRef(null);
  const cartHotTimerRef = useRef(null);
  const cartButtonRef = useRef(null);

  // --- Animation Handlers ---

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
    dot.className = 'bstore-fly-to-cart-dot';
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

  // --- Effects ---

  // Subscribe to cart changes
  useEffect(() => {
    const unsubscribe = subscribeCart(setCartState);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Banner Auto-Slider
  useEffect(() => {
    if (banners.length <= 1) {
      setActiveBanner(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveBanner(previous => (previous + 1) % banners.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (clickAnimationTimerRef.current) window.clearTimeout(clickAnimationTimerRef.current);
      if (cartHotTimerRef.current) window.clearTimeout(cartHotTimerRef.current);
    };
  }, []);

  // Load Data from Firestore
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      // We don't setLoading(true) here if we already have cached data to avoid UI flicker
      // Only set loading if the arrays are currently empty
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

        // Update Cache
        writeCache(CACHE_KEYS.categories, nextCategories);
        writeCache(CACHE_KEYS.products, nextProducts);
        writeCache(CACHE_KEYS.banners, nextBanners);
        localStorage.setItem(CACHE_KEYS.notice, nextNotice);

      } catch (error) {
        console.error("Error loading store data:", error);
        if (!ignore) {
          setOffline(true);
          // If we failed and have no data, we stay in loading/error state
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed dependencies to run only on mount. 

  // --- Derived State ---

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

  const drawerUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest User';
  const drawerUserEmail = currentUser?.email || 'Please login to continue';
  const drawerAvatarText = (drawerUserName || 'G').slice(0, 1).toUpperCase();
  const drawerRoleLabel = currentUser
    ? (canOpenAdminDashboard ? 'Admin' : canOpenCatalogManager ? 'Seller' : 'User')
    : 'Guest';

  return (
    <section className="bstore-page">
      {/* Inline Styles for specific animations/components */}
      <style>{`
        .btn-login-modern {
          background: linear-gradient(90deg, #1976d2 0%, #1565c0 100%);
          color: #fff;
          border: none;
          border-radius: 24px;
          padding: 6px 18px;
          box-shadow: 0 2px 8px rgba(21,101,192,0.10);
          transition: background 0.2s, box-shadow 0.2s;
        }
        .btn-login-modern:hover, .btn-login-modern:focus {
          background: linear-gradient(90deg, #1565c0 0%, #1976d2 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(21,101,192,0.18);
        }
        .bstore-fly-to-cart-dot {
          position: fixed;
          width: 10px;
          height: 10px;
          background-color: #dc3545;
          border-radius: 50%;
          z-index: 9999;
          pointer-events: none;
          animation: flyToCart 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes flyToCart {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--fly-x), var(--fly-y)) scale(0.2); opacity: 0; }
        }
      `}</style>

      {/* Top Bar */}
      <div className="bstore-topbar bstore-appbar" style={{ alignItems: 'center', display: 'flex' }}>
        <button
          className="btn btn-outline-secondary"
          type="button"
          aria-label="Open menu"
          onClick={() => setIsDrawerOpen(true)}
          style={{ marginRight: 10, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <MdCategory />
        </button>
        <img src={dinLogo} alt="Dinajpur Logo" style={{ height: 38, width: 38, objectFit: 'contain', marginRight: 12 }} />
        <div className="bstore-appbar__search" style={{ flex: '0 1 220px', margin: '0 1rem 0 0' }}>
          <input
            className="form-control"
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ maxWidth: 180, minWidth: 120, fontSize: 15 }}
          />
        </div>
        <div className="bstore-appbar__actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            ref={cartButtonRef}
            className={`btn btn-primary bstore-cart-button position-relative ${isCartHot || cartState.totalItems > 0 ? 'bstore-cart-button--hot' : ''}`}
            type="button"
            onClick={onOpenCart}
            aria-label="Cart"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}
          >
            <FiShoppingCart />
            {cartState.totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: 2,
                right: 2,
                background: '#dc3545',
                color: '#fff',
                borderRadius: '50%',
                fontSize: 12,
                minWidth: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
                fontWeight: 700,
              }}>{cartState.totalItems}</span>
            )}
          </button>
          
          {currentUser ? (
            <button
              className="btn btn-light btn-sm"
              style={{ borderRadius: '50%', padding: 4, marginLeft: 4 }}
              title="Profile"
              onClick={onOpenProfile}
            >
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              ) : (
                <FaUserCircle size={26} />
              )}
            </button>
          ) : (
            <button
              className="btn btn-login-modern"
              title="Login"
              onClick={onOpenLogin}
              style={{ marginLeft: 4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <FiLogIn size={22} />
              <span style={{ fontSize: 16 }}>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Drawer Backdrop & Sidebar */}
      <div 
        className={isDrawerOpen ? 'bstore-drawer-backdrop bstore-drawer-backdrop--show' : 'bstore-drawer-backdrop'} 
        onClick={() => setIsDrawerOpen(false)} 
      />
      <aside className={isDrawerOpen ? 'bstore-drawer bstore-drawer--open' : 'bstore-drawer'} aria-hidden={!isDrawerOpen}>
        <div className="bstore-drawer-user">
          <div className="member-avatar bstore-drawer-user__avatar" aria-hidden="true">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt={drawerUserName} referrerPolicy="no-referrer" />
            ) : (
              <span>{drawerAvatarText}</span>
            )}
          </div>
          <div className="bstore-drawer-user__meta">
            <strong className="bstore-drawer-user__name">{drawerUserName}</strong>
            <small className="bstore-drawer-user__email">{drawerUserEmail}</small>
            <span className={`bstore-drawer-user__role bstore-drawer-user__role--${drawerRoleLabel.toLowerCase()}`}>
              {drawerRoleLabel}
            </span>
          </div>
        </div>
        <div className="d-grid gap-2">
          {currentUser ? (
            <button className="btn btn-outline-secondary" type="button" onClick={() => {
              setIsDrawerOpen(false);
              onOpenProfile?.();
            }}>
              Profile
            </button>
          ) : (
            <button className="btn btn-outline-secondary" type="button" onClick={() => {
              setIsDrawerOpen(false);
              onOpenLogin?.();
            }}>
              Login
            </button>
          )}
          {currentUser ? (
            <button className="btn btn-outline-secondary" type="button" onClick={() => {
              setIsDrawerOpen(false);
              onOpenOrders?.();
            }}>
              My Orders
            </button>
          ) : null}
          {canOpenCatalogManager ? (
            <button className="btn btn-outline-secondary" type="button" onClick={() => {
              setIsDrawerOpen(false);
              onOpenSellerOrders?.();
            }}>
              Seller Orders
            </button>
          ) : null}
          {canOpenAdminDashboard ? (
            <button className="btn btn-outline-secondary" type="button" onClick={() => {
              setIsDrawerOpen(false);
              onOpenAdminDashboard?.();
            }}>
              Admin Dashboard
            </button>
          ) : null}
          {canOpenCatalogManager ? (
            <button className="btn btn-outline-secondary" type="button" onClick={() => {
              setIsDrawerOpen(false);
              onOpenCatalogManager?.();
            }}>
              Catalog Manager
            </button>
          ) : null}
          <button className="btn btn-primary" type="button" onClick={() => {
            setIsDrawerOpen(false);
            onOpenCart();
          }}>
            Open Cart
          </button>
          <button className="btn btn-light" type="button" onClick={() => setIsDrawerOpen(false)}>
            Close
          </button>
          {currentUser ? (
            <button className="btn btn-outline-danger" type="button" onClick={() => {
              setIsDrawerOpen(false);
              onSignOutUser?.();
            }}>
              Logout
            </button>
          ) : null}
        </div>
      </aside>

      {/* Notices */}
      {noticeText ? <div className="alert alert-info">{noticeText}</div> : null}
      {offline ? <div className="alert alert-warning">Offline mode: showing cached content.</div> : null}

      {/* Banner Slider */}
      {banners.length ? (
        <div className="bstore-banner-slider">
          <div
            className="bstore-banner-track"
            style={{ transform: `translateX(-${activeBanner * 100}%)` }}
          >
            {banners.map((banner, index) => (
              <div className="bstore-banner-slide" key={`${banner.imageUrl}-${index}`}>
                <div className="bstore-banner-card">
                  <ShimmerImage
                    src={banner.imageUrl}
                    alt={banner.description || 'Banner'}
                    wrapperClassName="bstore-banner-image-shell"
                  />
                </div>
              </div>
            ))}
          </div>

          {banners.length > 1 ? (
            <div className="bstore-banner-dots" aria-label="Banner pagination">
              {banners.map((banner, index) => (
                <button
                  key={`${banner.imageUrl}-dot-${index}`}
                  type="button"
                  className={index === activeBanner ? 'bstore-banner-dot bstore-banner-dot--active' : 'bstore-banner-dot'}
                  onClick={() => setActiveBanner(index)}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Categories Filter */}
      <div className="bstore-card mt-4">
        <div className="row g-2 g-lg-3 align-items-center bstore-filter-row">
          <div className="col-12">
            <div className="bstore-chip-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button
                className={`bstore-chip ${selectedCategory === 'all' ? 'bstore-chip--active' : ''}`}
                type="button"
                onClick={() => setSelectedCategory('all')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <MdCategory size={18} style={{ opacity: 0.7 }} /> All
              </button>
              {categories.map(category => (
                <button
                  className={`bstore-chip ${selectedCategory === category.id ? 'bstore-chip--active' : ''}`}
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {category.iconUrl ? (
                    <img src={category.iconUrl} alt={category.name} style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 3 }} />
                  ) : (
                    <MdCategory size={18} style={{ opacity: 0.7 }} />
                  )}
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product Header */}
      <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
        <h2 className="h4 mb-0">Products</h2>
        <span className="bstore-muted">{filteredProducts.length} items</span>
      </div>

      {/* Product Grid */}
      {loading ? (
        <>
          <div className="bstore-loading-banner">
            <div className="bstore-spinner-glow" />
            <div>
              <strong>Loading products</strong>
              <p className="bstore-muted mb-0">Fetching categories, banners, and product cards.</p>
            </div>
          </div>
          <div className="bstore-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <ProductCardSkeleton key={index} index={index} />
            ))}
          </div>
        </>
      ) : (
        <div className="bstore-grid">
          {filteredProducts.map(product => {
            // Safe image extraction
            const mainImage = product.image ? product.image.split(',')[0]?.trim() : '';
            
            return (
              <article
                className={`bstore-product-card ${clickedProductId === product.id ? 'bstore-product-card--clicked' : ''}`}
                key={product.id}
                onClick={() => {
                  handleProductCardClick(product.id);
                  onOpenProduct(product);
                }}
              >
                <div className="bstore-product-card__image position-relative">
                  {product.discount > 0 ? (
                    <span className="badge bstore-shimmer-badge bstore-discount-badge-top">{product.discount}% off</span>
                  ) : null}
                  <ShimmerImage
                    src={mainImage}
                    alt={product.name}
                    wrapperClassName="bstore-product-image-shell"
                  />
                </div>
                <div className="bstore-product-card__body">
                  <h3>{product.name}</h3>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="bstore-product-price-wrap">
                      {product.discount > 0 ? (
                        <>
                          <span className="bstore-product-price-old">৳{Number(product.price).toFixed(2)}</span>
                          <strong className="bstore-product-price-new">৳{getDiscountedUnitPrice(product).toFixed(2)}</strong>
                        </>
                      ) : (
                        <strong className="bstore-product-price-new">৳{getDiscountedUnitPrice(product).toFixed(2)}</strong>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {filteredProducts.length === 0 && !loading && (
             <div className="text-center py-5 text-muted">
               No products found matching your criteria.
             </div>
          )}
        </div>
      )}
    </section>
  );
}