import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import logo from '../bstoreapp/assets/images/logo.png';
import './login.css';

export default function LoginPage({ onSuccess, onBack }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function saveUserProfile(user) {
    try {
      const ref = doc(db, 'profiles', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await setDoc(ref, { uid: user.uid, email: user.email, displayName: user.displayName || '', photoURL: user.photoURL || '', lastLogin: new Date() }, { merge: true });
      } else {
        await setDoc(ref, { uid: user.uid, email: user.email, displayName: user.displayName || '', photoURL: user.photoURL || '', role: 'user', createdAt: new Date(), lastLogin: new Date() });
      }
    } catch (e) { console.error(e); }
  }

  async function handleGoogle() {
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await saveUserProfile(cred.user);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); navigate('/'); onSuccess?.(); }, 2000);
    } catch {
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const goBack = onBack || (() => navigate('/'));

  if (success) {
    return (
      <div className="lp-success">
        <img src={logo} alt="Logo" className="lp-success-logo" />
        <div className="lp-success-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2>স্বাগতম!</h2>
        <p>সফলভাবে লগইন হয়েছে</p>
        <div className="lp-success-bar"><div className="lp-success-bar-fill" /></div>
      </div>
    );
  }

  return (
    <div className="lp-page">
      {/* Top bar */}
      <div className="lp-topbar">
        <button className="lp-back" onClick={goBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
      </div>

      {/* Main content */}
      <div className="lp-body">
        <img src={logo} alt="Beautiful Dinajpur" className="lp-logo" />
        <h1 className="lp-title">স্বাগতম</h1>
        <p className="lp-sub">আপনার Google অ্যাকাউন্ট দিয়ে সাইন ইন করুন</p>

        {error && (
          <div className="lp-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <button className="lp-google-btn" onClick={handleGoogle} disabled={loading}>
          {loading ? (
            <span className="lp-spinner" />
          ) : (
            <svg viewBox="0 0 48 48" width="22" height="22" style={{flexShrink:0}}>
              <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303C34.73 32.082 29.818 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c2.69 0 5.164.896 7.163 2.382l6.084-6.084C33.963 5.053 29.21 3 24 3 12.954 3 4 11.954 4 23s8.954 20 20 20c11.045 0 19.824-7.949 19.824-19.824 0-1.324-.138-2.324-.213-3.093z"/>
              <path fill="#34A853" d="M6.306 14.691l6.571 4.819C14.655 16.104 19.01 13 24 13c2.69 0 5.164.896 7.163 2.382l6.084-6.084C33.963 5.053 29.21 3 24 3c-7.732 0-14.41 4.41-17.694 11.691z"/>
              <path fill="#FBBC05" d="M24 43c5.684 0 10.438-1.877 13.924-5.104l-6.438-5.271C29.818 35 24 35 24 35c-5.818 0-10.73-2.918-13.303-7.082l-6.571 4.819C9.59 40.59 16.268 45 24 45z"/>
              <path fill="#EA4335" d="M43.611 20.083H42V20H24v8h11.303c-1.23 3.082-4.303 7-11.303 7-5.818 0-10.73-2.918-13.303-7.082l-6.571 4.819C9.59 40.59 16.268 45 24 45c7.732 0 14.41-4.41 17.694-11.691z"/>
            </svg>
          )}
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <p className="lp-footer">© 2026 Beautiful Dinajpur</p>
      </div>
    </div>
  );
}
