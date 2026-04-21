import { useEffect, useState } from 'react';
import { collection, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiShoppingBag,
  FiDownload,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiTruck,
  FiDollarSign,
  FiFilter,
  FiPackage,
  FiCalendar,
  FiUser,
  FiPhone,
  FiCreditCard,
  FiTrash2,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import { AdminListTileOrder, OrderDetailModal } from './components';
import { AdminListView } from './components';

const CACHE_KEY = 'admin-orders-page-data';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function getStatusIcon(status) {
  switch (status) {
    case 'pending': return <FiClock />;
    case 'processing': return <FiTruck />;
    case 'confirmed': return <FiCheckCircle />;
    case 'delivered': return <FiCheckCircle />;
    case 'cancelled': return <FiXCircle />;
    default: return <FiClock />;
  }
}

export default function AdminOrderStatusPage({ currentUser }) {
  const [orders, setOrders] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const items = snap.docs.map(d => ({
        docId: d.id,
        userUid: d.data()?.userUid || '',
        userName: d.data()?.userName || '',
        userPhone: d.data()?.userPhone || '',
        userEmail: d.data()?.userEmail || '',
        totalPrice: Number(d.data()?.totalPrice || 0),
        paymentMethod: d.data()?.paymentMethod || '',
        status: d.data()?.status || 'pending',
        statusMessage: d.data()?.statusMessage || '',
        createdAt: d.data()?.createdAt || null,
        items: Array.isArray(d.data()?.items) ? d.data().items : [],
        shipping: d.data()?.shipping || {},
        shippingCharge: d.data()?.shippingCharge || 0,
      }));

      items.sort((a, b) => {
        const aTime = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const bTime = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setOrders(items);
      writeCache(items);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = orders.filter(order => {
    const byStatus = statusFilter === 'all' || order.status === statusFilter;
    if (!byStatus) return false;

    const query = searchQuery.toLowerCase();
    if (!query) return true;

    return (
      order.userName.toLowerCase().includes(query) ||
      order.userPhone.toLowerCase().includes(query) ||
      order.docId.toLowerCase().includes(query) ||
      (order.items || []).some(item => String(item.name || '').toLowerCase().includes(query))
    );
  });

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const totalRevenue = orders
    .filter(o => o.status === 'confirmed' || o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  async function updateOrderStatus(order, newStatus) {
    const statusMessages = {
      pending: 'Order placed. Waiting for confirmation.',
      processing: 'Order is now processing by seller/admin.',
      confirmed: 'Order confirmed by seller/admin.',
      delivered: 'Order delivered successfully.',
      cancelled: 'Order cancelled by seller/admin.',
    };

    setBusyId(order.docId);
    try {
      const payload = {
        status: newStatus,
        statusMessage: statusMessages[newStatus] || 'Status updated.',
        statusUpdatedAt: new Date().toISOString(),
      };

      if (newStatus === 'confirmed') payload.confirmedAt = new Date().toISOString();
      if (newStatus === 'delivered') payload.deliveredAt = new Date().toISOString();

      await updateDoc(doc(db, 'orders', order.docId), payload);
      setOrders(prev => prev.map(o => (o.docId === order.docId ? { ...o, ...payload } : o)));
    } catch (err) {
      console.error('Failed to update order:', err);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteOrder(orderId) {
    if (!window.confirm(`Delete order ${orderId.substring(0, 8)}?`)) return;

    setBusyId(orderId);
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(o => o.docId !== orderId));
    } catch (err) {
      console.error('Failed to delete order:', err);
    } finally {
      setBusyId(null);
    }
  }

  function downloadPDF() {
    const docPDF = new jsPDF();
    const pageWidth = docPDF.internal.pageSize.getWidth();
    docPDF.setFillColor(99, 102, 241);
    docPDF.rect(0, 0, pageWidth, 40, 'F');
    docPDF.setTextColor(255, 255, 255);
    docPDF.setFontSize(22);
    docPDF.text('Order Status Report', pageWidth / 2, 18, { align: 'center' });
    docPDF.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });
    docPDF.save(`Order-Status-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  const stats = [
    { icon: <FiShoppingBag className="w-6 h-6" />, value: orderStats.total, label: 'Total Orders', bgColor: 'bg-indigo-100', color: 'text-indigo-600' },
    { icon: <FiClock className="w-6 h-6" />, value: orderStats.pending, label: 'Pending', bgColor: 'bg-amber-100', color: 'text-amber-600' },
    { icon: <FiTruck className="w-6 h-6" />, value: orderStats.processing, label: 'Processing', bgColor: 'bg-blue-100', color: 'text-blue-600' },
    { icon: <FiDollarSign className="w-6 h-6" />, value: `৳${totalRevenue.toLocaleString()}`, label: 'Revenue', bgColor: 'bg-emerald-100', color: 'text-emerald-600' },
  ];

  const filterOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="admin-orders-page animate-fade-in pb-20">
      <AdminListView
        title="Order Management"
        subtitle="Track and manage customer orders"
        loading={loading}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by ID, customer name, or phone..."
        filterOptions={filterOptions}
        selectedFilter={statusFilter}
        onFilterChange={setStatusFilter}
        onRefresh={loadData}
        refreshLabel="Refresh"
        stats={stats}
        emptyIcon={FiShoppingBag}
        emptyMessage={searchQuery || statusFilter !== 'all' ? 'No orders match your filters' : 'No orders found'}
        actions={
          <button 
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            onClick={downloadPDF}
          >
            <FiDownload className="w-4 h-4" />
            Export
          </button>
        }
      >
        {filteredOrders.map(order => (
          <AdminListTileOrder
            key={order.docId}
            order={order}
            onClick={() => setSelectedOrder(order)}
          />
        ))}
      </AdminListView>

      <OrderDetailModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onUpdateStatus={updateOrderStatus}
        busyId={busyId}
      />
    </div>
  );
}
