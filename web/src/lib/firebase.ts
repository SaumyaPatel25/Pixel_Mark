import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAqO8eH0_ZQyYoRQBQT-O4ehHDW-Imif2E',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'stage-42a45.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'stage-42a45',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:120157810407:web:c0b82f0ad6627ca46c05a1',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '120157810407',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Initialize Firebase with fallback and error resilience
let app: any;
let auth: any;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);

  // Explicitly set browserLocalPersistence to guarantee sessions survive tab close/reopen
  if (typeof window !== 'undefined' && auth && typeof auth.onAuthStateChanged === 'function') {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('[Firebase Auth] Failed to set browserLocalPersistence:', err);
    });
  }
} catch (err) {
  console.error('[Firebase Auth] Initialization error:', err);
  auth = {} as any;
}

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');

export { auth, googleProvider, githubProvider };
