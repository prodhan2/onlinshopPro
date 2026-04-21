import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  FiAward,
  FiDownload,
  FiRefreshCw,
  FiArrowLeft,
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiTrendingUp,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import { AdminListTileSeller, SellerDetailModal } from './components';
import { AdminListView } from './components';

const CACHE_KEYS = {
  profiles: 'admin-sellers-profiles',
  products: 'admin-sellers-products',
  orders: 'admin-sellers-orders',
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
  } catch {}
}

export default function AdminSellerOverviewPage({ currentUser }) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState(() => readCache(CACHE_KEYS.profiles, []));
  const [products, setProducts] = useState(() => readCache(CACHE_KEYS.products, []));
  const [orders, setOrders] = useState(() => readCache(CACHE_KEYS.orders, []));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedRank, setSelectedRank] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const [profileSnap, productSnap, orderSnap] = await Promise.all([
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders')),
      ]);

      const profileItems = profileSnap.docs.map(d => ({
        docId: d.id,
        uid: d.data()?.uid || d.id,
        fullName: d.data()?.fullName || d.data()?.displayName || '',
        email: d.data()?.email || '',
        phone: d.data()?.phone || '',
        photoURL: d.data()?.photoURL || '',
        role: d.data()?.role || 'user',
      }));

      const productItems = productSnap.docs.map(d => ({
        docId: d.id,
        id: d.data()?.id || d.id,
        name: d.data()?.name || 'Unnamed',
        price: Number(d.data()?.price || 0),
        createdByUid: d.data()?.createdBy?.uid || '',
      }));

      const orderItems = orderSnap.docs.map(d => ({
        docId: d.id,
        userName: d.data()?.userName || '',
        userPhone: d.data()?.userPhone || '',
        totalPrice: Number(d.data()?.totalPrice || 0),
        status: d.data()?.status || 'pending',
        createdAt: d.data()?.createdAt || null,
        items: Array.isArray(d.data()?.items) ? d.data().items : [],
      }));

      setProfiles(profileItems);
      setProducts(productItems);
      setOrders(orderItems);

      writeCache(CACHE_KEYS.profiles, profileItems);
      writeCache(CACHE_KEYS.products, productItems);
      writeCache(CACHE_KEYS.orders, orderItems);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const sellers = useMemo(
    () => profiles.filter(p => p.role === 'seller'),
    [profiles]
  );

  const sellerStats = useMemo(() => {
    const productIdsBySeller = new Map();
    products.forEach(p => {
      if (!p.createdByUid) return;
      if (!productIdsBySeller.has(p.createdByUid)) {
        productIdsBySeller.set(p.createdByUid, new Set());
      }
      productIdsBySeller.get(p.createdByUid).add(p.id);
    });

    const stats = sellers.map(seller => {
      const sellerProductIds = productIdsBySeller.get(seller.uid) || new Set();
      const productCount = sellerProductIds.size;

      let orderCount = 0;
      let totalRevenue = 0;
      let confirmedRevenue = 0;

      orders.forEach(order => {
        const hasSellerProduct = (order.items || []).some(item => sellerProductIds.has(item.id));
        if (hasSellerProduct) {
          orderCount++;
          totalRevenue += Number(order.totalPrice || 0);
          if (order.status === 'confirmed' || order.status === 'delivered') {
            confirmedRevenue += Number(order.totalPrice || 0);
          }
        }
      });

      return {
        ...seller,
        productCount,
        orderCount,
        totalRevenue,
        confirmedRevenue,
      };
    });

    return stats.sort((a, b) => b.confirmedRevenue - a.confirmedRevenue);
  }, [sellers, products, orders]);

  const filteredSellers = sellerStats.filter(seller => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    return (
      seller.fullName.toLowerCase().includes(query) ||
      seller.email.toLowerCase().includes(query) ||
      seller.phone.toLowerCase().includes(query)
    );
  });

  function downloadPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(67, 233, 123);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Seller Overview Report', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Total Sellers: ${filteredSellers.length}`, pageWidth / 2, 35, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    let y = 50;
    doc.setFontSize(14);
    doc.text('Summary', 14, y);
    y += 8;
    doc.setFontSize(10);
    const totalProducts = filteredSellers.reduce((sum, s) => sum + s.productCount, 0);
    const totalOrders = filteredSellers.reduce((sum, s) => sum + s.orderCount, 0);
    const totalRevenue = filteredSellers.reduce((sum, s) => sum + s.confirmedRevenue, 0);
    doc.text(`Total Products: ${totalProducts}`, 14, y); y += 7;
    doc.text(`Total Orders: ${totalOrders}`, 14, y); y += 7;
    doc.text(`Total Confirmed Revenue: ৳${totalRevenue.toLocaleString()}`, 14, y); y += 12;

    doc.setFontSize(14);
    doc.text('Seller Details', 14, y);
    y += 8;
    doc.setFontSize(9);

    filteredSellers.forEach((seller, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(240, 240, 240);
      doc.rect(10, y - 5, pageWidth - 20, 8, 'F');
      doc.setFont(undefined, 'bold');
      doc.text(`${idx + 1}. ${seller.fullName}`, 12, y);
      doc.setFont(undefined, 'normal');
      y += 7;

      doc.text(`   Email: ${seller.email || 'N/A'}`, 12, y); y += 6;
      doc.text(`   Products: ${seller.productCount}`, 12, y); y += 6;
      doc.text(`   Orders: ${seller.orderCount}`, 12, y); y += 6;
      doc.text(`   Confirmed Revenue: ৳${seller.confirmedRevenue.toLocaleString()}`, 12, y); y += 10;
    });

    doc.save(`Seller-Overview-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  const totalProducts = filteredSellers.reduce((sum, s) => sum + s.productCount, 0);
  const totalOrders = filteredSellers.reduce((sum, s) => sum + s.orderCount, 0);
  const totalRevenue = filteredSellers.reduce((sum, s) => sum + s.confirmedRevenue, 0);

  const stats = [
    { icon: <FiAward className="w-6 h-6" />, value: filteredSellers.length, label: 'Total Sellers', bgColor: 'bg-emerald-100', color: 'text-emerald-600' },
    { icon: <FiPackage className="w-6 h-6" />, value: totalProducts, label: 'Products', bgColor: 'bg-blue-100', color: 'text-blue-600' },
    { icon: <FiShoppingBag className="w-6 h-6" />, value: totalOrders, label: 'Orders', bgColor: 'bg-pink-100', color: 'text-pink-600' },
    { icon: <FiDollarSign className="w-6 h-6" />, value: `৳${totalRevenue.toLocaleString()}`, label: 'Revenue', bgColor: 'bg-amber-100', color: 'text-amber-600' },
  ];

  return (
    <div className="admin-seller-overview-page animate-fade-in pb-20">
      <AdminListView
        title="Seller Overview"
        subtitle="View and manage all sellers"
        loading={loading}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search sellers by name, email, or phone..."
        onRefresh={loadData}
        refreshLabel="Refresh"
        stats={stats}
        emptyIcon={FiAward}
        emptyMessage={searchQuery ? 'No sellers match your search' : 'No sellers found'}
        actions={
          <button 
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            onClick={downloadPDF}
          >
            <FiDownload className="w-4 h-4" />
            Download PDF
          </button>
        }
      >
        {filteredSellers.map((seller, idx) => (
          <AdminListTileSeller
            key={seller.docId}
            seller={seller}
            rank={idx + 1}
            onClick={() => {
              setSelectedSeller(seller);
              setSelectedRank(idx + 1);
            }}
          />
        ))}
      </AdminListView>

      <SellerDetailModal
        isOpen={!!selectedSeller}
        onClose={() => {
          setSelectedSeller(null);
          setSelectedRank(null);
        }}
        seller={selectedSeller}
        rank={selectedRank}
      />
    </div>
  );
}
