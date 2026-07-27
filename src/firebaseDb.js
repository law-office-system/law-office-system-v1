import {
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
} from "firebase/firestore";

import { app } from "./firebaseApp";

export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

export default db;