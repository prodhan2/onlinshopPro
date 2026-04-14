
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import logo from '../bstoreapp/assets/images/logo.png';
import './user.css';

export default function LoginPage({ onSuccess, onBack }) {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  async function saveUserProfile(user) {
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const existingData = profileSnap.data();
        await setDoc(
          profileRef,
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || existingData.displayName || '',
            photoURL: user.photoURL || existingData.photoURL || '',
            lastLogin: new Date(),
          },
          { merge: true }
        );
      } else {
        await setDoc(profileRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: 'user',
          createdAt: new Date(),
          lastLogin: new Date(),
        });
      }
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError('');

    try {
      const userCredential = await signInWithPopup(auth, new GoogleAuthProvider());
      await saveUserProfile(userCredential.user);

      // Show success popup
      setShowSuccessPopup(true);

      // Redirect to homepage after 2.5 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
        navigate('/');
        onSuccess?.();
      }, 2500);
    } catch {
      setError('Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="pro-login-fullscreen">
      {/* Login Success Popup */}
      {showSuccessPopup && (
        <div className="pro-login-success-overlay">
          <div className="pro-login-success-popup">
            <div className="pro-login-success-animation">
              <div className="pro-login-success-circle">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeDasharray="60" strokeDashoffset="60">
                    <animate attributeName="stroke-dashoffset" from="60" to="0" dur="0.6s" fill="freeze" />
                  </path>
                  <polyline points="22 4 12 14.01 9 11.01" strokeDasharray="20" strokeDashoffset="20">
                    <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.4s" begin="0.6s" fill="freeze" />
                  </polyline>
                </svg>
              </div>
            </div>
            <h3 className="pro-login-success-title">স্বাগতম!</h3>
            <p className="pro-login-success-message">সফলভাবে লগইন হয়েছে</p>
            <p className="pro-login-success-redirect">হোমপেজে যাচ্ছে...</p>
            <div className="pro-login-success-progress-bar">
              <div className="pro-login-success-progress-fill" />
            </div>
          </div>
        </div>
      )}

      {/* Modal Overlay */}
      <div className="pro-login-modal-overlay" onClick={onBack || (() => navigate('/'))}>
        <div className="pro-login-modal-card" onClick={(e) => e.stopPropagation()}>
          {/* Close Button */}
          <button className="pro-login-close-btn" onClick={onBack || (() => navigate('/'))}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Main Content */}
          <div className="pro-login-modal-content">
            {/* Header */}
            <div className="pro-login-modal-header">
              <img src={logo} alt="Beautiful Dinajpur" className="pro-login-modal-logo" />
              <h2 className="pro-login-modal-title">স্বাগতম</h2>
              <p className="pro-login-modal-subtitle">চালিয়ে যেতে সাইন ইন করুন</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="pro-login-modal-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Google Login Button */}
            <button
              className="pro-login-modal-google-btn"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              <svg viewBox="0 0 48 48" width="22" height="22">
                <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303C34.73 32.082 29.818 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c2.69 0 5.164.896 7.163 2.382l6.084-6.084C33.963 5.053 29.21 3 24 3 12.954 3 4 11.954 4 23s8.954 20 20 20c11.045 0 19.824-7.949 19.824-19.824 0-1.324-.138-2.324-.213-3.093z"/>
                <path fill="#34A853" d="M6.306 14.691l6.571 4.819C14.655 16.104 19.01 13 24 13c2.69 0 5.164.896 7.163 2.382l6.084-6.084C33.963 5.053 29.21 3 24 3c-7.732 0-14.41 4.41-17.694 11.691z"/>
                <path fill="#FBBC05" d="M24 43c5.684 0 10.438-1.877 13.924-5.104l-6.438-5.271C29.818 35 24 35 24 35c-5.818 0-10.73-2.918-13.303-7.082l-6.571 4.819C9.59 40.59 16.268 45 24 45z"/>
                <path fill="#EA4335" d="M43.611 20.083H42V20H24v8h11.303c-1.23 3.082-4.303 7-11.303 7-5.818 0-10.73-2.918-13.303-7.082l-6.571 4.819C9.59 40.59 16.268 45 24 45c7.732 0 14.41-4.41 17.694-11.691z"/>
              </svg>
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Footer */}
            <p className="pro-login-modal-footer">
              © 2026 Beautiful Dinajpur. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

