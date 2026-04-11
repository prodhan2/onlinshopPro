import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBBnv6M5BW47F8THGZx9RmsW-vKsJiJucI',
  authDomain: 'bdinjapurshop.firebaseapp.com',
  projectId: 'bdinjapurshop',
  storageBucket: 'bdinjapurshop.appspot.com',
  messagingSenderId: '127702764328',
  appId: '1:127702764328:web:6a8b90e3ca90aa44981e1d',
  measurementId: 'G-H33D7XBJ0Z',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function setupAnalytics() {
  if (await isAnalyticsSupported()) {
    return getAnalytics(app);
  }

  return null;
}
