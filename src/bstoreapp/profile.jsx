import { useEffect, useState } from 'react';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';


export default function ProfilePage({ user, onBack, onLoggedOut }) {
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
        if (!ignore) {
          setLoading(false);
        }
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
        if (!ignore) {
          setStatus('Profile load failed. Please try again.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [user?.uid, user?.displayName]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData(previous => ({ ...previous, [name]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!user?.uid) {
      setStatus('Please login first.');
      return;
    }

    setSaving(true);
    setStatus('');

    try {
      const profileRef = doc(db, 'profiles', user.uid);
      await setDoc(
        profileRef,
        {
          uid: user.uid,
          email: user.email || '',
          fullName: formData.fullName.trim(),
          bloodGroup: formData.bloodGroup.trim(),
          phone: formData.phone.trim(),
          village: formData.village.trim(),
          upazilla: formData.upazilla.trim(),
          zilla: formData.zilla.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      if ((user.displayName || '') !== formData.fullName.trim()) {
        await updateProfile(user, { displayName: formData.fullName.trim() });
      }

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

  return (
    <section className="bstore-page bstore-page--narrow">
      <div className="bstore-appbar mb-3">
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = '/';
            }
          }}
        >
          Back
        </button>
        <h1 className="bstore-appbar__title mb-0">Profile</h1>
        <div className="bstore-appbar__actions">
          <button className="btn btn-outline-danger" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="bstore-card">
        <div className="text-center mb-4">
          <div className="member-avatar mx-auto mb-3">
            {user?.photoURL ? <img src={user.photoURL} alt={user.displayName || 'User'} /> : (user?.displayName?.[0] || 'U')}
          </div>
          <h2 className="h4 mb-1">{formData.fullName || user?.displayName || 'Beautiful Dinajpur User'}</h2>
          <p className="bstore-muted mb-0">{user?.email || 'No email available'}</p>
        </div>

        {!user?.uid ? (
          <div className="alert alert-warning mb-0">Please login to update profile information.</div>
        ) : loading ? (
          <div className="bstore-loading-banner">
            <div className="bstore-spinner-glow" />
            <p className="bstore-muted mb-0">Loading profile...</p>
          </div>
        ) : (
          <form className="row g-3" onSubmit={handleSave}>
            <div className="col-12">
              <label className="form-label" htmlFor="profile-full-name">
                Full name
              </label>
              <input
                id="profile-full-name"
                className="form-control"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="profile-blood">
                Blood group
              </label>
              <input
                id="profile-blood"
                className="form-control"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                placeholder="Example: A+, B-, O+"
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="profile-phone">
                Phone number
              </label>
              <input
                id="profile-phone"
                className="form-control"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="profile-village">
                Village
              </label>
              <input
                id="profile-village"
                className="form-control"
                name="village"
                value={formData.village}
                onChange={handleChange}
                placeholder="Village"
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="profile-upazilla">
                Upazilla
              </label>
              <input
                id="profile-upazilla"
                className="form-control"
                name="upazilla"
                value={formData.upazilla}
                onChange={handleChange}
                placeholder="Upazilla"
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="profile-zilla">
                Zilla
              </label>
              <input
                id="profile-zilla"
                className="form-control"
                name="zilla"
                value={formData.zilla}
                onChange={handleChange}
                placeholder="Zilla"
              />
            </div>

            {status ? (
              <div className="col-12">
                <div className="alert alert-info mb-0">{status}</div>
              </div>
            ) : null}

            {JSON.stringify(formData) !== JSON.stringify(initialData) && (
              <div className="col-12 d-flex gap-2 justify-content-end">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
