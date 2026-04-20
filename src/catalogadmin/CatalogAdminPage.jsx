import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { convertToWebP } from '../bstoreapp/webpConverter';
import ConfirmDialog from '../components/ConfirmDialog';
import logo from '../bstoreapp/assets/images/logo.png';
import './catalogAdmin.css';

const BEEIMG_API_KEY = '58c9ff18b1cf549b8fa5b946d5860f27';

async function uploadImageToBeeImg(file) {
  try {
    console.log(`Uploading: ${file.name} (${(file.size / 1024).toFixed(1)}KB, ${file.type || 'unknown type'})`);
    const webpFile = await convertToWebP(file, 0.85, 1920);
    console.log(`Converted to: ${webpFile.name} (${(webpFile.size / 1024).toFixed(1)}KB)`);
    
    const formData = new FormData();
    formData.append('file', webpFile);
    formData.append('apikey', BEEIMG_API_KEY);

    const response = await fetch('https://beeimg.com/api/upload/file/json/', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    const fileData = data?.files;
    if (!fileData?.url) {
      throw new Error(fileData?.status || 'Image upload failed');
    }
    
    console.log(`Upload successful: ${fileData.url}`);
    return fileData.url;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function generateNextCategoryId(categories) {
  const maxNum = categories.reduce((max, item) => {
    const raw = String(item?.id || '');
    const match = raw.match(/(\d+)$/);
    const n = match ? Number(match[1]) : 0;
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const next = maxNum + 1;
  return `CAT-${String(next).padStart(3, '0')}`;
}

function generateNextProductId(products) {
  const maxNum = products.reduce((max, item) => {
    const raw = String(item?.id || '');
    const match = raw.match(/(\d+)$/);
    const n = match ? Number(match[1]) : 0;
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const next = maxNum + 1;
  return `P-${String(next).padStart(3, '0')}`;
}

function generateNextBannerNo(banners) {
  const maxNum = banners.reduce((max, item) => {
    const n = Number(item?.no || 0);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return String(maxNum + 1);
}

function splitImages(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CatalogAdminPage({ onBack, canEdit, authReady, currentUser, onOpenOrders }) {
  const dragImageIdRef = useRef(null);
  const settingsRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState([]);
  const [banners, setBanners] = useState([]);
  const [editingCategoryDocId, setEditingCategoryDocId] = useState(null);
  const [editingProductDocId, setEditingProductDocId] = useState(null);
  const [editingPaymentDocId, setEditingPaymentDocId] = useState(null);
  const [editingBannerDocId, setEditingBannerDocId] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeSection, setActiveSection] = useState('categories');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const [categoryFile, setCategoryFile] = useState(null);
  const [initialLoadState, setInitialLoadState] = useState({
    categories: false,
    products: false,
    payment: false,
    banners: false,
  });
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', description: '', iconUrl: '' });
  const [productForm, setProductForm] = useState({
    id: '', name: '', description: '', image: '', price: '', discount: '0', stock: '0', categoryId: '', rating: '0', available: true,
  });
  const [productFile, setProductFile] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    area_name: '', charge: '', contact_number: '', COD_instructions: '', bKash_instructions: '',
  });
  const [bannerForm, setBannerForm] = useState({ no: '', imageUrl: '', description: '', show: true });
  const [bannerFile, setBannerFile] = useState(null);
  const [successPopup, setSuccessPopup] = useState({ show: false, message: '', type: 'success' });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, type: '', item: null, onConfirm: null });
  const [zoomedImage, setZoomedImage] = useState(null);
  const [coverImageId, setCoverImageId] = useState(null);

  const nextCategoryId = useMemo(() => generateNextCategoryId(categories), [categories]);
  const nextProductId = useMemo(() => generateNextProductId(products), [products]);
  const nextBannerNo = useMemo(() => generateNextBannerNo(banners), [banners]);
  const actor = useMemo(() => currentUser ? { displayName: currentUser.displayName, photoURL: currentUser.photoURL } : null, [currentUser]);
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => String(a?.name || a?.id || '').localeCompare(String(b?.name || b?.id || ''))),
    [categories],
  );
  const loadingData = useMemo(
    () => authReady && canEdit && Object.values(initialLoadState).some((value) => !value),
    [authReady, canEdit, initialLoadState],
  );

  const imageItems = useMemo(() => {
    const urls = splitImages(productForm.image);
    const files = productFile.map((f) => ({ id: f.id, src: f.preview, label: f.file.name }));
    return [...files, ...urls.map((url, i) => ({ id: `url-${i}`, src: url, label: 'URL Image' }))];
  }, [productForm.image, productFile]);

  const showSuccess = (message) => {
    setSuccessPopup({ show: true, message, type: 'success' });
    setTimeout(() => setSuccessPopup((p) => (p.type === 'success' ? { show: false, message: '', type: 'success' } : p)), 3000);
  };

  const showError = (message) => {
    setSuccessPopup({ show: true, message, type: 'error' });
    setTimeout(() => setSuccessPopup((p) => (p.type === 'error' ? { show: false, message: '', type: 'error' } : p)), 3000);
  };

  useEffect(() => {
    if (!editingCategoryDocId) {
      setCategoryForm((prev) => ({ ...prev, id: prev.id || nextCategoryId }));
    }
  }, [editingCategoryDocId, nextCategoryId]);

  useEffect(() => {
    if (!editingProductDocId) {
      setProductForm((prev) => ({
        ...prev,
        id: prev.id || nextProductId,
        categoryId: prev.categoryId || sortedCategories[0]?.id || '',
      }));
    }
  }, [editingProductDocId, nextProductId, sortedCategories]);

  useEffect(() => {
    if (!editingBannerDocId) {
      setBannerForm((prev) => ({ ...prev, no: prev.no || nextBannerNo }));
    }
  }, [editingBannerDocId, nextBannerNo]);

  useEffect(() => {
    setMobileView('list');
  }, [activeSection]);

  useEffect(() => {
    if (!authReady || !canEdit) return;

    const unsubscribe = onSnapshot(collection(db, 'categories'), (snap) => {
      const items = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
      setCategories(items);
      setInitialLoadState((prev) => ({ ...prev, categories: true }));
      if (!productForm.categoryId && items.length > 0) {
        setProductForm((p) => ({ ...p, categoryId: items[0].id }));
      }
    });

    return () => unsubscribe();
  }, [authReady, canEdit, productForm.categoryId]);

  useEffect(() => {
    if (!authReady || !canEdit) return;
    const unsubscribe = onSnapshot(collection(db, 'products'), (snap) => {
      const items = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
      setProducts(items);
      setInitialLoadState((prev) => ({ ...prev, products: true }));
    });
    return () => unsubscribe();
  }, [authReady, canEdit]);

  useEffect(() => {
    if (!authReady || !canEdit) return;
    const unsubscribe = onSnapshot(collection(db, 'paymentDetails'), (snap) => {
      const items = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
      setPaymentDetails(items);
      setInitialLoadState((prev) => ({ ...prev, payment: true }));
    });
    return () => unsubscribe();
  }, [authReady, canEdit]);

  useEffect(() => {
    if (!authReady || !canEdit) return;
    const unsubscribe = onSnapshot(collection(db, 'banners'), (snap) => {
      const items = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
      const sorted = [...items].sort((a, b) => Number(a.no || 0) - Number(b.no || 0));
      setBanners(sorted);
      setInitialLoadState((prev) => ({ ...prev, banners: true }));
    });
    return () => unsubscribe();
  }, [authReady, canEdit]);

  const saveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setStatus('Category name is required.');
      return;
    }
    setBusy(true);
    setStatus('Saving category...');
    try {
      const now = new Date().toISOString();
      let iconUrl = categoryForm.iconUrl.trim();
      if (categoryFile) {
        try {
          iconUrl = await uploadImageToBeeImg(categoryFile);
        } catch {
          iconUrl = await toDataUrl(categoryFile);
        }
      }

      const payload = {
        id: categoryForm.id || nextCategoryId,
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        iconUrl,
      };
      let next;
      if (editingCategoryDocId) {
        await updateDoc(doc(db, 'categories', editingCategoryDocId), { ...payload, updatedAt: now, updatedBy: actor });
        next = categories.map((item) =>
          item._docId === editingCategoryDocId ? { ...item, ...payload, updatedAt: now, updatedBy: actor } : item,
        );
      } else {
        const createPayload = { ...payload, createdAt: now, createdBy: actor };
        const ref = await addDoc(collection(db, 'categories'), createPayload);
        next = [{ _docId: ref.id, ...createPayload }, ...categories];
      }
      setCategories(next);
      setEditingCategoryDocId(null);
      setCategoryForm({ id: '', name: '', description: '', iconUrl: '' });
      setCategoryFile(null);
      const message = editingCategoryDocId ? 'Category updated successfully! ✅' : 'Category added successfully! ✅';
      showSuccess(message);
      setStatus(message);
    } catch (error) {
      console.error('Category error:', error);
      showError('Failed to save category. Please try again.');
      setStatus('Failed to save category.');
    } finally {
      setBusy(false);
    }
  };

  const handleEditCategory = (item) => {
    setEditingCategoryDocId(item._docId);
    setCategoryForm({
      id: item.id || '',
      name: item.name || '',
      description: item.description || '',
      iconUrl: item.iconUrl || '',
    });
    setCategoryFile(null);
    setStatus(`Editing category: ${item.name}`);
  };

  const handleDeleteCategory = (item) => {
    showDeleteConfirmation('category', item, async () => {
      try {
        await deleteDoc(doc(db, 'categories', item._docId));
        const next = categories.filter((x) => x._docId !== item._docId);
        setCategories(next);
        if (editingCategoryDocId === item._docId) {
          setEditingCategoryDocId(null);
          setCategoryForm({ id: '', name: '', description: '', iconUrl: '' });
          setCategoryFile(null);
        }
        const message = `Category "${item.name}" deleted successfully! 🗑️`;
        showSuccess(message);
        setStatus(message);
      } catch (error) {
        console.error('Delete category error:', error);
        showError('Failed to delete category. Please try again.');
        setStatus('Failed to delete category from Firebase.');
      }
    });
  };

  const reorderImages = (from, to) => {
    if (from === to || !from || !to) return;
    const allItems = [...imageItems];
    const fromIdx = allItems.findIndex((i) => i.id === from);
    const toIdx = allItems.findIndex((i) => i.id === to);
    if (fromIdx < 0 || toIdx < 0) return;
    const [item] = allItems.splice(fromIdx, 1);
    allItems.splice(toIdx, 0, item);
    const newUrls = allItems.filter((i) => i.id.startsWith('url-')).map((i) => i.src).join(', ');
    setProductForm((p) => ({ ...p, image: newUrls }));
  };

  const removeImageItem = (id) => {
    if (id.startsWith('url-')) {
      const urls = splitImages(productForm.image);
      const idx = parseInt(id.split('-')[1]);
      urls.splice(idx, 1);
      setProductForm((p) => ({ ...p, image: urls.join(', ') }));
    } else {
      setProductFile((pf) => pf.filter((f) => f.id !== id));
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      setStatus('Product name is required.');
      return;
    }
    setBusy(true);
    setStatus('Saving product...');
    try {
      let image = productForm.image.trim();
      for (const file of productFile) {
        try {
          const url = await uploadImageToBeeImg(file.file);
          image = image ? `${image}, ${url}` : url;
        } catch {
          const dataUrl = await toDataUrl(file.file);
          image = image ? `${image}, ${dataUrl}` : dataUrl;
        }
      }

      const now = new Date().toISOString();
      const payload = {
        id: productForm.id || nextProductId,
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        image: image || '',
        price: Number(productForm.price || 0),
        discount: Number(productForm.discount || 0),
        stock: Number(productForm.stock || 0),
        categoryId: productForm.categoryId || '',
        rating: Number(productForm.rating || 0),
        available: productForm.available !== false,
      };

      let next;
      if (editingProductDocId) {
        await updateDoc(doc(db, 'products', editingProductDocId), { ...payload, updatedAt: now, updatedBy: actor });
        next = products.map((item) =>
          item._docId === editingProductDocId ? { ...item, ...payload, updatedAt: now, updatedBy: actor } : item,
        );
      } else {
        const createPayload = { ...payload, createdAt: now, createdBy: actor };
        const ref = await addDoc(collection(db, 'products'), createPayload);
        next = [{ _docId: ref.id, ...createPayload }, ...products];
      }

      setProducts(next);
      setEditingProductDocId(null);
      setProductForm({
        id: nextProductId,
        name: '',
        description: '',
        image: '',
        price: '',
        discount: '0',
        stock: '0',
        categoryId: categories[0]?.id || '',
        rating: '0',
        available: true,
      });
      setProductFile([]);
      setCoverImageId(null);
      const message = editingProductDocId ? 'Product updated successfully! ✅' : 'Product added successfully! ✅';
      showSuccess(message);
      setStatus(message);
    } catch (error) {
      console.error('Product error:', error);
      showError('Failed to save product. Please try again.');
      setStatus('Failed to save product.');
    } finally {
      setBusy(false);
    }
  };

  const handleEditProduct = (item) => {
    setEditingProductDocId(item._docId);
    setProductForm({
      id: item.id || '',
      name: item.name || '',
      description: item.description || '',
      image: item.image || '',
      price: item.price || '',
      discount: item.discount || '0',
      stock: item.stock || '0',
      categoryId: item.categoryId || categories[0]?.id || '',
      rating: item.rating || '0',
      available: item.available !== false,
    });
    setProductFile([]);
    setStatus(`Editing product: ${item.name}`);
  };

  const handleDeleteProduct = (item) => {
    showDeleteConfirmation('product', item, async () => {
      try {
        await deleteDoc(doc(db, 'products', item._docId));
        const next = products.filter((x) => x._docId !== item._docId);
        setProducts(next);
        if (editingProductDocId === item._docId) {
          setEditingProductDocId(null);
          setProductForm({
            id: nextProductId,
            name: '',
            description: '',
            image: '',
            price: '',
            discount: '0',
            stock: '0',
            categoryId: '',
            rating: '0',
            available: true,
          });
          setProductFile([]);
        }
        const message = `Product "${item.name}" deleted successfully! 🗑️`;
        showSuccess(message);
        setStatus(message);
      } catch (error) {
        console.error('Delete product error:', error);
        showError('Failed to delete product. Please try again.');
        setStatus('Failed to delete product from Firebase.');
      }
    });
  };

  const savePaymentDetail = async (e) => {
    e.preventDefault();
    if (!paymentForm.area_name.trim()) {
      setStatus('Area name is required.');
      return;
    }
    setBusy(true);
    setStatus('Saving payment details...');
    try {
      const now = new Date().toISOString();
      const payload = {
        area_name: paymentForm.area_name.trim(),
        charge: Number(paymentForm.charge || 0),
        contact_number: paymentForm.contact_number.trim(),
        COD_instructions: paymentForm.COD_instructions.trim(),
        bKash_instructions: paymentForm.bKash_instructions.trim(),
      };

      let next;
      if (editingPaymentDocId) {
        await updateDoc(doc(db, 'paymentDetails', editingPaymentDocId), {
          ...payload,
          updatedAt: now,
          updatedBy: actor,
        });
        next = paymentDetails.map((item) =>
          item._docId === editingPaymentDocId
            ? { ...item, ...payload, updatedAt: now, updatedBy: actor }
            : item,
        );
      } else {
        const createPayload = { ...payload, createdAt: now, createdBy: actor };
        const ref = await addDoc(collection(db, 'paymentDetails'), createPayload);
        next = [{ _docId: ref.id, ...createPayload }, ...paymentDetails];
      }

      setPaymentDetails(next);
      setEditingPaymentDocId(null);
      setPaymentForm({
        area_name: '',
        charge: '',
        contact_number: '',
        COD_instructions: '',
        bKash_instructions: '',
      });

      const message = editingPaymentDocId ? 'Payment details updated successfully! ✅' : 'Payment details added successfully! ✅';
      showSuccess(message);
      setStatus(message);
    } catch (error) {
      console.error('Payment error:', error);
      showError('Failed to save payment details. Please try again.');
      setStatus('Failed to save payment details.');
    } finally {
      setBusy(false);
    }
  };

  const handleEditPayment = (item) => {
    setEditingPaymentDocId(item._docId);
    setPaymentForm({
      area_name: item.area_name || '',
      charge: item.charge || '',
      contact_number: item.contact_number || '',
      COD_instructions: item.COD_instructions || '',
      bKash_instructions: item.bKash_instructions || '',
    });
    setStatus(`Editing payment details: ${item.area_name || item._docId}`);
  };

  const handleDeletePayment = (item) => {
    showDeleteConfirmation('payment', item, async () => {
      try {
        await deleteDoc(doc(db, 'paymentDetails', item._docId));
        const next = paymentDetails.filter((x) => x._docId !== item._docId);
        setPaymentDetails(next);
        if (editingPaymentDocId === item._docId) {
          setEditingPaymentDocId(null);
          setPaymentForm({
            area_name: '',
            charge: '',
            contact_number: '',
            COD_instructions: '',
            bKash_instructions: '',
          });
        }
        const message = `Payment details for "${item.area_name}" deleted successfully! 🗑️`;
        showSuccess(message);
        setStatus(message);
      } catch (error) {
        console.error('Delete payment error:', error);
        showError('Failed to delete payment details. Please try again.');
        setStatus('Failed to delete payment details from Firebase.');
      }
    });
  };

  const saveBanner = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus('Saving banner...');
    try {
      let imageUrl = bannerForm.imageUrl.trim();
      if (bannerFile) {
        try {
          imageUrl = await uploadImageToBeeImg(bannerFile);
        } catch {
          imageUrl = await toDataUrl(bannerFile);
        }
      }

      if (!imageUrl) {
        setStatus('Banner Image URL or Image Upload is required.');
        setBusy(false);
        return;
      }

      const now = new Date().toISOString();
      const bannerNo = editingBannerDocId ? Number(bannerForm.no || 0) : Number(nextBannerNo || 1);
      const payload = {
        no: bannerNo,
        imageUrl,
        description: bannerForm.description.trim(),
        show: Boolean(bannerForm.show),
      };

      let next;
      if (editingBannerDocId) {
        await updateDoc(doc(db, 'banners', editingBannerDocId), {
          ...payload,
          updatedAt: now,
          updatedBy: actor,
        });
        next = banners.map((item) =>
          item._docId === editingBannerDocId
            ? { ...item, ...payload, updatedAt: now, updatedBy: actor }
            : item,
        );
      } else {
        const createPayload = { ...payload, createdAt: now, createdBy: actor };
        const ref = await addDoc(collection(db, 'banners'), createPayload);
        next = [{ _docId: ref.id, ...createPayload }, ...banners];
      }

      next = [...next].sort((a, b) => Number(a.no || 0) - Number(b.no || 0));
      setBanners(next);
      setEditingBannerDocId(null);
      setBannerForm({ no: generateNextBannerNo(next), imageUrl: '', description: '', show: true });
      setBannerFile(null);

      const message = editingBannerDocId ? 'Banner updated successfully! ✅' : 'Banner added successfully! ✅';
      showSuccess(message);
      setStatus(message);
    } catch (error) {
      console.error('Banner error:', error);
      showError('Failed to save banner. Please try again.');
      setStatus('Failed to save banner.');
    } finally {
      setBusy(false);
    }
  };

  const handleEditBanner = (item) => {
    setEditingBannerDocId(item._docId);
    setBannerForm({
      no: String(item.no || ''),
      imageUrl: item.imageUrl || '',
      description: item.description || '',
      show: item.show !== false,
    });
    setBannerFile(null);
    setStatus(`Editing banner: ${item.no}`);
  };

  const handleDeleteBanner = (item) => {
    showDeleteConfirmation('banner', item, async () => {
      try {
        await deleteDoc(doc(db, 'banners', item._docId));
        const next = banners.filter((x) => x._docId !== item._docId);
        setBanners(next);
        if (editingBannerDocId === item._docId) {
          setEditingBannerDocId(null);
          setBannerForm({ no: generateNextBannerNo(next), imageUrl: '', description: '', show: true });
          setBannerFile(null);
        }
        const message = `Banner No. ${item.no} deleted successfully! 🗑️`;
        showSuccess(message);
        setStatus(message);
      } catch (error) {
        console.error('Delete banner error:', error);
        showError('Failed to delete banner. Please try again.');
        setStatus('Failed to delete banner from Firebase.');
      }
    });
  };

  const showDeleteConfirmation = (type, item, onConfirm) => {
    setConfirmDelete({ show: true, type, item, onConfirm });
  };

  return (
    <section className="catalog-admin-page">
      {/* Header */}
      <header className="catalog-admin-topbar">
        <div className="catalog-admin-topbar-inner">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/';
              }
            }}
            className="catalog-admin-back"
            title="Go back"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="catalog-admin-topbar-title">Catalog Manager</h1>
          <div className="catalog-admin-topbar-meta">
            <div>
              {products.length} products
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="catalog-admin-content">
        {/* Tab Navigation */}
        <div className="catalog-admin-tabs">
          <button
            type="button"
            onClick={() => setActiveSection('categories')}
            className={`catalog-admin-tab ${activeSection === 'categories' ? 'is-active' : ''}`}
          >
            <div className="hidden sm:inline">📁 Categories</div>
            <div className="sm:hidden">Categories</div>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('products')}
            className={`catalog-admin-tab ${activeSection === 'products' ? 'is-active' : ''}`}
          >
            <div className="hidden sm:inline">🛍️ Products</div>
            <div className="sm:hidden">Products</div>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('banners')}
            className={`catalog-admin-tab ${activeSection === 'banners' ? 'is-active' : ''}`}
          >
            <div className="hidden sm:inline">🎨 Banners</div>
            <div className="sm:hidden">Banners</div>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('payment')}
            className={`catalog-admin-tab ${activeSection === 'payment' ? 'is-active' : ''}`}
          >
            <div className="hidden sm:inline">💳 Payment</div>
            <div className="sm:hidden">Payment</div>
          </button>
        </div>

        {/* Status Message */}
        {status && (
          <div className="catalog-admin-inline-status">
            <p className="text-sm font-medium">{status}</p>
          </div>
        )}

        {loadingData ? <div className="catalog-admin-status">Loading data from Firebase...</div> : null}

        <div className="catalog-admin-grid">
        {activeSection === 'categories' ? (
        <>
          {/* Mobile View Toggle Button */}
          <button
            type="button"
            className="btn mobile-view-toggle"
            onClick={() => setMobileView(mobileView === 'form' ? 'list' : 'form')}
          >
            {mobileView === 'form' ? 'Show categories list' : 'Open category form'}
          </button>

          {/* Form Section */}
          <form className={`catalog-card catalog-form-section ${mobileView === 'list' ? 'hidden-mobile' : ''}`} onSubmit={saveCategory}>
          <div className="catalog-section-divider">
            <span>Category Form</span>
          </div>
          <h3>{editingCategoryDocId ? 'Edit Category' : 'Add Category'}</h3>
          <label>
            Category ID
            <input
              type="text"
              value={categoryForm.id}
              readOnly
              aria-readonly="true"
              onFocus={(e) => e.target.select()}
              placeholder="CAT-001"
            />
          </label>
          <label>
            Name
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Electronics"
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((s) => ({ ...s, description: e.target.value }))}
              rows={3}
              placeholder="Short category description"
            />
          </label>
          <label>
            Icon URL (optional)
            <input
              type="url"
              value={categoryForm.iconUrl}
              onChange={(e) => setCategoryForm((s) => ({ ...s, iconUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label>
            Icon Upload (optional)
            <input type="file" accept="image/*" onChange={(e) => setCategoryFile(e.target.files?.[0] || null)} />
          </label>
          <div className="action-row">
            <button className="btn primary" type="submit" disabled={busy}>
              {editingCategoryDocId ? 'Update Category' : 'Add Category'}
            </button>
            {editingCategoryDocId ? (
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setEditingCategoryDocId(null);
                  setCategoryForm({ id: nextCategoryId, name: '', description: '', iconUrl: '' });
                  setCategoryFile(null);
                  setStatus('Category edit canceled.');
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

          {/* List Section */}
          <div className={`catalog-card catalog-list-section ${mobileView === 'form' ? 'hidden-mobile' : ''}`}>
            <div className="catalog-section-divider">
              <span>Category List</span>
            </div>
            <h4>Categories ({categories.length})</h4>
            <ul>
              {sortedCategories.map((item) => (
                <li key={item._docId}>
                  <div className="item-main">
                    {item.iconUrl ? (
                      <img 
                        src={item.iconUrl} 
                        alt={item.name || 'Category'} 
                        className="catalog-item-image catalog-item-image--category"
                        onClick={() => setZoomedImage(item.iconUrl)}
                      />
                    ) : item.createdBy?.photoURL ? (
                      <img src={item.createdBy.photoURL} alt={item.createdBy.displayName || 'Creator'} />
                    ) : null}
                    <span>{item.name}</span>
                    <code>{item.id || item._docId}</code>
                    <small>By: {item.createdBy?.displayName || 'Unknown'}</small>
                  </div>
                  <div className="item-actions">
                    <button type="button" className="btn mini" onClick={() => handleEditCategory(item)}>Edit</button>
                    <button type="button" className="btn mini danger" onClick={() => handleDeleteCategory(item)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
        ) : null}

        {activeSection === 'products' ? (
        <>
          {/* Mobile View Toggle Button */}
          <button
            type="button"
            className="btn mobile-view-toggle"
            onClick={() => setMobileView(mobileView === 'form' ? 'list' : 'form')}
          >
            {mobileView === 'form' ? 'Show products list' : 'Open product form'}
          </button>

          {/* Form Section */}
          <form className={`catalog-card catalog-form-section ${mobileView === 'list' ? 'hidden-mobile' : ''}`} onSubmit={saveProduct}>
          <div className="catalog-section-divider">
            <span>Product Form</span>
          </div>
          <h3>{editingProductDocId ? 'Edit Product' : 'Add Product'}</h3>
          <div className="two-col">
            <label>
              Product ID
              <input
                type="text"
                value={productForm.id}
                readOnly
                aria-readonly="true"
                onFocus={(e) => e.target.select()}
                placeholder="P-001"
              />
            </label>
            <label>
              Name
              <input
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Product name"
                required
              />
            </label>
          </div>

          <label>
            Description
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm((s) => ({ ...s, description: e.target.value }))}
              rows={3}
              placeholder="Product details"
            />
          </label>

          <div className="two-col">
            <label>
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={productForm.price}
                onChange={(e) => setProductForm((s) => ({ ...s, price: e.target.value }))}
                required
              />
            </label>
            <label>
              Discount (%)
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={productForm.discount}
                onChange={(e) => setProductForm((s) => ({ ...s, discount: e.target.value }))}
              />
            </label>
          </div>

          <div className="two-col">
            <label>
              Stock
              <input
                type="number"
                min="0"
                step="1"
                value={productForm.stock}
                onChange={(e) => setProductForm((s) => ({ ...s, stock: e.target.value }))}
              />
            </label>
            <label>
              Rating (0-5)
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={productForm.rating}
                onChange={(e) => setProductForm((s) => ({ ...s, rating: e.target.value }))}
              />
            </label>
          </div>

          <label>
            Category
            <select
              value={productForm.categoryId}
              onChange={(e) => setProductForm((s) => ({ ...s, categoryId: e.target.value }))}
              required
            >
              <option value="">Select category</option>
              {sortedCategories.map((item) => (
                <option key={item.id} value={item.id}>{item.name} ({item.id})</option>
              ))}
            </select>
          </label>

          <label>
            Image URL (optional, comma separated)
            <input
              type="text"
              value={productForm.image}
              onChange={(e) => setProductForm((s) => ({ ...s, image: e.target.value }))}
              placeholder="https://..."
            />
          </label>

          <label>
            Image Upload (optional, multiple)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const mapped = files.map((file) => ({
                  id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  file,
                  preview: URL.createObjectURL(file),
                }));
                setProductFile(mapped);
              }}
            />
          </label>

          {imageItems.length ? (
            <div className="preview-wrap">
              <div className="preview-head">
                Images Preview ({imageItems.length})
              </div>
              <div className="preview-grid">
                {imageItems.map((item) => (
                  <div
                    className="preview-item"
                    key={item.id}
                    draggable
                    onDragStart={() => {
                      dragImageIdRef.current = item.id;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      reorderImages(dragImageIdRef.current, item.id);
                    }}
                  >
                    <img src={item.src} alt={item.label} loading="lazy" />
                    <div className="preview-item-meta">{item.label}</div>
                    <div className="preview-item-actions">
                      <button
                        type="button"
                        className={`btn mini ${coverImageId === item.id ? 'primary' : ''}`}
                        onClick={() => setCoverImageId(item.id)}
                      >
                        Cover
                      </button>
                      <button
                        type="button"
                        className="btn mini danger"
                        onClick={() => removeImageItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <label className="check-row">
            <input
              type="checkbox"
              checked={productForm.available}
              onChange={(e) => setProductForm((s) => ({ ...s, available: e.target.checked }))}
            />
            Available
          </label>

          <div className="action-row">
            <button className="btn primary" type="submit" disabled={busy}>
              {editingProductDocId ? 'Update Product' : 'Add Product'}
            </button>
            {editingProductDocId ? (
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setEditingProductDocId(null);
                  setProductForm({
                    id: nextProductId,
                    name: '',
                    description: '',
                    image: '',
                    price: '',
                    discount: '0',
                    stock: '0',
                    categoryId: '',
                    rating: '0',
                    available: true,
                  });
                  setProductFile([]);
                  setStatus('Product edit canceled.');
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

          {/* List Section */}
          <div className={`catalog-card catalog-list-section ${mobileView === 'form' ? 'hidden-mobile' : ''}`}>
            <div className="catalog-section-divider">
              <span>Product List</span>
            </div>
            <h4>Products ({products.length})</h4>
            <ul>
              {[...products].reverse().map((item) => {
                const firstImage = splitImages(item.image)[0];
                return (
                  <li key={item._docId}>
                    <div className="item-main">
                      {firstImage ? (
                        <img 
                          src={firstImage} 
                          alt={item.name || 'Product'} 
                          className="catalog-item-image catalog-item-image--product"
                          onClick={() => setZoomedImage(firstImage)}
                        />
                      ) : item.createdBy?.photoURL ? (
                        <img src={item.createdBy.photoURL} alt={item.createdBy.displayName || 'Creator'} />
                      ) : null}
                      <div className="item-info">
                        <span>{item.name}</span>
                        <code>৳{item.price}</code>
                        <small>
                          By: {item.createdBy?.displayName || 'Unknown'} | Images: {splitImages(item.image).length}
                        </small>
                      </div>
                    </div>
                    <div className="item-actions">
                      <button type="button" className="btn mini" onClick={() => handleEditProduct(item)}>Edit</button>
                      <button type="button" className="btn mini danger" onClick={() => handleDeleteProduct(item)}>Delete</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
        ) : null}

        {activeSection === 'payment' ? (
        <form className="catalog-card" onSubmit={savePaymentDetail}>
          <div className="catalog-section-divider">
            <span>Payment Setup</span>
          </div>
          <h3>{editingPaymentDocId ? 'Edit Payment Details' : 'Add Payment Details'}</h3>

          <label>
            area_name
            <input
              type="text"
              value={paymentForm.area_name}
              onChange={(e) => setPaymentForm((s) => ({ ...s, area_name: e.target.value }))}
              placeholder="Dinajpur Sadar"
              required
            />
          </label>

          <label>
            charge
            <input
              type="number"
              min="0"
              step="1"
              value={paymentForm.charge}
              onChange={(e) => setPaymentForm((s) => ({ ...s, charge: e.target.value }))}
              placeholder="60"
            />
          </label>

          <label>
            contact_number
            <input
              type="text"
              value={paymentForm.contact_number}
              onChange={(e) => setPaymentForm((s) => ({ ...s, contact_number: e.target.value }))}
              placeholder="01XXXXXXXXX"
            />
          </label>

          <label>
            COD_instructions
            <textarea
              value={paymentForm.COD_instructions}
              onChange={(e) => setPaymentForm((s) => ({ ...s, COD_instructions: e.target.value }))}
              rows={3}
              placeholder="Cash on delivery instructions"
            />
          </label>

          <label>
            bKash_instructions
            <textarea
              value={paymentForm.bKash_instructions}
              onChange={(e) => setPaymentForm((s) => ({ ...s, bKash_instructions: e.target.value }))}
              rows={3}
              placeholder="bKash payment instructions"
            />
          </label>

          <div className="action-row">
            <button className="btn primary" type="submit" disabled={busy}>
              {editingPaymentDocId ? 'Update Payment Details' : 'Add Payment Details'}
            </button>
            {editingPaymentDocId ? (
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setEditingPaymentDocId(null);
                  setPaymentForm({
                    area_name: '',
                    charge: '',
                    contact_number: '',
                    COD_instructions: '',
                    bKash_instructions: '',
                  });
                  setStatus('Payment details edit canceled.');
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="list-wrap">
            <div className="catalog-section-divider catalog-section-divider--inner">
              <span>Saved Payment Areas</span>
            </div>
            <h4>Payment Details ({paymentDetails.length})</h4>
            <ul>
              {paymentDetails.map((item) => (
                <li key={item._docId}>
                  <div className="item-main">
                    {item.createdBy?.photoURL ? <img src={item.createdBy.photoURL} alt={item.createdBy.displayName || 'Creator'} /> : null}
                    <span>{item.area_name}</span>
                    <code>Charge: {item.charge || 0}</code>
                    <small>
                      Contact: {item.contact_number || 'N/A'} | By: {item.createdBy?.displayName || 'Unknown'}
                    </small>
                  </div>
                  <div className="item-actions">
                    <button type="button" className="btn mini" onClick={() => handleEditPayment(item)}>Edit</button>
                    <button type="button" className="btn mini danger" onClick={() => handleDeletePayment(item)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </form>
        ) : null}

        {activeSection === 'banners' ? (
        <form className="catalog-card" onSubmit={saveBanner}>
          <div className="catalog-section-divider">
            <span>Banner Setup</span>
          </div>
          <h3>{editingBannerDocId ? 'Edit Banner' : 'Add Banner'}</h3>

          <label>
            No.
            <input
              type="number"
              min="1"
              step="1"
              value={bannerForm.no}
              readOnly
              aria-readonly="true"
              onFocus={(e) => e.target.select()}
              placeholder="1"
              required
            />
          </label>

          <label>
            Image URL
            <input
              type="url"
              value={bannerForm.imageUrl}
              onChange={(e) => setBannerForm((s) => ({ ...s, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>

          <label>
            Image Upload (optional)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
            />
          </label>

          <label>
            Description
            <textarea
              value={bannerForm.description}
              onChange={(e) => setBannerForm((s) => ({ ...s, description: e.target.value }))}
              rows={3}
              placeholder="Banner description"
            />
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={bannerForm.show}
              onChange={(e) => setBannerForm((s) => ({ ...s, show: e.target.checked }))}
            />
            Show
          </label>

          <div className="action-row">
            <button className="btn primary" type="submit" disabled={busy}>
              {editingBannerDocId ? 'Update Banner' : 'Add Banner'}
            </button>
            {editingBannerDocId ? (
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setEditingBannerDocId(null);
                  setBannerForm({ no: nextBannerNo, imageUrl: '', description: '', show: true });
                  setBannerFile(null);
                  setStatus('Banner edit canceled.');
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="list-wrap">
            <div className="catalog-section-divider catalog-section-divider--inner">
              <span>Banner List</span>
            </div>
            <h4>Banners ({banners.length})</h4>
            <ul>
              {banners.map((item) => (
                <li key={item._docId}>
                  <div className="item-main">
                    {item.imageUrl ? <img src={item.imageUrl} alt={`Banner ${item.no}`} /> : null}
                    <span>No. {item.no}</span>
                    <code>{item.show ? 'Show: TRUE' : 'Show: FALSE'}</code>
                    <small>{item.description || 'No description'}</small>
                  </div>
                  <div className="item-actions">
                    <button type="button" className="btn mini" onClick={() => handleEditBanner(item)}>Edit</button>
                    <button type="button" className="btn mini danger" onClick={() => handleDeleteBanner(item)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </form>
        ) : null}
        </div>
      </div>

      {/* Success/Error Popup */}
      {successPopup.show && (
        <div className="catalog-popup-overlay" onClick={() => setSuccessPopup({ show: false, message: '', type: 'success' })}>
          <div className={`catalog-popup ${successPopup.type}`} onClick={e => e.stopPropagation()}>
            <div className="catalog-popup-logo">
              <img src={logo} alt="Logo" />
            </div>
            <div className="catalog-popup-icon">
              {successPopup.type === 'success' ? '✅' : '❌'}
            </div>
            <p className="catalog-popup-message">{successPopup.message}</p>
            <button 
              className="catalog-popup-close"
              onClick={() => setSuccessPopup({ show: false, message: '', type: successPopup.type })}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.show}
        title={`Delete ${confirmDelete.type === 'category' ? 'Category' : confirmDelete.type === 'product' ? 'Product' : confirmDelete.type === 'payment' ? 'Payment Details' : 'Banner'}?`}
        message={confirmDelete.item ? `Are you sure you want to delete "${confirmDelete.item.name || confirmDelete.item.area_name || `No. ${confirmDelete.item.no}`}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        logo={logo}
        onConfirm={async () => {
          if (confirmDelete.onConfirm) {
            await confirmDelete.onConfirm();
          }
          setConfirmDelete({ show: false, type: '', item: null, onConfirm: null });
        }}
        onCancel={() => setConfirmDelete({ show: false, type: '', item: null, onConfirm: null })}
      />

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="catalog-image-zoom-overlay" onClick={() => setZoomedImage(null)}>
          <div className="catalog-image-zoom-container" onClick={e => e.stopPropagation()}>
            <button 
              className="catalog-zoom-close"
              onClick={() => setZoomedImage(null)}
            >
              ×
            </button>
            <img 
              src={zoomedImage} 
              alt="Zoomed view" 
              className="catalog-zoom-image"
              onClick={() => setZoomedImage(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
