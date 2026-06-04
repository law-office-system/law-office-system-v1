import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZJvLlt05-fQK9ix4A_4qjY_y79mDfaNU",
  authDomain: "law-office-78a96.firebaseapp.com",
  projectId: "law-office-78a96",
  storageBucket: "law-office-78a96.firebasestorage.app",
  messagingSenderId: "789453843979",
  appId: "1:789453843979:web:d2558096ca8e84e041e10e",
};

const app = initializeApp(firebaseConfig);

// 🔥 مهم جدًا: بدون cache
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true,
});

export const auth = getAuth(app);
export const storage = getStorage(app);