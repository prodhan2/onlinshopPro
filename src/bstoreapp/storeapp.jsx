import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { setCartOwner, loadCart, subscribeCart } from './cardManager';

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
      </main>
    </>
  );
}