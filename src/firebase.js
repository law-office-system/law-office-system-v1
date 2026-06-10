import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZJvLlt05-fQK9ix4A_4qjY_y79mDfaNU",
  authDomain: "law-office-78a96.firebaseapp.com",
  projectId: "law-office-78a96",
  storageBucket: "law-office-78a96.firebasestorage.app",
  messagingSenderId: "789453843979",
  appId: "1:789453843979:web:d2558096ca8e84e041e10e",
};

const app = initializeApp(firebaseConfig);

// تهيئة Firestore
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true,
});

// تفعيل التخزين المؤقت (Persistence) للعمل بدون إنترنت
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // خطأ: المتصفح مفتوح في أكثر من تبويب في نفس الوقت
    console.warn("Persistence failed: Multiple tabs are open.");
  } else if (err.code === 'unimplemented') {
    // خطأ: المتصفح لا يدعم هذه الميزة
    console.warn("Persistence is not supported in this browser.");
  }
});

export const auth = getAuth(app);
export const storage = getStorage(app);