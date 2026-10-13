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
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebaseDb";

const LEVELS_COL = "litigation_levels";
const CASES_COL = "cases";

/**
 * التحقق من وجود المستند وانتمائه للمكتب الحالي.
 */
async function getOfficeDocument(collectionName, documentId, officeId) {
  if (!documentId || !officeId) {
    throw new Error("documentId و officeId مطلوبان");
  }

  const ref = doc(db, collectionName, documentId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    throw new Error("المستند غير موجود");
  }

  const data = snapshot.data();

  if (data.officeId !== officeId) {
    throw new Error("لا يمكن الوصول إلى بيانات مكتب آخر");
  }

  return { ref, data, snapshot };
}

/**
 * إنشاء أول مستوى تقاضي للقضية.
 */
export async function createInitialLitigationLevel(
  caseId,
  levelData,
  officeId
) {
  if (!caseId || !officeId) {
    throw new Error("caseId و officeId مطلوبان");
  }

  const caseResult = await getOfficeDocument(
    CASES_COL,
    caseId,
    officeId
  );

  const existingLevelsSnap = await getDocs(
    query(
      collection(db, LEVELS_COL),
      where("officeId", "==", officeId),
      where("caseId", "==", caseId)
    )
  );

  const batch = writeBatch(db);
  const levelRef = doc(collection(db, LEVELS_COL));

  batch.set(levelRef, {
    ...levelData,
    caseId,
    officeId,
    order: levelData.order ?? 1,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // إيقاف أي مستوى سابق للقضية (كلهم بنفس المكتب بفعل الفلترة)
  existingLevelsSnap.docs.forEach((levelDoc) => {
    batch.update(levelDoc.ref, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  });

  batch.update(caseResult.ref, {
    activeLevelId: levelRef.id,
    currentLevel: levelData.levelName ?? levelData.name ?? "",
    currentStatus: levelData.status ?? "active",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    id: levelRef.id,
    caseId,
    officeId,
    ...levelData,
    order: levelData.order ?? 1,
    isActive: true,
  };
}

/**
 * إنشاء مستوى تقاضٍ جديد وإيقاف المستوى السابق.
 */
export async function createNextLitigationLevel(
  caseId,
  currentLevelId,
  newLevelData,
  officeId
) {
  if (!caseId || !currentLevelId || !officeId) {
    throw new Error(
      "caseId و currentLevelId و officeId مطلوبة"
    );
  }

  const caseResult = await getOfficeDocument(
    CASES_COL,
    caseId,
    officeId
  );

  const currentResult = await getOfficeDocument(
    LEVELS_COL,
    currentLevelId,
    officeId
  );

  if (currentResult.data.caseId !== caseId) {
    throw new Error("المستوى الحالي لا ينتمي إلى هذه القضية");
  }

  const batch = writeBatch(db);
  const newLevelRef = doc(collection(db, LEVELS_COL));

  batch.update(currentResult.ref, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });

  batch.set(newLevelRef, {
    ...newLevelData,
    caseId,
    officeId,
    order:
      newLevelData.order ??
      ((currentResult.data.order ?? 0) + 1),
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.update(caseResult.ref, {
    activeLevelId: newLevelRef.id,
    currentLevel:
      newLevelData.levelName ??
      newLevelData.name ??
      "",
    currentStatus: newLevelData.status ?? "active",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    id: newLevelRef.id,
    caseId,
    officeId,
    ...newLevelData,
    isActive: true,
  };
}

/**
 * جلب مستويات القضية مفلترة بالمكتب.
 */
export async function getLitigationLevelsByCase(
  caseId,
  officeId
) {
  if (!caseId || !officeId) {
    throw new Error("caseId و officeId مطلوبان");
  }

  const q = query(
    collection(db, LEVELS_COL),
    where("officeId", "==", officeId),
    where("caseId", "==", caseId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((levelDoc) => ({
      id: levelDoc.id,
      ...levelDoc.data(),
    }))
    .filter((item) => item.officeId === officeId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * جلب مستوى القضية النشط.
 */
export async function getActiveLitigationLevel(
  caseId,
  officeId
) {
  if (!caseId || !officeId) {
    throw new Error("caseId و officeId مطلوبان");
  }

  const levels = await getLitigationLevelsByCase(caseId, officeId);
  return levels.find((lvl) => lvl.isActive === true) || null;
}

/**
 * جلب مستوى بواسطة معرّفه.
 */
export async function getLitigationLevelById(
  levelId,
  officeId
) {
  const result = await getOfficeDocument(
    LEVELS_COL,
    levelId,
    officeId
  );

  return {
    id: result.snapshot.id,
    ...result.data,
  };
}

/**
 * تعديل مستوى تقاضٍ.
 */
export async function updateLitigationLevel(
  levelId,
  updates,
  officeId
) {
  const result = await getOfficeDocument(
    LEVELS_COL,
    levelId,
    officeId
  );

  const safeUpdates = { ...updates };
  delete safeUpdates.officeId;
  delete safeUpdates.caseId;
  delete safeUpdates.id;

  await updateDoc(result.ref, {
    ...safeUpdates,
    updatedAt: serverTimestamp(),
  });

  return true;
}

/**
 * تسجيل صدور الحكم.
 */
export async function markJudgmentIssued(
  levelId,
  officeId,
  judgmentData = {}
) {
  const result = await getOfficeDocument(
    LEVELS_COL,
    levelId,
    officeId
  );

  await updateDoc(result.ref, {
    ...judgmentData,
    judgmentIssued: true,
    judgmentIssuedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return true;
}

/**
 * تسجيل إعلان الحكم.
 */
export async function markJudgmentAnnounced(
  levelId,
  officeId,
  announcementData = {}
) {
  const result = await getOfficeDocument(
    LEVELS_COL,
    levelId,
    officeId
  );

  await updateDoc(result.ref, {
    ...announcementData,
    judgmentAnnounced: true,
    judgmentAnnouncedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return true;
}

/**
 * زيادة عدد جلسات المستوى.
 */
export async function incrementLevelSessionCount(
  levelId,
  officeId
) {
  const result = await getOfficeDocument(
    LEVELS_COL,
    levelId,
    officeId
  );

  await updateDoc(result.ref, {
    sessionCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  return true;
}

/**
 * حذف مستوى تقاضٍ.
 */
export async function deleteLitigationLevel(
  levelId,
  officeId
) {
  const result = await getOfficeDocument(
    LEVELS_COL,
    levelId,
    officeId
  );

  await deleteDoc(result.ref);

  return true;
}

/**
 * الاشتراك المباشر في مستويات القضية مفلتراً بالمكتب.
 */
export function subscribeToLitigationLevels(
  caseId,
  officeId,
  callback,
  onError = console.error
) {
  if (!caseId || !officeId) {
    onError(new Error("caseId و officeId مطلوبان"));
    return () => {};
  }

  const q = query(
    collection(db, LEVELS_COL),
    where("officeId", "==", officeId),
    where("caseId", "==", caseId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const levels = snapshot.docs
        .map((levelDoc) => ({
          id: levelDoc.id,
          ...levelDoc.data(),
        }))
        .filter((item) => item.officeId === officeId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      callback(levels);
    },
    onError
  );
}

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