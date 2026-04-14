import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBsw_kkwT4oaQNuIRmmSwhpfumEktUh_is",
  authDomain: "aso-saver.firebaseapp.com",
  projectId: "aso-saver",
  storageBucket: "aso-saver.firebasestorage.app",
  messagingSenderId: "165620254620",
  appId: "1:165620254620:web:cae7e1a4005a51bc8c6a59",
  measurementId: "G-Z4ZKH832CF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
