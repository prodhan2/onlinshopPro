import { useEffect, useState } from 'react';
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
import SellerDashboardPage from './SellerDashboardPage';
import WishlistPage from '../WishlistPage';
import NotificationCenter from '../components/NotificationCenter';
import { auth, db } from '../firebase';
import './bstoreapp.css';

export default function BStoreApp() {
  const [route, setRoute] = useState({ name: 'category', payload: null });
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

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
    await signOut(auth);
    setIsAdmin(false);
    setRoute({ name: 'category', payload: null });
  }

  // Listen for custom event to open CatalogAdminPage from SellerDashboardPage
  useEffect(() => {
    const handler = () => setRoute({ name: 'catalog-admin', payload: null });
    window.addEventListener('open-catalog-admin', handler);
    return () => window.removeEventListener('open-catalog-admin', handler);
  }, []);

  return (
    <main className="bstore-shell">
      {route.name === 'category' ? (
        <CategoryPage
          currentUser={currentUser}
          onOpenCart={() => setRoute({ name: 'cart', payload: null })}
          onOpenProduct={product => setRoute({ name: 'details', payload: product })}
          onOpenPosterBuilder={() => setRoute({ name: 'poster-builder', payload: null })}
          onOpenPosterHistory={() => setRoute({ name: 'poster-history', payload: null })}
          onOpenWishlist={() => setRoute({ name: 'wishlist', payload: null })}
          onOpenOrders={() => setRoute({ name: 'orders', payload: null })}
          onOpenSellerDashboard={isSeller ? () => setRoute({ name: 'seller-dashboard', payload: null }) : null}
          onOpenSellerOrders={isSeller ? () => setRoute({ name: 'seller-dashboard', payload: null }) : null}
          onOpenAdminDashboard={() => {
            if (isAdmin) {
              setRoute({ name: 'admin-dashboard', payload: null });
            }
          }}
          onOpenCatalogManager={() => {
            if (isSeller || isAdmin) {
              setRoute({ name: 'catalog-admin', payload: null });
            } else if (!currentUser) {
              setRoute({ name: 'login', payload: null });
            }
          }}
          canOpenCatalogManager={isSeller || isAdmin}
          canOpenAdminDashboard={isAdmin}
          onOpenLogin={() => setRoute({ name: 'login', payload: null })}
          onOpenProfile={() => setRoute({ name: 'profile', payload: null })}
          onSignOutUser={handleUserSignOut}
        />
      ) : null}

      {route.name === 'details' ? (
        <ProductDetailsPage
          product={route.payload}
          currentUser={currentUser}
          onOpenCart={() => setRoute({ name: 'cart', payload: null })}
          onRequireLogin={() => setRoute({ name: 'login', payload: null })}
          onBuyNow={checkout => setRoute({ name: 'payment', payload: checkout })}
        />
      ) : null}

      {route.name === 'cart' ? (
        <CartPage
          currentUser={currentUser}
          onRequireLogin={() => setRoute({ name: 'login', payload: null })}
          onCheckout={checkout => setRoute({ name: 'payment', payload: checkout })}
        />
      ) : null}

      {route.name === 'payment' ? (
        <PaymentPage
          checkout={route.payload}
          onDone={() => setRoute({ name: 'orders', payload: null })}
        />
      ) : null}

      {route.name === 'orders' ? (
        <OrderManagementPage
          currentUser={currentUser}
          isAdmin={isAdmin}
        />
      ) : null}

      {route.name === 'login' ? (
        <LoginPage
          onSuccess={() => setRoute({ name: 'profile', payload: null })}
        />
      ) : null}

      {route.name === 'profile' ? (
        <ProfilePage
          user={currentUser}
          onLoggedOut={() => setRoute({ name: 'category', payload: null })}
        />
      ) : null}

      {route.name === 'poster-builder' ? (
        <PosterBuilder
          initialHistoryOpen={Boolean(route.payload?.openHistory)}
        />
      ) : null}

      {route.name === 'poster-history' ? (
        <PosterHistoryPage />
      ) : null}

      {route.name === 'catalog-admin' ? (
        <CatalogAdminPage
          onOpenOrders={() => setRoute({ name: 'orders', payload: null })}
          canEdit={isAdmin || isSeller}
          authReady={!adminLoading}
          currentUser={currentUser}
        />
      ) : null}

      {route.name === 'admin-dashboard' ? (
        isAdmin ? (
          <AdminDashboardPage
            currentUser={currentUser}
            onOpenCatalogManager={() => setRoute({ name: 'catalog-admin', payload: null })}
            onOpenPosterBuilder={() => setRoute({ name: 'poster-builder', payload: null })}
            onOpenPosterHistory={() => setRoute({ name: 'poster-history', payload: null })}
            onOpenOrders={() => setRoute({ name: 'orders', payload: null })}
          />
        ) : (
          <section className="bstore-page">
            <div className="bstore-card text-center">
              <h2 className="h4">Admin access required</h2>
              <p className="bstore-muted">You do not have permission to open Admin Dashboard.</p>
              <button className="btn btn-outline-secondary" type="button" onClick={() => setRoute({ name: 'category', payload: null })}>
                Back to Home
              </button>
            </div>
          </section>
        )
      ) : null}

      {route.name === 'wishlist' ? (
        <WishlistPage
          currentUser={currentUser}
        />
      ) : null}

      {route.name === 'seller-dashboard' ? (
        isSeller ? (
          <SellerDashboardPage
            currentUser={currentUser}
          />
        ) : (
          <section className="bstore-page">
            <div className="bstore-card text-center">
              <h2 className="h4">Seller access required</h2>
              <p className="bstore-muted">You do not have permission to access the seller dashboard.</p>
              <button className="btn btn-outline-secondary" type="button" onClick={() => setRoute({ name: 'category', payload: null })}>
                Back to Home
              </button>
            </div>
          </section>
        )
      ) : null}

      {/* Notification Center */}
      {currentUser && (
        <NotificationCenter
          userId={currentUser.uid}
          isOpen={notificationPanelOpen}
          onClose={() => setNotificationPanelOpen(false)}
        />
      )}
    </main>
  );
}
