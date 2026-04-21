import { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { setCartOwner, loadCart, subscribeCart } from './cardManager';
import musicFile from './assets/mp3/b.mp3';

// Pages
import HomePage from '../user/homepage';
import CategoryPage from '../CategoryPage';
import CartPage from '../user/cartpage';
import ProductDetailsPage from '../user/detailsshop';
import PaymentPage from '../user/paymentpage';
import OrderManagementPage from '../admin/OrderManagement';
import LoginPage from '../user/login';
import ProfilePage from '../user/profile';
import AccountDashboardPage from '../user/AccountDashboard';
import PosterBuilder from '../posterbuilder/PosterBuilder';
import PosterHistoryPage from '../posterbuilder/PosterHistoryPage';
import CatalogAdminPage from '../catalogadmin/CatalogAdminPage';
import AdminDashboardPage from '../admin/AdminDashboardPage';
import AdminDashboardHome from '../admin/AdminDashboardHome';
import AdminUserListPage from '../admin/AdminUserListPage';
import AdminListPage from '../admin/AdminListPage';
import AdminSellerOverviewPage from '../admin/AdminSellerOverviewPage';
import AdminOrderStatusPage from '../admin/AdminOrderStatusPage';
import AdminRoleManagementPage from '../admin/AdminRoleManagementPage';
import AdminLayout from '../admin/AdminLayout';
import SellerDashboardPage from '../admin/SellerDashboardPage';
import BannerManagement from '../admin/BannerManagement';
import WishlistPage from '../WishlistPage';
import SearchPage from '../user/SearchPage';
import NotificationCenter from '../components/NotificationCenter';
import Footer from '../user/Footer';
import BottomNav from '../components/BottomNav';

import { auth, db } from '../firebase';
import SplashScreen from '../components/SplashScreen';
import logo from './assets/images/logo.png';
import '../logo-controller.css';
import './bstoreapp.css';
import '../components/SplashScreen.css';

// ─────────────────────────────────────────────────────────────
// Protected Route Wrapper (Cleaner than inline layout element)
// ─────────────────────────────────────────────────────────────
function AdminRoute({ isAdmin, loading, children }) {
  if (loading) {
    return (
      <div className="admin-loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div className="pro-spinner" />
        <p>Verifying Admin Access...</p>
      </div>
    );
  }
  return isAdmin ? children : <Navigate to="/" replace />;
}

// ─────────────────────────────────────────────────────────────
// Main App Component
// ─────────────────────────────────────────────────────────────
export default function BStoreApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isOnAdminPage, setIsOnAdminPage] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicVisible, setMusicVisible] = useState(true);
  const [showMusicClose, setShowMusicClose] = useState(false);
  const longPressTimer = useRef(null);
  const audioRef = useRef(null);
  const dragRef = useRef(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [btnPos, setBtnPos] = useState({ right: 19, bottom: 88 });

  useEffect(() => {
    const audio = new Audio(musicFile);
    audio.loop = true;
    audioRef.current = audio;
    const tryPlay = () => {
      audio.play().then(() => setMusicPlaying(true)).catch(() => {});
      document.removeEventListener('click', tryPlay);
      document.removeEventListener('touchstart', tryPlay);
    };
    const p = audio.play();
    if (p !== undefined) p.then(() => setMusicPlaying(true)).catch(() => {
      document.addEventListener('click', tryPlay);
      document.addEventListener('touchstart', tryPlay);
    });
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  function toggleMusic() {
    if (dragState.current.dragging) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (musicPlaying) { audio.pause(); setMusicPlaying(false); }
    else { audio.play().then(() => setMusicPlaying(true)).catch(() => {}); }
  }

  function onDragStart(e) {
    // long press detection
    longPressTimer.current = setTimeout(() => {
      setShowMusicClose(true);
    }, 500);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = dragRef.current.getBoundingClientRect();
    dragState.current = { dragging: true, startX: clientX, startY: clientY, origX: rect.left, origY: rect.top };
    e.preventDefault();
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragState.current.dragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragState.current.startX;
      const dy = clientY - dragState.current.startY;
      const btnW = 36, btnH = 36;
      const newLeft = Math.max(0, Math.min(dragState.current.origX + dx, window.innerWidth - btnW));
      const newTop = Math.max(0, Math.min(dragState.current.origY + dy, window.innerHeight - btnH));
      setBtnPos({ right: window.innerWidth - newLeft - btnW, bottom: window.innerHeight - newTop - btnH });
    }
    function onEnd() {
      clearTimeout(longPressTimer.current);
      dragState.current.dragging = false;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  // ─────────────────────────────────────────────────────────
  // Splash Screen (runs once on mount)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setFadeSplash(true);
      const hideTimer = setTimeout(() => setShowSplash(false), 500);
      return () => clearTimeout(hideTimer);
    }, 2500);
    return () => clearTimeout(splashTimer);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Detect Admin Pages (for footer/nav visibility)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const adminPaths = ['/admin-', '/catalog-admin', '/seller-dashboard'];
    const isAdminPath = adminPaths.some(path => location.pathname.startsWith(path));
    setIsOnAdminPage(isAdminPath);
  }, [location.pathname]);

  // ─────────────────────────────────────────────────────────
  // Auth State Listener (single source of truth)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setCartOwner(user?.uid ?? null);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // ─────────────────────────────────────────────────────────
  // Cart Subscription (cleanup handled)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeCart((state) => {
      setCartItemCount(state?.totalItems || 0);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // Load Admin/Seller Flags (memoized to avoid re-fetch)
  // ─────────────────────────────────────────────────────────
  const loadUserRole = useCallback(async (uid) => {
    if (!uid) {
      setIsAdmin(false);
      setIsSeller(false);
      setAdminLoading(false);
      return;
    }

    setAdminLoading(true);
    try {
      const profileRef = doc(db, 'profiles', uid);
      const snap = await getDoc(profileRef);
      const data = snap.exists() ? snap.data() : {};
      const role = String(data?.role || '').toLowerCase();
      
      const isAdminFlag = Boolean(data?.admin || role === 'admin' || role === 'subadmin');
      const isSellerFlag = Boolean(role === 'seller' || isAdminFlag);
      
      setIsAdmin(isAdminFlag);
      setIsSeller(isSellerFlag);
    } catch (error) {
      console.warn('Failed to load user role:', error);
      setIsAdmin(false);
      setIsSeller(false);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authChecked) {
      loadUserRole(currentUser?.uid);
    }
  }, [authChecked, currentUser?.uid, loadUserRole]);

  // ─────────────────────────────────────────────────────────
  // Logout Handlers
  // ─────────────────────────────────────────────────────────
  const handleUserSignOut = () => setShowLogoutModal(true);
  
  const confirmSignOut = async () => {
    setShowLogoutModal(false);
    try {
      await signOut(auth);
      setIsAdmin(false);
      setIsSeller(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };
  
  const cancelSignOut = () => setShowLogoutModal(false);

  // ─────────────────────────────────────────────────────────
  // Keyboard Accessibility for Modal (ESC to close)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showLogoutModal) return;
    
    const handleEsc = (e) => {
      if (e.key === 'Escape') cancelSignOut();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [showLogoutModal]);

  const [showExitModal, setShowExitModal] = useState(false);
  const exitShownRef = useRef(false);

  // Exit Confirmation — triggers when mouse leaves top of viewport (user going to close tab)
  useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !exitShownRef.current) {
        exitShownRef.current = true;
        setShowExitModal(true);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  // Also catch actual tab/browser close with native dialog
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Catalog Admin Event Listener
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => navigate('/catalog-admin');
    window.addEventListener('open-catalog-admin', handler);
    return () => window.removeEventListener('open-catalog-admin', handler);
  }, [navigate]);

  // ─────────────────────────────────────────────────────────
  // Wait for auth + role check before rendering routes
  // ─────────────────────────────────────────────────────────
  if (!authChecked || (currentUser && adminLoading)) {
    return showSplash ? (
      <div className={`splash-screen ${fadeSplash ? 'fade-out' : ''}`}>
        <div className="splash-logo-container">
          <SplashScreen fadeSplash={fadeSplash} />
        </div>
      </div>
    ) : (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pro-spinner" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // Route Definitions
  // ─────────────────────────────────────────────────────────
  return (
    <>
      {showSplash && (
        <div className={`splash-screen ${fadeSplash ? 'fade-out' : ''}`}>
          <div className="splash-logo-container">
            <SplashScreen fadeSplash={fadeSplash} />
          </div>
        </div>
      )}

      <main className="bstore-shell">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <HomePage
              currentUser={currentUser}
              onOpenCart={() => navigate('/cart')}
              onOpenCategories={() => navigate('/categories')}
              onOpenProduct={(product) => navigate('/details', { state: { product } })}
              onOpenPosterBuilder={() => navigate('/poster-builder')}
              onOpenPosterHistory={() => navigate('/poster-history')}
              onOpenWishlist={() => navigate('/wishlist')}
              onOpenOrders={() => navigate('/orders')}
              onOpenSellerDashboard={isSeller ? () => navigate('/seller-dashboard') : null}
              onOpenSellerOrders={isSeller ? () => navigate('/seller-dashboard') : null}
              onOpenAdminDashboard={isAdmin ? () => navigate('/admin-dashboard') : null}
              onOpenCatalogManager={() => {
                if (isSeller || isAdmin) navigate('/catalog-admin');
                else if (!currentUser) navigate('/login');
              }}
              canOpenCatalogManager={isSeller || isAdmin}
              canOpenAdminDashboard={isAdmin}
              onOpenLogin={() => navigate('/login')}
              onOpenProfile={() => navigate('/profile')}
              onSignOutUser={handleUserSignOut}
            />
          } />

          <Route path="/details" element={
            <ProductDetailsPage
              product={location.state?.product}
              currentUser={currentUser}
              onOpenCart={() => navigate('/cart')}
              onRequireLogin={() => navigate('/login')}
              onBuyNow={(checkout) => navigate('/payment', { state: { checkout } })}
            />
          } />

          <Route path="/categories" element={
            <CategoryPage
              onBackHome={() => navigate('/')}
              onOpenCart={() => navigate('/cart')}
              onOpenProduct={(product) => navigate('/details', { state: { product } })}
            />
          } />

          <Route path="/cart" element={
            <CartPage
              currentUser={currentUser}
              onRequireLogin={() => navigate('/login')}
              onCheckout={(checkout) => navigate('/payment', { state: { checkout } })}
            />
          } />

          <Route path="/payment" element={
            <PaymentPage
              checkout={location.state?.checkout}
              onDone={() => navigate('/orders')}
            />
          } />

          <Route path="/orders" element={
            <OrderManagementPage currentUser={currentUser} isAdmin={isAdmin} />
          } />

          <Route path="/login" element={
            <LoginPage onSuccess={() => navigate('/', { replace: true })} />
          } />

          <Route path="/profile" element={
            <ProfilePage
              user={currentUser}
              onBack={() => navigate('/')}
              onGoHome={() => navigate('/')}
              onLoggedOut={() => navigate('/')}
            />
          } />

          <Route path="/account" element={
            <AccountDashboardPage currentUser={currentUser} />
          } />

          <Route path="/poster-builder" element={<PosterBuilder />} />
          <Route path="/poster-history" element={<PosterHistoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/wishlist" element={<WishlistPage currentUser={currentUser} />} />

          {/* Seller Route */}
          <Route path="/seller-dashboard" element={
            isSeller 
              ? <SellerDashboardPage currentUser={currentUser} />
              : (
                <section className="bstore-page">
                  <div className="bstore-card text-center">
                    <h2 className="h4">Seller access required</h2>
                    <p className="bstore-muted">You do not have permission to access the seller dashboard.</p>
                    <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/')}>
                      Back to Home
                    </button>
                  </div>
                </section>
              )
          } />

          {/* Catalog Admin (Seller or Admin) */}
          <Route path="/catalog-admin" element={
            (isAdmin || isSeller) 
              ? <CatalogAdminPage
                  onOpenOrders={() => navigate('/orders')}
                  canEdit={isAdmin || isSeller}
                  authReady={!adminLoading}
                  currentUser={currentUser}
                />
              : <Navigate to="/" replace />
          } />

          {/* Admin Protected Routes (Nested with Layout) */}
          <Route element={
            <AdminRoute isAdmin={isAdmin} loading={adminLoading}>
              <AdminLayout currentUser={currentUser} />
            </AdminRoute>
          }>
            <Route path="/admin-dashboard" element={<AdminDashboardHome currentUser={currentUser} />} />
            <Route path="/admin-users" element={<AdminUserListPage currentUser={currentUser} />} />
            <Route path="/admin-list" element={<AdminListPage currentUser={currentUser} />} />
            <Route path="/admin-sellers" element={<AdminSellerOverviewPage currentUser={currentUser} />} />
            <Route path="/admin-orders" element={<AdminOrderStatusPage currentUser={currentUser} />} />
            <Route path="/admin-roles" element={<AdminRoleManagementPage currentUser={currentUser} />} />
            <Route path="/admin-analytics" element={
              <AdminDashboardPage
                currentUser={currentUser}
                onOpenCatalogManager={() => navigate('/catalog-admin')}
                onOpenPosterBuilder={() => navigate('/poster-builder')}
                onOpenPosterHistory={() => navigate('/poster-history')}
                onOpenOrders={() => navigate('/orders')}
              />
            } />
            <Route path="/admin-banners" element={<BannerManagement currentUser={currentUser} />} />
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Notification Center (only for authenticated users) */}
        {currentUser && (
          <NotificationCenter
            userId={currentUser.uid}
            isOpen={notificationPanelOpen}
            onClose={() => setNotificationPanelOpen(false)}
          />
        )}

        {/* Logout Confirmation Modal (Accessible) */}
        {showLogoutModal && (
          <div 
            className="logout-modal-overlay" 
            onClick={cancelSignOut}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
          >
            <div className="logout-modal-card" onClick={(e) => e.stopPropagation()}>
              <button 
                className="logout-close-btn" 
                onClick={cancelSignOut}
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              
              <div className="logout-modal-content">
                <div className="logout-modal-header">
                  <img src={logo} alt="Beautiful Dinajpur" className="logout-modal-logo" />
                  <div className="logout-icon-circle" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </div>
                  <h2 id="logout-modal-title" className="logout-modal-title">সতর্কতা</h2>
                </div>

                <div className="logout-modal-body">
                  <p className="logout-message">আপনি কি সত্যিই লগআউট করতে চান?</p>
                  <p className="logout-hint">লগআউট করলে আপনার সব সেশন শেষ হয়ে যাবে এবং আবার লগইন করতে হবে।</p>
                </div>

                <div className="logout-modal-footer">
                  <button className="btn btn-cancel" onClick={cancelSignOut}>বাতিল করুন</button>
                  <button className="btn btn-logout" onClick={confirmSignOut}>হ্যাঁ, লগআউট করুন</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer - only on homepage & non-admin pages */}
        {location.pathname === '/' && !isOnAdminPage && (
          <footer className="pro-store-footer">
            <Footer />
          </footer>
        )}

        {/* Bottom Navigation - Hide on admin/auth pages for cleaner mobile UX */}
        {!isOnAdminPage && location.pathname !== '/login' && (
          <BottomNav 
            cartItemCount={cartItemCount}
            onOpenNotifications={() => setNotificationPanelOpen(true)}
          />
        )}

        {/* EXIT CONFIRMATION MODAL */}
        {showExitModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <style>{`
              @keyframes exitCardIn {
                from { opacity: 0; transform: scale(0.88) translateY(30px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
              }
              @keyframes exitOverlayIn {
                from { opacity: 0; } to { opacity: 1; }
              }
              .exit-stay-btn:hover  { background: rgba(255,255,255,0.13) !important; }
              .exit-leave-btn:hover { filter: brightness(1.12); }
            `}</style>

            <div style={{
              background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
              borderRadius: '32px',
              padding: '2.8rem 2.2rem 2.2rem',
              maxWidth: '360px', width: '92%',
              textAlign: 'center',
              boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
              animation: 'exitCardIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
              position: 'relative',
            }}>

              {/* Glow ring behind icon */}
              <div style={{
                position: 'absolute', top: 32, left: '50%',
                transform: 'translateX(-50%)',
                width: 90, height: 90, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Icon */}
              <div style={{
                width: 70, height: 70, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.4rem',
                boxShadow: '0 8px 32px rgba(239,68,68,0.5)',
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>

              {/* Title */}
              <h3 style={{
                color: '#f1f5f9', fontWeight: 800, fontSize: '1.35rem',
                margin: '0 0 0.6rem', letterSpacing: '-0.02em',
              }}>সাইট ছেড়ে যাচ্ছেন? 😢</h3>

              {/* Subtitle */}
              <p style={{
                color: '#94a3b8', fontSize: '0.9rem',
                margin: '0 0 0.4rem', lineHeight: 1.65,
              }}>আপনি কি সত্যিই এই সাইট থেকে বের হতে চান?</p>
              <p style={{
                color: '#64748b', fontSize: '0.8rem',
                margin: '0 0 2rem', lineHeight: 1.5,
              }}>আপনার কার্টের তথ্য হারিয়ে যেতে পারে।</p>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: '1.5rem' }} />

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button
                  className="exit-stay-btn"
                  onClick={() => { setShowExitModal(false); exitShownRef.current = false; }}
                  style={{
                    flex: 1, padding: '0.9rem', borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#e2e8f0', fontWeight: 700, fontSize: '0.95rem',
                    cursor: 'pointer', transition: 'background 0.2s',
                  }}
                >না, থাকব 🙂</button>
                <button
                  className="exit-leave-btn"
                  onClick={() => { setShowExitModal(false); window.location.href = 'about:blank'; }}
                  style={{
                    flex: 1, padding: '0.9rem', borderRadius: '16px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                    cursor: 'pointer', transition: 'filter 0.2s',
                    boxShadow: '0 4px 20px rgba(239,68,68,0.45)',
                  }}
                >হ্যাঁ, বের হব</button>
              </div>
            </div>
          </div>
        )}

        {/* FLOATING MUSIC BUTTON */}
        {musicVisible && (
          <div style={{ position: 'fixed', right: btnPos.right, bottom: btnPos.bottom, zIndex: 9999, touchAction: 'none' }}>
            {showMusicClose && (
              <button
                onClick={() => { setMusicVisible(false); setShowMusicClose(false); if (audioRef.current) { audioRef.current.pause(); setMusicPlaying(false); } }}
                style={{
                  position: 'absolute', top: -10, right: -10,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#ef4444', border: '2px solid #fff',
                  color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', zIndex: 10000,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                }}
              >×</button>
            )}
            <button
              ref={dragRef}
              className={`floating-music-btn${musicPlaying ? ' playing' : ''}`}
              style={{ position: 'relative', cursor: showMusicClose ? 'default' : 'grab' }}
              onMouseDown={onDragStart}
              onTouchStart={onDragStart}
              onClick={() => { if (showMusicClose) { setShowMusicClose(false); return; } toggleMusic(); }}
              title={musicPlaying ? 'Music Off' : 'Music On'}
            >
              {musicPlaying ? (
                <svg width="20" height="16" viewBox="0 0 28 22" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f472b6"/>
                      <stop offset="25%" stopColor="#a78bfa"/>
                      <stop offset="50%" stopColor="#38bdf8"/>
                      <stop offset="75%" stopColor="#34d399"/>
                      <stop offset="100%" stopColor="#fbbf24"/>
                    </linearGradient>
                  </defs>
                  <rect x="0" y="6" width="3" height="10" rx="1.5" fill="url(#waveGrad)"><animate attributeName="height" values="4;16;4" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y" values="9;3;9" dur="0.8s" repeatCount="indefinite"/></rect>
                  <rect x="5" y="3" width="3" height="16" rx="1.5" fill="url(#waveGrad)"><animate attributeName="height" values="16;4;16" dur="0.8s" repeatCount="indefinite"/><animate attributeName="y" values="3;9;3" dur="0.8s" repeatCount="indefinite"/></rect>
                  <rect x="10" y="1" width="3" height="20" rx="1.5" fill="url(#waveGrad)"><animate attributeName="height" values="20;6;20" dur="0.7s" repeatCount="indefinite"/><animate attributeName="y" values="1;8;1" dur="0.7s" repeatCount="indefinite"/></rect>
                  <rect x="15" y="3" width="3" height="16" rx="1.5" fill="url(#waveGrad)"><animate attributeName="height" values="6;16;6" dur="0.9s" repeatCount="indefinite"/><animate attributeName="y" values="8;3;8" dur="0.9s" repeatCount="indefinite"/></rect>
                  <rect x="20" y="6" width="3" height="10" rx="1.5" fill="url(#waveGrad)"><animate attributeName="height" values="10;4;10" dur="0.75s" repeatCount="indefinite"/><animate attributeName="y" values="6;9;6" dur="0.75s" repeatCount="indefinite"/></rect>
                  <rect x="25" y="4" width="3" height="14" rx="1.5" fill="url(#waveGrad)"><animate attributeName="height" values="4;14;4" dur="0.85s" repeatCount="indefinite"/><animate attributeName="y" values="9;4;9" dur="0.85s" repeatCount="indefinite"/></rect>
                </svg>
              ) : (
                <svg width="20" height="16" viewBox="0 0 28 22" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="8" width="3" height="6" rx="1.5" fill="rgba(255,255,255,0.3)"/>
                  <rect x="5" y="6" width="3" height="10" rx="1.5" fill="rgba(255,255,255,0.3)"/>
                  <rect x="10" y="4" width="3" height="14" rx="1.5" fill="rgba(255,255,255,0.3)"/>
                  <rect x="15" y="6" width="3" height="10" rx="1.5" fill="rgba(255,255,255,0.3)"/>
                  <rect x="20" y="8" width="3" height="6" rx="1.5" fill="rgba(255,255,255,0.3)"/>
                  <rect x="25" y="6" width="3" height="10" rx="1.5" fill="rgba(255,255,255,0.3)"/>
                  <line x1="2" y1="2" x2="26" y2="20" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        )}
      </main>
    </>
  );
}