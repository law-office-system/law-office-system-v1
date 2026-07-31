// ============================================================
// 📁 FILE: src/migrateCasesToLitigationLevels.js
// Description: One-time migration for old cases
// Run: node src/migrateCasesToLitigationLevels.js
// ============================================================

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

// Your Firebase config
const firebaseConfig = { /* ... your config ... */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CASES_COL = "cases";
const LEVELS_COL = "litigation_levels";

async function migrateCases() {
  console.log("🚀 Starting migration...");

  const casesSnapshot = await getDocs(collection(db, CASES_COL));
  let migrated = 0;
  let skipped = 0;

  for (const caseDoc of casesSnapshot.docs) {
    const caseData = caseDoc.data();
    const caseId = caseDoc.id;

    // Check if case already has litigation levels
    const levelsQuery = await getDocs(collection(db, LEVELS_COL));
    const existingLevels = levelsQuery.docs.filter(
      (d) => d.data().caseId === caseId
    );

    if (existingLevels.length > 0) {
      console.log(`⏭️ Case ${caseId} already has levels, skipping...`);
      skipped++;
      continue;
    }

    // Create initial litigation level from existing case data
    const batch = writeBatch(db);

    const levelRef = doc(collection(db, LEVELS_COL));
    const now = new Date();

    const levelData = {
      caseId,
      levelType: mapLitigationDegree(caseData.litigationDegree),
      court: caseData.court || "",
      circuit: caseData.department || "",
      caseNumber: caseData.caseSerial || "",
      caseYear: parseInt(caseData.caseYear) || now.getFullYear(),
      status: mapStageToStatus(caseData.stage),
      isActive: true,
      isCompleted: false,
      order: 1,
      sessionCount: (caseData.sessions || []).length,
      filingDate: caseData.createdAt || null,
      judgmentDate: null,
      judgmentAnnouncementDate: null,
      completionDate: null,
      judgmentResult: null,
      judgmentSummary: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    batch.set(levelRef, levelData);

    // Update case with activeLevelId
    batch.update(doc(db, CASES_COL, caseId), {
      activeLevelId: levelRef.id,
      currentLevel: levelData.levelType,
      currentStatus: levelData.status,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    migrated++;
    console.log(`✅ Migrated case ${caseId} -> Level ${levelRef.id}`);
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${migrated + skipped}`);
}

// Map old litigationDegree to new levelType
function mapLitigationDegree(degree) {
  const map = {
    "ابتدائي": "first_instance",
    "first_instance": "first_instance",
    "استئناف": "appeal",
    "appeal": "appeal",
    "نقض": "cassation",
    "cassation": "cassation",
    "التماس إعادة النظر": "retrial",
    "retrial": "retrial",
    "تنفيذ": "execution",
    "execution": "execution",
  };
  return map[degree] || "first_instance";
}

// Map old stage to new workflow status
function mapStageToStatus(stage) {
  const map = {
    "جديدة": "new",
    "new": "new",
    "تم قيدها": "registered",
    "registered": "registered",
    "أول جلسة": "first_session",
    "first_session": "first_session",
    "متداولة": "ongoing",
    "ongoing": "ongoing",
    "مؤجلة": "postponed",
    "postponed": "postponed",
    "مرافعة": "pleading",
    "pleading": "pleading",
    "حجز للحكم": "reserved_for_judgment",
    "reserved_for_judgment": "reserved_for_judgment",
    "صدر الحكم": "judgment_issued",
    "judgment_issued": "judgment_issued",
    "تم إعلان الحكم": "judgment_announced",
    "judgment_announced": "judgment_announced",
    "مغلقة": "closed",
    "closed": "closed",
  };
  return map[stage] || "new";
}

migrateCases().catch(console.error);