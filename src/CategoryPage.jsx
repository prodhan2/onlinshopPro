import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { addToWishlist, removeFromWishlist, isInWishlist } from './utils/wishlistUtils.js';

const PAGE_SIZE = 20;
const BRAND_NAME = 'Beautiful Dinajpur';

const CACHE_KEYS = {
  categories: 'beautiful-dinajpur-categories',
  products: 'beautiful-dinajpur-products',
  banners: 'beautiful-dinajpur-banners',
  notice: 'beautiful-dinajpur-notice',
};

function readCache(key, fallback = []) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore cache errors.
  }
}

function pickValue(record, keys, fallback = '') {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value);
    }
  }

  return fallback;
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value) {
  if (value === true) return true;
  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true' || value.trim() === '1';
  }
  return false;
}

function normalizeCategory(record, index) {
  return {
    id: pickValue(record, ['id', 'categoryId', 'slug'], `category-${index}`),
    name: pickValue(record, ['name', 'title', 'category'], `Category ${index + 1}`),
    image: pickValue(record, ['image', 'imageUrl', 'icon', 'banner'], ''),
  };
}

function normalizeProduct(record, index) {
  const priceText = pickValue(record, ['price', 'salePrice', 'amount'], '0');
  const discountText = pickValue(record, ['discount', 'discountPercent'], '0');
  const ratingText = pickValue(record, ['rating', 'stars'], '4.5');
  const soldText = pickValue(record, ['sold', 'soldCount', 'totalSold', 'orders'], '0');

  return {
    id: pickValue(record, ['id', 'productId', 'sku'], `product-${index}`),
    name: pickValue(record, ['name', 'title', 'productName'], `Product ${index + 1}`),
    description: pickValue(record, ['description', 'details', 'shortDescription'], ''),
    image: pickValue(record, ['image', 'imageUrl', 'thumbnail', 'photo'], ''),
    categoryId: pickValue(record, ['categoryId', 'category', 'categoryName'], 'all'),
    price: parseNumber(priceText, 0),
    discount: parseNumber(discountText, 0),
    rating: parseNumber(ratingText, 4.5),
    soldCount: parseNumber(soldText, 0),
    stock: parseNumber(pickValue(record, ['stock', 'quantity', 'available'], '0'), 0),
    seller: pickValue(record, ['seller', 'sellerName', 'brand'], 'Beautiful Dinajpur'),
    show: parseBoolean(pickValue(record, ['show', 'active', 'visible'], 'true')),
  };
}

function normalizeBanner(record, index) {
  return {
    id: pickValue(record, ['id', 'bannerId'], `banner-${index}`),
    imageUrl: pickValue(record, ['imageUrl', 'image', 'banner', 'photo'], ''),
    show: parseBoolean(pickValue(record, ['show', 'active', 'visible'], 'true')),
    title: pickValue(record, ['title', 'name'], ''),
  };
}

function sortCategories(categories) {
  const allCategory = { id: 'all', name: 'All Products', image: '' };
  return [allCategory, ...categories.filter(category => category.id !== 'all')];
}

function formatSoldCount(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `${Math.max(0, Math.round(value))}`;
}

export default function CategoryPage({
  onBackToProfile,
  onSignOut,
  onOpenLogin,
  onOpenAdmin,
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [noticeText, setNoticeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [activeBanner, setActiveBanner] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [sortBy, setSortBy] = useState('relevant');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minRating, setMinRating] = useState(0);
  const [wishlistItems, setWishlistItems] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);
  const deferredSearch = useDeferredValue(searchTerm);
  const loadMoreRef = useRef(null);

  // Monitor auth state and load wishlist
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadWishlist();
      } else {
        setWishlistItems(new Set());
      }
    });
    return unsubscribe;
  }, []);

  const loadWishlist = async () => {
    try {
      const wishlistProducts = await Promise.all(
        products.map(async (product) => {
          const inWishlist = await isInWishlist(product.id);
          return inWishlist ? product.id : null;
        })
      );
      setWishlistItems(new Set(wishlistProducts.filter(Boolean)));
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const toggleWishlist = async (e, product) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('Please sign in to add to wishlist');
      return;
    }

    const isInWish = wishlistItems.has(product.id);
    if (isInWish) {
      await removeFromWishlist(product.id);
      setWishlistItems((prev) => {
        const updated = new Set(prev);
        updated.delete(product.id);
        return updated;
      });
    } else {
      await addToWishlist(product.id, product);
      setWishlistItems((prev) => new Set(prev).add(product.id));
    }
  };

  // Calculate price range from products
  const priceStats = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 10000 };
    const prices = products.map(p => p.price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    let filtered = products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.seller.toLowerCase().includes(query);
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchesRating = product.rating >= minRating;

      return matchesCategory && matchesSearch && product.show !== false && matchesPrice && matchesRating;
    });

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => (b.id?.localeCompare(a.id) || 0));
        break;
      case 'relevant':
      default:
        // Keep natural order
        break;
    }

    return filtered;
  }, [deferredSearch, products, selectedCategory, priceRange, minRating, sortBy]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, pageCount * PAGE_SIZE);
  }, [filteredProducts, pageCount]);

  const hasMoreProducts = visibleProducts.length < filteredProducts.length;

  async function loadFromServer() {
      const responses = await Promise.allSettled([
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'banners')),
        getDocs(collection(db, 'notices')),
    ]);

    const [categoryResult, productResult, bannerResult, noticeResult] = responses;
    let nextCategories = [];
    let nextProducts = [];
    let nextBanners = [];
    let nextNotice = '';

    if (categoryResult.status === 'fulfilled') {
      const data = categoryResult.value.docs.map(docSnap => docSnap.data());
      nextCategories = Array.isArray(data) ? data.map(normalizeCategory).filter(item => item.name) : [];
    }

    if (productResult.status === 'fulfilled') {
      const data = productResult.value.docs.map(docSnap => docSnap.data());
      nextProducts = Array.isArray(data) ? data.map(normalizeProduct).filter(item => item.name) : [];
    }

    if (bannerResult.status === 'fulfilled') {
      const data = bannerResult.value.docs.map(docSnap => docSnap.data());
      nextBanners = Array.isArray(data)
        ? data.map(normalizeBanner).filter(item => item.show && item.imageUrl)
        : [];
    }

    if (noticeResult.status === 'fulfilled') {
      const data = noticeResult.value.docs.map(docSnap => docSnap.data());
      nextNotice = Array.isArray(data) && data.length > 0 ? pickValue(data[0], ['title', 'notice', 'text'], '') : '';
    }

    if (nextCategories.length > 0) {
      setCategories(sortCategories(nextCategories));
      writeCache(CACHE_KEYS.categories, sortCategories(nextCategories));
    }

    if (nextProducts.length > 0) {
      setProducts(nextProducts);
      writeCache(CACHE_KEYS.products, nextProducts);
    }

    if (nextBanners.length > 0) {
      setBanners(nextBanners);
      writeCache(CACHE_KEYS.banners, nextBanners);
    }

    if (nextNotice) {
      setNoticeText(nextNotice);
      writeCache(CACHE_KEYS.notice, nextNotice);
    }

    setOffline(false);
    setLoading(false);
  }

  async function loadCategoryPage({ fromCache = true } = {}) {
    setRefreshing(true);

    if (fromCache) {
      const cachedCategories = readCache(CACHE_KEYS.categories, []);
      const cachedProducts = readCache(CACHE_KEYS.products, []);
      const cachedBanners = readCache(CACHE_KEYS.banners, []);
      const cachedNotice = readCache(CACHE_KEYS.notice, '');

      if (cachedCategories.length > 0) {
        setCategories(sortCategories(cachedCategories));
      }
      if (cachedProducts.length > 0) {
        setProducts(cachedProducts);
      }
      if (cachedBanners.length > 0) {
        setBanners(cachedBanners);
      }
      if (cachedNotice) {
        setNoticeText(cachedNotice);
      }
    }

    try {
      await loadFromServer();
    } catch {
      setOffline(true);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const cachedCategories = readCache(CACHE_KEYS.categories, []);
    const cachedProducts = readCache(CACHE_KEYS.products, []);
    const cachedBanners = readCache(CACHE_KEYS.banners, []);
    const cachedNotice = readCache(CACHE_KEYS.notice, '');

    if (cachedCategories.length > 0) {
      setCategories(sortCategories(cachedCategories));
    }
    if (cachedProducts.length > 0) {
      setProducts(cachedProducts);
      setLoading(false);
      setOffline(true);
    }
    if (cachedBanners.length > 0) {
      setBanners(cachedBanners);
    }
    if (cachedNotice) {
      setNoticeText(cachedNotice);
    }

    loadCategoryPage({ fromCache: false });
  }, []);

  useEffect(() => {
    setPageCount(1);
  }, [selectedCategory, deferredSearch]);

  useEffect(() => {
    if (filteredProducts.length === 0 || !hasMoreProducts) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setPageCount(previousCount => previousCount + 1);
        }
      },
      { rootMargin: '200px' },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [filteredProducts.length, hasMoreProducts]);

  useEffect(() => {
    if (banners.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveBanner(previousIndex => (previousIndex + 1) % banners.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  const mainBanner = banners[activeBanner] || banners[0];
  const previewFinalPrice = previewProduct
    ? (previewProduct.discount > 0
      ? previewProduct.price - (previewProduct.price * previewProduct.discount) / 100
      : previewProduct.price)
    : 0;

  return (
    <main className="page-shell category-shell">
      <nav className="navbar navbar-expand-lg navbar-dark py-3 sticky-top category-navbar">
        <div className="container-fluid px-0">
          <span className="navbar-brand fw-bold">{BRAND_NAME}</span>
          <div className="d-flex gap-2 ms-auto flex-wrap align-items-center">
            {/* Show user photo if logged in */}
            {currentUser && currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || currentUser.email || 'User'}
                className="rounded-circle border"
                style={{ width: 38, height: 38, objectFit: 'cover', marginRight: 8 }}
                referrerPolicy="no-referrer"
              />
            ) : null}
            {onOpenLogin ? (
              <button type="button" className="btn btn-light" onClick={onOpenLogin}>
                Member Login
              </button>
            ) : null}
            {onOpenAdmin ? (
              <button type="button" className="btn btn-warning" onClick={onOpenAdmin}>
                Admin Login
              </button>
            ) : null}
            {onBackToProfile ? (
              <button type="button" className="btn btn-outline-light" onClick={onBackToProfile}>
                Back to Profile
              </button>
            ) : null}
            {onSignOut ? (
              <button type="button" className="btn btn-outline-light" onClick={onSignOut}>
                Sign out
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-light"
              onClick={() => loadCategoryPage({ fromCache: true })}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

      </nav>

      <div className="container-fluid px-0 py-4">
        <div className="category-hero glass-card p-4 p-lg-5 mb-4">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4">
            <div>
              <p className="section-kicker mb-2">Category Page</p>
              <h1 className="display-5 fw-bold mb-2">Fast shopping view</h1>
              <p className="hero-copy mb-0">
                Category browsing, search, banners, and products all in one responsive JSX page.
              </p>
            </div>
            <div className="category-status text-end text-lg-start">
              <span className={`badge ${offline ? 'text-bg-warning' : 'text-bg-success'}`}>
                {offline ? 'Offline cache' : 'Live data'}
              </span>
              {noticeText ? <p className="mb-0 mt-2 notice-text">{noticeText}</p> : null}
            </div>
          </div>

          <div className="row g-3 align-items-center">
            <div className="col-12 col-lg-8">
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-dark text-white border-0">Search</span>
                <input
                  type="text"
                  className="form-control"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Search products, descriptions, or sellers"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    className="btn btn-outline-light"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            <div className="col-12 col-lg-4 text-lg-end">
              <div className="shop-metrics">
                <div>
                  <strong>{products.length}</strong>
                  <span>Products</span>
                </div>
                <div>
                  <strong>{categories.length > 0 ? categories.length - 1 : 0}</strong>
                  <span>Categories</span>
                </div>
                <div>
                  <strong>{filteredProducts.length}</strong>
                  <span>Matches</span>
                </div>
              </div>
            </div>
          </div>

          {/* Horizontal Category List below search box */}
          <div className="category-horizontal-list mb-4 px-1">
            <div style={{
              display: 'flex',
              overflowX: 'auto',
              gap: '0.75rem',
              padding: '0.5rem 0',
              WebkitOverflowScrolling: 'touch',
            }}>
              {categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  className={
                    selectedCategory === category.id
                      ? 'btn btn-dark category-chip flex-shrink-0'
                      : 'btn btn-outline-light category-chip flex-shrink-0'
                  }
                  style={{ minWidth: 110, whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
      </nav>

      <div className="container-fluid px-0 py-4">
        <div className="category-hero glass-card p-4 p-lg-5 mb-4">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4">
            <div>
              <p className="section-kicker mb-2">Category Page</p>
              <h1 className="display-5 fw-bold mb-2">Fast shopping view</h1>
              <p className="hero-copy mb-0">
                Category browsing, search, banners, and products all in one responsive JSX page.
              </p>
            </div>
            <div className="category-status text-end text-lg-start">
              <span className={`badge ${offline ? 'text-bg-warning' : 'text-bg-success'}`}>
                {offline ? 'Offline cache' : 'Live data'}
              </span>
              {noticeText ? <p className="mb-0 mt-2 notice-text">{noticeText}</p> : null}
            </div>
          </div>

          <div className="row g-3 align-items-center">
            <div className="col-12 col-lg-8">
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-dark text-white border-0">Search</span>
                <input
                  type="text"
                  className="form-control"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="Search products, descriptions, or sellers"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    className="btn btn-outline-light"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            <div className="col-12 col-lg-4 text-lg-end">
              <div className="shop-metrics">
                <div>
                  <strong>{products.length}</strong>
                  <span>Products</span>
                </div>
                <div>
                  <strong>{categories.length > 0 ? categories.length - 1 : 0}</strong>
                  <span>Categories</span>
                </div>
                <div>
                  <strong>{filteredProducts.length}</strong>
                  <span>Matches</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sort and Filter Controls */}
        <div className="glass-card p-3 p-lg-4 mb-4 filter-section">
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label className="form-label fw-bold">Sort By</label>
              <select 
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="relevant">Most Relevant</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rating</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label fw-bold">Rating</label>
              <select 
                className="form-select"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
              >
                <option value="0">All Ratings</option>
                <option value="3">3★ & above</option>
                <option value="3.5">3.5★ & above</option>
                <option value="4">4★ & above</option>
                <option value="4.5">4.5★ & above</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-bold">Price Range: ৳{priceRange[0]} - ৳{priceRange[1]}</label>
              <div className="price-range-inputs d-flex gap-2">
                <input 
                  type="range" 
                  className="form-range flex-grow-1"
                  min={priceStats.min}
                  max={priceStats.max}
                  value={priceRange[0]}
                  onChange={(e) => {
                    const newMin = Math.min(parseInt(e.target.value), priceRange[1]);
                    setPriceRange([newMin, priceRange[1]]);
                  }}
                />
                <input 
                  type="range" 
                  className="form-range flex-grow-1"
                  min={priceStats.min}
                  max={priceStats.max}
                  value={priceRange[1]}
                  onChange={(e) => {
                    const newMax = Math.max(parseInt(e.target.value), priceRange[0]);
                    setPriceRange([priceRange[0], newMax]);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Reset filters button */}
          {(sortBy !== 'relevant' || priceRange[0] !== 0 || priceRange[1] !== priceStats.max || minRating !== 0) && (
            <div className="mt-3">
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setSortBy('relevant');
                  setPriceRange([priceStats.min, priceStats.max]);
                  setMinRating(0);
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {mainBanner ? (
          <div className="glass-card p-3 p-lg-4 mb-4">
            <div className="row g-3 align-items-stretch">
              <div className="col-12 col-lg-8">
                <div className="banner-frame h-100">
                  <img
                    src={mainBanner.imageUrl}
                    alt={mainBanner.title || 'Banner'}
                    className="img-fluid w-100 h-100 object-fit-cover rounded-4"
                    loading="lazy"
                    onError={event => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="banner-side h-100">
                  <p className="section-kicker mb-2">Highlights</p>
                  <h2 className="h3 fw-bold mb-3">Featured banner</h2>
                  <p className="text-body-secondary">
                    {mainBanner.title || 'Promotional content from the sheet appears here.'}
                  </p>
                  <div className="banner-dots mt-auto">
                    {banners.map((banner, index) => (
                      <button
                        key={banner.id}
                        type="button"
                        className={index === activeBanner ? 'dot dot--active' : 'dot'}
                        aria-label={`Go to banner ${index + 1}`}
                        onClick={() => setActiveBanner(index)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="glass-card p-3 p-lg-4 mb-4">
          <div className="d-flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                className={
                  selectedCategory === category.id ? 'btn btn-dark category-chip' : 'btn btn-outline-light category-chip'
                }
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="row g-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="col-6 col-lg-3">
                <div className="glass-card p-3 product-skeleton h-100">
                  <div className="placeholder-glow">
                    <div className="placeholder bg-secondary rounded-4 w-100" style={{ height: 180 }} />
                    <div className="placeholder bg-secondary rounded mt-3 w-75" style={{ height: 18 }} />
                    <div className="placeholder bg-secondary rounded mt-2 w-50" style={{ height: 16 }} />
                    <div className="placeholder bg-secondary rounded mt-3 w-100" style={{ height: 14 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="glass-card p-5 text-center">
            <h2 className="h3 fw-bold mb-2">No products found</h2>
            <p className="text-body-secondary mb-0">Try another category or search term.</p>
          </div>
        ) : (
          <>
            <div className="row g-4">
              {visibleProducts.map(product => {
                const finalPrice = product.discount > 0
                  ? product.price - (product.price * product.discount) / 100
                  : product.price;
                const originalPrice = product.discount > 0
                  ? product.price
                  : Math.round(product.price * 1.08);
                const imageUrl = product.image || '/vite.svg';

                return (
                  <div key={product.id} className="col-6 col-lg-3">
                    <article
                      className="glass-card product-card h-100 p-2"
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewProduct(product)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setPreviewProduct(product);
                        }
                      }}
                    >
                      <div className="product-image-wrap">
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="product-image"
                          loading="lazy"
                          onError={event => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                        {product.discount > 0 ? (
                          <span className="product-badge product-badge--discount">
                            -{Math.round(product.discount)}%
                          </span>
                        ) : null}
                        <span className="product-badge product-badge--sold">{formatSoldCount(product.soldCount)} Sold</span>
                        <button
                          className={`wishlist-heart ${wishlistItems.has(product.id) ? 'active' : ''}`}
                          onClick={(e) => toggleWishlist(e, product)}
                          title={wishlistItems.has(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                          ♥
                        </button>
                      </div>
                      <div className="product-body p-2 p-lg-3">
                        <h3 className="product-title mb-2">{product.name}</h3>
                        <div className="d-flex align-items-baseline gap-2 mb-3">
                          <strong className="product-price">৳{finalPrice.toFixed(0)}</strong>
                          <span className="product-old-price">৳{originalPrice.toFixed(0)}</span>
                        </div>
                        <button
                          type="button"
                          className="btn product-cta w-100"
                          onClick={event => {
                            event.stopPropagation();
                            setPreviewProduct(product);
                          }}
                        >
                          Shop now
                        </button>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>

            <div ref={loadMoreRef} className="py-4 text-center">
              {hasMoreProducts ? (
                <div className="spinner-border spinner-soft" role="status" aria-hidden="true" />
              ) : (
                <p className="text-body-secondary mb-0">You reached the end of the list.</p>
              )}
            </div>
          </>
        )}

        {previewProduct ? (
          <div
            className="product-preview-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Product preview"
            onClick={() => setPreviewProduct(null)}
          >
            <div className="product-preview-modal" onClick={event => event.stopPropagation()}>
              <button
                type="button"
                className="btn btn-light product-preview-close"
                onClick={() => setPreviewProduct(null)}
              >
                Close
              </button>

              <div className="product-preview-media">
                <img
                  src={previewProduct.image || '/vite.svg'}
                  alt={previewProduct.name}
                  onError={event => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <div className="product-preview-content">
                <h3>{previewProduct.name}</h3>
                <p className="product-preview-seller mb-2">{previewProduct.seller}</p>
                <div className="d-flex align-items-baseline gap-2 mb-2">
                  <strong className="product-price">৳{previewFinalPrice.toFixed(0)}</strong>
                  <span className="product-old-price">৳{previewProduct.price.toFixed(0)}</span>
                </div>
                <p className="product-preview-meta mb-3">
                  Rating: {previewProduct.rating.toFixed(1)} | Stock: {previewProduct.stock}
                </p>
                {previewProduct.description ? (
                  <p className="product-preview-description mb-3">{previewProduct.description}</p>
                ) : null}

                <button type="button" className="btn product-cta w-100">
                  Shop now
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
