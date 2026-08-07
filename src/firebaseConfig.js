import { initializeApp, getApps } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyByXNZj8fHo7Revalnx6wtslgdXKSCFKjM",
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN || "urlredirect-e2640.firebaseapp.com",
  projectId: "urlredirect-e2640",
  storageBucket: "urlredirect-e2640.appspot.com",
  messagingSenderId: "841657385917",
  appId: "1:841657385917:web:93e39dace4204f649d88d4",
  measurementId: "G-T6TF32Y4FF"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export getter functions or instances safely
export const auth = typeof window !== 'undefined' || process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? getAuth(app) : null;
export const db = getFirestore(app);
