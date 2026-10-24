import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  projectId: "huferry-china-trip",
  appId: "1:157681395253:web:886c4c6a779ca2b3c8f37c",
  storageBucket: "huferry-china-trip.firebasestorage.app",
  apiKey: "AIzaSyD5wdDDzCVt9ttTMd3nD7PieNMvCPCPSSQ",
  authDomain: "huferry-china-trip.firebaseapp.com",
  messagingSenderId: "157681395253",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
