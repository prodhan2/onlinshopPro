import { useEffect, useState } from 'react';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { FiHome, FiLogOut, FiSave, FiUser, FiMail, FiMapPin, FiPhone, FiDroplet, FiEdit3, FiChevronLeft } from 'react-icons/fi';
import { auth, db } from '../firebase';
import './profile.css';

export default function ProfilePage({ user, onBack, onLoggedOut, onGoHome }) {
  const [formData, setFormData] = useState({
    fullName: user?.displayName ?? '',
    bloodGroup: '',
    phone: '',
    village: '',
    upazilla: '',
    zilla: '',
  });
  const [initialData, setInitialData] = useState({
    fullName: user?.displayName ?? '',
    bloodGroup: '',
    phone: '',
    village: '',
    upazilla: '',
    zilla: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      if (!user?.uid) {
        if (!ignore) setLoading(false);
        return;
      }

      setLoading(true);
      setStatus('');

      try {
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        const data = profileSnap.exists() ? profileSnap.data() : {};

        if (!ignore) {
          const loaded = {
            fullName: data.fullName || user.displayName || '',
            bloodGroup: data.bloodGroup || '',
            phone: data.phone || '',
            village: data.village || '',
            upazilla: data.upazilla || '',
            zilla: data.zilla || '',
          };
          setFormData(loaded);
          setInitialData(loaded);
        }
      } catch {
        if (!ignore) setStatus('Profile load failed. Please try again.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProfile();
    return () => { ignore = true; };
  }, [user?.uid, user?.displayName]);

  async function handleSave(event) {
    event.preventDefault();
    if (!user?.uid) { setStatus('Please login first.'); return; }

    setSaving(true);
    setStatus('');

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      await setDoc(profileRef, {
        uid: user.uid,
        email: user.email || '',
        fullName: formData.fullName.trim(),
        bloodGroup: formData.bloodGroup.trim(),
        phone: formData.phone.trim(),
        village: formData.village.trim(),
        upazilla: formData.upazilla.trim(),
        zilla: formData.zilla.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if ((user.displayName || '') !== formData.fullName.trim()) {
        await updateProfile(user, { displayName: formData.fullName.trim() });
      }

      setInitialData({ ...formData });
      setStatus('Profile updated successfully.');
    } catch {
      setStatus('Profile update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    onLoggedOut?.();
  }

  const initials = (formData.fullName || user?.displayName || 'U')
    .split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="profile-page">
      {/* Top Bar */}
      <div className="profile-top-bar">
        <button className="profile-nav-btn" onClick={onBack || (() => window.history.back())}>
          <FiChevronLeft /> Back
        </button>
        <h1 className="profile-page-title">My Profile</h1>
        <button className="profile-nav-btn profile-home-btn" onClick={onGoHome || (() => window.location.href = '/')}>
          <FiHome />
        </button>
      </div>

      <div className="profile-container">
        {!user?.uid ? (
          <div className="profile-empty-state">
            <div className="profile-empty-icon"><FiUser /></div>
            <h2>Login Required</h2>
            <p>Please login to view and update your profile.</p>
          </div>
        ) : loading ? (
          <div className="profile-loading">
            <div className="profile-spinner"></div>
            <p>Loading profile...</p>
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar-section">
                  <div className="profile-avatar">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div className="profile-user-info">
                    <h2 className="profile-user-name">{formData.fullName || user?.displayName || 'User'}</h2>
                    <p className="profile-user-email"><FiMail /> {user?.email || 'No email'}</p>
                  </div>
                </div>

                {/* Info Grid */}
                {(formData.bloodGroup || formData.phone || formData.village || formData.upazilla || formData.zilla) && (
                  <div className="profile-info-grid">
                    {formData.bloodGroup && (
                      <div className="profile-info-item">
                        <div className="profile-info-icon"><FiDroplet /></div>
                        <div className="profile-info-text">
                          <span className="profile-info-label">Blood Group</span>
                          <span className="profile-info-value">{formData.bloodGroup}</span>
                        </div>
                      </div>
                    )}
                    {formData.phone && (
                      <div className="profile-info-item">
                        <div className="profile-info-icon"><FiPhone /></div>
                        <div className="profile-info-text">
                          <span className="profile-info-label">Phone</span>
                          <span className="profile-info-value">{formData.phone}</span>
                        </div>
                      </div>
                    )}
                    {formData.village && (
                      <div className="profile-info-item">
                        <div className="profile-info-icon"><FiMapPin /></div>
                        <div className="profile-info-text">
                          <span className="profile-info-label">Village</span>
                          <span className="profile-info-value">{formData.village}</span>
                        </div>
                      </div>
                    )}
                    {formData.upazilla && (
                      <div className="profile-info-item">
                        <div className="profile-info-icon"><FiMapPin /></div>
                        <div className="profile-info-text">
                          <span className="profile-info-label">Upazilla</span>
                          <span className="profile-info-value">{formData.upazilla}</span>
                        </div>
                      </div>
                    )}
                    {formData.zilla && (
                      <div className="profile-info-item">
                        <div className="profile-info-icon"><FiMapPin /></div>
                        <div className="profile-info-text">
                          <span className="profile-info-label">Zilla</span>
                          <span className="profile-info-value">{formData.zilla}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status Message */}
            {status && (
              <div className={`profile-status ${status.includes('success') ? 'profile-status-success' : status.includes('failed') ? 'profile-status-error' : 'profile-status-info'}`}>
                {status}
              </div>
            )}

            {/* Edit Form */}
            <div className="profile-card profile-edit-card">
              <div className="profile-form-header">
                <FiEdit3 />
                <h3>Edit Profile</h3>
              </div>
              <form onSubmit={handleSave} className="profile-form">
                <div className="profile-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>

                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label>Blood Group</label>
                    <input
                      type="text"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData(prev => ({ ...prev, bloodGroup: e.target.value }))}
                      placeholder="A+, B-, O+"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label>Village</label>
                    <input
                      type="text"
                      value={formData.village}
                      onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                      placeholder="Your village"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label>Upazilla</label>
                    <input
                      type="text"
                      value={formData.upazilla}
                      onChange={(e) => setFormData(prev => ({ ...prev, upazilla: e.target.value }))}
                      placeholder="Your upazilla"
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label>Zilla</label>
                  <input
                    type="text"
                    value={formData.zilla}
                    onChange={(e) => setFormData(prev => ({ ...prev, zilla: e.target.value }))}
                    placeholder="Your zilla"
                  />
                </div>

                <div className="profile-form-actions">
                  {JSON.stringify(formData) !== JSON.stringify(initialData) && (
                    <button className="profile-btn profile-btn-save" type="submit" disabled={saving}>
                      {saving ? <><span className="profile-btn-spinner"></span> Saving...</> : <><FiSave /> Save Changes</>}
                    </button>
                  )}
                  <button className="profile-btn profile-btn-logout" type="button" onClick={handleLogout}>
                    <FiLogOut /> Logout
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
