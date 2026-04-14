import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './admin.css';

// Simple localStorage cache helpers
const ADMIN_CACHE_KEYS = {
  profiles: 'admin-dashboard-profiles',
  products: 'admin-dashboard-products',
  orders: 'admin-dashboard-orders',
};

function readCache(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore
  }
}

const ROLE_OPTIONS = ['user', 'seller', 'subadmin', 'admin'];

function createProfileItem(data, docId) {
  const role = data?.role || (data?.admin ? 'admin' : 'user');

  return {
    docId,
    uid: data?.uid || docId,
    fullName: data?.fullName || data?.displayName || '',
    email: data?.email || '',
    photoURL: data?.photoURL || '',
    role,
    admin: role === 'admin' || Boolean(data?.admin),
  };
}

function createProductItem(data, docId) {
  return {
    docId,
    id: data?.id || docId,
    name: data?.name || 'Unnamed item',
    price: Number(data?.price || 0),
    image: data?.image || '',
    createdByUid: data?.createdBy?.uid || '',
    createdByName: data?.createdBy?.displayName || '',
  };
}

function createOrderItem(data, docId) {
  return {
    docId,
    userUid: data?.userUid || '',
    userName: data?.userName || '',
    userPhone: data?.userPhone || '',
    totalPrice: Number(data?.totalPrice || 0),
    paymentMethod: data?.paymentMethod || '',
    createdAt: data?.createdAt || null,
    items: Array.isArray(data?.items) ? data.items : [],
    status: data?.status || 'pending',
    statusMessage: data?.statusMessage || 'Order placed. Waiting for confirmation.',
  };
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

function formatDate(value) {
  const ms = toMillis(value);
  if (!ms) return 'No date';

  return new Intl.DateTimeFormat('bn-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms));
}

function getStatusClass(status) {
  if (status === 'confirmed' || status === 'delivered') return 'text-bg-success';
  if (status === 'processing') return 'text-bg-primary';
  if (status === 'cancelled') return 'text-bg-danger';
  return 'text-bg-warning';
}

export default function AdminDashboardPage({
  currentUser,
  onBack,
  onOpenCatalogManager,
  onOpenPosterBuilder,
  onOpenPosterHistory,
  onOpenOrders,
}) {
  // Use cached data for instant load
  const [profiles, setProfiles] = useState(() => readCache(ADMIN_CACHE_KEYS.profiles, []));
  const [products, setProducts] = useState(() => readCache(ADMIN_CACHE_KEYS.products, []));
  const [orders, setOrders] = useState(() => readCache(ADMIN_CACHE_KEYS.orders, []));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [editingDocId, setEditingDocId] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', role: 'user' });
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sellerFocus, setSellerFocus] = useState({ uid: '', tab: 'items' });
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');

  const roleCounts = useMemo(() => {
    return profiles.reduce((acc, item) => {
      const role = item.role || 'user';
      acc.total += 1;
      if (acc[role] !== undefined) {
        acc[role] += 1;
      }
      return acc;
    }, { total: 0, admin: 0, subadmin: 0, seller: 0, user: 0 });
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return profiles.filter(item => {
      const byRole = roleFilter === 'all'
        ? true
        : item.role === roleFilter;

      if (!byRole) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${item.fullName} ${item.email} ${item.uid}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [profiles, roleFilter, searchQuery]);

  const productIdsBySeller = useMemo(() => {
    const map = new Map();
    products.forEach(item => {
      if (!item.createdByUid) {
        return;
      }

      if (!map.has(item.createdByUid)) {
        map.set(item.createdByUid, new Set());
      }
      map.get(item.createdByUid).add(item.id);
    });
    return map;
  }, [products]);

  const sellerOrderCount = useMemo(() => {
    const counts = new Map();

    orders.forEach(order => {
      const itemIds = new Set((order.items || []).map(item => item.id));
      productIdsBySeller.forEach((sellerIds, sellerUid) => {
        const hasMatch = [...sellerIds].some(id => itemIds.has(id));
        if (hasMatch) {
          counts.set(sellerUid, (counts.get(sellerUid) || 0) + 1);
        }
      });
    });

    return counts;
  }, [orders, productIdsBySeller]);

  // Calculate seller profiles and their confirmed sales
  const sellerProfiles = useMemo(
    () => profiles.filter(item => item.role === 'seller'),
    [profiles],
  );

  // Map sellerUid => total confirmed sales (৳)
  const sellerConfirmedSales = useMemo(() => {
    const sales = new Map();
    if (!orders || !orders.length) return sales;
    sellerProfiles.forEach(seller => {
      let total = 0;
      // Find all orders for this seller's products that are confirmed
      orders.forEach(order => {
        if (order.status === 'confirmed' || order.status === 'delivered') {
          // Check if any item in this order belongs to this seller
          const sellerIds = productIdsBySeller.get(seller.uid) || new Set();
          const hasSellerProduct = (order.items || []).some(item => sellerIds.has(item.id));
          if (hasSellerProduct) {
            total += Number(order.totalPrice || 0);
          }
        }
      });
      sales.set(seller.uid, total);
    });
    return sales;
  }, [orders, sellerProfiles, productIdsBySeller]);

  const focusedSellerProducts = useMemo(() => {
    if (!sellerFocus.uid) return [];
    return products.filter(item => item.createdByUid === sellerFocus.uid);
  }, [products, sellerFocus.uid]);

  const focusedSellerOrders = useMemo(() => {
    if (!sellerFocus.uid) return [];
    const sellerIds = productIdsBySeller.get(sellerFocus.uid) || new Set();
    return orders.filter(order => {
      return (order.items || []).some(item => sellerIds.has(item.id));
    });
  }, [orders, productIdsBySeller, sellerFocus.uid]);

  const filteredOrders = useMemo(() => {
    const queryText = orderSearch.trim().toLowerCase();

    return orders.filter(order => {
      const byStatus = orderFilter === 'all' ? true : order.status === orderFilter;
      if (!byStatus) return false;

      if (!queryText) return true;
      const itemMatch = (order.items || []).some(item => String(item.name || '').toLowerCase().includes(queryText));
      const text = `${order.userName} ${order.userPhone} ${order.docId}`.toLowerCase();
      return itemMatch || text.includes(queryText);
    });
  }, [orders, orderFilter, orderSearch]);

  const filteredAdminProfiles = useMemo(
    () => filteredProfiles.filter(item => item.role === 'admin' || item.role === 'subadmin'),
    [filteredProfiles],
  );

  async function loadDashboardData() {
    setLoading(true);
    setStatus('');

    try {
      const [profileSnap, productSnap, orderSnap] = await Promise.all([
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders')),
      ]);

      const profileItems = profileSnap.docs
        .map(docSnap => createProfileItem(docSnap.data(), docSnap.id))
        .sort((a, b) => String(a.fullName || a.email || '').localeCompare(String(b.fullName || b.email || '')));

      const productItems = productSnap.docs
        .map(docSnap => createProductItem(docSnap.data(), docSnap.id))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));

      const orderItems = orderSnap.docs
        .map(docSnap => createOrderItem(docSnap.data(), docSnap.id))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

      setProfiles(profileItems);
      setProducts(productItems);
      setOrders(orderItems);

      // Save to cache for next time
      writeCache(ADMIN_CACHE_KEYS.profiles, profileItems);
      writeCache(ADMIN_CACHE_KEYS.products, productItems);
      writeCache(ADMIN_CACHE_KEYS.orders, orderItems);
    } catch {
      setStatus('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleRemove(item) {
    const label = item.fullName || item.email || item.uid;
    const ok = window.confirm(`Remove ${label} from profiles?`);
    if (!ok) {
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      await deleteDoc(doc(db, 'profiles', item.docId));
      setProfiles(prev => prev.filter(row => row.docId !== item.docId));
      setStatus('User profile removed successfully.');
      if (editingDocId === item.docId) {
        setEditingDocId(null);
      }
    } catch {
      setStatus('Failed to remove user.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item) {
    setEditingDocId(item.docId);
    setEditForm({
      fullName: item.fullName || '',
      email: item.email || '',
      role: item.role || 'user',
    });
  }

  async function setRole(item, role) {
    if (!ROLE_OPTIONS.includes(role)) {
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      await updateDoc(doc(db, 'profiles', item.docId), {
        role,
        admin: role === 'admin',
      });

      setProfiles(prev => prev.map(profile => (
        profile.docId === item.docId
          ? { ...profile, role, admin: role === 'admin' }
          : profile
      )));
      setStatus(`${item.fullName || item.email || item.uid} is now ${role}.`);
    } catch {
      setStatus('Failed to change role.');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();

    if (!editingDocId) {
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      await updateDoc(doc(db, 'profiles', editingDocId), {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        admin: editForm.role === 'admin',
      });

      setProfiles(prev => prev.map(item => (
        item.docId === editingDocId
          ? {
            ...item,
            fullName: editForm.fullName.trim(),
            email: editForm.email.trim(),
            role: editForm.role,
            admin: editForm.role === 'admin',
          }
          : item
      )));

      setStatus('User updated successfully.');
      setEditingDocId(null);
    } catch {
      setStatus('Failed to update user profile.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteProduct(productDocId) {
    const product = products.find(item => item.docId === productDocId);
    const ok = window.confirm(`Delete item '${product?.name || 'this product'}'?`);
    if (!ok) return;

    setBusy(true);
    setStatus('');
    try {
      await deleteDoc(doc(db, 'products', productDocId));
      setProducts(prev => prev.filter(item => item.docId !== productDocId));
      setStatus('Product deleted.');
    } catch {
      setStatus('Failed to delete product.');
    } finally {
      setBusy(false);
    }
  }

  async function updateOrderStatus(order, nextStatus) {
    const statusMessageMap = {
      pending: 'Order placed. Waiting for confirmation.',
      processing: 'Order is now processing by seller/admin.',
      confirmed: 'Order confirmed by seller/admin.',
      delivered: 'Order delivered successfully.',
      cancelled: 'Order cancelled by seller/admin.',
    };

    setBusy(true);
    setStatus('');
    try {
      const payload = {
        status: nextStatus,
        statusMessage: statusMessageMap[nextStatus] || 'Order status updated.',
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: {
          uid: currentUser?.uid || '',
          displayName: currentUser?.displayName || currentUser?.email || 'Admin',
        },
      };

      if (nextStatus === 'confirmed') {
        payload.confirmedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, 'orders', order.docId), payload);

      setOrders(prev => prev.map(item => (
        item.docId === order.docId
          ? { ...item, ...payload }
          : item
      )));
      setStatus(`Order ${order.docId} marked as ${nextStatus}.`);
    } catch {
      setStatus('Failed to update order status.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteOrder(orderId) {
    const ok = window.confirm(`Delete order ${orderId}?`);
    if (!ok) return;

    setBusy(true);
    setStatus('');
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(item => item.docId !== orderId));
      setStatus('Order deleted.');
    } catch {
      setStatus('Failed to delete order.');
    } finally {
      setBusy(false);
    }
  }

  const profileRows = filteredProfiles.length ? filteredProfiles : [];

  return (
    <section className="bstore-page">
      <div className="bstore-appbar mb-3">
        {/* Back button removed */}
        <h1 className="bstore-appbar__title mb-0">Admin Dashboard</h1>
        <div className="bstore-appbar__actions">
          <span className="badge text-bg-light">Admin</span>
        </div>
      </div>

      <div className="bstore-card">
        <p className="bstore-kicker">Admin Control</p>
        <h2 className="h4 mb-3">Quick Access</h2>
        <p className="bstore-muted mb-4">
          Manage store content and open admin tools from one place.
        </p>

        <div className="bstore-admin-grid">
          <button className="btn btn-primary" type="button" onClick={onOpenCatalogManager}>
            Catalog Manager
          </button>
          <button className="btn btn-outline-secondary" type="button" onClick={onOpenOrders}>
            Orders
          </button>
          <button className="btn btn-outline-secondary" type="button" onClick={onOpenPosterBuilder}>
            Poster Builder
          </button>
          <button className="btn btn-outline-secondary" type="button" onClick={onOpenPosterHistory}>
            Poster History
          </button>
        </div>
      </div>

      <div className="bstore-card">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <p className="bstore-kicker mb-1">User Management</p>
            <h3 className="h5 mb-0">Users, Sellers, Subadmins, Admins</h3>
          </div>
          <button className="btn btn-outline-secondary" type="button" onClick={loadDashboardData} disabled={loading}>
            {loading ? 'Loading...' : 'Load User List'}
          </button>
        </div>

        <div className="bstore-admin-stats mb-3">
          <div className="bstore-admin-stat">
            <span>Total Users</span>
            <strong>{roleCounts.total}</strong>
          </div>
          <div className="bstore-admin-stat">
            <span>Total Admins</span>
            <strong>{roleCounts.admin}</strong>
          </div>
          <div className="bstore-admin-stat">
            <span>Total Subadmins</span>
            <span>Total Subadmins</span>
            <strong>{roleCounts.subadmin}</strong>
          </div>
          <div className="bstore-admin-stat">
            <span>Total Sellers</span>
            <strong>{roleCounts.seller}</strong>
          </div>
          <div className="bstore-admin-stat">
            <span>Regular Users</span>
            <strong>{roleCounts.user}</strong>
          </div>
        </div>

        {status ? <div className="alert alert-info">{status}</div> : null}

        <div className="row g-2 mb-3">
          <div className="col-12 col-md-8">
            <input
              className="form-control"
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search by name, email, or uid"
            />
          </div>
          <div className="col-12 col-md-4">
            <select
              className="form-select"
              value={roleFilter}
              onChange={event => setRoleFilter(event.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="subadmin">Subadmins</option>
              <option value="seller">Sellers</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>

        {editingDocId ? (
          <form className="row g-2 mb-3" onSubmit={saveEdit}>
            <div className="col-12 col-md-4">
              <input
                className="form-control"
                value={editForm.fullName}
                onChange={event => setEditForm(prev => ({ ...prev, fullName: event.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="col-12 col-md-4">
              <input
                className="form-control"
                type="email"
                value={editForm.email}
                onChange={event => setEditForm(prev => ({ ...prev, email: event.target.value }))}
                placeholder="Email"
              />
            </div>
            <div className="col-12 col-md-2 d-flex align-items-center">
              <label className="form-check-label d-flex align-items-center gap-2">
                Role
                <select
                  className="form-select"
                  value={editForm.role}
                  onChange={event => setEditForm(prev => ({ ...prev, role: event.target.value }))}
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="col-12 col-md-2 d-flex gap-2">
              <button className="btn btn-primary w-100" type="submit" disabled={busy}>
                Save
              </button>
              <button className="btn btn-light" type="button" onClick={() => setEditingDocId(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="bstore-admin-list-wrap">
          <h4 className="h6">User List</h4>
          {profileRows.length === 0 ? (
            <p className="bstore-muted mb-0">No users match your current filter.</p>
          ) : (
            <div className="bstore-admin-list">
              {profileRows.map(item => {
                const label = item.fullName || item.email || item.uid;
                const canRemove = currentUser?.uid !== item.uid;
                return (
                  <article className="bstore-admin-row" key={item.docId}>
                    <div className="member-avatar bstore-admin-row__avatar" aria-hidden="true">
                      {item.photoURL ? (
                        <img src={item.photoURL} alt={label} referrerPolicy="no-referrer" />
                      ) : (
                        <span>{label.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="bstore-admin-row__meta">
                      <strong>{label}</strong>
                      <small>{item.email || 'No email'}</small>
                      <span className={item.role === 'admin' ? 'badge text-bg-warning' : 'badge text-bg-light'}>
                        {item.role}
                      </span>
                    </div>

                    <div className="bstore-admin-row__actions">
                      <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setRole(item, 'seller')} disabled={busy}>
                        Seller
                      </button>
                      <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setRole(item, 'subadmin')} disabled={busy}>
                        Subadmin
                      </button>
                      <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setRole(item, 'admin')} disabled={busy}>
                        Admin
                      </button>
                      <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => setRole(item, 'user')} disabled={busy}>
                        User
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => startEdit(item)} disabled={busy}>
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        type="button"
                        onClick={() => handleRemove(item)}
                        disabled={busy || !canRemove}
                        title={!canRemove ? 'You cannot remove your own profile.' : 'Remove user'}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="bstore-admin-list-wrap mt-3">
          <h4 className="h6">Admin List</h4>
          {filteredAdminProfiles.length === 0 ? (
            <p className="bstore-muted mb-0">No admin match your current filter.</p>
          ) : (
            <ul className="bstore-admin-inline-list mb-0">
              {filteredAdminProfiles.map(item => (
                <li key={`admin-${item.docId}`}>{item.fullName || item.email || item.uid} ({item.role})</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bstore-admin-list-wrap mt-3">
          <h4 className="h6">Seller Overview</h4>
          {sellerProfiles.length === 0 ? (
            <p className="bstore-muted mb-0">No seller assigned yet.</p>
          ) : (
            <div className="bstore-admin-list">
              {sellerProfiles.map(seller => {
                const itemCount = products.filter(item => item.createdByUid === seller.uid).length;
                const orderCount = sellerOrderCount.get(seller.uid) || 0;
                const confirmedSales = sellerConfirmedSales.get(seller.uid) || 0;

                return (
                  <article className="bstore-admin-row" key={`seller-${seller.docId}`}>
                    <div className="member-avatar bstore-admin-row__avatar" aria-hidden="true">
                      {seller.photoURL ? <img src={seller.photoURL} alt={seller.fullName || 'Seller'} /> : (seller.fullName?.[0] || 'S').toUpperCase()}
                    </div>

                    <div className="bstore-admin-row__meta">
                      <strong>{seller.fullName || seller.email || seller.uid}</strong>
                      <small>{seller.email || 'No email'}</small>
                      <span className="badge text-bg-info">Items: {itemCount} | Orders: {orderCount}</span>
                      <span className="badge text-bg-success ms-2">Confirmed Sales: ৳{confirmedSales.toLocaleString()}</span>
                    </div>

                    <div className="bstore-admin-row__actions">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        onClick={() => setSellerFocus({ uid: seller.uid, tab: 'items' })}
                      >
                        View Items
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        onClick={() => setSellerFocus({ uid: seller.uid, tab: 'orders' })}
                      >
                        View Orders
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {sellerFocus.uid ? (
          <div className="bstore-admin-list-wrap mt-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4 className="h6 mb-0">
                Seller {sellerFocus.tab === 'items' ? 'Items' : 'Orders'}
              </h4>
              <button className="btn btn-sm btn-light" type="button" onClick={() => setSellerFocus({ uid: '', tab: 'items' })}>
                Close
              </button>
            </div>

            {sellerFocus.tab === 'items' ? (
              focusedSellerProducts.length === 0 ? (
                <p className="bstore-muted mb-0">No items added by this seller.</p>
              ) : (
                <div className="bstore-admin-list">
                  {focusedSellerProducts.map(item => (
                    <article className="bstore-admin-row" key={`item-${item.docId}`}>
                      <div className="bstore-admin-row__meta">
                        <strong>{item.name}</strong>
                        <small>Price: ৳{item.price.toFixed(2)}</small>
                      </div>
                      <div className="bstore-admin-row__actions">
                        <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onOpenCatalogManager}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => handleDeleteProduct(item.docId)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )
            ) : (
              focusedSellerOrders.length === 0 ? (
                <p className="bstore-muted mb-0">No orders for this seller yet.</p>
              ) : (
                <div className="bstore-admin-list">
                  {focusedSellerOrders.map(order => (
                    <article className="bstore-admin-row" key={`seller-order-${order.docId}`}>
                      <div className="bstore-admin-row__meta">
                        <strong>Order #{order.docId.slice(0, 8)}</strong>
                        <small>{order.userName || 'Customer'} | {order.userPhone || 'N/A'}</small>
                        <span className={`badge ${getStatusClass(order.status)}`}>{order.status}</span>
                      </div>
                      <div className="bstore-admin-row__actions">
                        <button className="btn btn-sm btn-outline-success" type="button" onClick={() => updateOrderStatus(order, 'confirmed')}>
                          Confirm
                        </button>
                        <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => updateOrderStatus(order, 'cancelled')}>
                          Cancel
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )
            )}
          </div>
        ) : null}

        <div className="bstore-admin-list-wrap mt-3">
          <div className="d-flex flex-wrap gap-2 mb-2">
            <input
              className="form-control"
              style={{ maxWidth: 320 }}
              type="search"
              value={orderSearch}
              onChange={event => setOrderSearch(event.target.value)}
              placeholder="Search orders by user/phone/item"
            />
            <select
              className="form-select"
              style={{ maxWidth: 180 }}
              value={orderFilter}
              onChange={event => setOrderFilter(event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="confirmed">Confirmed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="btn btn-outline-secondary" type="button" onClick={onOpenOrders}>Open Orders Page</button>
          </div>

          <h4 className="h6">Orders ({filteredOrders.length})</h4>
          {filteredOrders.length === 0 ? (
            <p className="bstore-muted mb-0">No orders found.</p>
          ) : (
            <div className="bstore-admin-list">
              {filteredOrders.map(order => (
                <article className="bstore-admin-row" key={`order-${order.docId}`}>
                  <div className="bstore-admin-row__meta">
                    <strong>Order #{order.docId.slice(0, 8)} | ৳{order.totalPrice.toFixed(2)}</strong>
                    <small>{order.userName || 'Customer'} | {order.userPhone || 'N/A'} | {formatDate(order.createdAt)}</small>
                    <span className={`badge ${getStatusClass(order.status)}`}>{order.status}</span>
                    <small>{order.statusMessage}</small>
                   {order.statusUpdatedBy ? (
                     <small>Confirmed by: {order.statusUpdatedBy.displayName} on  {formatDate(order.statusUpdatedAt)}</small>
                   ) : null}
                   </div>
                  <div className="bstore-admin-row__actions">
                    <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => updateOrderStatus(order, 'processing')}>
                      Processing
                    </button>
                    <button className="btn btn-sm btn-outline-success" type="button" onClick={() => updateOrderStatus(order, 'confirmed')}>
                      Confirm
                    </button>
                    <button className="btn btn-sm btn-outline-success" type="button" onClick={() => updateOrderStatus(order, 'delivered')}>
                      Deliver
                    </button>
                    <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => updateOrderStatus(order, 'cancelled')}>
                      Cancel
                    </button>
                    <button className="btn btn-sm btn-danger" type="button" onClick={() => handleDeleteOrder(order.docId)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
