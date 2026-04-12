import { useEffect, useState } from 'react';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import dinLogo from './dinlogo.png';
import jsPDF from 'jspdf';


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
        <div className="bstore-appbar__actions d-flex gap-2">
          <button 
            className="btn btn-outline-primary" 
            type="button" 
            onClick={handleDownloadPDF}
            disabled={downloading || !user?.uid}
            title="Download Profile Card"
          >
            {downloading ? (
              <span className="spinner-border spinner-border-sm me-1" role="status" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-download me-1" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
              </svg>
            )}
            {downloading ? 'Generating...' : 'Download Card'}
          </button>
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

        {/* Profile Card Preview */}
        {user?.uid && (
          <div className="mb-4">
            <div className="card border-0 shadow-sm" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <div className="card-body p-4">
                {/* Header */}
                <div className="text-center text-white mb-3">
                  <h4 className="fw-bold mb-1">Beautiful Dinajpur</h4>
                  <small className="opacity-75">Marketplace - Connecting Sellers & Customers</small>
                </div>
                
                {/* Profile Info Card */}
                <div className="bg-white rounded-4 p-4 mb-3">
                  {/* Avatar */}
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" 
                       style={{ width: '80px', height: '80px', fontSize: '32px', fontWeight: 'bold', background: '#667eea !important' }}>
                    {(formData.fullName || user?.displayName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  
                  {/* Name & Email */}
                  <h5 className="fw-bold text-center mb-1 text-dark">
                    {formData.fullName || user?.displayName || 'Beautiful Dinajpur User'}
                  </h5>
                  <p className="text-center text-muted mb-3 small">{user?.email || 'No email available'}</p>
                  
                  <hr className="my-3" style={{ borderColor: '#667eea' }} />
                  
                  {/* Info Grid */}
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-2">
                        <small className="text-muted d-block" style={{ fontSize: '11px' }}>Blood Group</small>
                        <span className="fw-bold" style={{ fontSize: '13px' }}>{formData.bloodGroup || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-2">
                        <small className="text-muted d-block" style={{ fontSize: '11px' }}>Phone</small>
                        <span className="fw-bold" style={{ fontSize: '13px' }}>{formData.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-2">
                        <small className="text-muted d-block" style={{ fontSize: '11px' }}>Village</small>
                        <span className="fw-bold" style={{ fontSize: '13px' }}>{formData.village || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded-3 p-2">
                        <small className="text-muted d-block" style={{ fontSize: '11px' }}>Upazilla</small>
                        <span className="fw-bold" style={{ fontSize: '13px' }}>{formData.upazilla || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="bg-light rounded-3 p-2">
                        <small className="text-muted d-block" style={{ fontSize: '11px' }}>Zilla</small>
                        <span className="fw-bold" style={{ fontSize: '13px' }}>{formData.zilla || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="text-center text-white">
                  <small className="opacity-90 d-block">Beautiful Dinajpur Marketplace</small>
                  <small className="opacity-75 d-block">Connecting Sellers & Customers</small>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button 
                className="btn btn-primary btn-lg"
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-file-earmark-pdf me-2" viewBox="0 0 16 16">
                      <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2ZM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2Z"/>
                      <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 0 1.334.012c.365-.017.72-.088 1.021-.226a.7.7 0 0 1 .602.077c.376.151.575.469.65.823.073.34.04.736-.046 1.136-.086.4-.27.803-.52 1.208a7.18 7.18 0 0 1-.43 1.295c.349.724.742 1.485 1.062 2.227.47.142.956.345 1.482.645.371.219.699.48.897.787.21.326.275.714.08 1.102a.81.81 0 0 1-.438.42c-.34.17-.74.196-1.102.08-.362-.117-.672-.36-.897-.787a7.68 7.68 0 0 1-1.482-.645 19.697 19.697 0 0 0-1.062-2.227 7.269 7.269 0 0 1-.43 1.295c-.086.4-.119.796-.046 1.136.075.354.274.672.65.823.192.077.4.12.602.077a.7.7 0 0 0 .477-.365c.088-.164.12-.356.127-.538.007-.188-.012-.396-.047-.614-.084-.51-.27-1.134-.52-1.794a10.954 10.954 0 0 0-.98-1.686 5.753 5.753 0 0 0-1.334-.012c-.365.017-.72.088-1.021.226a.7.7 0 0 0-.602-.077c-.376-.151-.575-.469-.65-.823-.073-.34-.04-.736.046-1.136.086-.4.27-.803.52-1.208.25-.405.434-.808.52-1.208.086-.4.119-.796.046-1.136a.7.7 0 0 0-.65-.823.7.7 0 0 0-.602.077c-.376.151-.575.469-.65.823-.073.34-.04.736.046 1.136.086.4.27.803.52 1.208.25.405.434.808.52 1.208Z"/>
                    </svg>
                    Download Profile Card as PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}

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
