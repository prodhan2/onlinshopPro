import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { setCartOwner } from './cardManager';
import CategoryPage from './categorypage';
import CartPage from './cartpage';
import ProductDetailsPage from './detailsshop';
import PaymentPage from './paymentpage';
import OrderManagementPage from './OrderManagement';
import LoginPage from './login';
import ProfilePage from './profile';
import PosterBuilder from '../posterbuilder/PosterBuilder';
import PosterHistoryPage from '../posterbuilder/PosterHistoryPage';
import CatalogAdminPage from '../catalogadmin/CatalogAdminPage';
import AdminDashboardPage from './AdminDashboardPage';
import AdminDashboardHome from './AdminDashboardHome';
import AdminUserListPage from './AdminUserListPage';
import AdminListPage from './AdminListPage';
import AdminSellerOverviewPage from './AdminSellerOverviewPage';
import AdminOrderStatusPage from './AdminOrderStatusPage';
import AdminRoleManagementPage from './AdminRoleManagementPage';
import SellerDashboardPage from './SellerDashboardPage';
import WishlistPage from '../WishlistPage';
import NotificationCenter from '../components/NotificationCenter';
import { auth, db } from '../firebase';
import dinLogo from './dinlogo.png';
import './bstoreapp.css';

export default function BStoreApp() {
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setCartOwner(user?.uid ?? null);
    });
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
          <CategoryPage
            currentUser={currentUser}
            onOpenCart={() => navigate('/cart')}
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
            onSuccess={() => navigate('/profile')}
          />
        } />
        <Route path="/profile" element={
          <ProfilePage
            user={currentUser}
            onLoggedOut={() => navigate('/')}
          />
        } />
        <Route path="/poster-builder" element={<PosterBuilder />} />
        <Route path="/poster-history" element={<PosterHistoryPage />} />
        <Route path="/catalog-admin" element={
          <CatalogAdminPage
            onOpenOrders={() => navigate('/orders')}
            canEdit={isAdmin || isSeller}
            authReady={!adminLoading}
            currentUser={currentUser}
          />
        } />
        <Route path="/admin-dashboard" element={
          isAdmin ? (
            <AdminDashboardHome currentUser={currentUser} />
          ) : (
            <section className="bstore-page">
              <div className="bstore-card text-center">
                <h2 className="h4">Admin access required</h2>
                <p className="bstore-muted">You do not have permission to open Admin Dashboard.</p>
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/')}>Back to Home</button>
              </div>
            </section>
          )
        } />
        <Route path="/admin-users" element={
          isAdmin ? (
            <AdminUserListPage currentUser={currentUser} />
          ) : (
            <section className="bstore-page">
              <div className="bstore-card text-center">
                <h2 className="h4">Admin access required</h2>
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/admin-dashboard')}>Back to Dashboard</button>
              </div>
            </section>
          )
        } />
        <Route path="/admin-list" element={
          isAdmin ? (
            <AdminListPage currentUser={currentUser} />
          ) : (
            <section className="bstore-page">
              <div className="bstore-card text-center">
                <h2 className="h4">Admin access required</h2>
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/admin-dashboard')}>Back to Dashboard</button>
              </div>
            </section>
          )
        } />
        <Route path="/admin-sellers" element={
          isAdmin ? (
            <AdminSellerOverviewPage currentUser={currentUser} />
          ) : (
            <section className="bstore-page">
              <div className="bstore-card text-center">
                <h2 className="h4">Admin access required</h2>
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/admin-dashboard')}>Back to Dashboard</button>
              </div>
            </section>
          )
        } />
        <Route path="/admin-orders" element={
          isAdmin ? (
            <AdminOrderStatusPage currentUser={currentUser} />
          ) : (
            <section className="bstore-page">
              <div className="bstore-card text-center">
                <h2 className="h4">Admin access required</h2>
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/admin-dashboard')}>Back to Dashboard</button>
              </div>
            </section>
          )
        } />
        <Route path="/admin-roles" element={
          isAdmin ? (
            <AdminRoleManagementPage currentUser={currentUser} />
          ) : (
            <section className="bstore-page">
              <div className="bstore-card text-center">
                <h2 className="h4">Admin access required</h2>
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/admin-dashboard')}>Back to Dashboard</button>
              </div>
            </section>
          )
        } />
        <Route path="/admin-analytics" element={
          isAdmin ? (
            <AdminDashboardPage
              currentUser={currentUser}
              onOpenCatalogManager={() => navigate('/catalog-admin')}
              onOpenPosterBuilder={() => navigate('/poster-builder')}
              onOpenPosterHistory={() => navigate('/poster-history')}
              onOpenOrders={() => navigate('/orders')}
            />
          ) : (
            <section className="bstore-page">
              <div className="bstore-card text-center">
                <h2 className="h4">Admin access required</h2>
                <button className="btn btn-outline-secondary" type="button" onClick={() => navigate('/admin-dashboard')}>Back to Dashboard</button>
              </div>
            </section>
          )
        } />
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
            <div className="logout-modal-content">
              <div className="logout-modal-header">
                <div className="logout-logo-container">
                  <img src={dinLogo} alt="Beautiful Dinajpur" className="logout-logo" />
                  <div className="logo-glow-effect"></div>
                </div>
                <h2 className="logout-modal-title">Beautiful Dinajpur</h2>
                <p className="logout-modal-subtitle">আপনি কি সত্যিই যেতে চান?</p>
              </div>
              
              <div className="logout-modal-body">
                <p className="logout-message">
                  আপনি কি সত্যিই আপনার অ্যাকাউন্ট থেকে লগআউট করতে চান? 
                  <br />
                  <span className="logout-hint">আপনি পরে আবার লগইন করতে পারবেন।</span>
                </p>
              </div>

              <div className="logout-modal-footer">
                <button 
                  className="btn btn-cancel" 
                  onClick={cancelSignOut}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  বাতিল করুন
                </button>
                <button 
                  className="btn btn-logout" 
                  onClick={confirmSignOut}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  লগআউট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
