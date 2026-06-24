import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import {
  initializeFirestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAZJvLlt05-fQK9ix4A_4qjY_y79mDfaNU",
  authDomain: "law-office-78a96.firebaseapp.com",
  projectId: "law-office-78a96",
  storageBucket: "law-office-78a96.firebasestorage.app",
  messagingSenderId: "789453843979",
  appId: "1:789453843979:web:d2558096ca8e84e041e10e",
};

const app = initializeApp(firebaseConfig);

// ================= FIRESTORE =================
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true,
});

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Persistence failed: Multiple tabs are open.");
  } else if (err.code === "unimplemented") {
    console.warn("Persistence is not supported in this browser.");
  }
});

// ================= AUTH =================
export const auth = getAuth(app);

// ================= STORAGE =================
export const storage = getStorage(app);

// ================= MESSAGING =================
export let messaging = null;

isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
    console.log("✅ Firebase Messaging Ready");
  } else {
    console.warn("⚠️ Firebase Messaging not supported");
  }
});

export default app;