
import { useState } from 'react';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import dinLogo from './dinlogo.png';

export default function LoginPage({ onSuccess, onBack }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

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
      onSuccess?.();
    } catch {
      setError('Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-bg">
        <div className="login-bg-circle login-bg-circle-1"></div>
        <div className="login-bg-circle login-bg-circle-2"></div>
        <div className="login-bg-circle login-bg-circle-3"></div>
      </div>

      {/* Top Bar */}
      <div className="login-topbar">
        {onBack && (
          <button
            className="login-back-btn"
            onClick={() => {
              if (typeof onBack === 'function') {
                onBack();
              } else {
                window.history.back();
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        <div className="login-topbar-brand">
          <img src={dinLogo} alt="Beautiful Dinajpur" className="login-topbar-logo" />
          <span>Beautiful Dinajpur</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="login-content">
        <div className="login-card">
          {/* Decorative dots */}
          <div className="login-card-decoration">
            <div className="decoration-dot decoration-dot-1"></div>
            <div className="decoration-dot decoration-dot-2"></div>
            <div className="decoration-dot decoration-dot-3"></div>
          </div>

          {/* Logo */}
          <div className="login-logo-section">
            <div className="login-logo-wrapper">
              <img src={dinLogo} alt="Beautiful Dinajpur" className="login-logo" />
              <div className="login-logo-glow"></div>
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">দিনাজপুরের ঐতিহ্য ও সৌন্দর্য</p>
            <p className="login-subtitle-en">Beautiful Dinajpur Marketplace</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error-banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Google Login Button */}
          <button
            className="login-google-btn"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303C34.73 32.082 29.818 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c2.69 0 5.164.896 7.163 2.382l6.084-6.084C33.963 5.053 29.21 3 24 3 12.954 3 4 11.954 4 23s8.954 20 20 20c11.045 0 19.824-7.949 19.824-19.824 0-1.324-.138-2.324-.213-3.093z"/>
              <path fill="#34A853" d="M6.306 14.691l6.571 4.819C14.655 16.104 19.01 13 24 13c2.69 0 5.164.896 7.163 2.382l6.084-6.084C33.963 5.053 29.21 3 24 3c-7.732 0-14.41 4.41-17.694 11.691z"/>
              <path fill="#FBBC05" d="M24 43c5.684 0 10.438-1.877 13.924-5.104l-6.438-5.271C29.818 35 24 35 24 35c-5.818 0-10.73-2.918-13.303-7.082l-6.571 4.819C9.59 40.59 16.268 45 24 45z"/>
              <path fill="#EA4335" d="M43.611 20.083H42V20H24v8h11.303c-1.23 3.082-4.303 7-11.303 7-5.818 0-10.73-2.918-13.303-7.082l-6.571 4.819C9.59 40.59 16.268 45 24 45c7.732 0 14.41-4.41 17.694-11.691z"/>
            </svg>
            {googleLoading ? (
              <>
                <span className="login-spinner"></span>
                Signing in with Google...
              </>
            ) : (
              'Sign in with Google'
            )}
          </button>

          {/* Features */}
          <div className="login-features">
            <div className="login-feature-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Secure & Fast
            </div>
            <div className="login-feature-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Trusted Platform
            </div>
            <div className="login-feature-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Local Marketplace
            </div>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p>নিরাপদ ও দ্রুত অ্যাক্সেস</p>
            <small>© 2026 Beautiful Dinajpur. All rights reserved.</small>
          </div>
        </div>
      </div>
    </div>
  );
}
