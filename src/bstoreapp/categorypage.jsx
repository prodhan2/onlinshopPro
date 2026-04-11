import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { addToCart, getCartState, loadCart, subscribeCart } from './cardManager';
import { createBannerItem, createCategory, createProduct, getDiscountedUnitPrice } from './models';
import { db } from '../firebase';
import ShimmerImage from './ShimmerImage';

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
  localStorage.setItem(key, JSON.stringify(value));
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
  onOpenWishlist,
  onOpenOrders,
  onOpenSellerOrders,
}) {
  const [categories, setCategories] = useState(() => readCache(CACHE_KEYS.categories, createCategory));
  const [products, setProducts] = useState(() => readCache(CACHE_KEYS.products, createProduct));
  const [banners, setBanners] = useState(() => readCache(CACHE_KEYS.banners, createBannerItem));
  const [noticeText, setNoticeText] = useState(() => localStorage.getItem(CACHE_KEYS.notice) ?? '');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(products.length === 0);
  const [offline, setOffline] = useState(false);
  const [cartState, setCartState] = useState(() => loadCart());
  const [clickedProductId, setClickedProductId] = useState(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCartHot, setIsCartHot] = useState(false);
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

  useEffect(() => subscribeCart(setCartState), []);

  useEffect(() => {
    return () => {
      if (clickAnimationTimerRef.current) {
        window.clearTimeout(clickAnimationTimerRef.current);
      }

      if (cartHotTimerRef.current) {
        window.clearTimeout(cartHotTimerRef.current);
      }
    };
  }, []);

  function triggerFlyToCart(fromElement) {
    if (!fromElement || !cartButtonRef.current) {
      return;
    }

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

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(products.length === 0);

      try {
        const [categorySnap, productSnap, bannerSnap, noticeSnap] = await Promise.all([
          getDocs(collection(db, 'categories')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'banners')),
          getDocs(collection(db, 'notices')),
        ]);

        const categoryData = categorySnap.docs.map(docSnap => docSnap.data());
        const productData = productSnap.docs.map(docSnap => docSnap.data());
        const bannerData = bannerSnap.docs.map(docSnap => docSnap.data());
        const noticeData = noticeSnap.docs.map(docSnap => docSnap.data());

        if (ignore) {
          return;
        }

        const nextCategories = Array.isArray(categoryData) ? categoryData.map(createCategory) : [];
        const nextProducts = Array.isArray(productData) ? productData.map(createProduct) : [];
        const nextBanners = Array.isArray(bannerData)
          ? bannerData.map(createBannerItem).filter(item => item.show)
          : [];
        const nextNotice = Array.isArray(noticeData) && noticeData[0]
          ? noticeData[0].Notice ?? noticeData[0].notice ?? noticeData[0].text ?? noticeData[0].title ?? ''
          : '';

        setCategories(nextCategories);
        setProducts(nextProducts);
        setBanners(nextBanners);
        setNoticeText(nextNotice);
        setOffline(false);

        writeCache(CACHE_KEYS.categories, nextCategories);
        writeCache(CACHE_KEYS.products, nextProducts);
        writeCache(CACHE_KEYS.banners, nextBanners);
        localStorage.setItem(CACHE_KEYS.notice, nextNotice);
      } catch {
        if (!ignore) {
          setOffline(true);
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
  }, [products.length]);

  const filteredProducts = useMemo(() => {
    const base = selectedCategory === 'all'
      ? products
      : products.filter(product => product.categoryId === selectedCategory);

    if (!searchQuery.trim()) {
      return base;
    }

    const query = searchQuery.toLowerCase();
    return base.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query),
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
      <div className="bstore-topbar bstore-appbar">
        <button
          className="btn btn-outline-secondary"
          type="button"
          aria-label="Open menu"
          onClick={() => setIsDrawerOpen(true)}
        >
          Menu
        </button>
        <h1 className="bstore-appbar__title mb-0">Beautiful Dinajpur</h1>
        <div className="bstore-appbar__actions">
          <button
            ref={cartButtonRef}
            className={`btn btn-primary bstore-cart-button ${isCartHot || cartState.totalItems > 0 ? 'bstore-cart-button--hot' : ''}`}
            type="button"
            onClick={onOpenCart}
          >
            Cart ({cartState.totalItems})
          </button>
        </div>
      </div>

      <div className={isDrawerOpen ? 'bstore-drawer-backdrop bstore-drawer-backdrop--show' : 'bstore-drawer-backdrop'} onClick={() => setIsDrawerOpen(false)} />
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
          {currentUser ? (
            <button className="btn btn-outline-secondary" type="button" onClick={() => {
              setIsDrawerOpen(false);
              onOpenWishlist?.();
            }}>
              Wishlist
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

      {noticeText ? <div className="alert alert-info">{noticeText}</div> : null}
      {offline ? <div className="alert alert-warning">Offline mode: showing cached content.</div> : null}

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

      <div className="bstore-card mt-4">
        <div className="row g-2 g-lg-3 align-items-center bstore-filter-row">
          <div className="col-7 col-lg-4">
            <input
              className="form-control"
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search product name or description"
            />
          </div>
          <div className="col-5 col-lg-8">
            <div className="d-lg-none">
              <label htmlFor="bstore-mobile-category" className="visually-hidden">
                Category
              </label>
              <select
                id="bstore-mobile-category"
                className="form-select bstore-category-select"
                value={selectedCategory}
                onChange={event => setSelectedCategory(event.target.value)}
              >
                <option value="all">All</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bstore-chip-row d-none d-lg-flex">
              <button
                className={`bstore-chip ${selectedCategory === 'all' ? 'bstore-chip--active' : ''}`}
                type="button"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  className={`bstore-chip ${selectedCategory === category.id ? 'bstore-chip--active' : ''}`}
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
        <h2 className="h4 mb-0">Products</h2>
        <span className="bstore-muted">{filteredProducts.length} items</span>
      </div>

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
          {filteredProducts.map(product => (
            <article
              className={`bstore-product-card ${clickedProductId === product.id ? 'bstore-product-card--clicked' : ''}`}
              key={product.id}
              onClick={() => {
                handleProductCardClick(product.id);
                onOpenProduct(product);
              }}
            >
              <div className="bstore-product-card__image position-relative">
                {/* Discount badge at top-left */}
                {product.discount > 0 ? (
                  <span className="badge bstore-shimmer-badge bstore-discount-badge-top">{product.discount}% off</span>
                ) : null}
                <ShimmerImage
                  src={product.image ? product.image.split(',')[0]?.trim() : ''}
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
                {/* Removed Details and Add buttons. Card is now fully clickable for details. */}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
