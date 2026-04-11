import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './catalogAdmin.css';

const BEEIMG_API_KEY = '58c9ff18b1cf549b8fa5b946d5860f27';

async function uploadImageToBeeImg(file) {
  const formData = new FormData();
  formData.append('file', file);
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
  return fileData.url;
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
  const [activeSection, setActiveSection] = useState('categories');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', iconUrl: '' });
  const [categoryFile, setCategoryFile] = useState(null);

  const [productForm, setProductForm] = useState({
    id: '',
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
  const [productFile, setProductFile] = useState([]);
  const [imageOrder, setImageOrder] = useState([]);
  const [coverImageId, setCoverImageId] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    area_name: '',
    charge: '',
    contact_number: '',
    COD_instructions: '',
    bKash_instructions: '',
  });
  const [bannerForm, setBannerForm] = useState({
    no: '',
    imageUrl: '',
    description: '',
    show: true,
  });
  const [bannerFile, setBannerFile] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [categories],
  );

  const nextCategoryId = useMemo(() => generateNextCategoryId(categories), [categories]);
  const nextProductId = useMemo(() => generateNextProductId(products), [products]);
  const nextBannerNo = useMemo(() => generateNextBannerNo(banners), [banners]);

  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value === 'string') {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof value?.toMillis === 'function') return value.toMillis();
    return 0;
  };

  const loadCatalogData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [categorySnap, productSnap, paymentSnap, bannerSnap] = await Promise.all([
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'paymentDetails')),
        getDocs(collection(db, 'banners')),
      ]);

      const fetchedCategories = categorySnap.docs
        .map((docSnap) => ({ _docId: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

      const fetchedProducts = productSnap.docs
        .map((docSnap) => ({ _docId: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

      const fetchedPaymentDetails = paymentSnap.docs
        .map((docSnap) => ({ _docId: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => String(a.area_name || '').localeCompare(String(b.area_name || '')));

      const fetchedBanners = bannerSnap.docs
        .map((docSnap) => ({ _docId: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => Number(a.no || 0) - Number(b.no || 0));

      setCategories(fetchedCategories);
      setProducts(fetchedProducts);
      setPaymentDetails(fetchedPaymentDetails);
      setBanners(fetchedBanners);
    } catch {
      setStatus('Failed to load catalog data from Firebase.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  const uploadPreviews = useMemo(() => productFile.map((item) => item.preview), [productFile]);

  const manualPreviews = useMemo(() => splitImages(productForm.image), [productForm.image]);

  const imageItems = useMemo(() => {
    const urlItems = manualPreviews.map((src, idx) => ({
      id: `url-${idx}`,
      type: 'url',
      src,
      label: `URL ${idx + 1}`,
    }));

    const fileItems = productFile.map((item, idx) => ({
      id: item.id,
      type: 'file',
      src: item.preview,
      label: `FILE ${idx + 1}`,
    }));

    const map = new Map([...urlItems, ...fileItems].map((item) => [item.id, item]));
    const ids = [...map.keys()];
    const orderedIds = imageOrder.length
      ? imageOrder.filter((id) => map.has(id)).concat(ids.filter((id) => !imageOrder.includes(id)))
      : ids;
    return orderedIds.map((id) => map.get(id));
  }, [manualPreviews, productFile, imageOrder]);

  useEffect(() => {
    const ids = imageItems.map((item) => item.id);
    setImageOrder((prev) => {
      if (!prev.length) return ids;
      const kept = prev.filter((id) => ids.includes(id));
      const extras = ids.filter((id) => !kept.includes(id));
      return [...kept, ...extras];
    });
  }, [imageItems]);

  useEffect(() => {
    if (!coverImageId) return;
    if (!imageItems.some((item) => item.id === coverImageId)) {
      setCoverImageId('');
    }
  }, [coverImageId, imageItems]);

  const reorderImages = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setImageOrder((prev) => {
      const ids = prev.length ? [...prev] : imageItems.map((item) => item.id);
      const from = ids.indexOf(sourceId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return ids;
      const [picked] = ids.splice(from, 1);
      ids.splice(to, 0, picked);
      return ids;
    });
  };

  const removeImageItem = (itemId) => {
    if (itemId.startsWith('url-')) {
      const index = Number(itemId.replace('url-', ''));
      const urls = splitImages(productForm.image);
      if (!Number.isNaN(index) && urls[index] != null) {
        urls.splice(index, 1);
        setProductForm((prev) => ({ ...prev, image: urls.join(', ') }));
      }
      return;
    }

    setProductFile((prev) => {
      const found = prev.find((x) => x.id === itemId);
      if (found?.preview) URL.revokeObjectURL(found.preview);
      return prev.filter((x) => x.id !== itemId);
    });
  };

  useEffect(() => {
    if (editingCategoryDocId) return;
    setCategoryForm((prev) => ({ ...prev, id: nextCategoryId }));
  }, [editingCategoryDocId, nextCategoryId]);

  useEffect(() => {
    if (editingProductDocId) return;
    setProductForm((prev) => ({ ...prev, id: nextProductId }));
  }, [editingProductDocId, nextProductId]);

  useEffect(() => {
    if (editingBannerDocId) return;
    setBannerForm((prev) => ({ ...prev, no: nextBannerNo }));
  }, [editingBannerDocId, nextBannerNo]);

  useEffect(() => {
    if (!authReady || !canEdit || !currentUser?.uid) return;
    loadCatalogData();
  }, [authReady, canEdit, currentUser?.uid, loadCatalogData]);

  useEffect(() => {
    if (!settingsOpen) return;

    const onDocClick = (event) => {
      if (!settingsRef.current) return;
      if (!settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    const onEsc = (event) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [settingsOpen]);

  const actor = useMemo(
    () => ({
      uid: currentUser?.uid || '',
      displayName: currentUser?.displayName || currentUser?.email || 'Unknown',
      photoURL: currentUser?.photoURL || '',
    }),
    [currentUser?.uid, currentUser?.displayName, currentUser?.email, currentUser?.photoURL],
  );

  if (!authReady) {
    return (
      <section className="catalog-admin-page">
        <header className="catalog-admin-header">
          <button type="button" className="btn" onClick={onBack}>Back</button>
          <h2>Catalog Manager</h2>
        </header>
        <div className="catalog-admin-status">Checking permissions...</div>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="catalog-admin-page">
        <header className="catalog-admin-header">
          <button type="button" className="btn" onClick={onBack}>Back</button>
          <h2>Catalog Manager</h2>
        </header>
        <div className="catalog-admin-status">Please login to continue.</div>
      </section>
    );
  }

  if (!canEdit) {
    return (
      <section className="catalog-admin-page">
        <header className="catalog-admin-header">
          <button type="button" className="btn" onClick={onBack}>Back</button>
          <h2>Catalog Manager</h2>
        </header>
        <div className="catalog-admin-status">Access denied. Only admin and seller users can edit categories and products.</div>
      </section>
    );
  }

  const addCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setStatus('Category Name is required.');
      return;
    }

    setBusy(true);
    setStatus('Saving category...');
    try {
      let iconUrl = categoryForm.iconUrl.trim();
      if (categoryFile) {
        try {
          iconUrl = await uploadImageToBeeImg(categoryFile);
        } catch {
          iconUrl = await toDataUrl(categoryFile);
        }
      }

      const now = new Date().toISOString();
      let next;
      const autoCategoryId = editingCategoryDocId ? categoryForm.id.trim() : nextCategoryId;

      if (editingCategoryDocId) {
        await updateDoc(doc(db, 'categories', editingCategoryDocId), {
          id: autoCategoryId,
          name: categoryForm.name.trim(),
          iconUrl,
          updatedAt: now,
          updatedBy: actor,
        });
        next = categories.map((item) => {
          if (item._docId !== editingCategoryDocId) return item;
          return {
            ...item,
            id: autoCategoryId,
            name: categoryForm.name.trim(),
            iconUrl,
            updatedAt: now,
            updatedBy: actor,
          };
        });
      } else {
        const payload = {
          id: autoCategoryId,
          name: categoryForm.name.trim(),
          iconUrl,
          createdAt: now,
          createdBy: actor,
        };
        const ref = await addDoc(collection(db, 'categories'), payload);
        next = [{ _docId: ref.id, ...payload }, ...categories];
      }

      setCategories(next);
      setCategoryForm({ id: generateNextCategoryId(next), name: '', iconUrl: '' });
      setCategoryFile(null);
      setEditingCategoryDocId(null);
      setStatus(editingCategoryDocId ? 'Category updated successfully.' : 'Category added successfully.');
    } finally {
      setBusy(false);
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      setStatus('Product Name is required.');
      return;
    }
    if (!productForm.categoryId) {
      setStatus('Please select a category.');
      return;
    }

    setBusy(true);
    setStatus('Saving product...');
    try {
      const manualUrls = splitImages(productForm.image);

      const uploadedMap = new Map();
      for (const item of productFile) {
        try {
          const url = await uploadImageToBeeImg(item.file);
          uploadedMap.set(item.id, url);
        } catch {
          const fallbackUrl = await toDataUrl(item.file);
          uploadedMap.set(item.id, fallbackUrl);
        }
      }

      const imageMap = new Map();
      manualUrls.forEach((url, index) => {
        imageMap.set(`url-${index}`, url);
      });
      uploadedMap.forEach((url, id) => {
        imageMap.set(id, url);
      });

      const orderedIds = imageOrder.length ? imageOrder : [...imageMap.keys()];
      const orderedUrls = orderedIds.map((id) => imageMap.get(id)).filter(Boolean);
      const tailUrls = [...imageMap.values()].filter((url) => !orderedUrls.includes(url));
      let mergedImages = [...orderedUrls, ...tailUrls];

      if (coverImageId && imageMap.has(coverImageId)) {
        const coverUrl = imageMap.get(coverImageId);
        mergedImages = [coverUrl, ...mergedImages.filter((url) => url !== coverUrl)];
      }

      const imageUrl = [...new Set(mergedImages)].join(', ');

      const now = new Date().toISOString();
      let next;
      const autoProductId = editingProductDocId ? productForm.id.trim() : nextProductId;

      if (editingProductDocId) {
        await updateDoc(doc(db, 'products', editingProductDocId), {
          id: autoProductId,
          name: productForm.name.trim(),
          description: productForm.description.trim(),
          image: imageUrl,
          price: productForm.price || '0',
          discount: productForm.discount || '0',
          stock: productForm.stock || '0',
          categoryId: productForm.categoryId,
          rating: productForm.rating || '0',
          available: Boolean(productForm.available),
          updatedAt: now,
          updatedBy: actor,
        });
        next = products.map((item) => {
          if (item._docId !== editingProductDocId) return item;
          return {
            ...item,
            id: autoProductId,
            name: productForm.name.trim(),
            description: productForm.description.trim(),
            image: imageUrl,
            price: productForm.price || '0',
            discount: productForm.discount || '0',
            stock: productForm.stock || '0',
            categoryId: productForm.categoryId,
            rating: productForm.rating || '0',
            available: Boolean(productForm.available),
            updatedAt: now,
            updatedBy: actor,
          };
        });
      } else {
        const payload = {
          id: autoProductId,
          name: productForm.name.trim(),
          description: productForm.description.trim(),
          image: imageUrl,
          price: productForm.price || '0',
          discount: productForm.discount || '0',
          stock: productForm.stock || '0',
          categoryId: productForm.categoryId,
          rating: productForm.rating || '0',
          available: Boolean(productForm.available),
          createdAt: now,
          createdBy: actor,
        };
        const ref = await addDoc(collection(db, 'products'), payload);
        next = [{ _docId: ref.id, ...payload }, ...products];
      }

      setProducts(next);
      setProductForm({
        id: generateNextProductId(next),
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
      productFile.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
      setProductFile([]);
      setImageOrder([]);
      setCoverImageId('');
      setEditingProductDocId(null);
      setStatus(editingProductDocId ? 'Product updated successfully.' : 'Product added successfully.');
    } finally {
      setBusy(false);
    }
  };

  const handleEditCategory = (item) => {
    setEditingCategoryDocId(item._docId);
    setCategoryForm({
      id: item.id || '',
      name: item.name || '',
      iconUrl: item.iconUrl || '',
    });
    setCategoryFile(null);
    setStatus(`Editing category: ${item.name || item.id}`);
  };

  const handleDeleteCategory = (item) => {
    if (!window.confirm(`Delete category '${item.name}'?`)) return;
    deleteDoc(doc(db, 'categories', item._docId)).catch(() => {
      setStatus('Failed to delete category from Firebase.');
    });
    const next = categories.filter((x) => x._docId !== item._docId);
    setCategories(next);
    if (editingCategoryDocId === item._docId) {
      setEditingCategoryDocId(null);
      setCategoryForm({ id: generateNextCategoryId(next), name: '', iconUrl: '' });
      setCategoryFile(null);
    }
    setStatus('Category deleted.');
  };

  const handleEditProduct = (item) => {
    setEditingProductDocId(item._docId);
    setProductForm({
      id: item.id || '',
      name: item.name || '',
      description: item.description || '',
      image: item.image || '',
      price: item.price || '0',
      discount: item.discount || '0',
      stock: item.stock || '0',
      categoryId: item.categoryId || '',
      rating: item.rating || '0',
      available: item.available !== false,
    });
    setImageOrder([]);
    setCoverImageId('');
    setProductFile([]);
    setStatus(`Editing product: ${item.name || item.id}`);
  };

  const handleDeleteProduct = (item) => {
    if (!window.confirm(`Delete product '${item.name}'?`)) return;
    deleteDoc(doc(db, 'products', item._docId)).catch(() => {
      setStatus('Failed to delete product from Firebase.');
    });
    const next = products.filter((x) => x._docId !== item._docId);
    setProducts(next);
    if (editingProductDocId === item._docId) {
      setEditingProductDocId(null);
      setProductForm({
        id: generateNextProductId(next),
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
      setImageOrder([]);
      setCoverImageId('');
      setProductFile([]);
    }
    setStatus('Product deleted.');
  };

  const savePaymentDetail = async (e) => {
    e.preventDefault();
    if (!paymentForm.area_name.trim()) {
      setStatus('area_name is required.');
      return;
    }

    setBusy(true);
    setStatus('Saving payment details...');
    try {
      const now = new Date().toISOString();
      const payload = {
        area_name: paymentForm.area_name.trim(),
        charge: paymentForm.charge,
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
      setStatus(editingPaymentDocId ? 'Payment details updated.' : 'Payment details added.');
    } catch {
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
    if (!window.confirm(`Delete payment details for '${item.area_name}'?`)) return;
    deleteDoc(doc(db, 'paymentDetails', item._docId)).catch(() => {
      setStatus('Failed to delete payment details from Firebase.');
    });
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
    setStatus('Payment details deleted.');
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
      setStatus(editingBannerDocId ? 'Banner updated.' : 'Banner added.');
    } catch {
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
    if (!window.confirm(`Delete banner No. ${item.no}?`)) return;
    deleteDoc(doc(db, 'banners', item._docId)).catch(() => {
      setStatus('Failed to delete banner from Firebase.');
    });
    const next = banners.filter((x) => x._docId !== item._docId);
    setBanners(next);
    if (editingBannerDocId === item._docId) {
      setEditingBannerDocId(null);
      setBannerForm({ no: generateNextBannerNo(next), imageUrl: '', description: '', show: true });
      setBannerFile(null);
    }
    setStatus('Banner deleted.');
  };

  return (
    <section className="catalog-admin-page">
      <header className="catalog-admin-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button type="button" className="btn" onClick={() => window.history.back()} style={{ order: 0 }}>
          Back
        </button>
        <h2 style={{ margin: 0, flex: 1, textAlign: 'left' }}>Catalog Manager</h2>
        <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
          <button
            type="button"
            className={`btn${activeSection === 'categories' ? ' primary' : ''}`}
            onClick={() => setActiveSection('categories')}
            style={{ minWidth: 120 }}
          >
            Add Category
          </button>
          <button
            type="button"
            className={`btn${activeSection === 'products' ? ' primary' : ''}`}
            onClick={() => setActiveSection('products')}
            style={{ minWidth: 120 }}
          >
            Add Product
          </button>
        </div>
        <div className="catalog-admin-settings-wrap" ref={settingsRef}>
          <button
            type="button"
            className="btn"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            aria-haspopup="menu"
          >
            Settings
          </button>
          {settingsOpen ? (
            <div className="catalog-admin-settings-menu" role="menu">
              <button
                type="button"
                className="btn settings-menu-btn"
                onClick={() => {
                  setActiveSection('categories');
                  setSettingsOpen(false);
                }}
                role="menuitem"
              >
                Categories Page
              </button>
              <button
                type="button"
                className="btn settings-menu-btn"
                onClick={() => {
                  setActiveSection('products');
                  setSettingsOpen(false);
                }}
                role="menuitem"
              >
                Add Product Page
              </button>
              <button
                type="button"
                className="btn settings-menu-btn"
                onClick={() => {
                  setActiveSection('payment');
                  setSettingsOpen(false);
                }}
                role="menuitem"
              >
                Payment Details
              </button>
              <button
                type="button"
                className="btn settings-menu-btn"
                onClick={() => {
                  setActiveSection('banners');
                  setSettingsOpen(false);
                }}
                role="menuitem"
              >
                Banner Page
              </button>
              <button
                type="button"
                className="btn settings-menu-btn"
                onClick={() => {
                  setSettingsOpen(false);
                  onOpenOrders?.();
                }}
                role="menuitem"
              >
                Orders Page
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {status ? <div className="catalog-admin-status">{status}</div> : null}
      {loadingData ? <div className="catalog-admin-status">Loading data from Firebase...</div> : null}

      <div className="catalog-admin-grid">
        {activeSection === 'categories' ? (
        <form className="catalog-card" onSubmit={addCategory}>
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
                  setCategoryForm({ id: nextCategoryId, name: '', iconUrl: '' });
                  setCategoryFile(null);
                  setStatus('Category edit canceled.');
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="list-wrap">
            <h4>Categories ({categories.length})</h4>
            <ul>
              {sortedCategories.map((item) => (
                <li key={item._docId}>
                  <div className="item-main">
                    {item.createdBy?.photoURL ? <img src={item.createdBy.photoURL} alt={item.createdBy.displayName || 'Creator'} /> : null}
                    <span>{item.name}</span>
                    <code>{item.id}</code>
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
        </form>
        ) : null}

        {activeSection === 'products' ? (
        <form className="catalog-card" onSubmit={addProduct}>
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

          <div className="list-wrap">
            <h4>Products ({products.length})</h4>
            <ul>
              {[...products].reverse().map((item) => (
                <li key={item._docId}>
                  <div className="item-main">
                    {splitImages(item.image)[0] ? (
                      <img src={splitImages(item.image)[0]} alt={item.name || 'Product'} />
                    ) : item.createdBy?.photoURL ? (
                      <img src={item.createdBy.photoURL} alt={item.createdBy.displayName || 'Creator'} />
                    ) : null}
                    <span>{item.name}</span>
                    <code>{item.price}</code>
                    <small>
                      By: {item.createdBy?.displayName || 'Unknown'} | Images: {splitImages(item.image).length}
                    </small>
                  </div>
                  <div className="item-actions">
                    <button type="button" className="btn mini" onClick={() => handleEditProduct(item)}>Edit</button>
                    <button type="button" className="btn mini danger" onClick={() => handleDeleteProduct(item)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </form>
        ) : null}

        {activeSection === 'payment' ? (
        <form className="catalog-card" onSubmit={savePaymentDetail}>
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
    </section>
  );
}
