import { useState } from 'react';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function LoginPage({ onSuccess, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);

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

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
        // Create new user account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password.trim()
        );
        await saveUserProfile(userCredential.user);
      } else {
        // Sign in existing user
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password.trim()
        );
        await saveUserProfile(userCredential.user);
      }
      onSuccess?.();
    } catch {
      setError(
        isSignup
          ? 'Signup failed. Please check your information and try again.'
          : 'Login failed. Please check your email and password.'
      );
    } finally {
      setLoading(false);
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
    <section className="bstore-page bstore-page--narrow">
      <div className="bstore-card">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <p className="bstore-kicker">BStore {isSignup ? 'Signup' : 'Login'}</p>
            <h2 className="mb-1">{isSignup ? 'Create Account' : 'Sign in'}</h2>
            <p className="bstore-muted mb-0">
              {isSignup
                ? 'Create a new account to start shopping.'
                : 'Firebase auth based member login.'}
            </p>
          </div>
          {onBack ? (
            <button className="btn btn-outline-secondary" type="button" onClick={onBack}>
              Back
            </button>
          ) : null}
        </div>

        <form className="d-grid gap-3" onSubmit={handleSubmit}>
          <div>
            <label className="form-label" htmlFor="bstore-email">
              Email
            </label>
            <input
              id="bstore-email"
              className="form-control"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="bstore-password">
              Password
            </label>
            <input
              id="bstore-password"
              className="form-control"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              minLength={isSignup ? 6 : 1}
            />
            {isSignup && (
              <small className="form-text text-muted">Minimum 6 characters</small>
            )}
          </div>

          {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? (isSignup ? 'Creating account...' : 'Signing in...') : isSignup ? 'Create Account' : 'Login'}
          </button>

          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading
              ? isSignup
                ? 'Creating account with Google...'
                : 'Signing in with Google...'
              : isSignup
              ? 'Sign up with Google'
              : 'Login with Google'}
          </button>

          <div className="text-center pt-2 border-top">
            <p className="bstore-muted mb-2">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setIsSignup(!isSignup);
                setError('');
                setEmail('');
                setPassword('');
              }}
            >
              {isSignup ? 'Sign in instead' : 'Create one now'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
