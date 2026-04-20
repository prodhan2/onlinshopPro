import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { setCartOwner, loadCart, subscribeCart } from './cardManager';
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
import logo from './assets/images/logo.png';
import '../logo-controller.css';
import './bstoreapp.css';

export default function BStoreApp() {
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isOnAdminPage, setIsOnAdminPage] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect if we're on an admin page (has sidebar)
  useEffect(() => {
    const adminPaths = ['/admin-', '/catalog-admin', '/seller-dashboard'];
    const isAdminPath = adminPaths.some(path => location.pathname.startsWith(path));
    setIsOnAdminPage(isAdminPath);
  }, [location.pathname]);

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setCartOwner(user?.uid ?? null);
    });
  }, []);

  // Subscribe to cart updates
  useEffect(() => {
    const unsubscribe = subscribeCart((state) => {
      setCartItemCount(state?.totalItems || 0);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadAdminFlag() {
      if (!currentUser?.uid) {
        if (!ignore) {
          setIsAdmin(false);
          setIsSeller(false);
          setAdminLoading(false);
        }
        return;
      }

      setAdminLoading(true);
      try {
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const snap = await getDoc(profileRef);
        const data = snap.exists() ? snap.data() : {};
        const role = String(data?.role || '').toLowerCase();
        const isAdminFlag = Boolean(data?.admin || role === 'admin' || role === 'subadmin');
        const isSellerFlag = Boolean(role === 'seller' || isAdminFlag);
        if (!ignore) {
          setIsAdmin(isAdminFlag);
          setIsSeller(isSellerFlag);
        }
      } catch {
        if (!ignore) {
          setIsAdmin(false);
          setIsSeller(false);
        }
      } finally {
        if (!ignore) {
          setAdminLoading(false);
        }
      }
    }

    loadAdminFlag();
    return () => {
      ignore = true;
    };
  }, [currentUser?.uid]);

  async function handleUserSignOut() {
    setShowLogoutModal(true);
  }

  async function confirmSignOut() {
    setShowLogoutModal(false);
    await signOut(auth);
    setIsAdmin(false);
    setIsSeller(false);
    navigate('/');
  }

  function cancelSignOut() {
    setShowLogoutModal(false);
  }

  // Listen for custom event to open CatalogAdminPage from SellerDashboardPage
  useEffect(() => {
    const handler = () => navigate('/catalog-admin');
    window.addEventListener('open-catalog-admin', handler);
    return () => window.removeEventListener('open-catalog-admin', handler);
  }, [navigate]);

  return (
    <main className="bstore-shell">
      <Routes>
        <Route path="/" element={
          <HomePage
            currentUser={currentUser}
            onOpenCart={() => navigate('/cart')}
            onOpenCategories={() => navigate('/categories')}
            onOpenProduct={product => navigate('/details', { state: { product } })}
            onOpenPosterBuilder={() => navigate('/poster-builder')}
            onOpenPosterHistory={() => navigate('/poster-history')}
            onOpenWishlist={() => navigate('/wishlist')}
            onOpenOrders={() => navigate('/orders')}
            onOpenSellerDashboard={isSeller ? () => navigate('/seller-dashboard') : null}
            onOpenSellerOrders={isSeller ? () => navigate('/seller-dashboard') : null}
            onOpenAdminDashboard={() => { if (isAdmin) navigate('/admin-dashboard'); }}
            onOpenCatalogManager={() => {
              if (isSeller || isAdmin) {
                navigate('/catalog-admin');
              } else if (!currentUser) {
                navigate('/login');
              }
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
            onBuyNow={checkout => navigate('/payment', { state: { checkout } })}
          />
        } />
        <Route path="/categories" element={
          <CategoryPage
            onBackHome={() => navigate('/')}
            onOpenCart={() => navigate('/cart')}
            onOpenProduct={product => navigate('/details', { state: { product } })}
          />
        } />
        <Route path="/cart" element={
          <CartPage
            currentUser={currentUser}
            onRequireLogin={() => navigate('/login')}
            onCheckout={checkout => navigate('/payment', { state: { checkout } })}
          />
        } />
        <Route path="/payment" element={
          <PaymentPage
            checkout={location.state?.checkout}
            onDone={() => navigate('/orders')}
          />
        } />
        <Route path="/orders" element={
          <OrderManagementPage
            currentUser={currentUser}
            isAdmin={isAdmin}
          />
        } />
        <Route path="/login" element={
          <LoginPage
            onSuccess={() => navigate('/')}
          />
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
          <AccountDashboardPage
            currentUser={currentUser}
          />
        } />
        <Route path="/poster-builder" element={<PosterBuilder />} />
        <Route path="/poster-history" element={<PosterHistoryPage />} />

        {/* Admin Protected Routes with Layout */}
        <Route element={
          adminLoading ? (
            <div className="admin-loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
              <div className="pro-spinner" />
              <p>Verifying Admin Access...</p>
            </div>
          ) : (
            isAdmin ? <AdminLayout currentUser={currentUser} /> : <Navigate to="/" />
          )
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

        <Route path="/catalog-admin" element={
          <CatalogAdminPage
            onOpenOrders={() => navigate('/orders')}
            canEdit={isAdmin || isSeller}
            authReady={!adminLoading}
            currentUser={currentUser}
          />
        } />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/wishlist" element={<WishlistPage currentUser={currentUser} />} />
        <Route path="/seller-dashboard" element={
          isSeller ? (
            <SellerDashboardPage currentUser={currentUser} />
          ) : (
            <section className="bstore-page">
              <div className="bstore-card text-center">
                <h2 className="h4">Seller access required</h2>
                <p className="bstore-muted">You do not have permission to access the seller dashboard.</p>
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/')}>Back to Home</button>
              </div>
            </section>
          )
        } />
      </Routes>
      {/* Notification Center */}
      {currentUser && (
        <NotificationCenter
          userId={currentUser.uid}
          isOpen={notificationPanelOpen}
          onClose={() => setNotificationPanelOpen(false)}
        />
      )}

      {/* Beautiful Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={cancelSignOut}>
          <div className="logout-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="logout-close-btn" onClick={cancelSignOut}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            
            <div className="logout-modal-content">
              <div className="logout-modal-header">
                <img src={logo} alt="Beautiful Dinajpur" className="logout-modal-logo" />
                <div className="logout-icon-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                <h2 className="logout-modal-title">সতর্কতা</h2>
              </div>

              <div className="logout-modal-body">
                <p className="logout-message">
                  আপনি কি সত্যিই লগআউট করতে চান?
                </p>
                <p className="logout-hint">
                  লগআউট করলে আপনার সব সেশন শেষ হয়ে যাবে এবং আবার লগইন করতে হবে।
                </p>
              </div>

              <div className="logout-modal-footer">
                <button className="btn btn-cancel" onClick={cancelSignOut}>বাতিল করুন</button>
                <button className="btn btn-logout" onClick={confirmSignOut}>হ্যাঁ, লগআউট করুন</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer - only on homepage */}
      {location.pathname === '/' && (
        <div className={isOnAdminPage ? 'pro-store-footer admin-footer' : 'pro-store-footer'}>
          <Footer />
        </div>
      )}

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav cartItemCount={cartItemCount} />
    </main>
  );
}
