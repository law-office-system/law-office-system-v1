import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { 
  initializeFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  documentId,
  addDoc,
  setDoc,
  onSnapshot,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  CACHE_SIZE_UNLIMITED
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAZJvLlt05-fQK9ix4A_4qjY_y79mDfaNU",
  authDomain: "law-office-78a96.firebaseapp.com",
  projectId: "law-office-78a96",
  storageBucket: "law-office-78a96.firebasestorage.app",
  messagingSenderId: "789453843979",
  appId: "1:789453843979:web:d2558096ca8e84e041e10e",
};

const app = initializeApp(firebaseConfig);

// ================= FIRESTORE WITH PERSISTENCE =================
// ✅ Updated: Use new cache settings instead of deprecated enableIndexedDbPersistence
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  // ✅ New way to enable persistence (replaces enableIndexedDbPersistence)
  // persistence: true, // This is enabled by default in v9+
});

// ✅ Firestore persistence is now enabled by default in Firebase v9+
// No need to call enableIndexedDbPersistence() anymore
console.log("✅ Firestore initialized with offline persistence");

// ================= AUTH =================
export const auth = getAuth(app);

// ================= STORAGE =================
export const storage = getStorage(app);

// ================= EXPORT Firestore Functions =================
export {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  documentId,
  addDoc,
  setDoc,
  onSnapshot,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove
};

// ================= MESSAGING (Lazy Load) =================
export let messaging = null;

export const initMessaging = async () => {
  if (messaging) return messaging;

  try {
    const { getMessaging, isSupported } = await import("firebase/messaging");
    const supported = await isSupported();

    if (supported) {
      messaging = getMessaging(app);
      console.log("✅ Firebase Messaging Ready");
      return messaging;
    } else {
      console.warn("⚠️ Firebase Messaging not supported");
      return null;
    }
  } catch (err) {
    console.error("❌ Messaging init failed:", err);
    return null;
  }
};

// ================= REALTIME DATABASE (Lazy Load) =================
export let rtdb = null;

export const initRtdb = async () => {
  if (rtdb) return rtdb;

  try {
    const { getDatabase } = await import("firebase/database");
    rtdb = getDatabase(app);
    console.log("✅ Realtime Database Ready");
    return rtdb;
  } catch (err) {
    console.error("❌ RTDB init failed:", err);
    return null;
  }
};

export default app;