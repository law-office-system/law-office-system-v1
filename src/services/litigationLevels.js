// ============================================================
// 📁 FILE: src/services/litigationLevels.js
// Description: CRUD for Litigation Levels (درجات التقاضي)
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebaseDb";

const LEVELS_COL = "litigation_levels";
const CASES_COL = "cases";

// ==================== CREATE ====================

/**
 * Create the initial litigation level when a case is created
 * Automatically called from AddCase.jsx
 */
export async function createInitialLitigationLevel(caseId, levelData) {
  const now = Timestamp.now();

  const newLevel = {
    caseId,
    levelType: levelData.levelType || "first_instance",
    court: levelData.court || "",
    circuit: levelData.circuit || "",
    caseNumber: levelData.caseNumber || "",
    caseYear: levelData.caseYear || new Date().getFullYear(),
    status: levelData.status || "new",
    isActive: true,
    isCompleted: false,
    order: 1,
    sessionCount: 0,
    filingDate: levelData.filingDate ? Timestamp.fromDate(new Date(levelData.filingDate)) : null,
    judgmentDate: null,
    judgmentAnnouncementDate: null,
    completionDate: null,
    judgmentResult: null,
    judgmentSummary: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, LEVELS_COL), newLevel);

  // Update case with activeLevelId
  await updateDoc(doc(db, CASES_COL, caseId), {
    activeLevelId: docRef.id,
    currentLevel: newLevel.levelType,
    currentStatus: newLevel.status,
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id, ...newLevel };
}

/**
 * Create the next litigation level (e.g., appeal, cassation, execution)
 * Called when a judgment is issued and the lawyer wants to appeal
 */
export async function createNextLitigationLevel(caseId, currentLevelId, newLevelData) {
  const batch = writeBatch(db);

  // Get current level
  const currentLevelRef = doc(db, LEVELS_COL, currentLevelId);
  const currentLevelSnap = await getDoc(currentLevelRef);

  if (!currentLevelSnap.exists()) {
    throw new Error("Current litigation level not found");
  }

  const currentLevel = currentLevelSnap.data();
  const currentOrder = currentLevel.order || 1;

  // Mark current level as completed
  batch.update(currentLevelRef, {
    isActive: false,
    isCompleted: true,
    completionDate: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create new level
  const newLevelRef = doc(collection(db, LEVELS_COL));
  const now = Timestamp.now();

  const newLevel = {
    caseId,
    levelType: newLevelData.levelType,
    court: newLevelData.court || currentLevel.court || "",
    circuit: newLevelData.circuit || "",
    caseNumber: newLevelData.caseNumber || "",
    caseYear: newLevelData.caseYear || new Date().getFullYear(),
    status: newLevelData.status || "new",
    isActive: true,
    isCompleted: false,
    order: currentOrder + 1,
    sessionCount: 0,
    filingDate: newLevelData.filingDate ? Timestamp.fromDate(new Date(newLevelData.filingDate)) : null,
    judgmentDate: null,
    judgmentAnnouncementDate: null,
    completionDate: null,
    judgmentResult: null,
    judgmentSummary: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(newLevelRef, newLevel);

  // Update case
  const caseRef = doc(db, CASES_COL, caseId);
  batch.update(caseRef, {
    activeLevelId: newLevelRef.id,
    currentLevel: newLevelData.levelType,
    currentStatus: newLevelData.status || "new",
    status: "active",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return { id: newLevelRef.id, ...newLevel };
}

// ==================== READ ====================

/**
 * Get all litigation levels for a case, ordered by order
 */
export async function getLitigationLevelsByCase(caseId) {
  const q = query(
    collection(db, LEVELS_COL),
    where("caseId", "==", caseId),
    orderBy("order", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      filingDate: data.filingDate?.toDate?.() || data.filingDate,
      judgmentDate: data.judgmentDate?.toDate?.() || data.judgmentDate,
      judgmentAnnouncementDate: data.judgmentAnnouncementDate?.toDate?.() || data.judgmentAnnouncementDate,
      completionDate: data.completionDate?.toDate?.() || data.completionDate,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  });
}

/**
 * Get the active litigation level for a case
 */
export async function getActiveLitigationLevel(caseId) {
  const q = query(
    collection(db, LEVELS_COL),
    where("caseId", "==", caseId),
    where("isActive", "==", true)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    filingDate: data.filingDate?.toDate?.() || data.filingDate,
    judgmentDate: data.judgmentDate?.toDate?.() || data.judgmentDate,
    judgmentAnnouncementDate: data.judgmentAnnouncementDate?.toDate?.() || data.judgmentAnnouncementDate,
    completionDate: data.completionDate?.toDate?.() || data.completionDate,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
  };
}

/**
 * Get a single litigation level by ID
 */
export async function getLitigationLevelById(levelId) {
  const docRef = doc(db, LEVELS_COL, levelId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    filingDate: data.filingDate?.toDate?.() || data.filingDate,
    judgmentDate: data.judgmentDate?.toDate?.() || data.judgmentDate,
    judgmentAnnouncementDate: data.judgmentAnnouncementDate?.toDate?.() || data.judgmentAnnouncementDate,
    completionDate: data.completionDate?.toDate?.() || data.completionDate,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
  };
}

// ==================== UPDATE ====================

/**
 * Update litigation level status and details
 */
export async function updateLitigationLevel(levelId, updates) {
  const levelRef = doc(db, LEVELS_COL, levelId);

  const updatePayload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // Convert date fields to Timestamps
  if (updates.filingDate && typeof updates.filingDate === "string") {
    updatePayload.filingDate = Timestamp.fromDate(new Date(updates.filingDate));
  }
  if (updates.judgmentDate && typeof updates.judgmentDate === "string") {
    updatePayload.judgmentDate = Timestamp.fromDate(new Date(updates.judgmentDate));
  }
  if (updates.judgmentAnnouncementDate && typeof updates.judgmentAnnouncementDate === "string") {
    updatePayload.judgmentAnnouncementDate = Timestamp.fromDate(new Date(updates.judgmentAnnouncementDate));
  }

  await updateDoc(levelRef, updatePayload);

  // If status changed, update case currentStatus
  if (updates.status) {
    const levelSnap = await getDoc(levelRef);
    if (levelSnap.exists()) {
      const levelData = levelSnap.data();
      await updateDoc(doc(db, CASES_COL, levelData.caseId), {
        currentStatus: updates.status,
        updatedAt: serverTimestamp(),
      });
    }
  }

  return true;
}

/**
 * Mark a level as having a judgment issued
 */
export async function markJudgmentIssued(levelId, judgmentData) {
  const levelRef = doc(db, LEVELS_COL, levelId);

  await updateDoc(levelRef, {
    status: "judgment_issued",
    judgmentDate: serverTimestamp(),
    judgmentResult: judgmentData.result || null,
    judgmentSummary: judgmentData.summary || "",
    updatedAt: serverTimestamp(),
  });

  // Update case status
  const levelSnap = await getDoc(levelRef);
  if (levelSnap.exists()) {
    const levelData = levelSnap.data();
    await updateDoc(doc(db, CASES_COL, levelData.caseId), {
      currentStatus: "judgment_issued",
      status: judgmentData.result === "accepted" ? "closed" : "active",
      updatedAt: serverTimestamp(),
    });
  }

  return true;
}

/**
 * Mark a level as having judgment announced
 */
export async function markJudgmentAnnounced(levelId) {
  return updateLitigationLevel(levelId, {
    status: "judgment_announced",
    judgmentAnnouncementDate: new Date().toISOString(),
  });
}

/**
 * Increment session count for a level
 */
export async function incrementLevelSessionCount(levelId) {
  await updateDoc(doc(db, LEVELS_COL, levelId), {
    sessionCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}

// ==================== DELETE ====================

/**
 * Delete a litigation level (use with caution)
 */
export async function deleteLitigationLevel(levelId) {
  await deleteDoc(doc(db, LEVELS_COL, levelId));
}

// ==================== REAL-TIME ====================

/**
 * Subscribe to litigation levels for a case
 */
export function subscribeToLitigationLevels(caseId, callback) {
  const q = query(
    collection(db, LEVELS_COL),
    where("caseId", "==", caseId),
    orderBy("order", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const levels = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        filingDate: data.filingDate?.toDate?.() || data.filingDate,
        judgmentDate: data.judgmentDate?.toDate?.() || data.judgmentDate,
        judgmentAnnouncementDate: data.judgmentAnnouncementDate?.toDate?.() || data.judgmentAnnouncementDate,
        completionDate: data.completionDate?.toDate?.() || data.completionDate,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });
    callback(levels);
  });
}

import { onSnapshot } from "firebase/firestore";

export default {
  createInitialLitigationLevel,
  createNextLitigationLevel,
  getLitigationLevelsByCase,
  getActiveLitigationLevel,
  getLitigationLevelById,
  updateLitigationLevel,
  markJudgmentIssued,
  markJudgmentAnnounced,
  incrementLevelSessionCount,
  deleteLitigationLevel,
  subscribeToLitigationLevels,
};