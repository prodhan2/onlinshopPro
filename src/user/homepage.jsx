import { useEffect, useMemo, useRef, useState } from 'react';
import { FaBars, FaStore, FaSearch } from 'react-icons/fa';
import { FiShoppingCart, FiUser, FiHeart, FiChevronRight, FiArrowRight, FiLogIn, FiGrid } from 'react-icons/fi';
import { collection, onSnapshot } from 'firebase/firestore';
import { addToCart, getCartState, isProductInCart, loadCart, subscribeCart } from '../bstoreapp/cardManager';
import { createBannerItem, createCategory, createProduct, getDiscountedUnitPrice } from '../bstoreapp/models';
import { autoPreloadProducts } from '../bstoreapp/imageCache';
import { db } from '../firebase';
import ShimmerImage from '../bstoreapp/ShimmerImage';
import logo from '../bstoreapp/assets/images/logo.png';
import StoreHeader from './header/header';
import './user.css';

function readCache(key, mapper = item => item) {
  return [];
}

function writeCache(key, value) {
  // Disabled - no caching
}

function ProductCardSkeleton({ index }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse" key={index}>
      <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-300 rounded w-3/4" />
        <div className="h-3 bg-gray-300 rounded w-1/2" />
        <div className="h-8 bg-gray-300 rounded" />
      </div>
    </div>
  );
}

export default function HomePage({
  currentUser,
  onOpenCart,
  onOpenCategories,
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
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [noticeText, setNoticeText] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [cartState, setCartState] = useState(() => loadCart());
  const [clickedProductId, setClickedProductId] = useState(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const [isDesktopSlider, setIsDesktopSlider] = useState(() => window.innerWidth >= 1024);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCartHot, setIsCartHot] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('success');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const handleOpenDrawer = () => setIsDrawerOpen(true);
    window.addEventListener('open-drawer', handleOpenDrawer);
    return () => {
      window.removeEventListener('open-drawer', handleOpenDrawer);
    };
  }, []);

  const clickAnimationTimerRef = useRef(null);
  const cartHotTimerRef = useRef(null);
  const cartButtonRef = useRef(null);
  const popupTimerRef = useRef(null);
  const categoriesScrollRef = useRef(null);

  function toggleDarkMode() {
    const newMode = !darkMode;
    setDarkMode(newMode);
  }

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

    if (isProductInCart(product)) {
      setPopupMessage('Already in your cart!');
      setPopupType('warning');
      setShowPopup(true);
      
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
      popupTimerRef.current = setTimeout(() => {
        setShowPopup(false);
      }, 3000);
      return;
    }

    const added = addToCart(product, 1);
    if (!added) {
      onOpenLogin?.();
      return;
    }

    setPopupMessage(`${product.name} added!`);
    setPopupType('success');
    setShowPopup(true);
    
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
    }
    popupTimerRef.current = setTimeout(() => {
      setShowPopup(false);
    }, 3000);

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
    const handleResize = () => {
      setIsDesktopSlider(window.innerWidth >= 1024);
      setActiveBanner(0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const container = categoriesScrollRef.current;
    if (!container || window.innerWidth > 768) return;

    const scrollAmount = container.scrollWidth / categories.length;
    let direction = 1;
    let isUserScrolling = false;
    let userScrollTimeout;

    const autoScroll = () => {
      if (isUserScrolling) return;

      if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 5) {
        direction = -1;
      } else if (container.scrollLeft <= 5) {
        direction = 1;
      }

      container.scrollLeft += direction * 1;
    };

    const handleUserScroll = () => {
      isUserScrolling = true;
      clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        isUserScrolling = false;
      }, 3000);
    };

    container.addEventListener('wheel', handleUserScroll, { passive: true });
    container.addEventListener('touchstart', handleUserScroll, { passive: true });

    const interval = setInterval(autoScroll, 30);

    return () => {
      clearInterval(interval);
      clearTimeout(userScrollTimeout);
      container.removeEventListener('wheel', handleUserScroll);
      container.removeEventListener('touchstart', handleUserScroll);
    };
  }, [categories.length]);

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
      if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    setLoading(true);

    const unsubscribeCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        if (ignore) return;
        const categoryData = snapshot.docs.map(docSnap => docSnap.data());
        const nextCategories = Array.isArray(categoryData) ? categoryData.map(createCategory) : [];
        setCategories(nextCategories);
      },
      (error) => {
        console.error('Error listening to categories:', error);
      }
    );

    const unsubscribeProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        if (ignore) return;
        const productData = snapshot.docs.map(docSnap => docSnap.data());
        const nextProducts = Array.isArray(productData) ? productData.map(createProduct) : [];
        setProducts(nextProducts);
        autoPreloadProducts(nextProducts);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to products:', error);
        setLoading(false);
      }
    );

    const unsubscribeBanners = onSnapshot(
      collection(db, 'banners'),
      (snapshot) => {
        if (ignore) return;
        const bannerData = snapshot.docs.map(docSnap => docSnap.data());
        const nextBanners = Array.isArray(bannerData)
          ? bannerData.map(createBannerItem).filter(item => item && item.show)
          : [];
        setBanners(nextBanners);
      },
      (error) => {
        console.error('Error listening to banners:', error);
      }
    );

    const unsubscribeNotices = onSnapshot(
      collection(db, 'notices'),
      (snapshot) => {
        if (ignore) return;
        const noticeData = snapshot.docs.map(docSnap => docSnap.data());
        const noticeObj = Array.isArray(noticeData) && noticeData[0] ? noticeData[0] : {};
        const nextNotice = noticeObj.Notice ?? noticeObj.notice ?? noticeObj.text ?? noticeObj.title ?? '';
        setNoticeText(nextNotice);
      },
      (error) => {
        console.error('Error listening to notices:', error);
      }
    );

    return () => {
      ignore = true;
      unsubscribeCategories();
      unsubscribeProducts();
      unsubscribeBanners();
      unsubscribeNotices();
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

  const drawerUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest User';
  const drawerUserEmail = currentUser?.email || 'Please login to continue';
  const drawerAvatarText = (drawerUserName || 'G').slice(0, 1).toUpperCase();
  const drawerRoleLabel = currentUser
    ? (canOpenAdminDashboard ? 'Admin' : canOpenCatalogManager ? 'Seller' : 'User')
    : 'Guest';

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'bg-slate-950' : 'bg-gray-50'} transition-colors duration-300`}>
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

      {/* POPUP NOTIFICATION */}
      {showPopup && (
        <div className={`fixed top-4 right-4 left-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in ${
          popupType === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
            : 'bg-gradient-to-r from-yellow-500 to-orange-500'
        } text-white`}>
          <div className="text-2xl flex-shrink-0">
            {popupType === 'success' ? '✓' : '⚠'}
          </div>
          <p className="font-medium flex-1">{popupMessage}</p>
          <button 
            className="text-xl hover:opacity-70 flex-shrink-0"
            onClick={() => setShowPopup(false)}
          >
            ×
          </button>
        </div>
      )}

      {/* HEADER */}
      <StoreHeader
        logo={logo}
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onOpenProfile={onOpenProfile}
        onOpenCart={onOpenCart}
        onOpenMenu={() => setIsDrawerOpen(true)}
        cartState={cartState}
        cartButtonRef={cartButtonRef}
        isCartHot={isCartHot}
        toggleDarkMode={toggleDarkMode}
        darkMode={darkMode}
        searchFocused={searchFocused}
        onSearchFocusChange={setSearchFocused}
      />

      {/* NEWS TICKER */}
      <div className={`${darkMode ? 'bg-slate-800' : 'bg-blue-50'} border-b ${darkMode ? 'border-slate-700' : 'border-blue-200'} py-2 overflow-hidden`}>
        <div className="animate-scroll text-center text-xs sm:text-sm font-semibold text-blue-600 whitespace-nowrap px-2">
          {noticeText ? noticeText : (categories.length ? categories.map(c => c.name).join(' • ') : 'Welcome to our store!')}
        </div>
      </div>

      {/* SIDE DRAWER BACKDROP */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* SIDE DRAWER */}
      <aside className={`fixed left-0 top-0 h-full w-72 max-w-[85vw] ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto flex flex-col ${
        isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt={drawerUserName} className="w-12 h-12 rounded-full border-2 border-white" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg">
                {drawerAvatarText}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{drawerUserName}</p>
              <p className="text-xs opacity-90 truncate">{drawerUserEmail}</p>
              <span className="inline-block mt-1 text-xs bg-white text-blue-600 px-2 py-0.5 rounded font-bold">
                {drawerRoleLabel}
              </span>
            </div>
          </div>
          <button
            className="absolute top-4 right-4 text-2xl hover:opacity-70 p-2"
            onClick={() => setIsDrawerOpen(false)}
          >
            ×
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <button onClick={() => { setIsDrawerOpen(false); onOpenProfile?.(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-700 flex items-center gap-3 font-medium transition-colors">
            <FiUser className="flex-shrink-0" /> My Profile
          </button>
          {currentUser && (
            <button onClick={() => { setIsDrawerOpen(false); onOpenOrders?.(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-700 flex items-center gap-3 font-medium transition-colors">
              <FiGrid className="flex-shrink-0" /> My Orders
            </button>
          )}
          <button onClick={() => { setIsDrawerOpen(false); onOpenWishlist?.(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-700 flex items-center gap-3 font-medium transition-colors">
            <FiHeart className="flex-shrink-0" /> Wishlist
          </button>
          {canOpenCatalogManager && (
            <button onClick={() => { setIsDrawerOpen(false); onOpenCatalogManager?.(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-700 flex items-center gap-3 font-medium transition-colors">
              <FiGrid className="flex-shrink-0" /> Catalog Manager
            </button>
          )}
          {canOpenAdminDashboard && (
            <button onClick={() => { setIsDrawerOpen(false); onOpenAdminDashboard?.(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-700 flex items-center gap-3 font-medium transition-colors">
              <FiGrid className="flex-shrink-0" /> Admin Dashboard
            </button>
          )}
          <button onClick={() => { setIsDrawerOpen(false); onOpenCart(); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-100 dark:hover:bg-slate-700 flex items-center gap-3 font-medium transition-colors">
            <FiShoppingCart className="flex-shrink-0" /> Shopping Cart
          </button>
        </nav>

        {/* Auth Button */}
        <div className="p-3 border-t dark:border-slate-700">
          {currentUser ? (
            <button className="w-full px-4 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors" onClick={() => { setIsDrawerOpen(false); onSignOutUser?.(); }}>
              <FiLogIn /> Logout
            </button>
          ) : (
            <button className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors" onClick={() => { setIsDrawerOpen(false); onOpenLogin?.(); }}>
              <FiLogIn /> Login
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 pb-24">
        {/* Notice Banner */}
        {noticeText && (
          <div className="m-3 p-3 rounded-lg bg-gradient-to-r from-orange-100 to-red-100 border-l-4 border-orange-500 flex items-start gap-2">
            <span className="text-lg flex-shrink-0 mt-0.5">📢</span>
            <span className="text-sm text-orange-900 font-medium">{noticeText}</span>
          </div>
        )}

        {/* Banner Slider */}
        {banners.length > 0 && (
          <div className="mx-3 mb-4 rounded-xl overflow-hidden shadow-md">
            <div className="relative h-48 sm:h-64 bg-gray-200">
              {banners.map((banner, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === activeBanner ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <ShimmerImage
                    src={banner.imageUrl}
                    alt={banner.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {banners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveBanner(index)}
                      className={`rounded-full transition-all ${
                        index === activeBanner 
                          ? 'bg-white w-8 h-2.5' 
                          : 'bg-white/50 w-2.5 h-2.5'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories Section */}
        {categories.length > 0 && (
          <div className="mb-4">
            <div className="px-3 mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Categories</h2>
              <button
                onClick={onOpenCategories || (() => setSelectedCategory('all'))}
                className="text-blue-600 text-sm font-semibold flex items-center gap-1"
              >
                View All <FiChevronRight size={14} />
              </button>
            </div>
            <div ref={categoriesScrollRef} className="flex gap-2 px-3 pb-2 overflow-x-auto scroll-smooth">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : `${darkMode ? 'bg-slate-700 text-gray-200' : 'bg-gray-200 text-gray-700'} hover:shadow-md`
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="px-3">
          <h2 className="text-lg font-bold mb-3">
            {selectedCategory === 'all' ? 'All Products' : `${categories.find(c => c.id === selectedCategory)?.name || 'Products'}`}
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} index={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <FaSearch className="text-4xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No products found</p>
                  <button 
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                filteredProducts.map(product => {
                  const mainImage = product.image ? product.image.split(',')[0]?.trim() : product.imageUrl;
                  return (
                    <div
                      key={product.id}
                      onClick={() => { handleProductCardClick(product.id); onOpenProduct(product); }}
                      className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${
                        clickedProductId === product.id ? 'scale-95' : 'hover:scale-105'
                      }`}
                    >
                      {/* Image */}
                      <div className="relative h-40 bg-gray-100 overflow-hidden">
                        <ShimmerImage
                          src={mainImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        {product.discount > 0 && (
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-md">
                            -{product.discount}%
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 flex flex-col">
                        <h3 className="font-semibold text-sm mb-2 line-clamp-2 text-gray-800">{product.name}</h3>
                        
                        {/* Price */}
                        <div className="mb-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-blue-600">
                              ৳{getDiscountedUnitPrice(product).toFixed(0)}
                            </span>
                            {product.discount > 0 && (
                              <span className="text-xs text-gray-500 line-through">
                                ৳{Number(product.price || product.unitPrice).toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Button */}
                        {currentUser && (
                          <button
                            onClick={(e) => handleAddToCart(product, e)}
                            className={`w-full py-2 rounded-lg font-semibold text-sm transition-all ${
                              isProductInCart(product)
                                ? 'bg-green-500 text-white'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-md active:scale-95'
                            }`}
                          >
                            {isProductInCart(product) ? '✓ In Cart' : 'Add To Cart'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
