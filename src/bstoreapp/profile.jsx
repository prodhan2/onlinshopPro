import { useEffect, useState } from 'react';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import dinLogo from './dinlogo.png';
import jsPDF from 'jspdf';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiDroplet,
  FiHome,
  FiDownload,
  FiLogOut,
  FiArrowLeft,
  FiEdit3,
  FiCheck,
  FiShield,
  FiAward,
} from 'react-icons/fi';


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
  const [downloading, setDownloading] = useState(false);

  function handleDownloadPDF() {
    if (!user?.uid) {
      setStatus('Please login first.');
      return;
    }

    setDownloading(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Background gradient effect
      const gradient = doc.createLinearGradient(0, 0, pageWidth, pageHeight / 3);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      doc.setFillColor(gradient);
      doc.roundedRect(0, 0, pageWidth, pageHeight / 3, 0, 0, 'F');

      // Decorative circles
      doc.setFillColor(255, 255, 255, 0.1);
      doc.circle(pageWidth - 30, 40, 25, 'F');
      doc.circle(pageWidth - 50, 70, 15, 'F');
      doc.circle(20, 50, 20, 'F');

      // Logo/Brand header
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Beautiful Dinajpur', pageWidth / 2, 30, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Marketplace - Connecting Sellers & Customers', pageWidth / 2, 40, { align: 'center' });

      // Profile section
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 65, pageWidth - margin * 2, 90, 5, 5, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, 65, pageWidth - margin * 2, 90, 5, 5, 'S');

      // Avatar circle
      doc.setFillColor('#667eea');
      doc.circle(pageWidth / 2, 85, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      const initials = (formData.fullName || user?.displayName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      doc.text(initials, pageWidth / 2, 92, { align: 'center' });

      // User name
      doc.setTextColor(51, 51, 51);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(formData.fullName || user?.displayName || 'Beautiful Dinajpur User', pageWidth / 2, 115, { align: 'center' });

      // Email
      doc.setTextColor(102, 102, 102);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(user?.email || 'No email available', pageWidth / 2, 123, { align: 'center' });

      // Divider line
      doc.setDrawColor(102, 126, 234);
      doc.setLineWidth(1);
      doc.line(margin + 10, 130, pageWidth - margin - 10, 130);

      // Information cards
      const cardData = [
        { label: 'Blood Group', value: formData.bloodGroup || 'N/A', icon: '🩸' },
        { label: 'Phone', value: formData.phone || 'N/A', icon: '📱' },
        { label: 'Village', value: formData.village || 'N/A', icon: '🏘️' },
        { label: 'Upazilla', value: formData.upazilla || 'N/A', icon: '📍' },
        { label: 'Zilla', value: formData.zilla || 'N/A', icon: '🗺️' },
      ];

      let yPos = 140;
      cardData.forEach((item, index) => {
        const xPos = index % 2 === 0 ? margin + 5 : pageWidth / 2 + 5;
        const cardWidth = (pageWidth - margin * 2 - 10) / 2;
        
        if (index === 0 || index === 2 || index === 4) {
          yPos = index === 0 ? 140 : yPos;
        } else {
          yPos += 25;
        }

        // Card background
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(xPos, yPos, cardWidth, 20, 3, 3, 'F');
        doc.setDrawColor(233, 236, 239);
        doc.setLineWidth(0.3);
        doc.roundedRect(xPos, yPos, cardWidth, 20, 3, 3, 'S');

        // Label
        doc.setTextColor(108, 117, 125);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, xPos + 5, yPos + 8);

        // Value
        doc.setTextColor(51, 51, 51);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(item.value, xPos + 5, yPos + 16);
      });

      // Footer
      doc.setFillColor(102, 126, 234);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Beautiful Dinajpur Marketplace', pageWidth / 2, pageHeight - 17, { align: 'center' });
      doc.text('Connecting Sellers & Customers', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Generated date
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 4, { align: 'center' });

      doc.save(`Beautiful-Dinajpur-Profile-${formData.fullName || 'User'}.pdf`);
      setStatus('Profile card downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      setStatus('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

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
    <section className="profile-page">
      {/* Hero Header */}
      <div className="profile-header">
        <div className="profile-header-bg">
          <div className="profile-header-pattern"></div>
        </div>
        <div className="profile-header-content">
          <button
            className="profile-back-btn"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/';
              }
            }}
          >
            <FiArrowLeft /> Back
          </button>
          <div className="profile-brand">
            <img src={dinLogo} alt="Beautiful Dinajpur" className="profile-header-logo" />
            <span>Beautiful Dinajpur</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-content">
        {!user?.uid ? (
          <div className="profile-login-prompt">
            <FiUser className="profile-login-icon" />
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
              {/* Avatar Section */}
              <div className="profile-avatar-section">
                <div className="profile-avatar-wrapper">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="profile-avatar-img" />
                  ) : (
                    <span className="profile-avatar-text">
                      {(formData.fullName || user?.displayName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="profile-avatar-badge">
                    <FiCheck />
                  </div>
                </div>
                <h2 className="profile-name">{formData.fullName || user?.displayName || 'Beautiful Dinajpur User'}</h2>
                <p className="profile-email">
                  <FiMail /> {user?.email || 'No email available'}
                </p>

                {/* Role Badge */}
                <div className="profile-role-badges">
                  <span className="profile-role-badge role-user">
                    <FiUser /> User
                  </span>
                </div>
              </div>

              {/* Stats Section */}
              <div className="profile-stats">
                <div className="profile-stat-item">
                  <FiMapPin className="profile-stat-icon" />
                  <span className="profile-stat-label">Location</span>
                  <span className="profile-stat-value">{formData.village && formData.upazilla ? `${formData.village}, ${formData.upazilla}` : formData.zilla || 'Not set'}</span>
                </div>
                <div className="profile-stat-item">
                  <FiPhone className="profile-stat-icon" />
                  <span className="profile-stat-label">Phone</span>
                  <span className="profile-stat-value">{formData.phone || 'Not set'}</span>
                </div>
                <div className="profile-stat-item">
                  <FiDroplet className="profile-stat-icon" />
                  <span className="profile-stat-label">Blood Group</span>
                  <span className="profile-stat-value">{formData.bloodGroup || 'Not set'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="profile-actions">
                <button
                  className="profile-action-btn profile-download-btn"
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                >
                  <FiDownload />
                  {downloading ? 'Generating PDF...' : 'Download Profile Card'}
                </button>
                <button
                  className="profile-action-btn profile-logout-btn"
                  onClick={async () => {
                    await signOut(auth);
                    onLoggedOut?.();
                  }}
                >
                  <FiLogOut /> Logout
                </button>
              </div>
            </div>

            {/* Status Message */}
            {status && (
              <div className={`profile-status ${status.includes('success') ? 'profile-status-success' : status.includes('failed') ? 'profile-status-error' : 'profile-status-info'}`}>
                {status.includes('success') ? <FiCheck /> : status.includes('failed') ? <FiShield /> : <FiAward />}
                {status}
              </div>
            )}

            {/* Edit Form */}
            <div className="profile-edit-card">
              <div className="profile-edit-header">
                <FiEdit3 className="profile-edit-icon" />
                <h3>Edit Profile</h3>
              </div>

              <form className="profile-form" onSubmit={async (e) => {
                e.preventDefault();
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
                  setInitialData({ ...formData });
                  setStatus('Profile updated successfully.');
                } catch {
                  setStatus('Profile update failed. Please try again.');
                } finally {
                  setSaving(false);
                }
              }}>
                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="profile-full-name">
                    <FiUser /> Full Name
                  </label>
                  <input
                    id="profile-full-name"
                    className="profile-form-input"
                    name="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>

                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label className="profile-form-label" htmlFor="profile-blood">
                      <FiDroplet /> Blood Group
                    </label>
                    <input
                      id="profile-blood"
                      className="profile-form-input"
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData(prev => ({ ...prev, bloodGroup: e.target.value }))}
                      placeholder="A+, B-, O+"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label" htmlFor="profile-phone">
                      <FiPhone /> Phone Number
                    </label>
                    <input
                      id="profile-phone"
                      className="profile-form-input"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label className="profile-form-label" htmlFor="profile-village">
                      <FiHome /> Village
                    </label>
                    <input
                      id="profile-village"
                      className="profile-form-input"
                      name="village"
                      value={formData.village}
                      onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                      placeholder="Your village"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label" htmlFor="profile-upazilla">
                      <FiMapPin /> Upazilla
                    </label>
                    <input
                      id="profile-upazilla"
                      className="profile-form-input"
                      name="upazilla"
                      value={formData.upazilla}
                      onChange={(e) => setFormData(prev => ({ ...prev, upazilla: e.target.value }))}
                      placeholder="Your upazilla"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label" htmlFor="profile-zilla">
                      <FiMapPin /> Zilla
                    </label>
                    <input
                      id="profile-zilla"
                      className="profile-form-input"
                      name="zilla"
                      value={formData.zilla}
                      onChange={(e) => setFormData(prev => ({ ...prev, zilla: e.target.value }))}
                      placeholder="Your zilla"
                    />
                  </div>
                </div>

                {JSON.stringify(formData) !== JSON.stringify(initialData) && (
                  <div className="profile-form-actions">
                    <button className="profile-save-btn" type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <span className="profile-save-spinner"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiCheck /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
