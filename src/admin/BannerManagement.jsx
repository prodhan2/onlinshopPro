import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { convertToWebP } from '../bstoreapp/webpConverter';
import ConfirmDialog from '../components/ConfirmDialog';
import logo from '../bstoreapp/assets/images/logo.png';
import './admin.css';

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

function generateNextBannerNo(banners) {
  const maxNum = banners.reduce((max, item) => {
    const n = Number(item?.no || 0);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return String(maxNum + 1);
}

export default function BannerManagement({ currentUser }) {
  const [banners, setBanners] = useState([]);
  const [editingBannerDocId, setEditingBannerDocId] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [successPopup, setSuccessPopup] = useState({ show: false, message: '', type: 'success' });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, type: '', item: null });
  const [zoomedImage, setZoomedImage] = useState(null);
  const [bannerForm, setBannerForm] = useState({
    no: '',
    imageUrl: '',
    description: '',
    show: true,
  });
  const [bannerFile, setBannerFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const nextBannerNo = useMemo(() => generateNextBannerNo(banners), [banners]);

  const showSuccess = (message) => {
    setSuccessPopup({ show: true, message, type: 'success' });
    setTimeout(() => setSuccessPopup({ show: false, message: '', type: 'success' }), 3000);
  };

  const showError = (message) => {
    setSuccessPopup({ show: true, message, type: 'error' });
    setTimeout(() => setSuccessPopup({ show: false, message: '', type: 'error' }), 4000);
  };

  const actor = useMemo(
    () => ({
      uid: currentUser?.uid || '',
      displayName: currentUser?.displayName || currentUser?.email || 'Unknown',
      photoURL: currentUser?.photoURL || '',
    }),
    [currentUser?.uid, currentUser?.displayName, currentUser?.email, currentUser?.photoURL],
  );

  const loadBanners = useCallback(async () => {
    setLoadingData(true);
    try {
      const bannerSnap = await getDocs(collection(db, 'banners'));
      const fetchedBanners = bannerSnap.docs
        .map((docSnap) => ({ _docId: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => Number(a.no || 0) - Number(b.no || 0));
      setBanners(fetchedBanners);
    } catch (error) {
      console.error('Failed to load banners:', error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  useEffect(() => {
    if (editingBannerDocId) return;
    setBannerForm((prev) => ({ ...prev, no: nextBannerNo }));
  }, [editingBannerDocId, nextBannerNo]);

  const saveBanner = async (e) => {
    e.preventDefault();
    setBusy(true);
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
    } catch (error) {
      console.error('Banner error:', error);
      showError('Failed to save banner. Please try again.');
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
  };

  const handleDeleteBanner = (item) => {
    setConfirmDelete({ show: true, type: 'banner', item, onConfirm: async () => {
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
      } catch (error) {
        console.error('Delete banner error:', error);
        showError('Failed to delete banner. Please try again.');
      }
    }});
  };

  return (
    <div className="admin-dashboard-home animate-fade-in">
      {/* Header */}
      <div className="card-header-flex mb-4">
        <div>
          <h2 className="admin-page-title" style={{ background: 'none', webkitTextFillColor: 'initial', color: 'var(--admin-text-main)' }}>
            Banner Management
          </h2>
          <p className="admin-text-muted">Manage hero banners displayed on the homepage and category pages.</p>
        </div>
      </div>

      {loadingData && <div className="admin-text-muted">Loading banners...</div>}

      {/* Banner Form */}
      <div className="admin-card-modern mb-4">
        <h3 className="h5 mb-4">{editingBannerDocId ? 'Edit Banner' : 'Add New Banner'}</h3>
        <form onSubmit={saveBanner} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontWeight: '500', color: 'var(--admin-text-main)' }}>Banner No.</span>
              <input
                type="number"
                min="1"
                step="1"
                value={bannerForm.no}
                readOnly
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: '#f8fafc',
                }}
                required
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontWeight: '500', color: 'var(--admin-text-main)' }}>Image URL</span>
              <input
                type="url"
                value={bannerForm.imageUrl}
                onChange={(e) => setBannerForm((s) => ({ ...s, imageUrl: e.target.value }))}
                placeholder="https://..."
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontWeight: '500', color: 'var(--admin-text-main)' }}>Upload Image (optional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
              style={{
                padding: '0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontWeight: '500', color: 'var(--admin-text-main)' }}>Description</span>
            <textarea
              value={bannerForm.description}
              onChange={(e) => setBannerForm((s) => ({ ...s, description: e.target.value }))}
              rows={3}
              placeholder="Banner description"
              style={{
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                resize: 'vertical',
              }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="checkbox"
              checked={bannerForm.show}
              onChange={(e) => setBannerForm((s) => ({ ...s, show: e.target.checked }))}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '500', color: 'var(--admin-text-main)' }}>Show on homepage</span>
          </label>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              className="btn-modern btn-primary-modern"
              type="submit"
              disabled={busy}
              style={{ flex: '1' }}
            >
              {editingBannerDocId ? 'Update Banner' : 'Add Banner'}
            </button>
            {editingBannerDocId && (
              <button
                className="btn-modern"
                type="button"
                onClick={() => {
                  setEditingBannerDocId(null);
                  setBannerForm({ no: nextBannerNo, imageUrl: '', description: '', show: true });
                  setBannerFile(null);
                }}
                style={{ flex: '1' }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Banner List */}
      <div className="admin-card-modern">
        <h3 className="h5 mb-4">Banners ({banners.length})</h3>
        {banners.length === 0 ? (
          <p className="admin-text-muted">No banners added yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {banners.map((item) => (
              <div
                key={item._docId}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  alignItems: 'center',
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={`Banner ${item.no}`}
                    style={{
                      width: '120px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setZoomedImage(item.imageUrl)}
                  />
                ) : (
                  <div
                    style={{
                      width: '120px',
                      height: '80px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                    }}
                  >
                    No Image
                  </div>
                )}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--admin-text-main)' }}>
                    Banner No. {item.no}
                  </div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
                    {item.description || 'No description'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        backgroundColor: item.show ? '#ecfdf5' : '#fee2e2',
                        color: item.show ? '#059669' : '#dc2626',
                      }}
                    >
                      {item.show ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn-modern"
                    style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                    onClick={() => handleEditBanner(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-modern"
                    style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                    onClick={() => handleDeleteBanner(item)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success/Error Popup */}
      {successPopup.show && (
        <div
          className="catalog-popup-overlay"
          onClick={() => setSuccessPopup({ show: false, message: '', type: 'success' })}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            className={`catalog-popup ${successPopup.type}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
              position: 'relative',
              maxWidth: '400px',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {successPopup.type === 'success' ? '✅' : '❌'}
            </div>
            <p style={{ fontSize: '1.1rem', color: 'var(--admin-text-main)', marginBottom: '1.5rem' }}>
              {successPopup.message}
            </p>
            <button
              className="btn-modern btn-primary-modern"
              onClick={() => setSuccessPopup({ show: false, message: '', type: successPopup.type })}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.show}
        title="Delete Banner?"
        message={confirmDelete.item ? `Are you sure you want to delete Banner No. ${confirmDelete.item.no}? This action cannot be undone.` : ''}
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
          }}
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Zoomed"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
