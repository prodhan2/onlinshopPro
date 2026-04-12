
import { useState } from 'react';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
// Light neumorphism card style
const cardStyle = {
  background: '#f7fafd',
  borderRadius: '24px',
  boxShadow: '8px 8px 24px #e3e8f0, -8px -8px 24px #ffffff',
  border: 'none',
  padding: '2.5rem 2rem',
  maxWidth: 400,
  margin: '0 auto',
  position: 'relative',
  boxSizing: 'border-box',
  transition: 'box-shadow 0.2s',
};
const logoStyle = {
  width: 120,
  display: 'block',
  margin: '0 auto 1.2rem auto',
};
const googleBtnStyle = {
  background: '#fff',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06)',
  fontWeight: 600,
  fontSize: '1.1rem',
  color: '#222',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.7em',
  padding: '0.8em 0',
  margin: '1.2em 0 0.5em 0',
  cursor: 'pointer',
  width: '100%',
  transition: 'box-shadow 0.2s',
};
const googleIcon = {
  width: 28,
  height: 28,
  display: 'inline-block',
  marginRight: 4,
};
const subtitleStyle = {
  color: '#666',
  fontWeight: 400,
  fontSize: '1.1rem',
  marginBottom: '1.2rem',
  textAlign: 'center',
};
const titleStyle = {
  fontWeight: 700,
  fontSize: '2rem',
  margin: '0 0 0.2em 0',
  textAlign: 'center',
};
const bnSubtitle = {
  color: '#888',
  fontWeight: 400,
  fontSize: '1.05rem',
  marginBottom: '1.2rem',
  textAlign: 'center',
};
const safeText = {
  color: '#888',
  fontSize: '0.95rem',
  textAlign: 'center',
  marginTop: '1.2em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4em',
};

export default function LoginPage({ onSuccess, onBack }) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Save or update user profile in Firestore
   */
  async function saveUserProfile(user) {
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      // If profile exists, only update displayName and photoURL if they changed
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
        // Create new profile
        await setDoc(profileRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: 'user', // Default role for new users
          createdAt: new Date(),
          lastLogin: new Date(),
        });
      }
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  }


  // Remove handleSubmit and all email/password logic

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f7fafd 0%, #e3e8f0 100%)', width: '100vw' }}>
      {/* AppBar with Back Button */}
      <div style={{ width: '100%', height: 60, background: 'linear-gradient(90deg, #2196f3 0%, #1976d2 100%)', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06)', marginBottom: 32 }}>
        {onBack && (
          <button
            onClick={() => {
              if (typeof onBack === 'function') {
                onBack();
              } else {
                window.history.back();
              }
            }}
            style={{
              marginLeft: 18,
              marginRight: 16,
              background: '#fff',
              color: '#1976d2',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              padding: '7px 18px',
              cursor: 'pointer',
              boxShadow: '0 1px 4px 0 rgba(0,0,0,0.07)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 18, marginRight: 2 }}>←</span> ফিরে যান
          </button>
        )}
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 22, letterSpacing: 1, flex: 1, textAlign: onBack ? 'left' : 'center', marginLeft: onBack ? 16 : 0 }}>Beautiful Dinajpur</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)' }}>
        <div style={cardStyle}>
          <img src="https://i.postimg.cc/tgLHjg70/dinlogo.png" alt="Dinajpur Logo" style={logoStyle} />
          <div style={titleStyle}>Beautiful Dinajpur</div>
          <div style={bnSubtitle}>দিনাজপুরের ঐতিহ্য ও সৌন্দর্য</div>
          {error ? (
            <div style={{ background: '#ffeaea', color: '#d32f2f', borderRadius: 10, padding: '0.7em 1em', marginBottom: '1em', textAlign: 'center', fontWeight: 500, fontSize: '1.05em', border: '1.5px solid #ffbdbd' }}>{error}</div>
          ) : null}
          <button
            type="button"
            style={googleBtnStyle}
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {/* Google icon using Material Symbols or fallback emoji */}
            <span style={googleIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 48 48">
                <g>
                  <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303C34.73 32.082 29.818 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c2.69 0 5.164.896 7.163 2.382l6.084-6.084C33.963 5.053 29.21 3 24 3 12.954 3 4 11.954 4 23s8.954 20 20 20c11.045 0 19.824-7.949 19.824-19.824 0-1.324-.138-2.324-.213-3.093z"/>
                  <path fill="#34A853" d="M6.306 14.691l6.571 4.819C14.655 16.104 19.01 13 24 13c2.69 0 5.164.896 7.163 2.382l6.084-6.084C33.963 5.053 29.21 3 24 3c-7.732 0-14.41 4.41-17.694 11.691z"/>
                  <path fill="#FBBC05" d="M24 43c5.684 0 10.438-1.877 13.924-5.104l-6.438-5.271C29.818 35 24 35 24 35c-5.818 0-10.73-2.918-13.303-7.082l-6.571 4.819C9.59 40.59 16.268 45 24 45z"/>
                  <path fill="#EA4335" d="M43.611 20.083H42V20H24v8h11.303c-1.23 3.082-4.303 7-11.303 7-5.818 0-10.73-2.918-13.303-7.082l-6.571 4.819C9.59 40.59 16.268 45 24 45c7.732 0 14.41-4.41 17.694-11.691z"/>
                </g>
              </svg>
            </span>
            {googleLoading ? 'গুগল দিয়ে প্রবেশ হচ্ছে...' : 'গুগল দিয়ে প্রবেশ করুন'}
          </button>
          <div style={safeText}>
            <span role="img" aria-label="lock">🔒</span>
            নিরাপদ & ফাস্ট অ্যাক্সেস
          </div>
        </div>
      </div>
    </div>
  );
}
