/**
 * Firebase Migration Toolkit - Config
 * إعدادات وتعريفات الأداة
 */
const path = require("path");

const SRC_DIR = path.join(process.cwd(), "src");

const FIREBASE_FILES_TO_IGNORE = new Set([
  "firebase.js",
  "firebaseApp.js",
  "firebaseAuth.js",
  "firebaseDb.js",
  "firebaseStorage.js",
  "firebaseMessaging.js",
  "firebase-node.js",
]);

const FILE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

const INSTANCE_IMPORTS = {
  db: "firebaseDb",
  auth: "firebaseAuth",
  storage: "firebaseStorage",
  app: "firebaseApp",
  messaging: "firebaseMessaging",
  initMessaging: "firebaseMessaging",
};

const NEW_FIREBASE_FILES = new Set([
  "firebaseApp",
  "firebaseAuth",
  "firebaseDb",
  "firebaseStorage",
  "firebaseMessaging",
  "firebase-node",
]);

const FIRESTORE_FUNCTIONS = new Set([
  "collection", "doc", "getDoc", "getDocs", "setDoc", "updateDoc", "deleteDoc",
  "query", "where", "orderBy", "limit", "startAfter", "endBefore", "startAt", "endAt",
  "onSnapshot", "addDoc", "Timestamp", "serverTimestamp", "writeBatch", "arrayUnion",
  "arrayRemove", "documentId", "runTransaction", "collectionGroup", "increment",
  "and", "or", "getCountFromServer", "enableIndexedDbPersistence",
  "clearIndexedDbPersistence", "terminate", "FieldValue", "FieldPath", "GeoPoint",
  "Bytes", "DocumentReference", "CollectionReference", "Query", "QuerySnapshot",
  "DocumentSnapshot", "SnapshotMetadata", "persistentLocalCache",
  "persistentMultipleTabManager", "initializeFirestore", "CACHE_SIZE_UNLIMITED",
  "ignoreUndefinedProperties", "cacheSizeBytes",
]);

const AUTH_FUNCTIONS = new Set([
  "createUserWithEmailAndPassword", "signInWithEmailAndPassword", "signOut",
  "onAuthStateChanged", "updateProfile", "GoogleAuthProvider", "signInWithPopup",
  "sendPasswordResetEmail", "updateEmail", "updatePassword", "reauthenticateWithCredential",
  "EmailAuthProvider", "getIdToken", "signInWithRedirect", "getRedirectResult",
  "linkWithCredential", "unlink", "deleteUser", "sendEmailVerification",
  "applyActionCode", "checkActionCode", "verifyPasswordResetCode", "confirmPasswordReset",
  "fetchSignInMethodsForEmail", "OAuthProvider", "FacebookAuthProvider",
  "TwitterAuthProvider", "GithubAuthProvider", "getAuth", "connectAuthEmulator",
  "signInWithCredential", "signInWithCustomToken", "signInAnonymously", "setPersistence",
  "browserLocalPersistence", "browserSessionPersistence", "inMemoryPersistence",
  "indexedDBLocalPersistence", "ReCaptchaVerifier", "PhoneAuthProvider",
]);

const STORAGE_FUNCTIONS = new Set([
  "ref", "uploadBytes", "getDownloadURL", "deleteObject", "listAll", "getMetadata",
  "uploadBytesResumable", "updateMetadata", "getStorage", "connectStorageEmulator",
  "list", "getBytes", "StringFormat", "UploadTaskSnapshot", "UploadTask",
]);

const MESSAGING_FUNCTIONS = new Set([
  "getMessaging", "getToken", "onMessage", "deleteToken", "isSupported",
]);

module.exports = {
  SRC_DIR,
  FIREBASE_FILES_TO_IGNORE,
  FILE_EXTENSIONS,
  INSTANCE_IMPORTS,
  NEW_FIREBASE_FILES,
  FIRESTORE_FUNCTIONS,
  AUTH_FUNCTIONS,
  STORAGE_FUNCTIONS,
  MESSAGING_FUNCTIONS,
};
